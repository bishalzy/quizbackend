import http from 'http';
import WebSocket from 'ws';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const redisStore = new Map<string, string>();
const redisSets = new Map<string, Set<string>>();
const redisZSets = new Map<string, Map<string, number>>();
const redisSubscribers = new Map<string, Array<(msg: string) => void>>();

vi.mock('../src/redis/redisClient.js', () => {
  const redisClient = {
    on: vi.fn(),
    connect: vi.fn(async () => undefined),
    get: vi.fn(async (key: string) => redisStore.get(key) ?? null),
    set: vi.fn(async (key: string, value: string, options?: { NX?: boolean }) => {
      if (options?.NX && redisStore.has(key)) {
        return null;
      }

      redisStore.set(key, value);
      return 'OK';
    }),
    setEx: vi.fn(async (key: string, _ttl: number, value: string) => {
      redisStore.set(key, value);
      return 'OK';
    }),
    del: vi.fn(async (key: string) => {
      redisStore.delete(key);
      redisSets.delete(key);
      return 1;
    }),
    sAdd: vi.fn(async (key: string, value: string) => {
      const set = redisSets.get(key) ?? new Set<string>();
      set.add(value);
      redisSets.set(key, set);
      return set.size;
    }),
    sRem: vi.fn(async (key: string, value: string) => {
      const set = redisSets.get(key);
      if (!set) {
        return 0;
      }

      const removed = set.delete(value) ? 1 : 0;
      if (set.size === 0) {
        redisSets.delete(key);
      }

      return removed;
    }),
    sMembers: vi.fn(async (key: string) => Array.from(redisSets.get(key) ?? [])),
    zAdd: vi.fn(async (key: string, items: Array<{ score: number; value: string }>) => {
      const set = redisZSets.get(key) ?? new Map<string, number>();
      for (const item of items) {
        set.set(item.value, item.score);
      }
      redisZSets.set(key, set);
      return items.length;
    }),
    zRange: vi.fn(async (key: string, start: number, stop: number) => {
      const set = redisZSets.get(key);
      if (!set) return [];
      const items = Array.from(set.entries()).sort((a, b) => a[1] - b[1]).map((v) => v[0]);
      if (start < 0) start = items.length + start;
      if (stop < 0) stop = items.length + stop;
      return items.slice(start, stop + 1);
    }),
    zRangeByScore: vi.fn(async (key: string, min: number, max: number, opts?: any) => {
      const set = redisZSets.get(key);
      if (!set) return [];
      const items = Array.from(set.entries()).filter(([, score]) => score >= min && score <= max).sort((a, b) => a[1] - b[1]).map((v) => v[0]);
      if (opts && opts.LIMIT) {
        return items.slice(opts.LIMIT.offset, opts.LIMIT.offset + opts.LIMIT.count);
      }
      return items;
    }),
    zRem: vi.fn(async (key: string, ...members: string[]) => {
      const set = redisZSets.get(key);
      if (!set) return 0;
      let removed = 0;
      for (const m of members) {
        if (set.delete(m)) removed += 1;
      }
      if (set.size === 0) redisZSets.delete(key);
      return removed;
    }),
    publish: vi.fn(async (channel: string, message: string) => {
      const subs = redisSubscribers.get(channel) ?? [];
      for (const cb of subs) {
        // call subscribers synchronously
        try { cb(message); } catch { /* ignore */ }
      }
      return subs.length;
    }),
    subscribe: vi.fn(async (channel: string, cb: (msg: string) => void) => {
      const subs = redisSubscribers.get(channel) ?? [];
      subs.push(cb);
      redisSubscribers.set(channel, subs);
      return;
    }),
    duplicate: vi.fn(() => ({
      on: vi.fn(),
      connect: vi.fn(async () => undefined),
      subscribe: vi.fn(async (channel: string, cb: (msg: string) => void) => {
        const subs = redisSubscribers.get(channel) ?? [];
        subs.push(cb);
        redisSubscribers.set(channel, subs);
        return;
      }),
    })),
    exists: vi.fn(async (key: string) => (redisStore.has(key) ? 1 : 0)),
    watch: vi.fn(async () => undefined),
    unwatch: vi.fn(async () => undefined),
    multi: vi.fn(() => ({
      setEx: vi.fn(),
      sAdd: vi.fn(),
      exec: vi.fn(async () => [{ status: 'fulfilled' }]),
    })),
  };

  return {
    default: redisClient,
  };
});

