import { randomUUID } from 'crypto';
import redisClient from '../../redis/redisClient.js';
import {
  MULTIPLAYER_ROOM_LOCK_TTL_MS,
  MULTIPLAYER_ROOM_TTL_SECONDS,
  buildRoomKey,
  buildRoomLockKey,
  buildUserRoomKey,
  generateRoomCode,
} from '../general.js';
import type {
  MultiplayerQuestion,
  PublicRoomState,
  RoomPlayerState,
  RoomSettings,
  RoomState,
  SocketUserIdentity,
} from '../multiplayer.types.js';
import { MULTIPLAYER_RECONNECT_GRACE_MS } from '../general.js';

const ACTIVE_ROOMS_KEY = 'mp:rooms:index';

const clone = <T,>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

const now = (): number => Date.now();

const readRoom = async (roomCode: string): Promise<RoomState | null> => {
  const value = await redisClient.get(buildRoomKey(roomCode));
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as RoomState;
  } catch {
    return null;
  }
};

const writeRoom = async (room: RoomState): Promise<RoomState> => {
  const roomToStore = clone(room);
  roomToStore.updatedAt = now();
  roomToStore.lastActivityAt = now();
  await redisClient.set(buildRoomKey(roomToStore.roomCode), JSON.stringify(roomToStore), {
    EX: MULTIPLAYER_ROOM_TTL_SECONDS,
  });
  await redisClient.sAdd(ACTIVE_ROOMS_KEY, roomToStore.roomCode);
  return roomToStore;
};

const publicQuestionFromRoom = (room: RoomState): PublicRoomState['currentQuestion'] => {
  const question = room.questions[room.currentQuestionIndex];
  if (!question) {
    return null;
  }

  const options = [...question.incorrect_answers, question.correct_answer];
  // Deterministic shuffle per question index so reconnecting clients see the same order
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = options[i]!;
    options[i] = options[j]!;
    options[j] = tmp;
  }

  return {
    type: question.type,
    difficulty: question.difficulty,
    category: question.category,
    question: question.question,
    options,
  };
};

const toPublicRoomState = (room: RoomState): PublicRoomState => ({
  roomCode: room.roomCode,
  hostUserId: room.hostUserId,
  hostUsername: room.hostUsername,
  phase: room.phase,
  createdAt: room.createdAt,
  updatedAt: room.updatedAt,
  lastActivityAt: room.lastActivityAt,
  minPlayers: room.minPlayers,
  maxPlayers: room.maxPlayers,
  questionCount: room.questionCount,
  questionTimeoutMs: room.questionTimeoutMs,
  ...(room.category !== undefined ? { category: room.category } : {}),
  ...(room.difficulty !== undefined ? { difficulty: room.difficulty } : {}),
  ...(room.type !== undefined ? { type: room.type } : {}),
  currentQuestionIndex: room.currentQuestionIndex,
  currentQuestionStartedAt: room.currentQuestionStartedAt,
  currentQuestionEndsAt: room.currentQuestionEndsAt,
  players: Object.values(room.players).map((player) => ({
    userId: player.userId,
    username: player.username,
    ready: player.ready,
    connected: player.connected,
    score: player.score,
    joinedAt: player.joinedAt,
  })),
  currentQuestion: publicQuestionFromRoom(room),
});

