import { deleteRoom, getRoom, listRoomCodes } from './roomStore.service.js';

const LOBBY_IDLE_LIMIT_MS = 15 * 60 * 1000;
const ACTIVE_GRACE_LIMIT_MS = 5 * 60 * 1000;
const FINISHED_RETENTION_MS = 30 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

const shouldDeleteRoom = (roomPhase: string, updatedAt: number, hasConnectedPlayers: boolean): boolean => {
  const age = Date.now() - updatedAt;

  if (roomPhase === 'finished') {
    return age > FINISHED_RETENTION_MS;
  }

  if (!hasConnectedPlayers) {
    return age > ACTIVE_GRACE_LIMIT_MS;
  }

  return roomPhase === 'lobby' && age > LOBBY_IDLE_LIMIT_MS;
};

const cleanupInactiveRooms = async (): Promise<void> => {
  const roomCodes = await listRoomCodes();
  for (const roomCode of roomCodes) {
    const room = await getRoom(roomCode);
    if (!room) {
      continue;
    }

    const hasConnectedPlayers = Object.values(room.players).some((player) => player.connected);
    if (shouldDeleteRoom(room.phase, room.updatedAt, hasConnectedPlayers)) {
      await deleteRoom(roomCode);
    }
  }
};

const startMultiplayerCleanup = (): void => {
  const timer = setInterval(() => {
    void cleanupInactiveRooms();
  }, CLEANUP_INTERVAL_MS);

  timer.unref();
};

export { cleanupInactiveRooms, startMultiplayerCleanup };
