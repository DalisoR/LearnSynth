import { LLMService } from '../llm/types';
import { LessonGenerationRequest, ComprehensiveLesson, QuizQuestion, Reflection } from './types';
import logger from '../../utils/logger';

export class ComprehensiveLessonGenerator {
  private llmService: LLMService;

  constructor(llmService: LLMService) {
    this.llmService = llmService;
  }

  async generate(request: LessonGenerationRequest): Promise<ComprehensiveLesson> {
    logger.info(`Generating comprehensive lesson for: ${request.chapterTitle}`);

    // Build context for the lesson
    const context = this.buildContext(request);

    // Generate the main lesson content
    const lessonContent = await this.generateMainContent(request, context);

    // Generate visual aids
    const visualAids = request.includeVisuals
      ? await this.generateVisualAids(lessonContent, context)
      : [];

    // Generate quizzes
    const quizzes = await this.generateQuizzes(lessonContent, context);

    // Generate reflections
    const reflections = await this.generateReflections(lessonContent, context);

    // Generate final assessment
    const finalAssessment = await this.generateFinalAssessment(lessonContent, context);

    // Generate narration
    const narrationText = await this.generateNarration(lessonContent, context);

    const comprehensiveLesson: ComprehensiveLesson = {
      chapterId: '', // Will be set when saving
      lessonTitle: lessonContent.lessonTitle,
      summary: lessonContent.summary,
      learningObjectives: lessonContent.learningObjectives,
      explanation: lessonContent.explanation,
      visualAids,
      quizzes,
      reflection: {
        prompts: reflections,
        guidingQuestions: lessonContent.guidingQuestions,
        journalingTemplate: lessonContent.journalingTemplate,
      },
      finalAssessment,
      duration: this.estimateDuration(lessonContent),
      difficulty: this.determineDifficulty(lessonContent, request.chapterContent),
      references: this.extractReferences(lessonContent, request.documentTitle),
      narrationText,
      knowledgeBaseContext: request.knowledgeBaseContext,
    };

    logger.info(`Generated comprehensive lesson: ${comprehensiveLesson.lessonTitle}`);
    return comprehensiveLesson;
  }

  private buildContext(request: LessonGenerationRequest): string {
    let context = `Document: ${request.documentTitle}\n`;
    context += `Chapter: ${request.chapterTitle}\n`;
    context += `Style: ${request.style || 'easy'}\n\n`;

    if (request.knowledgeBaseContext) {
      context += `Related Knowledge Base Context:\n${request.knowledgeBaseContext}\n\n`;
    }

    context += `Chapter Content:\n${request.chapterContent}\n\n`;

    context += `Please create an easy-to-understand, engaging lesson that helps students grasp the concepts through:
- Simple analogies and relatable examples
- Clear explanations with step-by-step breakdown
- Real-world applications
- Interactive elements (quizzes, reflections)
`;

    return context;
  }

