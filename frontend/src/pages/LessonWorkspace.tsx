import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen,
  ChevronRight,
  Loader2,
  MessageCircle,
  Trophy,
  TrendingUp,
  Award,
  Zap,
  Target,
  Brain,
  BarChart3,
  Clock,
  Flame,
  Star,
  HelpCircle,
  CheckCircle2,
  Sparkles,
  Users,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { contentFormatter, EmbeddedContent } from '@/services/contentFormatter';

interface Chapter {
  id: string;
  title: string;
  content: string;
  chapterNumber: number;
  difficulty: string;
  summary: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Achievement {
  id: string;
  badgeId: string;
  name: string;
  icon: string;
  description: string;
  earnedAt: Date;
}

interface StudyStreak {
  currentStreak: number;
  longestStreak: number;
}

interface LearningInsight {
  type: 'strength' | 'weakness' | 'recommendation' | 'prediction';
  title: string;
  description: string;
  confidence: number;
}

const LessonWorkspace: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [enhancedLesson, setEnhancedLesson] = useState<any>(null);
  const [teachingStyle, setTeachingStyle] = useState<'socratic' | 'direct' | 'constructivist' | 'encouraging'>('direct');
  const [loading, setLoading] = useState(true);
  const [generatingLesson, setGeneratingLesson] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [embeddedContent, setEmbeddedContent] = useState<EmbeddedContent[]>([]);

  // AI Tutor Chat State
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Gamification State
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [studyStreak, setStudyStreak] = useState<StudyStreak>({ currentStreak: 0, longestStreak: 0 });
  const [totalPoints, setTotalPoints] = useState(0);
  const [showAchievement, setShowAchievement] = useState<Achievement | null>(null);

  // Analytics State
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [studySession, setStudySession] = useState<{ startTime: Date; messages: number }>({
    startTime: new Date(),
    messages: 0
  });

  useEffect(() => {
    if (documentId && user) {
      fetchChapters();
      loadUserStats();
    }
  }, [documentId, user]);

