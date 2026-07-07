export type ClientSocketEvent =
  | 'room:create'
  | 'room:join'
  | 'room:ready'
  | 'room:leave'
  | 'game:start'
  | 'game:answer'
  | 'room:get'
  | 'ping';

export type ServerSocketEvent =
  | 'room:created'
  | 'room:joined'
  | 'room:left'
  | 'room:state'
  | 'room:updated'
  | 'game:started'
  | 'game:question'
  | 'game:result'
  | 'game:answer:ack'
  | 'game:ended'
  | 'error'
  | 'pong';

export type CreateRoomPayload = {
  minPlayers?: number;
  maxPlayers?: number;
  questionCount?: number;
  questionTimeoutMs?: number;
  category?: number;
  difficulty?: string;
  type?: string;
};

export type JoinRoomPayload = {
  roomCode: string;
};

export type ReadyRoomPayload = {
  roomCode: string;
  ready: boolean;
};

export type LeaveRoomPayload = {
  roomCode?: string;
};

export type StartGamePayload = {
  roomCode: string;
};

export type SubmitAnswerPayload = {
  roomCode: string;
  answer: string;
};

export type GetRoomPayload = {
  roomCode?: string;
};

export type ClientPayloadMap = {
  'room:create': CreateRoomPayload;
  'room:join': JoinRoomPayload;
  'room:ready': ReadyRoomPayload;
  'room:leave': LeaveRoomPayload;
  'game:start': StartGamePayload;
  'game:answer': SubmitAnswerPayload;
  'room:get': GetRoomPayload;
  'ping': Record<string, never>;
};

export type SocketMessage<TEvent extends ClientSocketEvent = ClientSocketEvent> = {
  event: TEvent;
  payload: ClientPayloadMap[TEvent];
};

export type ServerSocketMessage = {
  event: ServerSocketEvent;
  payload: Record<string, unknown>;
};
