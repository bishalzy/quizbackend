import questionsService from '../../services/questions.service.js';
import type { Question, QuestionRequest } from '../../utils/types/questionTypes.js';
import type { MultiplayerQuestion, RoomState } from '../multiplayer.types.js';
import {
  activateRoom,
  advanceQuestionIndex,
  attachQuestions,
  clearQuestionAnswers,
  getCurrentQuestion,
  getRoom,
  hasAllConnectedPlayersSubmitted,
  markQuestionFinished,
  publicRoom,
  recordAnswer,
  saveRoom,
  setRoomFinished,
  setRoomStarting,
} from './roomStore.service.js';
import { scheduleRoomTimer, cancelRoomTimer, registerTimerHandler } from './timer.service.js';
import { broadcastToRoom } from './socketRegistry.service.js';

// timers moved to Redis-backed scheduler — in-memory map removed

const toPublicQuestion = (question: Question): MultiplayerQuestion => ({
  type: question.type,
  difficulty: question.difficulty,
  category: question.category,
  question: question.question,
  correct_answer: question.correct_answer,
  incorrect_answers: question.incorrect_answers,
});

const shuffleArray = <T,>(arr: T[]): T[] => {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = tmp;
  }
  return shuffled;
};

const toVisibleQuestion = (question: MultiplayerQuestion) => ({
  type: question.type,
  difficulty: question.difficulty,
  category: question.category,
  question: question.question,
  options: shuffleArray([...question.incorrect_answers, question.correct_answer]),
});

const getScoreBoard = (room: RoomState): Record<string, number> => {
  const scoreboard: Record<string, number> = {};
  for (const player of Object.values(room.players)) {
    scoreboard[player.userId.toString()] = player.score;
  }

  return scoreboard;
};

const clearRoomTimer = async (roomCode: string): Promise<void> => {
  await cancelRoomTimer(roomCode);
};

const scheduleQuestionTimeout = async (roomCode: string, questionIndex: number, timeoutMs: number): Promise<void> => {
  await clearRoomTimer(roomCode);
  const executeAt = Date.now() + timeoutMs;
  await scheduleRoomTimer(roomCode, questionIndex, executeAt);
};

const broadcastCurrentQuestion = async (roomCode: string): Promise<void> => {
  const room = await getRoom(roomCode);
  if (!room || room.phase !== 'active') {
    return;
  }

  const question = getCurrentQuestion(room);
  if (!question) {
    return;
  }

  broadcastToRoom(roomCode, 'game:question', {
    roomCode,
    questionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
    question: toVisibleQuestion(question),
    endsAt: room.currentQuestionEndsAt,
    scores: getScoreBoard(room),
  });

  scheduleQuestionTimeout(roomCode, room.currentQuestionIndex, room.questionTimeoutMs);
};

const startGame = async (roomCode: string): Promise<RoomState> => {
  const room = await setRoomStarting(roomCode);
  const currentRoom = await getRoom(roomCode);
  if (!currentRoom) {
    throw new Error('Room not found');
  }

  const request: QuestionRequest = {
    noofQuestion: currentRoom.questionCount,
  };

  if (currentRoom.category !== undefined) {
    request.category = currentRoom.category;
  }

  if (currentRoom.difficulty !== undefined) {
    request.difficulty = currentRoom.difficulty;
  }

  if (currentRoom.type !== undefined) {
    request.type = currentRoom.type;
  }

  const response = await questionsService(request);

  const data = await response.json() as { results?: Question[] };
  const questions = (data.results ?? []).map(toPublicQuestion);
  if (questions.length === 0) {
    throw new Error('No questions returned for the room');
  }

  await attachQuestions(roomCode, questions);
  const activatedRoom = await activateRoom(roomCode);

  broadcastToRoom(roomCode, 'game:started', {
    roomCode,
    room: publicRoom(activatedRoom),
    scores: getScoreBoard(activatedRoom),
  });

  void broadcastCurrentQuestion(roomCode);
  return activatedRoom;
};

const submitAnswer = async (roomCode: string, userId: number, answer: string): Promise<RoomState> => {
  const room = await recordAnswer(roomCode, userId, answer);
  if (hasAllConnectedPlayersSubmitted(room)) {
    void resolveQuestion(roomCode, room.currentQuestionIndex, 'all-answered');
  }

  return room;
};

const resolveQuestion = async (roomCode: string, questionIndex: number, reason: 'timeout' | 'all-answered'): Promise<void> => {
  await clearRoomTimer(roomCode);

  const room = await getRoom(roomCode);
  if (!room || room.phase !== 'active') {
    return;
  }

  if (room.currentQuestionIndex !== questionIndex) {
    return;
  }

  const question = getCurrentQuestion(room);
  if (!question) {
    const finishedRoom = await setRoomFinished(roomCode);
    broadcastToRoom(roomCode, 'game:ended', {
      roomCode,
      finalScores: getScoreBoard(finishedRoom),
      winners: Object.values(finishedRoom.players)
        .sort((left, right) => right.score - left.score)
        .slice(0, 1)
        .map((player) => ({ userId: player.userId, username: player.username, score: player.score })),
    });
    return;
  }

  for (const player of Object.values(room.players)) {
    const submission = room.currentQuestionAnswers[player.userId.toString()];
    const selectedAnswer = submission?.answer ?? '';
    const correct = selectedAnswer === question.correct_answer;
    if (correct) {
      player.score += 1;
    }

    room.questionHistory.push({
      questionIndex,
      correctAnswer: question.correct_answer,
      results: {
        ...(room.questionHistory[room.questionHistory.length - 1]?.results ?? {}),
        [player.userId.toString()]: {
          answer: selectedAnswer,
          correct,
          submittedAt: submission?.submittedAt ?? Date.now(),
        },
      },
    });
  }

  room.currentQuestionAnswers = {};
  room.currentQuestionStartedAt = null;
  room.currentQuestionEndsAt = null;
  room.updatedAt = Date.now();
  await saveRoom(room);

  if (room.currentQuestionIndex + 1 >= room.questions.length) {
    const finishedRoom = await setRoomFinished(roomCode);
    await markQuestionFinished(roomCode);
    broadcastToRoom(roomCode, 'game:result', {
      roomCode,
      questionIndex,
      reason,
      correctAnswer: question.correct_answer,
      scores: getScoreBoard(finishedRoom),
    });
    broadcastToRoom(roomCode, 'game:ended', {
      roomCode,
      finalScores: getScoreBoard(finishedRoom),
      winners: Object.values(finishedRoom.players)
        .sort((left, right) => right.score - left.score)
        .slice(0, 1)
        .map((player) => ({ userId: player.userId, username: player.username, score: player.score })),
    });
    return;
  }

  broadcastToRoom(roomCode, 'game:result', {
    roomCode,
    questionIndex,
    reason,
    correctAnswer: question.correct_answer,
    scores: getScoreBoard(room),
  });

  setTimeout(() => {
    advanceQuestionIndex(roomCode).then(() => {
      void broadcastCurrentQuestion(roomCode);
    }).catch(console.error);
  }, 5000);
};

// register timer handler to resolve question on timeout
registerTimerHandler(async ({ roomCode, questionIndex }) => {
  await resolveQuestion(roomCode, questionIndex, 'timeout');
});

export {
  broadcastCurrentQuestion,
  clearRoomTimer,
  resolveQuestion,
  scheduleQuestionTimeout,
  startGame,
  submitAnswer,
};
