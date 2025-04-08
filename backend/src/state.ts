import { Flashcard, BucketMap, AnswerDifficulty } from "./logic/flashcards";
import { PracticeRecord } from "./types";

// --- Initial Data ---
// Define some sample flashcards
const initialCards: Flashcard[] = [
  // new Flashcard("der Tisch", "the table", "Starts with T", ["noun", "german"]),
  // new Flashcard("la silla", "the chair", "Starts with S", ["noun", "spanish"]),
  // new Flashcard("bonjour", "hello", "Greeting", ["phrase", "french"]),
  // new Flashcard("arigato", "thank you", "Expression of gratitude", [
  //   "phrase",
  //   "japanese",
  // ]),
  // new Flashcard("der Hund", "the dog", "Common pet", ["noun", "german"]),
  // new Flashcard("el gato", "the cat", "Common pet", ["noun", "spanish"]),
];

// --- State Variables ---
// Initialize buckets: Put all initial cards in bucket 0
let currentBuckets: BucketMap = new Map();
const initialCardSet = new Set(initialCards);
currentBuckets.set(0, initialCardSet);

// Initialize practice history
let practiceHistory: PracticeRecord[] = [];

// Current simulation day (can be incremented or managed)
let currentDay: number = 0;

// --- State Accessors and Mutators ---
export const getBuckets = (): BucketMap => currentBuckets;

export const setBuckets = (newBuckets: BucketMap): void => {
  currentBuckets = newBuckets;
};

export const getHistory = (): PracticeRecord[] => practiceHistory;

export const addHistoryRecord = (record: PracticeRecord): void => {
  practiceHistory.push(record);
};

export const getCurrentDay = (): number => currentDay;

export const incrementDay = (): void => {
  currentDay++;
};

// Helper to find a card (assuming front/back are unique identifiers for now)
export const findCard = (
  front: string,
  back: string
): Flashcard | undefined => {
  for (const [, bucketSet] of currentBuckets) {
    for (const card of bucketSet) {
      if (card.front === front && card.back === back) {
        return card;
      }
    }
  }
  // Check initial set too, in case it hasn't been placed yet (edge case)
  return initialCards.find(
    (card) => card.front === front && card.back === back
  );
};

// Helper to find the bucket of a card
export const findCardBucket = (cardToFind: Flashcard): number | undefined => {
  for (const [bucketNum, bucketSet] of currentBuckets) {
    if (bucketSet.has(cardToFind)) {
      return bucketNum;
    }
  }
  return undefined; // Should ideally always be found if state is consistent
};

console.log("Initial State Loaded:", currentBuckets);