  useEffect(() => {
    // Show achievement notification
    if (showAchievement) {
      const timer = setTimeout(() => setShowAchievement(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [showAchievement]);

  const fetchChapters = async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/documents/${documentId}/chapters`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();
      if (data.chapters) {
        const transformedChapters = data.chapters.map((chapter: any) => ({
          id: chapter.id,
          title: chapter.title,
          content: chapter.content,
          chapterNumber: chapter.chapter_number,
          difficulty: 'intermediate',
          summary: chapter.content.substring(0, 200) + '...'
        }));
        setChapters(transformedChapters);
        if (transformedChapters.length > 0) {
          handleChapterSelect(transformedChapters[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      // Load achievements
      const achievementResponse = await fetch(
        `http://localhost:4000/api/gamification/achievements?userId=${user?.id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      if (achievementResponse.ok) {
        const achievementData = await achievementResponse.json();
        setAchievements(achievementData.achievements || []);
      }

      // Load streak
      const streakResponse = await fetch(
        `http://localhost:4000/api/gamification/streak?userId=${user?.id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      if (streakResponse.ok) {
        const streakData = await streakResponse.json();
        setStudyStreak(streakData);
      }

      // Load analytics
      const analyticsResponse = await fetch(
        `http://localhost:4000/api/learning/analytics/${documentId}?userId=${user?.id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setInsights(analyticsData.insights || []);
        setRecommendations(analyticsData.recommendations || []);
      }

      // Update streak
      await fetch('http://localhost:4000/api/gamification/update-streak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId: user?.id })
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const handleChapterSelect = async (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setGeneratingLesson(true);
    setShowQuiz(false);
    setEmbeddedContent([]);
    setEnhancedLesson(null);

    try {
      console.log(`🎓 Loading AI-enhanced lesson with ${teachingStyle} style...`);

      // Get AI-enhanced lesson
      const response = await fetch(
        `http://localhost:4000/api/learning/enhanced-chapter/${chapter.id}?userId=${user?.id}&teachingStyle=${teachingStyle}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const data = await response.json();

      if (data.success && data.enhancedLesson) {
        setEnhancedLesson(data.enhancedLesson);

        // Create embedded content from the enhanced lesson's sections
        const embedded: EmbeddedContent[] = [];
        const originalContent = data.originalChapter.content;

        // Add contextual quizzes from the enhanced lesson's quickQuiz
        if (data.enhancedLesson.quickQuiz && data.enhancedLesson.quickQuiz.length > 0) {
          const quizPositions = contentFormatter.generateQuizInsertionPoints(originalContent);
          data.enhancedLesson.quickQuiz.forEach((quiz: any, index: number) => {
            if (index < quizPositions.length) {
              embedded.push({
                type: 'quiz',
                position: quizPositions[index],
                data: {
                  question: quiz.question,
                  options: quiz.options,
                  correctAnswer: quiz.correctAnswer,
                  explanation: quiz.explanation
                }
              });
            }
          });
        }

        // Generate images
        const imagePositions = contentFormatter.generateImageInsertionPoints(originalContent);
        imagePositions.forEach((pos, index) => {
          embedded.push({
            type: 'image',
            position: pos,
            data: {
              url: `https://via.placeholder.com/800x400/4f46e5/ffffff?text=Visual+Concept+${index + 1}`,
              title: `Visual Concept ${index + 1}`,
              caption: `Visual representation of key concepts`
            }
          });
        });

        setEmbeddedContent(embedded);

        // ⭐ DISPLAY ENHANCED CONTENT (not original!)
        // This is the key change - we use the enhanced sections, not the original content
        if (data.enhancedLesson.enhancedSections && data.enhancedLesson.enhancedSections.length > 0) {
          const formattedContent = contentFormatter.formatEnhancedContent(
            data.enhancedLesson.enhancedSections,
            embedded
          );
          setSelectedChapter({ ...chapter, content: formattedContent });
        } else {
          // Fallback to original content if no enhanced sections
          const formattedContent = contentFormatter.formatContent(originalContent, embedded);
          setSelectedChapter({ ...chapter, content: formattedContent });
        }
      } else {
        // Fallback to original content
        const embedded: EmbeddedContent[] = [];
        const imagePositions = contentFormatter.generateImageInsertionPoints(chapter.content);
        imagePositions.forEach((pos, index) => {
          embedded.push({
            type: 'image',
            position: pos,
            data: {
              url: `https://via.placeholder.com/800x400/4f46e5/ffffff?text=Visual+Concept+${index + 1}`,
              title: `Visual Concept ${index + 1}`,
              caption: `Visual representation`
            }
          });
        });
        setEmbeddedContent(embedded);
        const formattedContent = contentFormatter.formatContent(chapter.content, embedded);
        setSelectedChapter({ ...chapter, content: formattedContent });
      }

      // Start study session
      await fetch('http://localhost:4000/api/learning/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId: user?.id, chapterId: chapter.id })
      });
    } catch (error) {
      console.error('Error loading enhanced chapter:', error);
      // Fallback to basic chapter content
      const embedded: EmbeddedContent[] = [];
      const formattedContent = contentFormatter.formatContent(chapter.content, embedded);
      setSelectedChapter({ ...chapter, content: formattedContent });
    } finally {
      setGeneratingLesson(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedChapter) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('http://localhost:4000/api/learning/ask-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          question: chatInput,
          chapterId: selectedChapter.id,
          userId: user?.id
        })
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: data.message.content,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setChatLoading(false);
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-indigo-600" />
          <div className="text-xl font-semibold text-gray-800">Loading Your Classroom...</div>
          <div className="text-sm text-gray-600 mt-2">Preparing your personalized learning experience</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Achievement Notification */}
      {showAchievement && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <Card className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-2xl border-0">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="text-3xl">{showAchievement.icon}</div>
              <div>
                <div className="font-bold">Achievement Unlocked!</div>
                <div className="text-sm">{showAchievement.name}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Left Sidebar - Chapter List */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto shadow-lg">
        <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            Course Content
          </h2>
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-1">
              <Flame className="w-4 h-4 text-orange-300" />
              <span>{studyStreak.currentStreak} day streak</span>
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-yellow-300" />
              <span>{achievements.length} badges</span>
            </div>
          </div>
        </div>

        <div className="p-3">
          {chapters.map((chapter, index) => (
            <div
              key={chapter.id}
              className={`p-4 mb-3 rounded-xl cursor-pointer transition-all transform hover:scale-[1.02] ${
                selectedChapter?.id === chapter.id
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
              onClick={() => handleChapterSelect(chapter)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      selectedChapter?.id === chapter.id
                        ? 'bg-white text-indigo-600'
                        : 'bg-indigo-100 text-indigo-600'
                    }`}>
                      {index + 1}
                    </div>
                    <Badge className={getDifficultyColor(chapter.difficulty)} variant="secondary">
                      {chapter.difficulty}
                    </Badge>
                  </div>
                  <h3 className={`font-semibold text-sm mb-1 ${
                    selectedChapter?.id === chapter.id ? 'text-white' : 'text-gray-800'
                  }`}>
                    {chapter.title}
                  </h3>
                  <p className={`text-xs ${
                    selectedChapter?.id === chapter.id ? 'text-indigo-100' : 'text-gray-600'
                  }`}>
                    {chapter.summary.substring(0, 80)}...
                  </p>
                </div>
                <ChevronRight className={`w-5 h-5 ${
                  selectedChapter?.id === chapter.id ? 'text-white' : 'text-gray-400'
                }`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedChapter ? (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                    <span>Chapter {chapters.findIndex(c => c.id === selectedChapter.id) + 1}</span>
                    <span>•</span>
                    <Badge className={getDifficultyColor(selectedChapter.difficulty)}>
                      {selectedChapter.difficulty}
                    </Badge>
                    {enhancedLesson && (
                      <>
                        <span>•</span>
                        <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI-Enhanced
                        </Badge>
                      </>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {selectedChapter.title}
                  </h1>
                  {enhancedLesson && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Teaching Style:</span>{' '}
                      <span className="capitalize">{enhancedLesson.teachingApproach || teachingStyle}</span>
                      {enhancedLesson.learningObjectives && enhancedLesson.learningObjectives.length > 0 && (
                        <span className="ml-4">
                          • <span className="font-medium">Objectives:</span> {enhancedLesson.learningObjectives.length} goals
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {/* Teaching Style Selector */}
                  <div className="flex gap-2 items-center">
                    <select
                      value={teachingStyle}
                      onChange={(e) => setTeachingStyle(e.target.value as any)}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="direct">Direct Instruction</option>
                      <option value="socratic">Socratic Method</option>
                      <option value="constructivist">Constructivist</option>
                      <option value="encouraging">Encouraging</option>
                    </select>
                    <Button
                      onClick={() => handleChapterSelect(selectedChapter)}
                      disabled={generatingLesson}
                      className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    >
                      <Sparkles className="w-4 h-4" />
                      {generatingLesson ? 'Enhancing...' : 'Enhance with AI'}
                    </Button>
                  </div>
                  <Button
                    onClick={() => setShowChat(!showChat)}
                    variant={showChat ? 'default' : 'outline'}
                    className="gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    AI Tutor
                  </Button>
                  <Button
                    onClick={() => setShowQuiz(!showQuiz)}
                    variant="outline"
                    className="gap-2"
                  >
                    <Brain className="w-4 h-4" />
                    Quiz
                  </Button>
                </div>
              </div>
            </div>

            {/* Content and Chat Area */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto p-6">
                <div className="max-w-5xl mx-auto">
                  {generatingLesson ? (
                    <div className="flex items-center justify-center py-32">
                      <div className="text-center">
                        <div className="relative">
                          <Sparkles className="w-16 h-16 text-indigo-600 mx-auto animate-pulse" />
                          <div className="absolute inset-0 animate-ping">
                            <Sparkles className="w-16 h-16 text-purple-400 opacity-75" />
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-gray-800 mt-6 mb-2">
                          AI is crafting your personalized lesson
                        </div>
                        <div className="text-gray-600">
                          Creating interactive content tailored to your learning style
                        </div>
                        <div className="flex gap-1 justify-center mt-4">
                          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {/* Chapter Content */}
                      <Card className="shadow-xl border-0 bg-white overflow-hidden">
                        <CardContent className="p-10">
                          <div
                            className="prose prose-lg max-w-none prose-headings:scroll-mt-24"
                            dangerouslySetInnerHTML={{
                              __html: selectedChapter.content
                            }}
                          />
                        </CardContent>
                      </Card>

                      {/* Enhanced Lesson Information */}
                      {enhancedLesson && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Learning Objectives */}
                          {enhancedLesson.learningObjectives && enhancedLesson.learningObjectives.length > 0 && (
                            <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-50">
                              <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-green-700">
                                  <Target className="w-5 h-5" />
                                  Learning Objectives
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <ul className="space-y-2">
                                  {enhancedLesson.learningObjectives.map((objective: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                      <span>{objective}</span>
                                    </li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>
                          )}

                          {/* Key Vocabulary */}
                          {enhancedLesson.keyVocabulary && enhancedLesson.keyVocabulary.length > 0 && (
                            <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
                              <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-blue-700">
                                  <BookOpen className="w-5 h-5" />
                                  Key Vocabulary
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="space-y-3">
                                  {enhancedLesson.keyVocabulary.slice(0, 5).map((item: any, idx: number) => (
                                    <div key={idx} className="text-sm">
                                      <div className="font-semibold text-gray-800">{item.term}</div>
                                      <div className="text-gray-600">{item.definition}</div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Summary */}
                          {enhancedLesson.summary && (
                            <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-pink-50">
                              <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-purple-700">
                                  <BarChart3 className="w-5 h-5" />
                                  AI Summary
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <p className="text-sm text-gray-700 leading-relaxed">
                                  {enhancedLesson.summary}
                                </p>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}

                      {/* Analytics Dashboard */}
                      {recommendations.length > 0 && (
                        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <TrendingUp className="w-5 h-5 text-indigo-600" />
                              Your Learning Insights
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {recommendations.slice(0, 4).map((rec, idx) => (
                                <div key={idx} className="p-4 bg-white rounded-lg border border-indigo-100">
                                  <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg ${
                                      rec.priority === 'high' ? 'bg-red-100 text-red-600' :
                                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                                      'bg-green-100 text-green-600'
                                    }`}>
                                      {rec.type === 'review' && <Target className="w-5 h-5" />}
                                      {rec.type === 'practice' && <Zap className="w-5 h-5" />}
                                      {rec.type === 'challenge' && <Award className="w-5 h-5" />}
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-gray-800">{rec.title}</h4>
                                      <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                        <Clock className="w-3 h-3" />
                                        {rec.estimatedTime} min
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Comprehensive Quiz Section */}
                      <Card className="shadow-xl border-0 bg-white">
                        <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                          <CardTitle className="flex items-center gap-2">
                            <Brain className="w-6 h-6" />
                            Test Your Knowledge
                          </CardTitle>
                          <p className="text-purple-100 mt-2">
                            Comprehensive quiz to validate your understanding
                          </p>
                        </CardHeader>
                        <CardContent className="p-6">
                          {!showQuiz ? (
                            <div className="text-center py-8">
                              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-10 h-10 text-purple-600" />
                              </div>
                              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                Ready to test your knowledge?
                              </h3>
                              <p className="text-gray-600 mb-6">
                                Take a comprehensive quiz to see how well you've mastered this chapter
                              </p>
                              <Button
                                onClick={() => setShowQuiz(true)}
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-3 text-lg gap-2"
                              >
                                <Zap className="w-5 h-5" />
                                Start Quiz
                              </Button>
                            </div>
                          ) : (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                              <HelpCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                              <p className="text-blue-800 font-medium">
                                Quiz component will be integrated here
                              </p>
                              <p className="text-blue-600 text-sm mt-2">
                                Interactive quiz with real-time feedback
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Tutor Chat Panel */}
              {showChat && (
                <div className="w-96 border-l border-gray-200 bg-white flex flex-col">
                  <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-5 h-5" />
                      <h3 className="font-bold">AI Teaching Assistant</h3>
                    </div>
                    <p className="text-xs text-indigo-100">
                      Ask questions, get explanations, or request practice problems
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">Start a conversation with your AI tutor!</p>
                        <p className="text-xs mt-1">
                          Try: "Can you explain this concept differently?"
                        </p>
                      </div>
                    )}
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                            message.role === 'user'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className={`text-xs mt-1 ${
                            message.role === 'user' ? 'text-indigo-200' : 'text-gray-500'
                          }`}>
                            {message.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-2xl px-4 py-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Ask your AI tutor anything..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!chatInput.trim() || chatLoading}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
              <div className="flex justify-between items-center max-w-5xl mx-auto">
                <Button
                  variant="outline"
                  onClick={() => {
                    const currentIndex = chapters.findIndex(c => c.id === selectedChapter.id);
                    if (currentIndex > 0) {
                      handleChapterSelect(chapters[currentIndex - 1]);
                    }
                  }}
                  disabled={chapters.findIndex(c => c.id === selectedChapter.id) === 0}
                  className="gap-2"
                >
                  ← Previous Chapter
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('/books')}
                  className="gap-2"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Back to Documents
                </Button>

                <Button
                  onClick={() => {
                    const currentIndex = chapters.findIndex(c => c.id === selectedChapter.id);
                    if (currentIndex < chapters.length - 1) {
                      handleChapterSelect(chapters[currentIndex + 1]);
                    }
                  }}
                  disabled={chapters.findIndex(c => c.id === selectedChapter.id) === chapters.length - 1}
                  className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  Next Chapter →
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-indigo-50 to-purple-50">
            <div className="text-center">
              <BookOpen className="w-24 h-24 text-gray-300 mx-auto mb-6" />
              <div className="text-2xl font-bold text-gray-700 mb-2">
                Select a chapter to begin learning
              </div>
              <p className="text-gray-500">
                Choose from the chapters on the left to start your learning journey
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonWorkspace;