  private async generateMainContent(
    request: LessonGenerationRequest,
    context: string
  ): Promise<any> {
    const systemPrompt = `You are an expert educator who creates engaging, easy-to-understand lessons. Your teaching style is:
- Clear and simple explanations
- Use of relatable analogies and real-world examples
- Breaking complex concepts into digestible pieces
- Encouraging curiosity and critical thinking
- Making learning fun and memorable

Always structure your lessons with:
1. Clear learning objectives
2. Easy-to-understand overview
3. Step-by-step explanations with examples and analogies
4. Real-world applications
5. Key takeaways

Format your response as JSON matching this schema.`;

    const prompt = `Create a comprehensive lesson for the chapter. Make it extremely easy to understand with analogies, examples, and clear explanations. Include:

1. A compelling lesson title
2. A clear, concise summary (2-3 sentences)
3. 3-5 learning objectives (what students will learn)
4. Detailed explanation with:
   - Easy-to-understand overview (2-3 paragraphs)
   - 3-5 key concepts, each with:
     * Simple definition
     * Relatable example
     * Clear analogy (compare to everyday things)
     * Why it matters
   - Step-by-step breakdown guide (5-8 steps)
   - Real-world applications (3-4 examples)
   - Key takeaways (3-5 bullet points)

5. 3 guiding questions to help students reflect
6. A journaling template prompt

Make it engaging, memorable, and easy to understand. Use simple language and avoid jargon unless you explain it clearly.

Respond ONLY with valid JSON in this exact format:
{
  "lessonTitle": "string",
  "summary": "string",
  "learningObjectives": ["string", "string"],
  "explanation": {
    "overview": "string",
    "concepts": [
      {
        "name": "string",
        "description": "string",
        "example": "string",
        "analogy": "string",
        "whyItMatters": "string"
      }
    ],
    "stepByStepGuide": ["string", "string"],
    "realWorldApplications": ["string", "string"],
    "keyTakeaways": ["string", "string"]
  },
  "guidingQuestions": ["string", "string"],
  "journalingTemplate": "string"
}`;

    try {
      const response = await this.llmService.generate({
        prompt,
        systemPrompt,
        context,
        maxTokens: 2000,
        temperature: 0.7,
      });

      // Parse JSON response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const lessonData = JSON.parse(jsonMatch[0]);
      logger.info(`Generated main content for lesson: ${lessonData.lessonTitle}`);
      return lessonData;
    } catch (error) {
      logger.error('Error generating main content:', error);
      throw new Error(`Failed to generate lesson content: ${error.message}`);
    }
  }

