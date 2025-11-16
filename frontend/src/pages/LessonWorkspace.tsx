import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
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
  ArrowRight,
  Search,
  FileText,
  ExternalLink,
  Plus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { contentFormatter, EmbeddedContent } from '@/services/contentFormatter';
import QuizComponent from '@/components/QuizComponent';

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

  // Saved Lessons State
  const [isLessonSaved, setIsLessonSaved] = useState(false);
  const [savedLessonId, setSavedLessonId] = useState<string | null>(null);
  const [savingLesson, setSavingLesson] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Cache for generated lessons (session-based)
  const [lessonCache, setLessonCache] = useState<Record<string, any>>({});

  // TTS State
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Knowledge Base Enhancement State
  const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState<string[]>([]);
  const [availableKnowledgeBases, setAvailableKnowledgeBases] = useState<any[]>([]);
  const [showKbSelector, setShowKbSelector] = useState(false);
  const [kbSearchQuery, setKbSearchQuery] = useState('');
  const [kbFilterFavorites, setKbFilterFavorites] = useState(false);
  const [filteredKnowledgeBases, setFilteredKnowledgeBases] = useState<any[]>([]);
  const [loadingKbs, setLoadingKbs] = useState(false);

  // Mobile UI State
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

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
          handleChapterSelect(transformedChapters[0], false); // false = don't force regenerate
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

  const handleChapterSelect = async (chapter: Chapter, forceRegenerate: boolean = false) => {
    setSelectedChapter(chapter);
    setShowQuiz(false);

    // Create cache key based on chapter and teaching style
    const cacheKey = `${chapter.id}-${teachingStyle}-${selectedKnowledgeBases.sort().join(',')}`;

    // Check cache first (unless force regenerating)
    if (!forceRegenerate && lessonCache[cacheKey]) {
      console.log('✅ Using cached enhanced lesson');
      const cachedLesson = lessonCache[cacheKey];
      setEnhancedLesson(cachedLesson.enhancedLesson);
      setIsLessonSaved(true);
      setSavedLessonId(cachedLesson.savedLessonId);
      setAudioUrl(cachedLesson.audioUrl);
      setAudioDuration(cachedLesson.audioDuration || 0);
      setEmbeddedContent(cachedLesson.embedded);
      setSelectedChapter({ ...chapter, content: cachedLesson.formattedContent });
      setGeneratingLesson(false);
      return;
    }

    setGeneratingLesson(true);

    try {
      console.log(`🎓 Loading AI-enhanced lesson with ${teachingStyle} style...`);

      // First, check if we have a saved enhanced lesson in database
      const savedResponse = await fetch(
        `http://localhost:4000/api/learning/saved-enhanced-lesson/${chapter.id}?userId=${user?.id}&teachingStyle=${teachingStyle}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const savedData = await savedResponse.json();

      if (savedData.success && savedData.lesson) {
        // Use saved lesson
        console.log('✅ Using saved enhanced lesson from database');
        await loadLessonData(chapter, savedData.lesson, null);
      } else {
        // Generate new enhanced lesson ONLY if not in cache
        console.log(forceRegenerate ? '🔄 Regenerating enhanced lesson...' : '🆕 Generating new enhanced lesson...');

        const useKB = selectedKnowledgeBases.length > 0;
        const endpoint = useKB
          ? 'http://localhost:4000/api/learning/generate-enhanced-lesson-with-kb'
          : `http://localhost:4000/api/learning/enhanced-chapter/${chapter.id}?userId=${user?.id}&teachingStyle=${teachingStyle}`;

        const payload = useKB ? {
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          chapterContent: chapter.content,
          teachingStyle,
          knowledgeBaseIds: selectedKnowledgeBases
        } : undefined;

        const response = await fetch(endpoint, {
          method: useKB ? 'POST' : 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: useKB ? JSON.stringify(payload) : undefined
        });

        const data = await response.json();

        if (data.success && data.enhancedLesson) {
          const enhancedLesson = data.enhancedLesson;
          setEnhancedLesson(enhancedLesson);

          // Create embedded content
          const embedded: EmbeddedContent[] = [];
          const originalContent = data.originalChapter?.content || chapter.content;

          // Add contextual quizzes
          if (enhancedLesson.quickQuiz && enhancedLesson.quickQuiz.length > 0) {
            const quizPositions = contentFormatter.generateQuizInsertionPoints(originalContent);
            enhancedLesson.quickQuiz.forEach((quiz: any, index: number) => {
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

          // Display enhanced content
          let formattedContent;
          if (enhancedLesson.enhancedSections && enhancedLesson.enhancedSections.length > 0) {
            formattedContent = contentFormatter.formatEnhancedContent(
              enhancedLesson.enhancedSections,
              embedded
            );
          } else {
            formattedContent = contentFormatter.formatContent(originalContent, embedded);
          }

          // Cache the lesson
          const cachedData = {
            enhancedLesson,
            embedded,
            formattedContent,
            audioUrl: null,
            audioDuration: 0,
            savedLessonId: null
          };
          setLessonCache(prev => ({ ...prev, [cacheKey]: cachedData }));

          setSelectedChapter({ ...chapter, content: formattedContent });
          setIsLessonSaved(false);
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
      }
    } catch (error) {
      console.error('Error loading enhanced chapter:', error);
      const embedded: EmbeddedContent[] = [];
      const formattedContent = contentFormatter.formatContent(chapter.content, embedded);
      setSelectedChapter({ ...chapter, content: formattedContent });
    } finally {
      setGeneratingLesson(false);
      setIsRegenerating(false);
    }
  };

  // Helper function to load lesson data
  const loadLessonData = async (chapter: Chapter, lessonData: any, embeddedData: any) => {
    setEnhancedLesson(lessonData);
    setIsLessonSaved(true);
    setSavedLessonId(lessonData.id);

    const audioUrl = lessonData.audio_url || null;
    const audioDuration = lessonData.audio_duration || 0;
    setAudioUrl(audioUrl);
    setAudioDuration(audioDuration);

    // Create embedded content
    const embedded: EmbeddedContent[] = [];
    setEmbeddedContent(embedded);

    // Display saved enhanced content
    const formattedContent = contentFormatter.formatEnhancedContent(
      lessonData.enhanced_sections,
      embedded
    );
    setSelectedChapter({ ...chapter, content: formattedContent });

    // Cache the lesson from database
    const cacheKey = `${chapter.id}-${teachingStyle}-${selectedKnowledgeBases.sort().join(',')}`;
    const cachedData = {
      enhancedLesson: lessonData,
      embedded,
      formattedContent,
      audioUrl,
      audioDuration,
      savedLessonId: lessonData.id
    };
    setLessonCache(prev => ({ ...prev, [cacheKey]: cachedData }));
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

  // Save enhanced lesson
  const saveEnhancedLesson = async () => {
    if (!enhancedLesson || !selectedChapter || !user) return;

    setSavingLesson(true);
    try {
      const response = await fetch('http://localhost:4000/api/learning/save-enhanced-lesson', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          chapterId: selectedChapter.id,
          chapterTitle: selectedChapter.title,
          teachingStyle,
          enhancedSections: enhancedLesson.enhancedSections,
          learningObjectives: enhancedLesson.learningObjectives,
          keyVocabulary: enhancedLesson.keyVocabulary,
          summary: enhancedLesson.summary,
          quickQuiz: enhancedLesson.quickQuiz,
          knowledgeBaseIds: selectedKnowledgeBases,
          ttsEnabled
        })
      });

      const data = await response.json();
      if (data.success) {
        setIsLessonSaved(true);
        setSavedLessonId(data.lesson.id);
        if (data.lesson.audio_url) {
          setAudioUrl(data.lesson.audio_url);
          setAudioDuration(data.lesson.audio_duration || 0);
        }
        console.log('✅ Enhanced lesson saved!');
      }
    } catch (error) {
      console.error('Error saving lesson:', error);
    } finally {
      setSavingLesson(false);
    }
  };

  // Toggle favorite
  const toggleFavorite = async () => {
    if (!savedLessonId || !user) return;

    try {
      const response = await fetch(
        `http://localhost:4000/api/learning/enhanced-lesson/${savedLessonId}/toggle-favorite`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: user.id })
        }
      );

      const data = await response.json();
      if (data.success && enhancedLesson) {
        setEnhancedLesson({ ...enhancedLesson, is_favorite: data.lesson.is_favorite });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // TTS Functions
  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Load knowledge bases
  const loadKnowledgeBases = async () => {
    if (!user) {
      console.log('⚠️ Cannot load KBs: No user');
      return;
    }

    setLoadingKbs(true);
    try {
      console.log('📚 Loading knowledge bases for user:', user.id);
      const response = await fetch(
        `http://localhost:4000/api/subjects?userId=${user.id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();

      console.log('📚 KB API Response:', data);

      if (data.subjects && Array.isArray(data.subjects)) {
        // Fetch document/chapter counts for each subject
        const subjectsWithStats = await Promise.all(
          data.subjects.map(async (subject: any) => {
            try {
              const statsResponse = await fetch(
                `http://localhost:4000/api/subjects/${subject.id}/stats`,
                {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  }
                }
              );
              const stats = await statsResponse.json();
              return {
                ...subject,
                document_count: stats.document_count || 0,
                chapter_count: stats.chapter_count || 0
              };
            } catch {
              return {
                ...subject,
                document_count: 0,
                chapter_count: 0
              };
            }
          })
        );
        console.log('✅ Loaded', subjectsWithStats.length, 'knowledge bases');
        setAvailableKnowledgeBases(subjectsWithStats);
      } else {
        console.log('⚠️ No subjects in response');
        setAvailableKnowledgeBases([]);
      }
    } catch (error) {
      console.error('❌ Error loading knowledge bases:', error);
      setAvailableKnowledgeBases([]);
    } finally {
      setLoadingKbs(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadKnowledgeBases();
    }
  }, [user]);

  useEffect(() => {
    // Filter knowledge bases based on search query and favorites
    let filtered = availableKnowledgeBases;

    // Filter by search query
    if (kbSearchQuery.trim()) {
      const query = kbSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (kb) =>
          kb.name.toLowerCase().includes(query) ||
          (kb.description && kb.description.toLowerCase().includes(query))
      );
    }

    // Filter by favorites
    if (kbFilterFavorites) {
      filtered = filtered.filter((kb) => kb.is_favorite);
    }

    setFilteredKnowledgeBases(filtered);
  }, [availableKnowledgeBases, kbSearchQuery, kbFilterFavorites]);

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
        <div className="fixed top-4 right-4 z-[100] animate-slide-in">
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

      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Left Sidebar - Chapter List */}
      {/* Desktop: Always visible | Mobile: Overlay drawer */}
      <div
        className={`
          fixed md:relative z-50
          h-full
          bg-white border-r border-gray-200 overflow-y-auto shadow-lg
          transition-transform duration-300 ease-in-out
          ${isMobile ? (showMobileSidebar ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
          ${!isMobile ? 'w-80' : 'w-80'}
        `}
      >
        <div className="p-4 md:p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 className="text-lg md:text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
              <span className="hidden sm:inline">Course Content</span>
              <span className="sm:hidden">Chapters</span>
            </h2>
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileSidebar(false)}
                className="text-white hover:bg-white/20 md:hidden"
              >
                <X className="w-6 h-6" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm">
            <div className="flex items-center gap-1">
              <Flame className="w-4 h-4 text-orange-300" />
              <span className="hidden xs:inline">{studyStreak.currentStreak} day streak</span>
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-yellow-300" />
              <span className="hidden xs:inline">{achievements.length} badges</span>
            </div>
          </div>
        </div>

        <div className="p-2 md:p-3">
          {chapters.map((chapter, index) => (
            <div
              key={chapter.id}
              className={`p-3 md:p-4 mb-2 md:mb-3 rounded-xl cursor-pointer transition-all transform hover:scale-[1.02] touch-manipulation ${
                selectedChapter?.id === chapter.id
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
              onClick={() => {
                handleChapterSelect(chapter, false);
                if (isMobile) {
                  setShowMobileSidebar(false);
                }
              }}
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
            <div className="bg-white border-b border-gray-200 shadow-sm">
              {/* Mobile Header Bar */}
              {isMobile && (
                <div className="flex items-center justify-between p-3 border-b border-gray-200">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowMobileSidebar(true)}
                    className="h-10 w-10"
                  >
                    <Menu className="w-6 h-6" />
                  </Button>
                  <h1 className="text-lg font-bold text-gray-900 truncate px-2">
                    {selectedChapter.title}
                  </h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowChat(true)}
                    className="h-10 w-10 relative"
                  >
                    <MessageCircle className="w-6 h-6" />
                    {chatMessages.length > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                  </Button>
                </div>
              )}

              {/* Mobile Controls Bar */}
              {isMobile && (
                <div className="bg-white border-b border-gray-200 p-3 space-y-3">
                  {/* Teaching Style */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Teaching Style</label>
                    <select
                      value={teachingStyle}
                      onChange={(e) => setTeachingStyle(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="direct">Direct Instruction</option>
                      <option value="socratic">Socratic Method</option>
                      <option value="constructivist">Constructivist</option>
                      <option value="encouraging">Encouraging</option>
                    </select>
                  </div>

                  {/* Knowledge Base Selector */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Knowledge Base</label>
                    <Button
                      onClick={() => setShowKbSelector(!showKbSelector)}
                      variant={showKbSelector ? 'default' : 'outline'}
                      className="w-full justify-start gap-2 h-10"
                    >
                      <Brain className="w-4 h-4" />
                      KB: {selectedKnowledgeBases.length > 0 ? selectedKnowledgeBases.length : 'None'}
                    </Button>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Save Button */}
                    {enhancedLesson && (
                      <Button
                        onClick={saveEnhancedLesson}
                        disabled={savingLesson || isLessonSaved}
                        variant={isLessonSaved ? 'default' : 'outline'}
                        className="w-full gap-2"
                        size="sm"
                      >
                        {savingLesson ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isLessonSaved ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Star className="w-4 h-4" />
                        )}
                        {savingLesson ? 'Saving...' : isLessonSaved ? 'Saved' : 'Save'}
                      </Button>
                    )}

                    {/* Regenerate Button */}
                    <Button
                      onClick={() => {
                        setIsRegenerating(true);
                        handleChapterSelect(selectedChapter, true);
                      }}
                      disabled={generatingLesson || isRegenerating}
                      className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                      size="sm"
                    >
                      <Sparkles className="w-4 h-4" />
                      {generatingLesson || isRegenerating ? 'Enhancing...' : 'Regenerate'}
                    </Button>
                  </div>

                  {/* Knowledge Base Dropdown */}
                  {showKbSelector && (
                    <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-800">Select Knowledge Bases</h4>
                        <div className="text-xs text-gray-500">
                          {selectedKnowledgeBases.length} selected
                        </div>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {filteredKnowledgeBases.length === 0 ? (
                          <p className="text-sm text-gray-500 py-4 text-center">
                            No knowledge bases available
                          </p>
                        ) : (
                          filteredKnowledgeBases.map((kb) => (
                            <div
                              key={kb.id}
                              className="flex items-start gap-3 p-2 hover:bg-indigo-50 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={selectedKnowledgeBases.includes(kb.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedKnowledgeBases([...selectedKnowledgeBases, kb.id]);
                                  } else {
                                    setSelectedKnowledgeBases(
                                      selectedKnowledgeBases.filter(id => id !== kb.id)
                                    );
                                  }
                                }}
                                className="mt-1 text-indigo-600 focus:ring-indigo-500"
                              />
                              <div className="flex-1">
                                <div className="font-medium text-sm">{kb.name}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Desktop Header */}
              <div className={`${isMobile ? 'hidden' : 'block'} bg-white p-4 md:p-6 shadow-sm`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-gray-600 mb-2 flex-wrap">
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
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {selectedChapter.title}
                    </h1>
                    {enhancedLesson && (
                      <div className="mt-2 text-xs md:text-sm text-gray-600">
                        <span className="font-medium">Teaching Style:</span>{' '}
                        <span className="capitalize">{enhancedLesson.teachingApproach || teachingStyle}</span>
                        {enhancedLesson.learningObjectives && enhancedLesson.learningObjectives.length > 0 && (
                          <span className="ml-2 md:ml-4">
                            • <span className="font-medium">Objectives:</span> {enhancedLesson.learningObjectives.length} goals
                          </span>
                        )}
                        {lessonCache[`${selectedChapter.id}-${teachingStyle}-${selectedKnowledgeBases.sort().join(',')}`] && !isRegenerating && (
                          <span className="ml-2 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-green-700 font-medium">Cached</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="relative flex gap-2 items-center flex-wrap ml-4">
                    {/* Teaching Style Selector */}
                    <select
                      value={teachingStyle}
                      onChange={(e) => setTeachingStyle(e.target.value as any)}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="direct">Direct</option>
                      <option value="socratic">Socratic</option>
                      <option value="constructivist">Constructivist</option>
                      <option value="encouraging">Encouraging</option>
                    </select>

                    {/* Knowledge Base Selector */}
                    <Button
                      onClick={() => setShowKbSelector(!showKbSelector)}
                      variant={showKbSelector ? 'default' : 'outline'}
                      className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3"
                      size="sm"
                    >
                      <Brain className="w-3 h-3 md:w-4 md:h-4" />
                      <span className="hidden xs:inline">KB:</span> {selectedKnowledgeBases.length > 0 ? selectedKnowledgeBases.length : 'None'}
                    </Button>

                    {/* Knowledge Base Dropdown */}
                    {showKbSelector && (
                      <div className={`absolute z-10 mt-2 ${isMobile ? 'w-[calc(100vw-2rem)] max-w-sm' : 'w-96'} bg-white rounded-lg shadow-xl border border-gray-200 p-4`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-800">Select Knowledge Bases</h4>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-gray-500">
                            {selectedKnowledgeBases.length} selected
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              loadKnowledgeBases();
                            }}
                            disabled={loadingKbs}
                            className="h-6 w-6"
                            title="Reload Knowledge Bases"
                          >
                            {loadingKbs ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Search and Filters */}
                      <div className="space-y-2 mb-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={kbSearchQuery}
                            onChange={(e) => setKbSearchQuery(e.target.value)}
                            placeholder="Search knowledge bases..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={kbFilterFavorites ? 'default' : 'outline'}
                            onClick={() => setKbFilterFavorites(!kbFilterFavorites)}
                            className="h-8 text-xs gap-1"
                          >
                            <Star className={`w-3 h-3 ${kbFilterFavorites ? 'fill-white' : ''}`} />
                            Favorites
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {loadingKbs ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="text-center">
                              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
                              <p className="text-sm text-gray-600">Loading knowledge bases...</p>
                            </div>
                          </div>
                        ) : filteredKnowledgeBases.length === 0 ? (
                          <div className="text-center py-8">
                            <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              {kbSearchQuery ? 'No knowledge bases match your search' : availableKnowledgeBases.length === 0 ? 'No knowledge bases created yet' : 'No knowledge bases available'}
                            </p>
                            {availableKnowledgeBases.length === 0 && (
                              <div className="mt-3">
                                <p className="text-xs text-gray-500 mb-3">
                                  Create a Knowledge Base to enhance your lessons with additional context
                                </p>
                                <Button
                                  size="sm"
                                  onClick={() => window.open('/knowledge', '_blank')}
                                  className="gap-2"
                                >
                                  <Plus className="w-3 h-3" />
                                  Create Knowledge Base
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          filteredKnowledgeBases.map((kb) => (
                            <div
                              key={kb.id}
                              className="flex items-start gap-3 p-3 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200"
                            >
                              <input
                                type="checkbox"
                                checked={selectedKnowledgeBases.includes(kb.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedKnowledgeBases([...selectedKnowledgeBases, kb.id]);
                                  } else {
                                    setSelectedKnowledgeBases(
                                      selectedKnowledgeBases.filter(id => id !== kb.id)
                                    );
                                  }
                                }}
                                className="mt-1 text-indigo-600 focus:ring-indigo-500"
                              />
                              {/* Color Indicator */}
                              <div
                                className="w-2 h-12 rounded-full flex-shrink-0 mt-0.5"
                                style={{ backgroundColor: kb.color || '#6366f1' }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium text-sm text-gray-800 truncate">{kb.name}</div>
                                  {kb.is_favorite && (
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                  {kb.description || 'No description'}
                                </div>
                                {/* KB Stats */}
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                  {kb.document_count !== undefined && (
                                    <>
                                      <span className="flex items-center gap-1">
                                        <FileText className="w-3 h-3" />
                                        {kb.document_count} docs
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <BookOpen className="w-3 h-3" />
                                        {kb.chapter_count || 0} chapters
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              {/* Quick View Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:bg-indigo-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`/knowledge/${kb.id}`, '_blank');
                                }}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          onClick={() => {
                            setShowKbSelector(false);
                            setKbSearchQuery('');
                            setKbFilterFavorites(false);
                          }}
                          className="flex-1"
                        >
                          Done
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedKnowledgeBases([])}
                          className="flex-1"
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                  )}

                    {/* Save Lesson Button */}
                    {enhancedLesson && (
                      <Button
                        onClick={saveEnhancedLesson}
                        disabled={savingLesson || isLessonSaved}
                        variant={isLessonSaved ? 'default' : 'outline'}
                        className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3"
                        size="sm"
                      >
                        {savingLesson ? (
                          <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                        ) : isLessonSaved ? (
                          <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" />
                        ) : (
                          <Star className="w-3 h-3 md:w-4 md:h-4" />
                        )}
                        <span className="hidden xs:inline">
                          {savingLesson ? 'Saving...' : isLessonSaved ? 'Saved' : 'Save'}
                        </span>
                      </Button>
                    )}

                    {/* Favorite Button */}
                    {isLessonSaved && enhancedLesson?.is_favorite && (
                      <Button
                        onClick={toggleFavorite}
                        variant="outline"
                        className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 text-yellow-600"
                        size="sm"
                      >
                        <Star className="w-3 h-3 md:w-4 md:h-4 fill-yellow-600" />
                        <span className="hidden xs:inline">Favorited</span>
                      </Button>
                    )}

                    <Button
                      onClick={() => {
                        setIsRegenerating(true);
                        handleChapterSelect(selectedChapter, true); // true = force regenerate
                      }}
                      disabled={generatingLesson || isRegenerating}
                      className="gap-1 md:gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-xs md:text-sm px-2 md:px-3"
                      size="sm"
                    >
                      <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
                      <span className="hidden xs:inline">{generatingLesson || isRegenerating ? 'Enhancing...' : 'Regenerate'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className={isMobile ? 'p-3' : 'p-6'}>
                <div className={`
                  ${isMobile ? 'w-full' : 'max-w-5xl mx-auto'}
                `}>
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
                    <div className="space-y-8">
                      {/* Chapter Content */}
                      <Card className="shadow-xl border-0 bg-white overflow-hidden">
                        <CardContent className={isMobile ? 'p-6' : 'p-10'}>
                          <div
                            className={`
                              prose ${isMobile ? 'prose-base' : 'prose-lg'}
                              max-w-none
                              prose-headings:scroll-mt-24
                              prose-headings:text-gray-900
                              prose-p:text-gray-700
                              prose-p:leading-relaxed
                            `}
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

                      {/* TTS Audio Player */}
                      {(isLessonSaved || audioUrl) && (
                        <Card className="shadow-lg border-0 bg-gradient-to-r from-indigo-50 to-purple-50">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <span>Audio Lesson</span>
                              {user?.id === 'mock-user-id' && (
                                <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800">
                                  Demo Audio
                                </Badge>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="bg-white rounded-lg p-4 border border-indigo-100">
                              <div className="flex items-center gap-4">
                                <Button
                                  onClick={togglePlayPause}
                                  className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 flex items-center justify-center"
                                >
                                  {isPlaying ? (
                                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                  ) : (
                                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </Button>

                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">
                                      {selectedChapter?.title || 'Enhanced Lesson'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {formatTime(currentTime)} / {formatTime(audioDuration)}
                                    </span>
                                  </div>
                                  <div className="relative">
                                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-200"
                                        style={{
                                          width: audioDuration > 0 ? `${(currentTime / audioDuration) * 100}%` : '0%'
                                        }}
                                      />
                                    </div>
                                    <input
                                      type="range"
                                      min="0"
                                      max={audioDuration || 0}
                                      value={currentTime}
                                      onChange={(e) => {
                                        if (audioRef.current) {
                                          const newTime = parseFloat(e.target.value);
                                          audioRef.current.currentTime = newTime;
                                          setCurrentTime(newTime);
                                        }
                                      }}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                  </div>
                                </div>

                                <Button
                                  onClick={() => {
                                    if (audioRef.current) {
                                      audioRef.current.playbackRate = audioRef.current.playbackRate === 1 ? 1.5 : 1;
                                    }
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  <span className="text-xs">Speed</span>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
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
                        {!showQuiz ? (
                          <CardContent className="p-8 text-center">
                            <div className="max-w-2xl mx-auto">
                              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Brain className="w-10 h-10 text-purple-600" />
                              </div>
                              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                                Test Your Knowledge
                              </h3>
                              <p className="text-gray-600 mb-8">
                                Take a comprehensive quiz to validate your understanding of this chapter
                              </p>
                              <Button
                                onClick={() => setShowQuiz(true)}
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-12 py-4 text-lg gap-3"
                                size="lg"
                              >
                                <Zap className="w-6 h-6" />
                                Start Comprehensive Quiz
                              </Button>
                            </div>
                          </CardContent>
                        ) : (
                          <>
                            <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                              <CardTitle className="flex items-center gap-2">
                                <Brain className="w-6 h-6" />
                                Chapter Quiz
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                              <QuizComponent
                                chapterId={selectedChapter.id}
                                onComplete={(result) => {
                                  console.log('Quiz completed:', result);
                                  setShowQuiz(false);
                                }}
                              />
                            </CardContent>
                          </>
                        )}
                      </Card>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Tutor Chat Panel - Desktop Sidebar | Mobile Modal */}
              {showChat && (
                <>
                  {/* Mobile Chat Overlay */}
                  {isMobile && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowChat(false)} />
                  )}

                  {/* Chat Panel */}
                  <div
                    className={`
                      ${isMobile
                        ? 'fixed inset-0 z-50'
                        : 'w-96 border-l border-gray-200'
                      }
                      bg-white flex flex-col
                      ${isMobile ? 'rounded-t-2xl' : ''}
                    `}
                  >
                    {/* Chat Header */}
                    <div className="p-3 md:p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Brain className="w-5 h-5" />
                          <h3 className="font-bold text-sm md:text-base">AI Teaching Assistant</h3>
                        </div>
                        {isMobile && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowChat(false)}
                            className="text-white hover:bg-white/20 h-8 w-8"
                          >
                            <X className="w-5 h-5" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-indigo-100">
                        Ask questions, get explanations, or request practice problems
                      </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
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

                    <div className="p-3 md:p-4 border-t border-gray-200">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Ask your AI tutor anything..."
                          className="flex-1 px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!chatInput.trim() || chatLoading}
                          className="bg-indigo-600 hover:bg-indigo-700 px-4 md:px-6"
                          size="sm"
                        >
                          <span className="hidden xs:inline">Send</span>
                          <span className="xs:hidden">➤</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Navigation - Desktop | Mobile Bottom Bar */}
            <div className={`bg-white border-t border-gray-200 shadow-lg ${isMobile ? 'p-2' : 'p-4'}`}>
              <div className={`flex items-center gap-2 ${isMobile ? 'justify-center' : 'justify-between'} max-w-5xl mx-auto`}>
                {isMobile ? (
                  // Mobile: Fixed bottom navigation
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentIndex = chapters.findIndex(c => c.id === selectedChapter.id);
                        if (currentIndex > 0) {
                          handleChapterSelect(chapters[currentIndex - 1], false);
                        }
                      }}
                      disabled={chapters.findIndex(c => c.id === selectedChapter.id) === 0}
                      className="flex-1 gap-1 h-12 text-xs"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Prev
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/books')}
                      className="flex-1 gap-1 h-12 text-xs"
                    >
                      <ArrowRight className="w-4 h-4 rotate-180" />
                      <span className="hidden xs:inline">Back</span>
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => {
                        const currentIndex = chapters.findIndex(c => c.id === selectedChapter.id);
                        if (currentIndex < chapters.length - 1) {
                          handleChapterSelect(chapters[currentIndex + 1], false);
                        }
                      }}
                      disabled={chapters.findIndex(c => c.id === selectedChapter.id) === chapters.length - 1}
                      className="flex-1 gap-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 h-12 text-xs"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  // Desktop: Full button labels
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const currentIndex = chapters.findIndex(c => c.id === selectedChapter.id);
                        if (currentIndex > 0) {
                          handleChapterSelect(chapters[currentIndex - 1], false);
                        }
                      }}
                      disabled={chapters.findIndex(c => c.id === selectedChapter.id) === 0}
                      className="gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous Chapter
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
                          handleChapterSelect(chapters[currentIndex + 1], false);
                        }
                      }}
                      disabled={chapters.findIndex(c => c.id === selectedChapter.id) === chapters.length - 1}
                      className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    >
                      Next Chapter
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </>
                )}
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

      {/* Hidden Audio Element for TTS */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          preload="metadata"
        />
      )}
    </div>
  );
};

export default LessonWorkspace;
