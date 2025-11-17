import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import flashcardsService, { FlashcardData, StudyQueue } from '../services/api/flashcards';

const FlashcardStudy: React.FC = () => {
  const { user } = useAuth();
  const [studyQueue, setStudyQueue] = useState<StudyQueue | null>(null);
  const [currentCard, setCurrentCard] = useState<FlashcardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [cardsCorrect, setCardsCorrect] = useState(0);

  useEffect(() => {
    if (user?.id) {
      initializeStudySession();
    }
  }, [user?.id]);

  const initializeStudySession = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Start a new study session
      const sessionData = await flashcardsService.startSession({
        sessionType: 'mixed',
      });
      setSessionId(sessionData.session.id);
      setStartTime(Date.now());

      // Get study queue
      const queue = await flashcardsService.getStudyQueue();
      setStudyQueue(queue);

      // Set first card
      if (queue.dueCards.length > 0) {
        setCurrentCard(queue.dueCards[0]);
      } else if (queue.newCards.length > 0) {
        setCurrentCard(queue.newCards[0]);
      } else {
        setCurrentCard(null);
      }
    } catch (err: any) {
      console.error('Failed to initialize study session:', err);
      setError('Failed to load study queue');
    } finally {
      setIsLoading(false);
    }
  };

  const submitReview = async (quality: number) => {
    if (!currentCard || !sessionId) return;

    const responseTime = Date.now() - startTime;

    try {
      await flashcardsService.submitReview({
        flashcardId: currentCard.id,
        sessionId,
        quality,
        responseTime,
        reviewType: currentCard.flashcard_spaced_repetition?.review_count === 0 ? 'new' : 'review',
      });

      // Update stats
      setCardsReviewed(prev => prev + 1);
      if (quality >= 3) {
        setCardsCorrect(prev => prev + 1);
      }

      // Move to next card
      moveToNextCard();
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      setError('Failed to submit review');
    }
  };

  const moveToNextCard = () => {
    if (!studyQueue) return;

    setShowAnswer(false);

    // Remove current card from queue
    const updatedQueue = { ...studyQueue };
    if (currentCard) {
      if (currentCard.flashcard_spaced_repetition?.review_count === 0) {
        updatedQueue.newCards = updatedQueue.newCards.filter(c => c.id !== currentCard.id);
      } else {
        updatedQueue.dueCards = updatedQueue.dueCards.filter(c => c.id !== currentCard.id);
      }
    }

    setStudyQueue(updatedQueue);

    // Get next card
    const nextCard = updatedQueue.dueCards.length > 0
      ? updatedQueue.dueCards[0]
      : updatedQueue.newCards[0];

    if (nextCard) {
      setCurrentCard(nextCard);
      setStartTime(Date.now());
    } else {
      // Session complete
      endSession();
    }
  };

  const endSession = async () => {
    if (!sessionId) return;

    try {
      await flashcardsService.endSession(sessionId, {
        cardsReviewed,
        cardsCorrect,
        totalResponseTime: Date.now() - startTime,
      });
    } catch (err: any) {
      console.error('Failed to end session:', err);
    }

    setCurrentCard(null);
    setSessionId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={initializeStudySession}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Complete!</h2>
          <p className="text-gray-600 mb-6">
            Great work! You've reviewed all available cards.
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{cardsReviewed}</div>
              <div className="text-sm text-gray-600">Cards Reviewed</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {Math.round((cardsCorrect / Math.max(cardsReviewed, 1)) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Accuracy</div>
            </div>
          </div>
          <button
            onClick={initializeStudySession}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Start New Session
          </button>
        </div>
      </div>
    );
  }

  const isNewCard = currentCard.flashcard_spaced_repetition?.review_count === 0;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flashcard Study</h1>
          <p className="text-gray-600">
            {cardsReviewed} reviewed • {cardsCorrect} correct
          </p>
        </div>
        <div className="flex items-center gap-4">
          {isNewCard && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              🆕 New Card
            </span>
          )}
          <span className="text-sm text-gray-600">
            {studyQueue?.totalCount} cards remaining
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{
            width: `${((cardsReviewed) / (cardsReviewed + (studyQueue?.totalCount || 0))) * 100}%`,
          }}
        />
      </div>

      {/* Flashcard */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6 min-h-[400px] flex flex-col justify-center">
        <div className="text-center">
          {/* Image Occlusion Display */}
          {currentCard.occlusion_data && (
            <div className="mb-6">
              <img
                src={currentCard.occlusion_data.maskedImageUrl}
                alt="Occluded"
                className="max-w-full h-auto rounded-lg mx-auto"
              />
              {currentCard.occlusion_data.totalOcclusions > 1 && (
                <p className="text-sm text-gray-600 mt-2">
                  Click on the hidden areas to reveal the answers
                </p>
              )}
            </div>
          )}

          {/* Card Content */}
          {!showAnswer ? (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {currentCard.front}
              </h2>
              {currentCard.tags && currentCard.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {currentCard.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-2">Answer:</p>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {currentCard.back}
              </h2>

              {/* Difficulty Rating */}
              {currentCard.flashcard_spaced_repetition && (
                <div className="mt-4 text-sm text-gray-600">
                  <p>
                    Next review: {flashcardsService.formatInterval(
                      currentCard.flashcard_spaced_repetition.interval_days
                    )}
                  </p>
                  <p>
                    Repetitions: {currentCard.flashcard_spaced_repetition.repetitions}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        {!showAnswer ? (
          <button
            onClick={() => setShowAnswer(true)}
            className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold"
          >
            Show Answer
          </button>
        ) : (
          <div className="grid grid-cols-5 gap-2 max-w-2xl">
            <QualityButton
              quality={0}
              label="Again"
              color="red"
              onClick={() => submitReview(0)}
            />
            <QualityButton
              quality={2}
              label="Hard"
              color="orange"
              onClick={() => submitReview(2)}
            />
            <QualityButton
              quality={3}
              label="Good"
              color="yellow"
              onClick={() => submitReview(3)}
            />
            <QualityButton
              quality={4}
              label="Easy"
              color="blue"
              onClick={() => submitReview(4)}
            />
            <QualityButton
              quality={5}
              label="Perfect"
              color="green"
              onClick={() => submitReview(5)}
            />
          </div>
        )}
      </div>

      {/* Help Text */}
      {!showAnswer && (
        <p className="text-center text-sm text-gray-500 mt-4">
          Think about the answer, then click "Show Answer"
        </p>
      )}
    </div>
  );
};

// Quality Button Component
interface QualityButtonProps {
  quality: number;
  label: string;
  color: string;
  onClick: () => void;
}

const QualityButton: React.FC<QualityButtonProps> = ({ quality, label, color, onClick }) => {
  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-700',
    orange: 'bg-orange-600 hover:bg-orange-700',
    yellow: 'bg-yellow-600 hover:bg-yellow-700 text-gray-900',
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 ${colorClasses[color as keyof typeof colorClasses]} text-white rounded-lg font-semibold transition-colors`}
    >
      <div className="text-sm font-bold">{label}</div>
      <div className="text-xs opacity-90">{quality}</div>
    </button>
  );
};

export default FlashcardStudy;
