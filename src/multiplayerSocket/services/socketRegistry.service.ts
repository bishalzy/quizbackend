import WebSocket from 'ws';
import type { ServerSocketMessage } from '../../utils/types/socket.message.types.js';

export type SocketContext = {
  userId: number;
  username: string;
  roomCode?: string;
};

const socketsByRoom = new Map<string, Map<number, WebSocket>>();
const socketContexts = new WeakMap<WebSocket, SocketContext>();

const sendSocketEvent = (socket: WebSocket, event: ServerSocketMessage['event'], payload: ServerSocketMessage['payload']): void => {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify({ event, payload }));
};

const registerSocket = (socket: WebSocket, context: SocketContext): void => {
  socketContexts.set(socket, context);
};

const bindSocketToRoom = (socket: WebSocket, roomCode: string): void => {
  const context = socketContexts.get(socket);
  if (!context) {
    throw new Error('Socket is not registered');
  }

  const roomSockets = socketsByRoom.get(roomCode) ?? new Map<number, WebSocket>();
  const existingSocket = roomSockets.get(context.userId);
  if (existingSocket && existingSocket !== socket && existingSocket.readyState === WebSocket.OPEN) {
    existingSocket.close(4000, 'Replaced by a newer connection');
  }

  context.roomCode = roomCode;
  roomSockets.set(context.userId, socket);
  socketsByRoom.set(roomCode, roomSockets);
  socketContexts.set(socket, context);
};

const getSocketContext = (socket: WebSocket): SocketContext | undefined => {
  return socketContexts.get(socket);
};

const broadcastToRoom = (roomCode: string, event: ServerSocketMessage['event'], payload: ServerSocketMessage['payload']): void => {
  const roomSockets = socketsByRoom.get(roomCode);
  if (!roomSockets) {
    return;
  }

  for (const socket of roomSockets.values()) {
    sendSocketEvent(socket, event, payload);
  }
};

const removeSocket = (socket: WebSocket): SocketContext | undefined => {
  const context = socketContexts.get(socket);
  if (!context) {
    return undefined;
  }

  if (context.roomCode) {
    const roomSockets = socketsByRoom.get(context.roomCode);
    roomSockets?.delete(context.userId);
    if (roomSockets && roomSockets.size === 0) {
      socketsByRoom.delete(context.roomCode);
    }
  }

  socketContexts.delete(socket);
  return context;
};

export {
  bindSocketToRoom,
  broadcastToRoom,
  getSocketContext,
  registerSocket,
  removeSocket,
  sendSocketEvent,
};
