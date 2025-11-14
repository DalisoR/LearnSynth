import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { lessonsAPI } from '@/services/api';
import { Lesson } from '@/types/api';

interface LessonPlayerProps {
  lessonId: string;
}

export default function LessonPlayer({ lessonId }: LessonPlayerProps) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    loadLesson();
  }, [lessonId]);

  const loadLesson = async () => {
    try {
      const data = await lessonsAPI.getOne(lessonId);
      setLesson(data.lesson);
    } catch (error) {
      console.error('Failed to load lesson:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayNarration = async () => {
    if (!lesson?.audio_url) {
      // Generate audio first
      try {
        const data = await lessonsAPI.narrate(lessonId);
        setLesson(data.lesson);
      } catch (error) {
        console.error('Failed to generate audio:', error);
      }
      return;
    }

    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      audioRef.current?.play();
      setPlaying(true);
    }
  };

  const splitTextIntoSegments = (text: string): string[] => {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading lesson...</div>;
  }

  if (!lesson) {
    return <div className="text-center text-gray-500 p-8">Lesson not found</div>;
  }

  const segments = lesson.narration_text ? splitTextIntoSegments(lesson.narration_text) : [];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">{lesson.lesson_title}</h2>
        {lesson.summary && (
          <p className="text-gray-600 mb-4">{lesson.summary}</p>
        )}

        {lesson.narration_text && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Button onClick={handlePlayNarration} className="flex items-center gap-2">
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {lesson.audio_url ? 'Play Narration' : 'Generate Narration'}
              </Button>
              <Volume2 className="w-5 h-5 text-gray-400" />
            </div>
            {lesson.audio_url && (
              <audio
                ref={audioRef}
                onEnded={() => setPlaying(false)}
                className="w-full"
                controls
              />
            )}
          </div>
        )}
      </Card>

      {lesson.key_concepts.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Key Concepts
          </h3>
          <ul className="space-y-2">
            {lesson.key_concepts.map((concept, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  {idx + 1}
                </span>
                <span>{concept}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {lesson.quiz.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Quiz</h3>
          <div className="space-y-6">
            {lesson.quiz.map((question, qIdx) => (
              <div key={qIdx} className="border-b pb-4 last:border-b-0">
                <p className="font-medium mb-3">{qIdx + 1}. {question.question}</p>
                <div className="space-y-2">
                  {question.options.map((option, oIdx) => (
                    <div
                      key={oIdx}
                      className={`p-2 rounded border ${
                        oIdx === question.correct_index
                          ? 'bg-green-50 border-green-300'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      {option}
                    </div>
                  ))}
                </div>
                {question.explanation && (
                  <p className="text-sm text-gray-600 mt-2 italic">
                    {question.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {lesson.flashcards.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Flashcards</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {lesson.flashcards.map((card, idx) => (
              <div key={idx} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="mb-2 text-sm text-gray-500">Card {idx + 1}</div>
                <div className="font-medium mb-2">{card.front}</div>
                <div className="text-gray-600">{card.back}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