const createInitialRoom = (
  roomCode: string,
  host: SocketUserIdentity,
  settings?: Partial<Pick<RoomSettings, 'minPlayers' | 'maxPlayers' | 'questionCount' | 'questionTimeoutMs' | 'category' | 'difficulty' | 'type'>>,
): RoomState => {
  const timestamp = now();

  return {
    roomCode,
    hostUserId: host.userId,
    hostUsername: host.username,
    phase: 'lobby',
    createdAt: timestamp,
    updatedAt: timestamp,
    lastActivityAt: timestamp,
    minPlayers: settings?.minPlayers ?? 2,
    maxPlayers: settings?.maxPlayers ?? 8,
    questionCount: settings?.questionCount ?? 10,
    questionTimeoutMs: settings?.questionTimeoutMs ?? 15000,
    currentQuestionIndex: 0,
    currentQuestionStartedAt: null,
    currentQuestionEndsAt: null,
    questions: [],
    players: {
      [host.userId]: {
        userId: host.userId,
        username: host.username,
        avatarUrl: host.avatarUrl,
        ready: false,
        connected: true,
        score: 0,
        joinedAt: timestamp,
        lastSeenAt: timestamp,
        disconnectedAt: null,
      },
    },
    currentQuestionAnswers: {},
    questionHistory: [],
    ...(settings?.category !== undefined ? { category: settings.category } : {}),
    ...(settings?.difficulty !== undefined ? { difficulty: settings.difficulty } : {}),
    ...(settings?.type !== undefined ? { type: settings.type } : {}),
  };
};

const setUserRoomCode = async (userId: number, roomCode: string | null): Promise<void> => {
  const key = buildUserRoomKey(userId);
  if (!roomCode) {
    await redisClient.del(key);
    return;
  }

  await redisClient.set(key, roomCode, {
    EX: MULTIPLAYER_ROOM_TTL_SECONDS,
  });
};

const getUserRoomCode = async (userId: number): Promise<string | null> => {
  return redisClient.get(buildUserRoomKey(userId));
};

const withRoomLock = async <T,>(roomCode: string, handler: () => Promise<T>): Promise<T> => {
  const lockKey = buildRoomLockKey(roomCode);
  const lockToken = randomUUID();
  const lockAcquired = await redisClient.set(lockKey, lockToken, {
    NX: true,
    PX: MULTIPLAYER_ROOM_LOCK_TTL_MS,
  });

  if (lockAcquired !== 'OK') {
    throw new Error('Room is busy, please retry');
  }

  try {
    return await handler();
  } finally {
    const currentToken = await redisClient.get(lockKey);
    if (currentToken === lockToken) {
      await redisClient.del(lockKey);
    }
  }
};

const createRoom = async (
  host: SocketUserIdentity,
  settings?: Partial<Pick<RoomSettings, 'minPlayers' | 'maxPlayers' | 'questionCount' | 'questionTimeoutMs' | 'category' | 'difficulty' | 'type'>>,
): Promise<RoomState> => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const roomCode = generateRoomCode();
    const room = createInitialRoom(roomCode, host, settings);
    const stored = await redisClient.set(buildRoomKey(roomCode), JSON.stringify(room), {
      NX: true,
      EX: MULTIPLAYER_ROOM_TTL_SECONDS,
    });

    if (stored === 'OK') {
      await redisClient.sAdd(ACTIVE_ROOMS_KEY, roomCode);
      await setUserRoomCode(host.userId, roomCode);
      return room;
    }
  }

  throw new Error('Unable to generate a unique room code');
};

const getRoom = async (roomCode: string): Promise<RoomState | null> => {
  return readRoom(roomCode);
};

const saveRoom = async (room: RoomState): Promise<RoomState> => {
  return writeRoom(room);
};

const joinRoom = async (
  roomCode: string,
  player: Pick<SocketUserIdentity, 'userId' | 'username' | 'avatarUrl'>,
): Promise<RoomState> => {
  return withRoomLock(roomCode, async () => {
    const room = await readRoom(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.phase !== 'lobby') {
      throw new Error('Room already started');
    }

    const timestamp = now();
    const existingPlayer = room.players[player.userId];
    if (!existingPlayer && Object.keys(room.players).length >= room.maxPlayers) {
      throw new Error('Room is full');
    }

    room.players[player.userId] = {
      userId: player.userId,
      username: player.username,
      avatarUrl: player.avatarUrl,
      ready: existingPlayer?.ready ?? false,
      connected: true,
      score: existingPlayer?.score ?? 0,
      joinedAt: existingPlayer?.joinedAt ?? timestamp,
      lastSeenAt: timestamp,
      disconnectedAt: null,
    };

    const savedRoom = await writeRoom(room);
    await setUserRoomCode(player.userId, roomCode);
    return savedRoom;
  });
};

