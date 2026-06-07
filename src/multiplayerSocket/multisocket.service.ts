import type { IncomingMessage } from 'http';
import WebSocket from 'ws';
import { findUserById } from '../models/Users.js';
import { verifyAccessToken, verifyRefreshToken } from '../utils/token/verifyToken.js';
import type {
  CreateRoomPayload,
  GetRoomPayload,
  JoinRoomPayload,
  LeaveRoomPayload,
  ReadyRoomPayload,
  SocketMessage,
  StartGamePayload,
  SubmitAnswerPayload,
} from '../utils/types/socket.message.types.js';
import type { SocketUserIdentity } from './multiplayer.types.js';
import { MULTIPLAYER_SOCKET_PATH } from './general.js';
import {
  activateRoom,
  createRoom,
  getPlayerRoomCode,
  getRoom,
  joinRoom,
  leaveRoom,
  markPlayerDisconnected,
  publicRoom,
  reconnectPlayer,
  saveRoom,
  setPlayerReady,
} from './services/roomStore.service.js';
import { bindSocketToRoom, getSocketContext, registerSocket, removeSocket, sendSocketEvent } from './services/socketRegistry.service.js';
import { startGame, submitAnswer } from './services/gameFlow.service.js';

const parseCookies = (cookieHeader: string | undefined): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, chunk) => {
    const [rawKey, ...rawValue] = chunk.trim().split('=');
    if (!rawKey) {
      return cookies;
    }

    cookies[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.join('=') ?? '');
    return cookies;
  }, {});
};

const resolveIdentity = async (req: IncomingMessage): Promise<SocketUserIdentity | null> => {
  const cookies = parseCookies(req.headers.cookie);
  const accessToken = cookies.access_token;
  const refreshToken = cookies.refresh_token;

  if (accessToken) {
    try {
      const decoded = await verifyAccessToken(accessToken);
      const user = await findUserById(decoded.user_id);
      if (user) {
        return {
          userId: user.id,
          username: user.username,
          avatarUrl: user.avatar_url ?? null,
          sessionId: decoded.session_id,
        };
      }
    } catch {
      // fall through to refresh token handling
    }
  }

  if (refreshToken) {
    const session = await verifyRefreshToken(refreshToken);
    const user = await findUserById(session.user_id);
    if (user) {
      return {
        userId: user.id,
        username: user.username,
        avatarUrl: user.avatar_url ?? null,
        sessionId: session.id,
      };
    }
  }

  return null;
};

const sendError = (socket: WebSocket, message: string, roomCode?: string): void => {
  sendSocketEvent(socket, 'error', {
    message,
    roomCode,
  });
};

const sendRoomState = async (socket: WebSocket, roomCode: string): Promise<void> => {
  const room = await getRoom(roomCode);
  if (!room) {
    return;
  }

  sendSocketEvent(socket, 'room:state', {
    room: publicRoom(room),
  });
};

const handleClientMessage = async (socket: WebSocket, identity: SocketUserIdentity, message: SocketMessage): Promise<void> => {
  switch (message.event) {
    case 'room:create': {
      const payload = message.payload as CreateRoomPayload;
      const room = await createRoom(identity, payload);
      bindSocketToRoom(socket, room.roomCode);
      sendSocketEvent(socket, 'room:created', { room: publicRoom(room) });
      break;
    }

    case 'room:join': {
      const payload = message.payload as JoinRoomPayload;
      const room = await joinRoom(payload.roomCode, identity);
      bindSocketToRoom(socket, room.roomCode);
      sendSocketEvent(socket, 'room:joined', { room: publicRoom(room) });
      sendSocketEvent(socket, 'room:updated', { room: publicRoom(room) });
      break;
    }

    case 'room:ready': {
      const payload = message.payload as ReadyRoomPayload;
      const room = await setPlayerReady(payload.roomCode, identity.userId, payload.ready);
      bindSocketToRoom(socket, room.roomCode);
      sendSocketEvent(socket, 'room:updated', { room: publicRoom(room) });
      break;
    }

    case 'room:leave': {
      const payload = message.payload as LeaveRoomPayload;
      const roomCode = payload.roomCode ?? (await getPlayerRoomCode(identity.userId));
      if (!roomCode) {
        return;
      }

      const room = await leaveRoom(roomCode, identity.userId);
      if (room) {
        sendSocketEvent(socket, 'room:updated', { room: publicRoom(room) });
      } else {
        sendSocketEvent(socket, 'room:updated', { roomCode });
      }
      break;
    }

    case 'room:get': {
      const payload = message.payload as GetRoomPayload;
      const roomCode = payload.roomCode ?? (await getPlayerRoomCode(identity.userId));
      if (!roomCode) {
        throw new Error('Room code is required');
      }

      await sendRoomState(socket, roomCode);
      break;
    }

    case 'game:start': {
      const payload = message.payload as StartGamePayload;
      const room = await getRoom(payload.roomCode);
      if (!room) {
        throw new Error('Room not found');
      }

      if (room.hostUserId !== identity.userId) {
        throw new Error('Only the host can start the game');
      }

      const connectedPlayers = Object.values(room.players).filter((player) => player.connected);
      if (connectedPlayers.length < room.minPlayers) {
        throw new Error('Not enough connected players');
      }

      if (connectedPlayers.some((player) => !player.ready)) {
        throw new Error('All connected players must be ready');
      }

      const startedRoom = await startGame(payload.roomCode);
      bindSocketToRoom(socket, startedRoom.roomCode);
      sendSocketEvent(socket, 'game:started', {
        room: publicRoom(startedRoom),
      });
      break;
    }

    case 'game:answer': {
      const payload = message.payload as SubmitAnswerPayload;
      const room = await submitAnswer(payload.roomCode, identity.userId, payload.answer);
      bindSocketToRoom(socket, room.roomCode);
      sendSocketEvent(socket, 'room:updated', { room: publicRoom(room) });
      break;
    }

    case 'ping': {
      sendSocketEvent(socket, 'pong', { timestamp: Date.now() });
      break;
    }

    default:
      throw new Error('Unsupported socket event');
  }
};

const handleSocketConnection = async (socket: WebSocket, req: IncomingMessage): Promise<void> => {
  if (req.url !== MULTIPLAYER_SOCKET_PATH) {
    socket.close(1008, 'Invalid socket path');
    return;
  }

  const identity = await resolveIdentity(req);
  if (!identity) {
    socket.close(4401, 'Unauthorized');
    return;
  }

  registerSocket(socket, {
    userId: identity.userId,
    username: identity.username,
  });

  const roomCode = await getPlayerRoomCode(identity.userId);
  if (roomCode) {
    const room = await reconnectPlayer(roomCode, identity);
    if (room) {
      bindSocketToRoom(socket, roomCode);
      await saveRoom(room);
      await sendRoomState(socket, roomCode);
    }
  }

  socket.on('message', (rawData) => {
    void (async () => {
      try {
        const message = JSON.parse(rawData.toString()) as SocketMessage;
        if (!message || typeof message.event !== 'string') {
          throw new Error('Invalid socket message');
        }

        await handleClientMessage(socket, identity, message);
      } catch (error) {
        sendError(socket, error instanceof Error ? error.message : 'Socket message failed');
      }
    })();
  });

  socket.on('close', async () => {
    const context = getSocketContext(socket);
    if (context?.roomCode) {
      await markPlayerDisconnected(context.roomCode, context.userId);
    }
    removeSocket(socket);
  });
};

export { handleSocketConnection };
