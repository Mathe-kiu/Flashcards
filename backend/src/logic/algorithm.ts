import { Flashcard, AnswerDifficulty, BucketMap } from "./flashcards";
import { PracticeRecord, ProgressStats } from "../types";

/**
 * Converts a BucketMap into an array of Sets, where the index is the bucket number
 */
export function toBucketSets(buckets: BucketMap): Array<Set<Flashcard>> {
  const result: Array<Set<Flashcard>> = [];
  // Find the highest bucket number
  let maxBucket = 0;
  for (const bucketNum of buckets.keys()) {
    maxBucket = Math.max(maxBucket, bucketNum);
  }

  // Initialize array with empty sets
  for (let i = 0; i <= maxBucket; i++) {
    result.push(new Set<Flashcard>());
  }

  // Fill in the sets from the map
  for (const [bucketNum, cards] of buckets.entries()) {
    result[bucketNum] = cards;
  }

  return result;
}

/**
 * Determines which cards should be practiced on a given day,
 * based on the Leitner system.
 */
export function practice(
  buckets: Array<Set<Flashcard>>,
  day: number
): Set<Flashcard> {
  const result = new Set<Flashcard>();

  // Always practice cards from bucket 0
  if (buckets[0]) {
    for (const card of buckets[0]) {
      result.add(card);
    }
  }

  // For other buckets, practice on days divisible by 2^(bucket number)
  for (let bucketNum = 1; bucketNum < buckets.length; bucketNum++) {
    const interval = Math.pow(2, bucketNum);
    if (day % interval === 0 && buckets[bucketNum]) {
      for (const card of buckets[bucketNum]) {
        result.add(card);
      }
    }
  }

  return result;
}

/**
 * Updates the buckets based on the answer difficulty
 */
export function update(
  buckets: BucketMap,
  card: Flashcard,
  difficulty: AnswerDifficulty
): BucketMap {
  // Create a deep copy of the buckets map
  const newBuckets = new Map<number, Set<Flashcard>>();

  // Find which bucket currently contains the card
  let currentBucket = -1;
  for (const [bucketNum, cards] of buckets.entries()) {
    const newSet = new Set<Flashcard>(cards);
    newBuckets.set(bucketNum, newSet);

    if (cards.has(card)) {
      currentBucket = bucketNum;
    }
  }

  // If card wasn't found in any bucket, add bucket 0
  if (currentBucket === -1 && !newBuckets.has(0)) {
    newBuckets.set(0, new Set<Flashcard>());
  }

  // Remove card from current bucket
  if (currentBucket !== -1) {
    const currentSet = newBuckets.get(currentBucket)!;
    currentSet.delete(card);
  }

  // Calculate new bucket
  let newBucket: number;
  if (difficulty === AnswerDifficulty.Wrong) {
    newBucket = 0; // Answered wrong, go back to bucket 0
  } else if (difficulty === AnswerDifficulty.Hard) {
    newBucket = currentBucket; // Hard, stay in the same bucket
  } else {
    // Easy, move to the next bucket
    newBucket = currentBucket + 1;
  }

  // Ensure the new bucket exists
  if (!newBuckets.has(newBucket)) {
    newBuckets.set(newBucket, new Set<Flashcard>());
  }

  // Add card to its new bucket
  newBuckets.get(newBucket)!.add(card);

  return newBuckets;
}

/**
 * Retrieves a hint for a flashcard
 */
export function getHint(card: Flashcard): string {
  if (card.hint) {
    return card.hint;
  }
  return "No hint available for this card.";
}

/**
 * Computes progress statistics based on current buckets and history
 */
export function computeProgress(
  buckets: BucketMap,
  history: PracticeRecord[]
): ProgressStats {
  // Count total cards across all buckets
  let totalCards = 0;
  const cardsByBucket: Record<number, number> = {};

  for (const [bucketNum, cards] of buckets.entries()) {
    totalCards += cards.size;
    cardsByBucket[bucketNum] = cards.size;
  }

  // Initialize buckets not present in the map
  for (
    let i = 0;
    i <= Math.max(...Object.keys(cardsByBucket).map(Number), 0);
    i++
  ) {
    if (!(i in cardsByBucket)) {
      cardsByBucket[i] = 0;
    }
  }

  // Calculate success rate from history
  let totalAnswers = history.length;
  let correctAnswers = history.filter(
    (record) =>
      record.difficulty === AnswerDifficulty.Easy ||
      record.difficulty === AnswerDifficulty.Hard
  ).length;

  const successRate =
    totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

  // Calculate average moves per card
  const cardMoves: Record<string, number> = {};
  for (const record of history) {
    const cardKey = `${record.cardFront}:${record.cardBack}`;
    if (!(cardKey in cardMoves)) {
      cardMoves[cardKey] = 0;
    }
    cardMoves[cardKey]++;
  }

  const averageMovesPerCard =
    Object.keys(cardMoves).length > 0
      ? Object.values(cardMoves).reduce((sum, moves) => sum + moves, 0) /
        Object.keys(cardMoves).length
      : 0;

  return {
    totalCards,
    cardsByBucket,
    successRate,
    averageMovesPerCard,
    totalPracticeEvents: totalAnswers,
  };
}