  private async generateVisualAids(lessonContent: any, context: string): Promise<any[]> {
    const systemPrompt = `You are a visual design expert. Create descriptions for visual aids that would help students understand the lesson better.`;

    const prompt = `Based on this lesson content, suggest 2-3 visual aids (diagrams, charts, illustrations) that would help students understand the concepts better.

For each visual, provide:
- Type (diagram, chart, illustration, etc.)
- A clear title
- Description of what to show
- The actual content/data for the visual

Lesson content: ${JSON.stringify(lessonContent, null, 2)}

Respond ONLY with valid JSON:
{
  "visuals": [
    {
      "type": "diagram",
      "title": "string",
      "description": "string",
      "content": "string or data structure",
      "prompt": "string for AI image generation"
    }
  ]
}`;

    try {
      const response = await this.llmService.generate({
        prompt,
        systemPrompt,
        context,
        maxTokens: 1000,
        temperature: 0.5,
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return [];
      }

      const visualData = JSON.parse(jsonMatch[0]);
      return visualData.visuals || [];
    } catch (error) {
      logger.error('Error generating visual aids:', error);
      return [];
    }
  }

  private async generateQuizzes(lessonContent: any, context: string): Promise<QuizQuestion[]> {
    const systemPrompt = `You are an assessment expert. Create engaging quiz questions that test understanding, not just memorization.`;

    const prompt = `Create 5 quiz questions based on this lesson content. Mix question types:
- 3 multiple choice (with 4 options each)
- 1 true/false
- 1 short answer

For each question:
- Make it test understanding, not just recall
- Include a clear explanation of the correct answer
- Vary difficulty levels (easy, medium, hard)

Lesson content: ${JSON.stringify(lessonContent, null, 2)}

Respond ONLY with valid JSON:
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswer": 0,
      "explanation": "string",
      "difficulty": "easy",
      "points": 1
    }
  ]
}`;

    try {
      const response = await this.llmService.generate({
        prompt,
        systemPrompt,
        context,
        maxTokens: 1500,
        temperature: 0.5,
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return [];
      }

      const quizData = JSON.parse(jsonMatch[0]);
      return quizData.questions || [];
    } catch (error) {
      logger.error('Error generating quizzes:', error);
      return [];
    }
  }

  private async generateReflections(lessonContent: any, context: string): Promise<Reflection[]> {
    const systemPrompt = `You are a learning coach. Create reflection prompts that encourage deep thinking and personal connection to the material.`;

    const prompt = `Create 3 reflection prompts based on this lesson content. Each should be a different type:
1. Written reflection (connect to prior knowledge)
2. Practical application (how to use this)
3. Inquiry (questions for further exploration)

Keep prompts concise but thought-provoking.

Lesson content: ${JSON.stringify(lessonContent, null, 2)}

Respond ONLY with valid JSON:
{
  "reflections": [
    {
      "type": "written",
      "prompt": "string",
      "wordLimit": 200
    },
    {
      "type": "practical",
      "prompt": "string",
      "examples": 2
    },
    {
      "type": "inquiry",
      "prompt": "string"
    }
  ]
}`;

    try {
      const response = await this.llmService.generate({
        prompt,
        systemPrompt,
        context,
        maxTokens: 800,
        temperature: 0.6,
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return [];
      }

      const reflectionData = JSON.parse(jsonMatch[0]);
      return reflectionData.reflections || [];
    } catch (error) {
      logger.error('Error generating reflections:', error);
      return [];
    }
  }

  private async generateFinalAssessment(lessonContent: any, context: string): Promise<any> {
    const systemPrompt = `You are an assessment designer. Create a comprehensive final assessment that tests all aspects of the lesson.`;

    const prompt = `Create a final comprehensive assessment with:
- 10 questions total (6 multiple choice, 2 true/false, 2 short answer)
- Mix of difficulty levels
- 3 reflection prompts
- Pass score: 70%
- Time limit: 20 minutes
- Total points: 100

Lesson content: ${JSON.stringify(lessonContent, null, 2)}

Respond ONLY with valid JSON:
{
  "questions": [
    {
      "type": "multiple-choice",
      "question": "string",
      "options": ["string"],
      "correctAnswer": "string",
      "points": 10
    }
  ],
  "reflections": [
    {
      "type": "written",
      "prompt": "string",
      "wordLimit": 300
    }
  ],
  "passingScore": 70,
  "timeLimit": 20,
  "totalPoints": 100
}`;

    try {
      const response = await this.llmService.generate({
        prompt,
        systemPrompt,
        context,
        maxTokens: 2000,
        temperature: 0.5,
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { questions: [], passingScore: 70, timeLimit: 20, totalPoints: 100 };
      }

      const assessmentData = JSON.parse(jsonMatch[0]);
      return assessmentData;
    } catch (error) {
      logger.error('Error generating final assessment:', error);
      return { questions: [], passingScore: 70, timeLimit: 20, totalPoints: 100 };
    }
  }

  private async generateNarration(lessonContent: any, context: string): Promise<string> {
    const prompt = `Write a friendly, engaging narration script for this lesson. Make it sound like a knowledgeable tutor explaining the concepts to a student. Use:
- Conversational tone
- Clear transitions
- Encouraging language
- Examples and analogies
- 2-3 minutes when read aloud (about 300-400 words)

Lesson: ${JSON.stringify(lessonContent, null, 2)}

Respond ONLY with the narration text as a string.`;

    try {
      const response = await this.llmService.generate({
        prompt,
        context,
        maxTokens: 600,
        temperature: 0.6,
      });

      return response.content;
    } catch (error) {
      logger.error('Error generating narration:', error);
      return `Welcome to this lesson on ${lessonContent.lessonTitle}.`;
    }
  }

  private estimateDuration(lessonContent: any): number {
    // Rough estimation: 2 minutes per concept + 5 minutes for quizzes
    const concepts = lessonContent.explanation?.concepts?.length || 3;
    return concepts * 2 + 5;
  }

  private determineDifficulty(lessonContent: any, chapterContent: string): 'beginner' | 'intermediate' | 'advanced' {
    const wordCount = chapterContent.split(/\s+/).length;
    const hasComplexTerms = /algorithm|calculus|derivative|integration/i.test(chapterContent);

    if (wordCount > 5000 || hasComplexTerms) {
      return 'advanced';
    } else if (wordCount > 2000) {
      return 'intermediate';
    }
    return 'beginner';
  }

  private extractReferences(lessonContent: any, documentTitle: string): Array<{ source: string; chapter: string; url?: string }> {
    return [
      {
        source: documentTitle,
        chapter: lessonContent.lessonTitle,
      },
    ];
  }
}
