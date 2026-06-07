export type RoomPhase = 'lobby' | 'starting' | 'active' | 'finished';

export interface MultiplayerQuestion {
  type: 'multiple' | 'boolean';
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

export interface RoomPlayerState {
  userId: number;
  username: string;
  avatarUrl: string | null;
  ready: boolean;
  connected: boolean;
  score: number;
  joinedAt: number;
  lastSeenAt: number;
  disconnectedAt: number | null;
}

export interface PublicPlayerState {
  userId: number;
  username: string;
  ready: boolean;
  connected: boolean;
  score: number;
  joinedAt: number;
}

export interface RoomSettings {
  minPlayers: number;
  maxPlayers: number;
  questionCount: number;
  questionTimeoutMs: number;
  category?: number;
  difficulty?: string;
  type?: string;
}

export interface RoomQuestionSubmission {
  answer: string;
  submittedAt: number;
}

export interface RoomQuestionHistoryEntry {
  questionIndex: number;
  correctAnswer: string;
  results: Record<string, { answer: string; correct: boolean; submittedAt: number }>;
}

export interface RoomState extends RoomSettings {
  roomCode: string;
  hostUserId: number;
  hostUsername: string;
  phase: RoomPhase;
  createdAt: number;
  updatedAt: number;
  lastActivityAt: number;
  currentQuestionIndex: number;
  currentQuestionStartedAt: number | null;
  currentQuestionEndsAt: number | null;
  questions: MultiplayerQuestion[];
  players: Record<string, RoomPlayerState>;
  currentQuestionAnswers: Record<string, RoomQuestionSubmission>;
  questionHistory: RoomQuestionHistoryEntry[];
}

export interface PublicQuestionState {
  type: 'multiple' | 'boolean';
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  question: string;
  incorrect_answers: string[];
}

export interface PublicRoomState extends RoomSettings {
  roomCode: string;
  hostUserId: number;
  hostUsername: string;
  phase: RoomPhase;
  createdAt: number;
  updatedAt: number;
  lastActivityAt: number;
  currentQuestionIndex: number;
  currentQuestionStartedAt: number | null;
  currentQuestionEndsAt: number | null;
  players: PublicPlayerState[];
  currentQuestion: PublicQuestionState | null;
}

export interface SocketUserIdentity {
  userId: number;
  username: string;
  avatarUrl: string | null;
  sessionId: number;
}
