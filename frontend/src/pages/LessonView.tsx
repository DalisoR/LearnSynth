import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Image, Brain, CheckCircle, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { enhancedLessonsAPI } from '@/services/api';
import { toast } from 'sonner';

interface EnhancedLesson {
  id: string;
  title: string;
  content: {
    core: string;
    intermediate: string;
    advanced: string;
  };
  learningObjectives?: {
    primary: string[];
    secondary: string[];
    extended: string[];
  };
  visualContent?: any[];
  topics?: any[];
  estimatedTime?: number;
}

export default function LessonView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<EnhancedLesson | null>(null);
  const [contentLevel, setContentLevel] = useState<'core' | 'intermediate' | 'advanced'>('intermediate');
  const [currentTopic, setCurrentTopic] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    if (id) {
      loadLesson();
    }
  }, [id]);

  const loadLesson = async () => {
    try {
      setLoading(true);
      const data = await enhancedLessonsAPI.getLesson(id!);
      setLesson(data.lesson);
    } catch (error) {
      console.error('Failed to load lesson:', error);
      toast.error('Failed to load lesson');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-lg">Lesson not found</p>
          <Button onClick={() => navigate('/books')} className="mt-4">
            Back to Books
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('/books')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">{lesson.title}</h1>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">
              <BookOpen className="w-3 h-3 mr-1" />
              {lesson.estimatedTime || 20} min
            </Badge>
            <Badge variant="outline">
              <Brain className="w-3 h-3 mr-1" />
              Interactive
            </Badge>
          </div>
        </div>
      </div>

      {/* Content Level Toggle */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-1">Content Level</h3>
            <p className="text-sm text-gray-600">
              Choose your preferred depth of learning
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={contentLevel === 'core' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setContentLevel('core')}
            >
              Quick Read
            </Button>
            <Button
              variant={contentLevel === 'intermediate' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setContentLevel('intermediate')}
            >
              Standard
            </Button>
            <Button
              variant={contentLevel === 'advanced' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setContentLevel('advanced')}
            >
              Deep Dive
            </Button>
          </div>
        </div>
      </Card>

      {/* Learning Objectives */}
      {lesson.learningObjectives && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Learning Objectives</h2>
          <div className="space-y-4">
            {lesson.learningObjectives.primary.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-700 mb-2">Must Know</h4>
                <ul className="list-disc list-inside space-y-1">
                  {lesson.learningObjectives.primary.map((obj, i) => (
                    <li key={i} className="text-sm">{obj}</li>
                  ))}
                </ul>
              </div>
            )}
            {lesson.learningObjectives.secondary.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-blue-700 mb-2">Should Know</h4>
                <ul className="list-disc list-inside space-y-1">
                  {lesson.learningObjectives.secondary.map((obj, i) => (
                    <li key={i} className="text-sm">{obj}</li>
                  ))}
                </ul>
              </div>
            )}
            {lesson.learningObjectives.extended.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-purple-700 mb-2">Could Know</h4>
                <ul className="list-disc list-inside space-y-1">
                  {lesson.learningObjectives.extended.map((obj, i) => (
                    <li key={i} className="text-sm">{obj}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Lesson Content */}
      <Card className="p-8 mb-6">
        <div className="prose prose-slate max-w-none">
          <div className="whitespace-pre-wrap">
            {lesson.content[contentLevel]}
          </div>
        </div>

        {/* Visual Content Placeholder */}
        {lesson.visualContent && lesson.visualContent.length > 0 && (
          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="flex items-center gap-2 font-semibold mb-4">
              <Image className="w-5 h-5" />
              Visual Aids
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {lesson.visualContent.slice(0, 4).map((visual: any, i: number) => (
                <div key={i} className="border rounded p-4 bg-white">
                  <img
                    src={visual.url || `https://via.placeholder.com/400x300?text=Visual ${i + 1}`}
                    alt={visual.altText || `Visual ${i + 1}`}
                    className="w-full rounded"
                  />
                  {visual.caption && (
                    <p className="text-xs text-gray-600 mt-2">{visual.caption}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Checkpoints */}
      <Card className="p-6 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Check Your Understanding
        </h3>
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <p className="font-medium mb-2">Quick Check: What is the main concept of this lesson?</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="radio" name="check1" />
                <span className="text-sm">Option A</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="check1" />
                <span className="text-sm">Option B</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="check1" />
                <span className="text-sm">Option C</span>
              </label>
            </div>
            <Button size="sm" className="mt-3">Check Answer</Button>
          </div>

          <div className="p-4 border rounded-lg bg-blue-50">
            <p className="font-medium mb-2">💡 Reflection Prompt</p>
            <p className="text-sm text-gray-700 mb-3">
              How does this concept relate to what you already know?
            </p>
            <textarea
              className="w-full p-2 border rounded text-sm"
              rows={3}
              placeholder="Write your reflection here..."
            />
            <Button size="sm" variant="outline" className="mt-2">
              Save Reflection
            </Button>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" onClick={() => navigate('/books')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Library
        </Button>

        <div className="flex gap-2">
          <Button variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Restart Lesson
          </Button>
          <Button onClick={() => setShowQuiz(true)} className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            Take Final Quiz
          </Button>
        </div>
      </div>

      {/* Quiz Modal (Simplified) */}
      {showQuiz && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <Card className="max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Final Assessment</h2>
            <p className="text-gray-600 mb-6">
              Test your understanding of the key concepts covered in this lesson.
            </p>

            <div className="space-y-6">
              <div>
                <p className="font-medium mb-3">1. What is the most important concept in this lesson?</p>
                <div className="space-y-2">
                  {['Option A', 'Option B', 'Option C', 'Option D'].map((opt, i) => (
                    <label key={i} className="flex items-center gap-2">
                      <input type="radio" name="q1" />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-medium mb-3">2. Explain the relationship between the key concepts.</p>
                <textarea
                  className="w-full p-3 border rounded"
                  rows={4}
                  placeholder="Write your answer here..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowQuiz(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setShowQuiz(false);
                toast.success('Quiz submitted! Check your results in the dashboard.');
              }}>
                Submit Quiz
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
