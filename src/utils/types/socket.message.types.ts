export type socketEvent = "gameStart" | "gameEnd" | "playerJoined" | "playerLeft" | "newQuestion" | "answerResult" | "createRoom" | "joinRoom" | "leaveRoom";

type GameStartPayload = {
  gameId: string;
  players: string[];
};

type GameEndPayload = {
  gameId: string;
  winner: string;
};

type PlayerJoinedPayload = {
  gameId: string;
  playerId: number;
};

type PlayerLeftPayload = {
  gameId: string;
  playerId: number;
};

type NewQuestionPayload = {
  gameId: number;
  question: string;
};

type AnswerPayload = {
  gameId: number;
  playerId: number;
  selectedAnswer: number;
};

type CreateRoomPayload = {
  playerId: number;
};

type JoinRoomPayload = {
  roomId: number;
  playerId: number;
};

type LeaveRoomPayload = {
  roomId: number;
  playerId: number;
}

type PayloadMap = {
  gameStart: GameStartPayload;
  gameEnd: GameEndPayload;
  playerJoined: PlayerJoinedPayload;
  playerLeft: PlayerLeftPayload;
  newQuestion: NewQuestionPayload;
  answerResult: AnswerPayload;
  createRoom: CreateRoomPayload;
  joinRoom: JoinRoomPayload;
  leaveRoom: LeaveRoomPayload;
};

export type SocketMessage = {
  event: socketEvent;
  payload: PayloadMap[socketEvent];
};