const reconnectPlayer = async (
  roomCode: string,
  player: Pick<SocketUserIdentity, 'userId' | 'username' | 'avatarUrl'>,
): Promise<RoomState | null> => {
  return withRoomLock(roomCode, async () => {
    const room = await readRoom(roomCode);
    if (!room) {
      return null;
    }

    const existingPlayer = room.players[player.userId];
    if (!existingPlayer) {
      return null;
    }

    const disconnectedAt = existingPlayer.disconnectedAt;
    const canReconnect = disconnectedAt ? now() - disconnectedAt <= MULTIPLAYER_RECONNECT_GRACE_MS : true;

    room.players[player.userId] = {
      ...existingPlayer,
      username: player.username,
      avatarUrl: player.avatarUrl,
      connected: canReconnect ? true : existingPlayer.connected,
      disconnectedAt: canReconnect ? null : existingPlayer.disconnectedAt,
      lastSeenAt: now(),
    };

    return writeRoom(room);
  });
};

const setPlayerReady = async (roomCode: string, userId: number, ready: boolean): Promise<RoomState> => {
  return withRoomLock(roomCode, async () => {
    const room = await readRoom(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    const player = room.players[userId];
    if (!player) {
      throw new Error('Player is not in the room');
    }

    room.players[userId] = {
      ...player,
      ready,
      connected: true,
      disconnectedAt: null,
      lastSeenAt: now(),
    };

    const savedRoom = await writeRoom(room);
    await setUserRoomCode(userId, roomCode);
    return savedRoom;
  });
};

const leaveRoom = async (roomCode: string, userId: number): Promise<RoomState | null> => {
  return withRoomLock(roomCode, async () => {
    const room = await readRoom(roomCode);
    if (!room) {
      return null;
    }

    delete room.players[userId];
    delete room.currentQuestionAnswers[userId.toString()];

    if (Object.keys(room.players).length === 0) {
      await redisClient.del(buildRoomKey(roomCode));
      await setUserRoomCode(userId, null);
      return null;
    }

    if (room.hostUserId === userId) {
      const nextHost = Object.values(room.players).sort((left, right) => left.joinedAt - right.joinedAt)[0];
      if (nextHost) {
        room.hostUserId = nextHost.userId;
        room.hostUsername = nextHost.username;
      }
    }

    const savedRoom = await writeRoom(room);
    await setUserRoomCode(userId, null);
    return savedRoom;
  });
};

const markPlayerDisconnected = async (roomCode: string, userId: number): Promise<RoomState | null> => {
  return withRoomLock(roomCode, async () => {
    const room = await readRoom(roomCode);
    if (!room) {
      return null;
    }

    const player = room.players[userId];
    if (!player) {
      return room;
    }

    room.players[userId] = {
      ...player,
      connected: false,
      disconnectedAt: now(),
      lastSeenAt: now(),
    };

    return writeRoom(room);
  });
};

const attachQuestions = async (roomCode: string, questions: MultiplayerQuestion[]): Promise<RoomState> => {
  return withRoomLock(roomCode, async () => {
    const room = await readRoom(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    room.questions = questions;
    return writeRoom(room);
  });
};

const activateRoom = async (roomCode: string): Promise<RoomState> => {
  return withRoomLock(roomCode, async () => {
    const room = await readRoom(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    room.phase = 'active';
    room.currentQuestionIndex = 0;
    room.currentQuestionStartedAt = now();
    room.currentQuestionEndsAt = now() + room.questionTimeoutMs;
    room.currentQuestionAnswers = {};
    room.questionHistory = [];
    return writeRoom(room);
  });
};

const setRoomStarting = async (roomCode: string): Promise<RoomState> => {
  return withRoomLock(roomCode, async () => {
    const room = await readRoom(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    room.phase = 'starting';
    return writeRoom(room);
  });
};

const setRoomFinished = async (roomCode: string): Promise<RoomState> => {
  return withRoomLock(roomCode, async () => {
    const room = await readRoom(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    room.phase = 'finished';
    room.currentQuestionEndsAt = null;
    room.currentQuestionStartedAt = null;
    return writeRoom(room);
  });
};

const recordAnswer = async (roomCode: string, userId: number, answer: string): Promise<RoomState> => {
  return withRoomLock(roomCode, async () => {
    const room = await readRoom(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.phase !== 'active') {
      throw new Error('Game is not active');
    }

    if (room.currentQuestionAnswers[userId.toString()]) {
      return room;
    }

    room.currentQuestionAnswers[userId.toString()] = {
      answer,
      submittedAt: now(),
    };

    return writeRoom(room);
  });
};

const clearQuestionAnswers = async (roomCode: string): Promise<RoomState> => {
  return withRoomLock(roomCode, async () => {
    const room = await readRoom(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    room.currentQuestionAnswers = {};
    return writeRoom(room);
  });
};

const advanceQuestionIndex = async (roomCode: string): Promise<RoomState> => {
  return withRoomLock(roomCode, async () => {
    const room = await readRoom(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    room.currentQuestionIndex += 1;
    room.currentQuestionStartedAt = now();
    room.currentQuestionEndsAt = now() + room.questionTimeoutMs;
    room.currentQuestionAnswers = {};
    return writeRoom(room);
  });
};

const markQuestionFinished = async (roomCode: string): Promise<RoomState> => {
  return withRoomLock(roomCode, async () => {
    const room = await readRoom(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    room.currentQuestionStartedAt = null;
    room.currentQuestionEndsAt = null;
    return writeRoom(room);
  });
};

const listRoomCodes = async (): Promise<string[]> => {
  return redisClient.sMembers(ACTIVE_ROOMS_KEY);
};

const deleteRoom = async (roomCode: string): Promise<void> => {
  await redisClient.del(buildRoomKey(roomCode));
  await redisClient.sRem(ACTIVE_ROOMS_KEY, roomCode);
};

const hasAllConnectedPlayersReady = (room: RoomState): boolean => {
  const players = Object.values(room.players).filter((player) => player.connected);
  return players.length >= room.minPlayers && players.every((player) => player.ready);
};

const hasAllConnectedPlayersSubmitted = (room: RoomState): boolean => {
  const players = Object.values(room.players).filter((player) => player.connected);
  return players.length > 0 && players.every((player) => Boolean(room.currentQuestionAnswers[player.userId.toString()]));
};

const isHost = (room: RoomState, userId: number): boolean => room.hostUserId === userId;

const getCurrentQuestion = (room: RoomState): MultiplayerQuestion | null => {
  return room.questions[room.currentQuestionIndex] ?? null;
};

const publicRoom = (room: RoomState): PublicRoomState => toPublicRoomState(room);

export {
  activateRoom,
  advanceQuestionIndex,
  attachQuestions,
  clearQuestionAnswers,
  createRoom,
  deleteRoom,
  getCurrentQuestion,
  getUserRoomCode as getPlayerRoomCode,
  getRoom,
  hasAllConnectedPlayersReady,
  hasAllConnectedPlayersSubmitted,
  isHost,
  joinRoom,
  leaveRoom,
  listRoomCodes,
  markPlayerDisconnected,
  markQuestionFinished,
  publicRoom,
  readRoom,
  reconnectPlayer,
  recordAnswer,
  saveRoom,
  setPlayerReady,
  setUserRoomCode as setPlayerRoomIndex,
  setRoomFinished,
  setRoomStarting,
  setUserRoomCode,
  toPublicRoomState,
  withRoomLock,
};
