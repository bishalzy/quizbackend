# Multiplayer: design, keys, and deployment notes

This document summarizes the multiplayer subsystem implemented in this repo.

## Overview
- WebSockets endpoint: `/ws/multiplayer` (see `src/socket.ts`).
- Authentication: cookie `access_token` validated by `verifyAccessToken` (see `src/multiplayerSocket/multisocket.service.ts`).
- Room state persisted in Redis (JSON) with TTL and active-index set.

## Redis keys
- `mp:room:{roomCode}` — JSON-serialized `RoomState` for a room.
- `mp:room:{roomCode}:lock` — short-lived lock token used for atomic updates.
- `mp:user:{userId}:room` — optional mapping from user → roomCode for quick reconnect.
- `mp:rooms:index` — set of active room codes.
- `mp:timers` — sorted-set used by the timer processor; member values are JSON objects `{ roomCode, questionIndex }` and scores are execution timestamps (ms).

## Message protocol (JSON over WS)
- Client messages: `{ event: string, payload: object }`.
- Important client events: `room:create`, `room:join`, `room:ready`, `room:leave`, `room:get`, `game:start`, `game:answer`, `ping`.
- Server events: `room:created`, `room:joined`, `room:updated`, `room:state`, `game:started`, `game:question`, `game:result`, `game:ended`, `pong`, `error`.
- See `src/utils/types/socket.message.types.ts` for payload shape types.

## Reconnection & presence
- When a socket connects, `getPlayerRoomCode` is used to attempt `reconnectPlayer` and the server will send `room:state` if available.
- A short reconnect grace window is enforced via `MULTIPLAYER_RECONNECT_GRACE_MS` (set in `src/multiplayerSocket/general.ts`). Reconnect restores `connected=true` only inside that window.

## Timers and multi-process scheduling
- Timeouts for questions are scheduled via the Redis sorted-set `mp:timers` and a local processor polls due members and claims work using room locks (`timer.service.ts`).
- This design supports multiple node processes: any process can claim and execute a due timer while others skip.

## How to run tests
- Unit/integration tests use Vitest. Tests mock Redis; run the multiplayer tests with:

```bash
npx vitest run test/multiplayerSocket.test.ts
```

## Deployment notes
- Ensure you have a Redis instance available and that the Node process can connect to it.
- Start the server normally; the timer processor is started automatically when `src/socket.ts` loads.
- For low-latency production, consider enabling Redis keyspace notifications or using a lightweight job queue instead of polling.

## Next steps
- Replace polling with Redis keyspace notifications for lower latency.
- Add cleanup/inactive-room integration tests that exercise TTL removal.
- Add operational docs (metrics, alerting) if desired.
