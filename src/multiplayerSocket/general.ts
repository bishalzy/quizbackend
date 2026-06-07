export const MULTIPLAYER_SOCKET_PATH = '/ws/multiplayer';
export const MULTIPLAYER_ROOM_TTL_SECONDS = 60 * 60 * 2;
export const MULTIPLAYER_ROOM_LOCK_TTL_MS = 5_000;
export const MULTIPLAYER_RECONNECT_GRACE_MS = 300;

export const buildRoomKey = (roomCode: string): string => `mp:room:${roomCode}`;
export const buildRoomLockKey = (roomCode: string): string => `mp:room:${roomCode}:lock`;
export const buildUserRoomKey = (userId: number): string => `mp:user:${userId}:room`;

export const generateRoomCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
