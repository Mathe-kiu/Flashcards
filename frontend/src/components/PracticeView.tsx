import { useState, useEffect } from "react";
import { Flashcard, AnswerDifficulty } from "../types";
import {
  fetchPracticeCards,
  submitAnswer,
  advanceDay,
  fetchHint,
} from "../services/api";

const PracticeView = () => {
  const [practiceCards, setPracticeCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [showBack, setShowBack] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [day, setDay] = useState<number>(0);
  const [sessionFinished, setSessionFinished] = useState<boolean>(false);

  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);

  const loadPracticeCards = async () => {
    setIsLoading(true);
    setError(null);
    setSessionFinished(false);
    setCurrentCardIndex(0);
    setShowBack(false);
    try {
      const session = await fetchPracticeCards();
      setPracticeCards(session.cards);
      setDay(session.day);
      if (session.cards.length === 0) {
        setSessionFinished(true); // No cards to practice today
      }
    } catch (err) {
      console.error("Failed to fetch practice cards:", err);
      setError("Could not load cards. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPracticeCards();
  }, []); // Load cards on component mount

  const handleShowBack = () => {
    setShowBack(true);
  };

  const handleAnswer = async (difficulty: AnswerDifficulty) => {
    if (currentCardIndex >= practiceCards.length) return;

    const currentCard = practiceCards[currentCardIndex];
    try {
      await submitAnswer(currentCard.front, currentCard.back, difficulty);
      // Move to the next card
      const nextIndex = currentCardIndex + 1;
      if (nextIndex < practiceCards.length) {
        setCurrentCardIndex(nextIndex);
        setHint(null);
        setShowBack(false); // Hide back for the new card
      } else {
        // Finished practicing all cards for this session
        setSessionFinished(true);
        console.log("Practice session finished for Day", day);
      }
    } catch (err) {
      console.error("Failed to submit answer:", err);
      setError("Failed to save progress. Please try again.");
    }
  };

  const handleNextDay = async () => {
    try {
      const { currentDay } = await advanceDay();
      setDay(currentDay);
      // Reload cards for the new day
      await loadPracticeCards();
    } catch (err) {
      console.error("Failed to advance day:", err);
      setError("Could not advance to the next day.");
    }
  };

  if (isLoading) {
    return <div className="loading">Loading practice cards...</div>;
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  if (sessionFinished) {
    return (
      <div className="session-finished">
        <div className="day-counter">Day {day}</div>
        <p>No more cards to practice today!</p>
        <button className="btn btn-primary" onClick={handleNextDay}>
          Go to Next Day
        </button>
      </div>
    );
  }

  const currentCard = practiceCards[currentCardIndex];

  const handleGetHint = async () => {
    if (!currentCard) return;
    setLoadingHint(true);
    setHintError(null);
    setHint(null);
    try {
      const fetchedHint = await fetchHint(currentCard);
      setHint(fetchedHint);
    } catch (err) {
      console.error("Failed to fetch hint:", err);
      setHintError("Could not load hint.");
    } finally {
      setLoadingHint(false);
    }
  };

  return (
    <div className="practice-container">
      <div className="day-counter">Day {day}</div>
      <p className="card-counter">
        Card {currentCardIndex + 1} of {practiceCards.length}
      </p>
      {currentCard ? (
        <div className={`flashcard ${showBack ? "flashcard-back" : ""}`}>
          {showBack ? currentCard.back : currentCard.front}
        </div>
      ) : (
        <p>Something went wrong, no card to display.</p>
      )}

      {!showBack && (
        <div style={{ marginTop: "15px" }}>
          <button onClick={handleGetHint} disabled={loadingHint}>
            {loadingHint ? "Loading Hint..." : "Get Hint"}
          </button>
          {hint && (
            <p style={{ color: "gray", fontStyle: "italic" }}>Hint: {hint}</p>
          )}
          {hintError && <p style={{ color: "red" }}>{hintError}</p>}
        </div>
      )}

      {!showBack ? (
        <button className="btn btn-primary" onClick={handleShowBack}>
          Show Answer
        </button>
      ) : (
        <div>
          <p className="difficulty-text">How difficult was this card?</p>
          <div>
            <button
              className="btn btn-wrong"
              onClick={() => handleAnswer(AnswerDifficulty.Wrong)}
            >
              Wrong
            </button>
            <button
              className="btn btn-hard"
              onClick={() => handleAnswer(AnswerDifficulty.Hard)}
            >
              Hard
            </button>
            <button
              className="btn btn-easy"
              onClick={() => handleAnswer(AnswerDifficulty.Easy)}
            >
              Easy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeView;
