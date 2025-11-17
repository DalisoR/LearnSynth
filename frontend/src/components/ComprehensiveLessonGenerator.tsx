import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  BookOpen,
  FileText,
  Loader2,
  CheckCircle2,
  Sparkles,
  Lightbulb,
  Target,
  GraduationCap,
  ListChecks,
  Quote,
  ExternalLink,
  ChevronRight,
  FileDown,
  PlayCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { learningApi } from '@/services/api/learningApi';
import { subjectsAPI } from '@/services/api';

interface Topic {
  title: string;
  description: string;
  keyPoints: string[];
}

interface CourseOutline {
  title: string;
  description: string;
  topics: Topic[];
}

interface Subject {
  id: string;
  name: string;
  documentCount?: number;
}

interface Reference {
  source: string;
  relevanceScore: number;
  excerpt: string;
  chapterId: string;
  documentId: string;
  subjectName?: string;
}

interface EnhancedSection {
  type: string;
  title: string;
  content: string;
  keyPoints: string[];
  examples?: string[];
  teachingStyle: string;
  knowledgeBaseReferences?: Reference[];
}

interface ComprehensiveLesson {
  chapterId: string;
  enhancedSections: EnhancedSection[];
  learningObjectives: string[];
  keyVocabulary: { term: string; definition: string }[];
  summary: string;
  quickQuiz: any[];
  knowledgeBaseContext?: {
    references: Reference[];
  };
}

interface SourcesUsed {
  totalReferences: number;
  prescribedBooks: string[];
  recommendedBooks: string[];
}

