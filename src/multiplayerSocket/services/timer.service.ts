import redisClient from '../../redis/redisClient.js';
import { withRoomLock } from './roomStore.service.js';

const TIMERS_KEY = 'mp:timers';
const TIMERS_CHANNEL = 'mp:timers:channel';

type DueEntry = { roomCode: string; questionIndex: number };

let processorInterval: NodeJS.Timeout | null = null;
let handler: ((entry: DueEntry) => Promise<void>) | null = null;
const redisSubscriberClient = redisClient.duplicate();

redisSubscriberClient.on('error', (err) => {
  console.error('Redis subscriber client error', err);
});

try {
  await redisSubscriberClient.connect();
} catch (error) {
  console.error('Error connecting Redis subscriber client:', error);
}

const scheduleRoomTimer = async (roomCode: string, questionIndex: number, executeAtMs: number): Promise<void> => {
  const member = JSON.stringify({ roomCode, questionIndex });
  await redisClient.zAdd(TIMERS_KEY, [{ score: executeAtMs, value: member }]);
  // notify other processes that a timer was scheduled
  try {
    await redisClient.publish(TIMERS_CHANNEL, member);
  } catch {
    // best-effort notify
  }
};

const cancelRoomTimer = async (roomCode: string): Promise<void> => {
  // remove any members for this room
  const members = await redisClient.zRange(TIMERS_KEY, 0, -1);
  const toRemove = members.filter((m) => {
    try {
      const parsed = JSON.parse(m) as DueEntry;
      return parsed.roomCode === roomCode;
    } catch {
      return false;
    }
  });

  if (toRemove.length === 0) return;
  await redisClient.zRem(TIMERS_KEY, [...toRemove]);
};

const processDue = async (): Promise<void> => {
  if (!handler) return;

  const now = Date.now();
  // fetch due members (limit to 50 to avoid huge batches)
  const members = await redisClient.zRangeByScore(TIMERS_KEY, 0, now, { LIMIT: { offset: 0, count: 50 } });
  if (!members || members.length === 0) return;

  for (const member of members) {
    let entry: DueEntry | null = null;
    try {
      entry = JSON.parse(member) as DueEntry;
    } catch {
      // ignore parse errors and remove the bad member
      await redisClient.zRem(TIMERS_KEY, member);
      continue;
    }

    try {
      // attempt to claim the room with the same room lock to avoid races
      await withRoomLock(entry.roomCode, async () => {
        // invoke handler while holding the lock
        if (handler) {
          await handler(entry);
        }
      });

      // remove the member after processing
      await redisClient.zRem(TIMERS_KEY, member);
    } catch (err) {
      // If lock couldn't be acquired or handler failed, leave the member for next round
      // No-op
    }
  }
};

const startTimerProcessor = (intervalMs = 200): void => {
  if (processorInterval) return;
  // start periodic scanning as a fallback
  processorInterval = setInterval(() => {
    void processDue();
  }, intervalMs);

  // subscribe to immediate notifications to reduce latency
  try {
    // subscribe will trigger processDue when a schedule is published
    void redisSubscriberClient.subscribe(TIMERS_CHANNEL, async () => {
      void processDue();
    });
  } catch {
    // some Redis clients may not support subscribe in this context; ignore
  }
};

const stopTimerProcessor = (): void => {
  if (!processorInterval) return;
  clearInterval(processorInterval);
  processorInterval = null;
};

const registerTimerHandler = (fn: (entry: DueEntry) => Promise<void>): void => {
  handler = fn;
};

export { scheduleRoomTimer, cancelRoomTimer, startTimerProcessor, stopTimerProcessor, registerTimerHandler };
