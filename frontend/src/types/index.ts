// Define types to match backend structures

export interface Flashcard {
  readonly front: string;
  readonly back: string;
  readonly hint?: string;
  readonly tags: ReadonlyArray<string>;
}

export enum AnswerDifficulty {
  Wrong = 0,
  Hard = 1,
  Easy = 2,
}

export interface PracticeSession {
  cards: Flashcard[];
  day: number;
}

export interface UpdateRequest {
  cardFront: string;
  cardBack: string;
  difficulty: AnswerDifficulty;
}

export interface ProgressStats {
  totalCards: number;
  cardsByBucket: Record<number, number>;
  successRate: number;
  averageMovesPerCard: number;
  totalPracticeEvents: number;
}