const ComprehensiveLessonGenerator: React.FC = () => {
  const { user } = useAuth();

  // State for outline input and parsing
  const [outlineText, setOutlineText] = useState('');
  const [courseOutline, setCourseOutline] = useState<CourseOutline | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  // State for subject selection
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);

  // State for generation
  const [teachingStyle, setTeachingStyle] = useState<'socratic' | 'direct' | 'constructivist' | 'encouraging'>('direct');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lesson, setLesson] = useState<ComprehensiveLesson | null>(null);
  const [sourcesUsed, setSourcesUsed] = useState<SourcesUsed | null>(null);

  // State for display
  const [activeTab, setActiveTab] = useState<'outline' | 'generation' | 'lesson'>('outline');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  // Load subjects on mount
  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    setSubjectsLoading(true);
    setSubjectsError(null);
    try {
      console.log('Loading subjects from API...');
      const response = await subjectsAPI.getAll();
      console.log('API Response:', response);

      if (response && response.subjects) {
        const subjectsWithCounts = response.subjects.map((subject: any) => ({
          id: subject.id,
          name: subject.name,
          documentCount: subject.documentCount || 0
        }));
        console.log('Loaded subjects:', subjectsWithCounts);
        setSubjects(subjectsWithCounts);
      } else {
        console.error('Invalid response format:', response);
        setSubjectsError('Failed to load knowledge bases');
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
      setSubjectsError('Failed to load knowledge bases');
    } finally {
      setSubjectsLoading(false);
    }
  };

  const handleParseOutline = async () => {
    if (!outlineText.trim()) {
      alert('Please enter a course outline');
      return;
    }

    setIsParsing(true);
    try {
      const response = await learningApi.parseCourseOutline(outlineText);
      if (response.success) {
        setCourseOutline(response.courseOutline);
        setActiveTab('generation');
      } else {
        throw new Error('Failed to parse outline');
      }
    } catch (error) {
      console.error('Error parsing outline:', error);
      alert('Failed to parse course outline. Please try again.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleGenerateLesson = async () => {
    if (!courseOutline) {
      alert('Please parse a course outline first');
      return;
    }

    if (selectedSubjects.length === 0) {
      alert('Please select at least one subject');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await learningApi.generateComprehensiveLesson(
        courseOutline,
        selectedSubjects,
        teachingStyle
      );

      if (response.success) {
        setLesson(response.lesson);
        setSourcesUsed(response.sourcesUsed);
        setActiveTab('lesson');
      } else {
        throw new Error('Failed to generate lesson');
      }
    } catch (error) {
      console.error('Error generating lesson:', error);
      alert('Failed to generate comprehensive lesson. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const renderOutlineInput = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Course Outline Input
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Paste your free-form course outline
          </label>
          <Textarea
            placeholder="Example:
Constitutional Law Course

Week 1: Introduction to Constitutional Law
- Definition and scope
- Historical development
- Key principles and foundations

Week 2: Separation of Powers
- Executive branch powers
- Legislative branch powers
- Judicial branch powers
- Checks and balances system

Week 3: Fundamental Rights
- Civil liberties
- Political rights
- Economic rights"
            value={outlineText}
            onChange={(e) => setOutlineText(e.target.value)}
            rows={12}
            className="font-mono text-sm"
          />
        </div>
        <Button
          onClick={handleParseOutline}
          disabled={isParsing || !outlineText.trim()}
          className="w-full"
        >
          {isParsing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Parsing Outline...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Parse Course Outline
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );

  const renderGenerationConfig = () => {
    if (!courseOutline) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Generation Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Parsed Outline Display */}
          <div>
            <h3 className="font-semibold mb-2">Parsed Course Outline</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-bold text-lg">{courseOutline.title}</h4>
              <p className="text-sm text-gray-600 mb-3">{courseOutline.description}</p>
              <div className="space-y-2">
                {courseOutline.topics.map((topic, idx) => (
                  <div key={idx} className="border-l-2 border-blue-500 pl-3">
                    <div className="font-medium">{topic.title}</div>
                    <div className="text-sm text-gray-600">{topic.description}</div>
                    {topic.keyPoints && topic.keyPoints.length > 0 && (
                      <ul className="text-sm text-gray-500 mt-1 ml-4 list-disc">
                        {topic.keyPoints.map((point, pIdx) => (
                          <li key={pIdx}>{point}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Teaching Style Selection */}
          <div>
            <h3 className="font-semibold mb-2">Teaching Style</h3>
            <div className="grid grid-cols-2 gap-2">
              {(['socratic', 'direct', 'constructivist', 'encouraging'] as const).map((style) => (
                <Button
                  key={style}
                  variant={teachingStyle === style ? 'default' : 'outline'}
                  onClick={() => setTeachingStyle(style)}
                  className="justify-start"
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Subject Selection */}
          <div>
            <h3 className="font-semibold mb-2">
              Select Knowledge Base Sources ({selectedSubjects.length} selected)
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Select ALL subjects that contain your prescribed and recommended readings.
              The AI will search across all selected sources equally.
            </p>
            {subjectsLoading && (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading knowledge bases...
              </div>
            )}
            {subjectsError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {subjectsError}
              </div>
            )}
            {!subjectsLoading && !subjectsError && (
              <div className="space-y-2">
                {subjects.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
                    No knowledge bases found. Create some knowledge bases first.
                  </div>
                ) : (
                  subjects.map((subject) => (
                    <div
                      key={subject.id}
                      onClick={() => toggleSubject(subject.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedSubjects.includes(subject.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          <span className="font-medium">{subject.name}</span>
                        </div>
                        {selectedSubjects.includes(subject.id) && (
                          <CheckCircle2 className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                      {subject.documentCount && (
                        <div className="text-sm text-gray-500 mt-1">
                          {subject.documentCount} document{subject.documentCount !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerateLesson}
            disabled={isGenerating || selectedSubjects.length === 0}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Comprehensive Lesson...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Comprehensive Lesson
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderLessonDisplay = () => {
    if (!lesson || !sourcesUsed) return null;

    return (
      <div className="space-y-6">
        {/* Header with Stats */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">{courseOutline?.title}</h2>
                <p className="text-gray-600">{lesson.teachingApproach}</p>
              </div>
              <Badge variant="outline" className="text-sm">
                {lesson.enhancedSections.length} Sections
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {sourcesUsed.totalReferences}
                </div>
                <div className="text-sm text-gray-600">Sources Referenced</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {lesson.learningObjectives.length}
                </div>
                <div className="text-sm text-gray-600">Learning Objectives</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {lesson.keyVocabulary.length}
                </div>
                <div className="text-sm text-gray-600">Key Terms</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lesson Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-4">
            {lesson.enhancedSections.map((section, idx) => (
              <Card
                key={idx}
                className={`cursor-pointer transition-all ${
                  selectedSection === section.title ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedSection(
                  selectedSection === section.title ? null : section.title
                )}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <ChevronRight
                      className={`h-5 w-5 transition-transform ${
                        selectedSection === section.title ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </CardHeader>
                {selectedSection === section.title && (
                  <CardContent className="space-y-4">
                    <div className="prose prose-sm max-w-none">
                      <p>{section.content}</p>
                    </div>

                    {section.keyPoints && section.keyPoints.length > 0 && (
                      <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-2">
                          <ListChecks className="h-4 w-4" />
                          Key Points
                        </h4>
                        <ul className="list-disc list-inside space-y-1">
                          {section.keyPoints.map((point, pIdx) => (
                            <li key={pIdx} className="text-sm">{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {section.examples && section.examples.length > 0 && (
                      <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-2">
                          <Lightbulb className="h-4 w-4" />
                          Examples
                        </h4>
                        <ul className="list-disc list-inside space-y-1">
                          {section.examples.map((example, eIdx) => (
                            <li key={eIdx} className="text-sm">{example}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Source Attribution */}
                    {section.knowledgeBaseReferences &&
                      section.knowledgeBaseReferences.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                            <Quote className="h-4 w-4" />
                            Sources Used
                          </h4>
                          <div className="space-y-2">
                            {section.knowledgeBaseReferences.map((ref, rIdx) => (
                              <div
                                key={rIdx}
                                className="text-xs p-2 bg-gray-50 rounded flex items-start gap-2"
                              >
                                <ExternalLink className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <div>
                                  <div className="font-medium">{ref.source}</div>
                                  <div className="text-gray-600 truncate">
                                    {ref.excerpt}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Learning Objectives */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Learning Objectives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {lesson.learningObjectives.map((objective, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {objective}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Key Vocabulary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Key Vocabulary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lesson.keyVocabulary.map((vocab, idx) => (
                    <div key={idx} className="text-sm">
                      <div className="font-semibold">{vocab.term}</div>
                      <div className="text-gray-600">{vocab.definition}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{lesson.summary}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Comprehensive Lesson Generator</h1>
        <p className="text-gray-600">
          Generate enriched lessons from course outlines using all your knowledge base sources
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="outline">1. Course Outline</TabsTrigger>
          <TabsTrigger value="generation" disabled={!courseOutline}>
            2. Configure
          </TabsTrigger>
          <TabsTrigger value="lesson" disabled={!lesson}>
            3. Lesson
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outline" className="mt-6">
          {renderOutlineInput()}
        </TabsContent>

        <TabsContent value="generation" className="mt-6">
          {renderGenerationConfig()}
        </TabsContent>

        <TabsContent value="lesson" className="mt-6">
          {renderLessonDisplay()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComprehensiveLessonGenerator;
