import { Flashcard, AnswerDifficulty, BucketMap } from "../logic/flashcards";

// API response for practice session
export interface PracticeSession {
  cards: Flashcard[];
  day: number;
}

// Request structure for updating a card
export interface UpdateRequest {
  cardFront: string;
  cardBack: string;
  difficulty: AnswerDifficulty;
}

// Request structure for getting a hint
export interface HintRequest {
  cardFront: string;
  cardBack: string;
}

// Structure for progress statistics
export interface ProgressStats {
  totalCards: number;
  cardsByBucket: Record<number, number>;
  successRate: number;
  averageMovesPerCard: number;
  totalPracticeEvents: number;
}

// Structure for practice history record
export interface PracticeRecord {
  cardFront: string;
  cardBack: string;
  timestamp: number;
  difficulty: AnswerDifficulty;
  previousBucket: number;
  newBucket: number;
}

// Re-export core types for convenience
export { Flashcard, AnswerDifficulty, BucketMap };
