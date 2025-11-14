import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { srsAPI } from '@/services/api';
import { SRSItem } from '@/types/api';

export default function StudyPlanner() {
  const [dueItems, setDueItems] = useState<SRSItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDueItems();
  }, []);

  const loadDueItems = async () => {
    try {
      const data = await srsAPI.getDue();
      setDueItems(data.items || []);
    } catch (error) {
      console.error('Failed to load due items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (quality: number) => {
    if (currentIndex >= dueItems.length) return;

    try {
      await srsAPI.submitReview(dueItems[currentIndex].id, quality);

      if (currentIndex < dueItems.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      } else {
        // Finished all items
        setCurrentIndex(0);
        setDueItems([]);
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('Failed to submit review. Please try again.');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  if (dueItems.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="p-8 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-2xl font-bold mb-2">All Caught Up!</h2>
          <p className="text-gray-600">No items due for review right now.</p>
        </Card>
      </div>
    );
  }

  const currentItem = dueItems[currentIndex];
  const progress = ((currentIndex + 1) / dueItems.length) * 100;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Study Session</h1>
          <span className="text-sm text-gray-600">
            {currentIndex + 1} of {dueItems.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Card className="p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">{currentItem.lessons.lesson_title}</h2>

          {currentItem.lessons.flashcards.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              {!showAnswer ? (
                <div>
                  <p className="font-medium text-lg mb-4">
                    {currentItem.lessons.flashcards[0].front}
                  </p>
                  <Button onClick={() => setShowAnswer(true)}>
                    Show Answer
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="font-medium mb-2">Question:</p>
                  <p className="mb-4">{currentItem.lessons.flashcards[0].front}</p>
                  <p className="font-medium mb-2">Answer:</p>
                  <p className="mb-6">{currentItem.lessons.flashcards[0].back}</p>

                  <div>
                    <p className="text-sm text-gray-600 mb-3">How well did you know this?</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleReview(1)}
                        className="flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Again
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleReview(3)}
                      >
                        Hard
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleReview(5)}
                        className="flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Easy
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {showAnswer && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowAnswer(false)}
            >
              Back
            </Button>
          </div>
        )}
      </Card>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Spaced Repetition Schedule</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Ease Factor</p>
            <p className="font-medium">{currentItem.ease_factor.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-600">Interval</p>
            <p className="font-medium">{currentItem.interval} days</p>
          </div>
          <div>
            <p className="text-gray-600">Next Review</p>
            <p className="font-medium">
              {new Date(currentItem.next_review).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