vi.mock('../src/utils/token/verifyToken.js', () => ({
  verifyAccessToken: vi.fn(async (token: string) => {
    if (token === 'host-token') {
      return { user_id: 1, username: 'host-user', session_id: 101 };
    }

    if (token === 'guest-token') {
      return { user_id: 2, username: 'guest-user', session_id: 202 };
    }

    throw new Error('Invalid token');
  }),
  verifyRefreshToken: vi.fn(async () => {
    throw new Error('Refresh token flow is not used in this test');
  }),
}));

vi.mock('../src/models/Users.js', () => ({
  findUserById: vi.fn(async (userId: number) => {
    if (userId === 1) {
      return { id: 1, username: 'host-user', avatar_url: null };
    }

    if (userId === 2) {
      return { id: 2, username: 'guest-user', avatar_url: null };
    }

    return null;
  }),
}));

vi.mock('../src/services/questions.service.js', () => ({
  default: vi.fn(async () => ({
    json: async () => ({
      response_code: 0,
      results: [
        {
          type: 'multiple',
          difficulty: 'easy',
          category: 'General Knowledge',
          question: 'What is 2 + 2?',
          correct_answer: '4',
          incorrect_answers: ['3', '5', '6'],
        },
      ],
    }),
  })),
}));

const waitForEvent = (socket: WebSocket, event: string, timeoutMs = 5000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);

    const onMessage = (data: WebSocket.RawData) => {
      try {
        const parsed = JSON.parse(data.toString()) as { event?: string; payload?: unknown };
        if (parsed.event === event) {
          cleanup();
          resolve(parsed.payload);
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    const cleanup = (): void => {
      clearTimeout(timeout);
      socket.off('message', onMessage);
    };

    socket.on('message', onMessage);
  });
};

const sendSocketMessage = (socket: WebSocket, event: string, payload: Record<string, unknown>): void => {
  socket.send(JSON.stringify({ event, payload }));
};

describe('multiplayer websocket flow', () => {
  let httpServer: http.Server;
  let port: number;
  let hostSocket: WebSocket;
  let guestSocket: WebSocket;

  beforeAll(async () => {
    const { default: server } = await import('../src/socket.js');

    httpServer = server;
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        if (!address || typeof address === 'string') {
          throw new Error('Unable to start test server');
        }

        port = address.port;
        resolve();
      });
    });

    hostSocket = new WebSocket(`ws://127.0.0.1:${port}/ws/multiplayer`, {
      headers: {
        cookie: 'access_token=host-token',
      },
    });

    guestSocket = new WebSocket(`ws://127.0.0.1:${port}/ws/multiplayer`, {
      headers: {
        cookie: 'access_token=guest-token',
      },
    });

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        hostSocket.once('open', () => resolve());
        hostSocket.once('error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        guestSocket.once('open', () => resolve());
        guestSocket.once('error', reject);
      }),
    ]);
  });

  afterAll(async () => {
    hostSocket?.close();
    guestSocket?.close();

    if (httpServer) {
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
    }
  });

  it('creates a room, allows join, and starts a game when everyone is ready', async () => {
    const createdRoomPromise = waitForEvent(hostSocket, 'room:created');
    sendSocketMessage(hostSocket, 'room:create', {
      minPlayers: 2,
      questionCount: 1,
      questionTimeoutMs: 1000,
    });

    const createdRoom = await createdRoomPromise;
    expect(createdRoom.room.roomCode).toMatch(/^\d{6}$/);

    const roomCode = createdRoom.room.roomCode as string;

    const joinedRoomPromise = waitForEvent(guestSocket, 'room:joined');
    sendSocketMessage(guestSocket, 'room:join', { roomCode });
    const joinedRoom = await joinedRoomPromise;
    expect(joinedRoom.room.roomCode).toBe(roomCode);

    const hostReadyPromise = waitForEvent(hostSocket, 'room:updated');
    sendSocketMessage(hostSocket, 'room:ready', { roomCode, ready: true });
    await hostReadyPromise;

    const guestReadyPromise = waitForEvent(guestSocket, 'room:updated');
    sendSocketMessage(guestSocket, 'room:ready', { roomCode, ready: true });
    await guestReadyPromise;

    const startedGamePromise = waitForEvent(hostSocket, 'game:started');
    const questionEventPromise = waitForEvent(hostSocket, 'game:question');
    sendSocketMessage(hostSocket, 'game:start', { roomCode });

    const startedGame = await startedGamePromise;
    expect(startedGame.room.roomCode).toBe(roomCode);

    const questionEvent = await questionEventPromise;
    expect(questionEvent.roomCode).toBe(roomCode);
    expect(questionEvent.question.question).toBe('What is 2 + 2?');
  });

  it('resolves a submitted answer and ends the game when the last question is answered', async () => {
    const createdRoomPromise = waitForEvent(hostSocket, 'room:created');
    sendSocketMessage(hostSocket, 'room:create', {
      minPlayers: 2,
      questionCount: 1,
      questionTimeoutMs: 1000,
    });

    const createdRoom = await createdRoomPromise;
    const roomCode = createdRoom.room.roomCode as string;

    const joinedRoomPromise = waitForEvent(guestSocket, 'room:joined');
    sendSocketMessage(guestSocket, 'room:join', { roomCode });
    await joinedRoomPromise;

    const hostReadyPromise = waitForEvent(hostSocket, 'room:updated');
    sendSocketMessage(hostSocket, 'room:ready', { roomCode, ready: true });
    await hostReadyPromise;

    const guestReadyPromise = waitForEvent(guestSocket, 'room:updated');
    sendSocketMessage(guestSocket, 'room:ready', { roomCode, ready: true });
    await guestReadyPromise;

    const startedGamePromise = waitForEvent(hostSocket, 'game:started');
    const questionEventPromise = waitForEvent(hostSocket, 'game:question');
    sendSocketMessage(hostSocket, 'game:start', { roomCode });

    await startedGamePromise;
    const questionEvent = await questionEventPromise;
    expect(questionEvent.question.question).toBe('What is 2 + 2?');

    const resultPromise = waitForEvent(hostSocket, 'game:result');
    const endedPromise = waitForEvent(hostSocket, 'game:ended');

    sendSocketMessage(hostSocket, 'game:answer', { roomCode, answer: '4' });
    sendSocketMessage(guestSocket, 'game:answer', { roomCode, answer: '3' });

    const resultEvent = await resultPromise;
    expect(resultEvent.roomCode).toBe(roomCode);
    expect(resultEvent.correctAnswer).toBe('4');
    expect(resultEvent.scores['1']).toBe(1);
    expect(resultEvent.scores['2']).toBe(0);

    const endedEvent = await endedPromise;
    expect(endedEvent.roomCode).toBe(roomCode);
    expect(endedEvent.finalScores['1']).toBe(1);
    expect(endedEvent.finalScores['2']).toBe(0);
  });

  it('allows a player to disconnect in lobby and reconnect preserving presence', async () => {
    const createdRoomPromise = waitForEvent(hostSocket, 'room:created');
    sendSocketMessage(hostSocket, 'room:create', {
      minPlayers: 2,
      questionCount: 1,
      questionTimeoutMs: 1000,
    });

    const createdRoom = await createdRoomPromise;
    const roomCode = createdRoom.room.roomCode as string;

    const joinedRoomPromise = waitForEvent(guestSocket, 'room:joined');
    sendSocketMessage(guestSocket, 'room:join', { roomCode });
    await joinedRoomPromise;

    // simulate disconnect
    guestSocket.close();
    await new Promise((r) => setTimeout(r, 100));

    // reconnect with a new socket using same token
    const guestReconnect = new WebSocket(`ws://127.0.0.1:${port}/ws/multiplayer`, {
      headers: { cookie: 'access_token=guest-token' },
    });

    await new Promise<void>((resolve, reject) => {
      guestReconnect.once('open', () => resolve());
      guestReconnect.once('error', reject);
    });

    // explicitly request room state to force a response if reconnect path didn't push it
    sendSocketMessage(guestReconnect, 'room:get', {});
    const state = await waitForEvent(guestReconnect, 'room:state');
    expect(state.room.roomCode).toBe(roomCode);
    const player = state.room.players.find((p: any) => p.userId === 2);
    expect(player).toBeDefined();
    expect(player.connected).toBe(true);

    guestReconnect.close();

    // restore the shared guestSocket for remaining tests/teardown
    guestSocket = new WebSocket(`ws://127.0.0.1:${port}/ws/multiplayer`, {
      headers: { cookie: 'access_token=guest-token' },
    });

    await new Promise<void>((resolve, reject) => {
      guestSocket.once('open', () => resolve());
      guestSocket.once('error', reject);
    });
  });

  it('allows a player to disconnect during an active game and reconnect to resume', async () => {
    const createdRoomPromise = waitForEvent(hostSocket, 'room:created');
    sendSocketMessage(hostSocket, 'room:create', {
      minPlayers: 2,
      questionCount: 1,
      questionTimeoutMs: 1000,
    });

    const createdRoom = await createdRoomPromise;
    const roomCode = createdRoom.room.roomCode as string;

    const joinedRoomPromise = waitForEvent(guestSocket, 'room:joined');
    sendSocketMessage(guestSocket, 'room:join', { roomCode });
    await joinedRoomPromise;

    const hostReadyPromise = waitForEvent(hostSocket, 'room:updated');
    sendSocketMessage(hostSocket, 'room:ready', { roomCode, ready: true });
    await hostReadyPromise;
    const guestReadyPromise = waitForEvent(guestSocket, 'room:updated');
    sendSocketMessage(guestSocket, 'room:ready', { roomCode, ready: true });
    await guestReadyPromise;

    const startedGamePromise = waitForEvent(hostSocket, 'game:started');
    const questionEventPromise = waitForEvent(hostSocket, 'game:question');
    sendSocketMessage(hostSocket, 'game:start', { roomCode });
    await startedGamePromise;
    await questionEventPromise;

    // disconnect guest during active game
    guestSocket.close();
    await new Promise((r) => setTimeout(r, 100));

    // reconnect guest
    const guestReconnect = new WebSocket(`ws://127.0.0.1:${port}/ws/multiplayer`, {
      headers: { cookie: 'access_token=guest-token' },
    });

    await new Promise<void>((resolve, reject) => {
      guestReconnect.once('open', () => resolve());
      guestReconnect.once('error', reject);
    });

    // explicitly request room state to ensure we receive the latest room info
    sendSocketMessage(guestReconnect, 'room:get', {});
    const state = await waitForEvent(guestReconnect, 'room:state');
    expect(state.room.roomCode).toBe(roomCode);
    expect(state.room.phase).toBe('active');

    guestReconnect.close();

    // restore the shared guestSocket for remaining tests/teardown
    guestSocket = new WebSocket(`ws://127.0.0.1:${port}/ws/multiplayer`, {
      headers: { cookie: 'access_token=guest-token' },
    });

    await new Promise<void>((resolve, reject) => {
      guestSocket.once('open', () => resolve());
      guestSocket.once('error', reject);
    });
  });

  it('does not restore connected state after reconnect TTL expires', async () => {
    // use a small grace window set in general.ts; ensure disconnect > grace
    const createdRoomPromise = waitForEvent(hostSocket, 'room:created');
    sendSocketMessage(hostSocket, 'room:create', {
      minPlayers: 2,
      questionCount: 1,
      questionTimeoutMs: 1000,
    });

    const createdRoom = await createdRoomPromise;
    const roomCode = createdRoom.room.roomCode as string;

    const joinedRoomPromise = waitForEvent(guestSocket, 'room:joined');
    sendSocketMessage(guestSocket, 'room:join', { roomCode });
    await joinedRoomPromise;

    // disconnect and wait beyond grace window
    guestSocket.close();
    // grace window defined in code (MULTIPLAYER_RECONNECT_GRACE_MS) — wait slightly longer
    await new Promise((r) => setTimeout(r, 350));

    const guestReconnect = new WebSocket(`ws://127.0.0.1:${port}/ws/multiplayer`, {
      headers: { cookie: 'access_token=guest-token' },
    });

    await new Promise<void>((resolve, reject) => {
      guestReconnect.once('open', () => resolve());
      guestReconnect.once('error', reject);
    });

    // request room state and assert player is still disconnected
    sendSocketMessage(guestReconnect, 'room:get', {});
    const state = await waitForEvent(guestReconnect, 'room:state');
    const player = state.room.players.find((p: any) => p.userId === 2);
    expect(player).toBeDefined();
    expect(player.connected).toBe(false);

    guestReconnect.close();

    // restore shared guestSocket
    guestSocket = new WebSocket(`ws://127.0.0.1:${port}/ws/multiplayer`, {
      headers: { cookie: 'access_token=guest-token' },
    });
    await new Promise<void>((resolve, reject) => {
      guestSocket.once('open', () => resolve());
      guestSocket.once('error', reject);
    });
  });

  it('removes inactive rooms via cleanupInactiveRooms', async () => {
    const { cleanupInactiveRooms } = await import('../src/multiplayerSocket/services/cleanup.service.js');

    const createdRoomPromise = waitForEvent(hostSocket, 'room:created');
    sendSocketMessage(hostSocket, 'room:create', {
      minPlayers: 2,
      questionCount: 1,
      questionTimeoutMs: 1000,
    });

    const createdRoom = await createdRoomPromise;
    const roomCode = createdRoom.room.roomCode as string;

    const key = `mp:room:${roomCode}`;
    const raw = await redisStore.get(key);
    expect(raw).toBeDefined();
    const roomObj = JSON.parse(raw as string);

    // backdate updatedAt to simulate long inactivity
    roomObj.updatedAt = Date.now() - 1000 * 60 * 60 * 24; // 1 day ago
    await redisStore.set(key, JSON.stringify(roomObj));

    await cleanupInactiveRooms();

    // room should be deleted from store and index
    expect(await redisStore.get(key)).toBeUndefined();
    const indexSet = await redisSets.get('mp:rooms:index');
    expect(indexSet?.has(roomCode)).toBeFalsy();
  });
});