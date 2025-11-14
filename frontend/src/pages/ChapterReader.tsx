import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { ChevronLeft, ChevronRight, BookOpen, Award, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Chapter {
  id: string;
  title: string;
  content: string;
  chapterNumber: number;
  difficulty: string;
  estimatedReadTime: number;
  keyTopics: string[];
  summary: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  userProgress: number;
}

interface Navigation {
  current: Chapter | null;
  next: Chapter | null;
  previous: Chapter | null;
  total: number;
  position: number;
}

const ChapterReader: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [navigation, setNavigation] = useState<Navigation | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (chapterId && user) {
      fetchChapter();
      fetchNavigation();
    }
  }, [chapterId, user]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      setProgress(Math.min(scrollPercent, 100));

      // Auto-update progress every 10%
      if (Math.floor(scrollPercent / 10) > Math.floor(progress / 10) && scrollPercent > 10) {
        updateProgress(Math.floor(scrollPercent / 10) * 10);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [progress]);

  const fetchChapter = async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/learning/chapter/${chapterId}?userId=${user?.id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();
      if (data.success) {
        setChapter(data.chapter);
        setProgress(data.chapter.userProgress);
      }
    } catch (error) {
      console.error('Error fetching chapter:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNavigation = async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/learning/navigation/${chapterId}?userId=${user?.id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();
      if (data.success) {
        setNavigation(data.navigation);
      }
    } catch (error) {
      console.error('Error fetching navigation:', error);
    }
  };

  const updateProgress = async (progressPercent: number) => {
    try {
      await fetch('http://localhost:4000/api/learning/progress/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: user?.id,
          chapterId,
          progressPercent
        })
      });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const generateQuiz = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/learning/quiz/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          chapterId,
          questionCount: 10,
          adaptive: true
        })
      });
      const data = await response.json();
      if (data.success) {
        navigate(`/learning/quiz/${chapterId}`, { state: { quiz: data.quiz } });
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading chapter...</div>
      </div>
    );
  }

  if (!chapter || !navigation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Chapter not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Bar */}
      <div className="sticky top-0 z-10 bg-white border-b">
        <div className="container mx-auto px-4 py-2">
          <Progress value={progress} className="w-full" />
          <div className="text-xs text-gray-600 mt-1 text-center">
            {progress.toFixed(0)}% complete
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => navigation.previous && navigate(`/learning/chapter/${navigation.previous.id}`)}
            disabled={!navigation.previous}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="text-center">
            <div className="text-sm text-gray-600">
              Chapter {navigation.position} of {navigation.total}
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => navigation.next && navigate(`/learning/chapter/${navigation.next.id}`)}
            disabled={!navigation.next}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Chapter Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl mb-2">{chapter.title}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge className={getDifficultyColor(chapter.difficulty)}>
                    {chapter.difficulty}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    <Clock className="inline w-4 h-4 mr-1" />
                    {chapter.estimatedReadTime} min read
                  </span>
                  {chapter.isCompleted && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="inline w-4 h-4 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
              </div>
              <BookOpen className="w-12 h-12 text-blue-600" />
            </div>
          </CardHeader>
        </Card>

        {/* Chapter Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{chapter.summary}</p>
          </CardContent>
        </Card>

        {/* Key Topics */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Key Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {chapter.keyTopics.map((topic, index) => (
                <Badge key={index} variant="secondary">
                  {topic}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chapter Content */}
        <Card>
          <CardContent className="pt-6">
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: chapter.content.replace(/\n/g, '<br />') }}
            />
          </CardContent>
        </Card>

        {/* Quiz Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="w-5 h-5 mr-2" />
              Test Your Knowledge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              Take a quiz to test your understanding and unlock the next chapter.
            </p>
            <Button onClick={generateQuiz} className="w-full">
              Generate Quiz
            </Button>
          </CardContent>
        </Card>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => navigation.previous && navigate(`/learning/chapter/${navigation.previous.id}`)}
            disabled={!navigation.previous}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous Chapter
          </Button>

          <Button
            onClick={() => navigate(`/learning/dashboard/${chapterId.split('-')[0]}`)}
            variant="outline"
          >
            Back to Dashboard
          </Button>

          <Button
            onClick={() => navigation.next && navigate(`/learning/chapter/${navigation.next.id}`)}
            disabled={!navigation.next}
          >
            Next Chapter
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChapterReader;