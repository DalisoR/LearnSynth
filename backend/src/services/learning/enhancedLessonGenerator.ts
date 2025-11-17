/**
 * Enhanced Lesson Generator
 * Transforms raw chapter content into AI-enhanced pedagogical lessons
 * using 4 teaching styles: Socratic, Direct, Constructivist, Encouraging
 * Supports Knowledge Base enhancement for richer context
 */

import { llmService } from '../llm/factory';
import { ragService } from '../rag/ragService';

export interface EnhancedLessonSection {
  type: 'concept' | 'example' | 'analogy' | 'question' | 'summary';
  title: string;
  content: string;
  teachingStyle: 'socratic' | 'direct' | 'constructivist' | 'encouraging';
  keyPoints: string[];
  examples?: string[];
  analogies?: string[];
  questions?: string[];
  knowledgeBaseReferences?: {
    source: string;
    relevanceScore: number;
  }[];
}

export interface EnhancedLesson {
  chapterId: string;
  originalContent: string;
  enhancedSections: EnhancedLessonSection[];
  teachingApproach: string;
  learningObjectives: string[];
  keyVocabulary: { term: string; definition: string }[];
  summary: string;
  quickQuiz: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }[];
  knowledgeBaseIds?: string[];
  knowledgeBaseContext?: {
    context: string;
    references: Array<{
      source: string;
      relevanceScore: number;
      excerpt: string;
      chapterId: string;
      documentId: string;
    }>;
  };
}

export class EnhancedLessonGenerator {
  /**
   * Transform raw chapter content into an enhanced lesson
   */
  async generateEnhancedLesson(
    chapterId: string,
    chapterTitle: string,
    originalContent: string,
    teachingStyle: 'socratic' | 'direct' | 'constructivist' | 'encouraging' = 'direct'
  ): Promise<EnhancedLesson> {
    console.log(`🎓 Generating enhanced lesson for: ${chapterTitle} (${teachingStyle} style)`);

    // Break content into manageable chunks
    const contentChunks = this.chunkContent(originalContent);

    // Generate enhanced sections for each chunk
    const enhancedSections: EnhancedLessonSection[] = [];

    for (const chunk of contentChunks) {
      const section = await this.enhanceChunk(chunk, teachingStyle, chapterTitle);
      enhancedSections.push(section);
    }

    // Generate learning objectives
    const learningObjectives = await this.generateLearningObjectives(originalContent, chapterTitle);

    // Generate key vocabulary
    const keyVocabulary = await this.extractKeyVocabulary(originalContent);

    // Generate summary
    const summary = await this.generateSummary(originalContent, chapterTitle);

    // Generate quick quiz
    const quickQuiz = await this.generateQuickQuiz(originalContent, chapterTitle);

    return {
      chapterId,
      originalContent,
      enhancedSections,
      teachingApproach: this.getTeachingApproachDescription(teachingStyle),
      learningObjectives,
      keyVocabulary,
      summary,
      quickQuiz
    };
  }

  /**
   * Generate enhanced lesson with Knowledge Base support
   * Retrieves additional context from specified knowledge bases
   */
  async generateEnhancedLessonWithKB(
    chapterId: string,
    chapterTitle: string,
    originalContent: string,
    teachingStyle: 'socratic' | 'direct' | 'constructivist' | 'encouraging' = 'direct',
    knowledgeBaseIds: string[] = []
  ): Promise<EnhancedLesson> {
    console.log(`🎓 Generating KB-enhanced lesson for: ${chapterTitle} with ${knowledgeBaseIds.length} KB(s)`);

    let kbContext = '';
    let kbReferences: { [key: string]: any }[] = [];
    let fullKBContextResult: { context: string; references: any[] } = { context: '', references: [] };

    // If knowledge bases are specified, retrieve relevant context
    if (knowledgeBaseIds.length > 0) {
      try {
        fullKBContextResult = await this.retrieveKnowledgeBaseContext(knowledgeBaseIds, chapterTitle);
        kbContext = fullKBContextResult.context;
        kbReferences = fullKBContextResult.references;
      } catch (error) {
        console.error('Failed to retrieve KB context:', error);
        // Continue without KB enhancement
      }
    }

    // Break content into manageable chunks
    const contentChunks = this.chunkContent(originalContent);

    // Generate enhanced sections for each chunk with KB context
    const enhancedSections: EnhancedLessonSection[] = [];

    for (const chunk of contentChunks) {
      const section = await this.enhanceChunkWithKB(
        chunk,
        teachingStyle,
        chapterTitle,
        kbContext,
        kbReferences
      );
      enhancedSections.push(section);
    }

    // Generate learning objectives with KB support
    const learningObjectives = await this.generateLearningObjectives(
      originalContent,
      chapterTitle,
      kbContext
    );

    // Generate key vocabulary
    const keyVocabulary = await this.extractKeyVocabulary(originalContent);

    // Generate summary with KB context
    const summary = await this.generateSummary(originalContent, chapterTitle, kbContext);

    // Generate quick quiz
    const quickQuiz = await this.generateQuickQuiz(originalContent, chapterTitle);

    return {
      chapterId,
      originalContent,
      enhancedSections,
      teachingApproach: this.getTeachingApproachDescription(teachingStyle),
      learningObjectives,
      keyVocabulary,
      summary,
      quickQuiz,
      knowledgeBaseIds,
      knowledgeBaseContext: fullKBContextResult // Include the full KB context and references
    };
  }

  /**
   * Retrieve context from knowledge bases using RAG semantic search
   */
  private async retrieveKnowledgeBaseContext(
    knowledgeBaseIds: string[],
    query: string
  ): Promise<{ context: string; references: any[] }> {
    try {
      console.log(`🔍 Retrieving KB context from ${knowledgeBaseIds.length} knowledge base(s) for query: "${query}"`);

      // Use RAG service to get relevant context from knowledge bases
      const contextResult = await ragService.getRelevantContext(
        knowledgeBaseIds,
        query,
        5 // Retrieve top 5 relevant chunks
      );

      if (!contextResult.context || contextResult.references.length === 0) {
        console.warn('⚠️ No relevant context found in knowledge bases');
        return { context: '', references: [] };
      }

      console.log(`✅ Retrieved ${contextResult.references.length} relevant KB chunks`);

      // Format references for lesson enhancement
      const formattedReferences = contextResult.references.map(ref => ({
        source: ref.source,
        relevanceScore: ref.relevanceScore,
        excerpt: ref.excerpt,
        chapterId: ref.chapterId,
        documentId: ref.documentId
      }));

      return {
        context: contextResult.context,
        references: formattedReferences
      };

    } catch (error) {
      console.error('❌ Error retrieving KB context from RAG service:', error);

      // Fallback to empty context if RAG fails
      return { context: '', references: [] };
    }
  }

  /**
   * Enhance a content chunk with Knowledge Base context
   */
  private async enhanceChunkWithKB(
    chunk: string,
    teachingStyle: 'socratic' | 'direct' | 'constructivist' | 'encouraging',
    chapterTitle: string,
    kbContext: string,
    kbReferences: any[]
  ): Promise<EnhancedLessonSection> {
    const prompt = this.buildEnhancementPromptWithKB(chunk, teachingStyle, chapterTitle, kbContext);

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 1500,
        temperature: 0.7
      });

      const section = this.parseEnhancedSection(response.content, teachingStyle);

      // Add KB references to the section
      return {
        ...section,
        knowledgeBaseReferences: kbReferences
      };
    } catch (error) {
      console.error('Error enhancing chunk with KB:', error);

      // Fallback: basic enhancement without KB
      return {
        type: 'concept',
        title: 'Key Concept',
        content: chunk,
        teachingStyle,
        keyPoints: [chunk.substring(0, 100)],
        knowledgeBaseReferences: []
      };
    }
  }

  /**
   * Build prompt with KB context and citation requirements
   */
  private buildEnhancementPromptWithKB(
    content: string,
    teachingStyle: 'socratic' | 'direct' | 'constructivist' | 'encouraging',
    chapterTitle: string,
    kbContext: string
  ): string {
    const styleInstructions = {
      socratic: 'Guide students to discover answers through thoughtful questioning. Ask questions that build on each other.',
      direct: 'Provide clear, structured instruction with step-by-step explanations and concrete examples.',
      constructivist: 'Connect new concepts to prior knowledge and real-world applications. Build understanding progressively.',
      encouraging: 'Use supportive, positive language that builds confidence and celebrates learning progress.'
    };

    const hasKBContext = kbContext && kbContext.trim().length > 0;

    return `
# Teaching Style: ${teachingStyle.toUpperCase()}

${styleInstructions[teachingStyle]}

# Chapter: ${chapterTitle}

# Original Content:
${content}

${hasKBContext ? kbContext : ''}

# Instructions:
Enhance this content following the ${teachingStyle} teaching approach.${hasKBContext ? ' Use the additional context from the knowledge base to provide richer explanations, deeper insights, and relevant examples that connect to the broader subject matter.' : ''}

${hasKBContext ? `
## Using Knowledge Base Context:
- Incorporate relevant information from the KB naturally into your explanation
- Reference specific sources when using KB content (e.g., "According to [source]...")
- Use KB context to provide additional examples, analogies, or real-world applications
- Connect chapter content with related concepts from the KB
- Ensure all KB-sourced information is clearly attributed
` : ''}

## Content Quality Guidelines:
- Ground all explanations in the original content and KB context
- DO NOT hallucinate facts or make up information
- If KB context is available, weave it naturally into the explanation
- Maintain accuracy while making content engaging
- Use clear, accessible language appropriate for learners

Provide your response in the following JSON format:
{
  "type": "concept|example|analogy|question|summary",
  "title": "Section title",
  "content": "Enhanced explanation (300-500 words)${hasKBContext ? ' with KB context integrated' : ''}",
  "keyPoints": ["Point 1 (cite KB source if applicable)", "Point 2", "Point 3"],
  "examples": ["Example 1${hasKBContext ? ' (from KB or chapter)' : ''}", "Example 2"],
  "analogies": ["Analogy 1${hasKBContext ? ' (enriched with KB insights)' : ''}", "Analogy 2"],
  "questions": ["Thought-provoking question 1", "Question 2"]
}

Make it educational, engaging, and pedagogical!
`;
  }

  /**
   * Enhance a content chunk with AI-powered teaching
   */
  private async enhanceChunk(
    chunk: string,
    teachingStyle: 'socratic' | 'direct' | 'constructivist' | 'encouraging',
    chapterTitle: string
  ): Promise<EnhancedLessonSection> {
    const prompt = this.buildEnhancementPrompt(chunk, teachingStyle, chapterTitle);

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 1500,
        temperature: 0.7
      });

      return this.parseEnhancedSection(response.content, teachingStyle);
    } catch (error) {
      console.error('Error enhancing chunk:', error);

      // Fallback: basic enhancement
      return {
        type: 'concept',
        title: 'Key Concept',
        content: chunk,
        teachingStyle,
        keyPoints: [chunk.substring(0, 100)]
      };
    }
  }

  /**
   * Build prompt for content enhancement
   */
  private buildEnhancementPrompt(
    content: string,
    teachingStyle: 'socratic' | 'direct' | 'constructivist' | 'encouraging',
    chapterTitle: string
  ): string {
    const styleInstructions = {
      socratic: `
        TEACHING STYLE: Socratic Method
        - Ask thoughtful questions that guide students to discover concepts
        - Challenge assumptions and encourage critical thinking
        - Use the "Why?" and "How do you know?" approach
        - Help students connect dots and draw their own conclusions
        - Don't just give answers - help them think through problems
      `,
      direct: `
        TEACHING STYLE: Direct Instruction
        - Provide clear, structured explanations
        - Break complex ideas into simple steps
        - Give concrete examples and demonstrations
        - Be authoritative and informative
        - Focus on accuracy and clarity
        - Teach the "what, why, and how" directly
      `,
      constructivist: `
        TEACHING STYLE: Constructivist
        - Connect new concepts to what students already know
        - Build knowledge progressively from foundation to advanced
        - Encourage students to form their own understanding
        - Use analogies and real-world connections
        - Help students see patterns and relationships
        - Relate abstract concepts to concrete experiences
      `,
      encouraging: `
        TEACHING STYLE: Encouraging Mentor
        - Be supportive and positive
        - Celebrate learning milestones
        - Build confidence in the learner
        - Use encouraging language
        - Focus on growth mindset
        - Make learning feel achievable and exciting
      `
    };

    return `
      You are an expert teacher. Transform the following content using the ${teachingStyle} teaching style.

      ${styleInstructions[teachingStyle]}

      IMPORTANT RULES:
      1. Ground all explanations in the source material - never add false information
      2. Enhance the content with pedagogical techniques
      3. Make it engaging and understandable
      4. If using examples, make them clear and relevant
      5. Keep the core facts accurate

      CONTENT TO ENHANCE:
      ${content}

      CHAPTER: ${chapterTitle}

      Return ONLY a JSON object with this structure:
      {
        "type": "concept|example|analogy|question|summary",
        "title": "Compelling section title",
        "content": "Enhanced explanation in ${teachingStyle} style (200-300 words)",
        "keyPoints": ["Point 1", "Point 2", "Point 3"],
        "examples": ["Concrete example 1", "Concrete example 2"],
        "analogies": ["Simple analogy to explain the concept"],
        "questions": ["Thought-provoking question for reflection"]
      }

      Make it educational, engaging, and pedagogical!
    `;
  }

  /**
   * Chunk content into manageable sections
   */
  private chunkContent(content: string): string[] {
    const maxChunkSize = 800; // characters
    const paragraphs = content.split('\n\n');

    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk);
        currentChunk = paragraph;
      } else {
        currentChunk += '\n\n' + paragraph;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Parse enhanced section from AI response
   */
  private parseEnhancedSection(response: string, teachingStyle: string): EnhancedLessonSection {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return {
          type: data.type || 'concept',
          title: data.title || 'Enhanced Learning',
          content: data.content || response,
          teachingStyle,
          keyPoints: data.keyPoints || [],
          examples: data.examples || [],
          analogies: data.analogies || [],
          questions: data.questions || []
        };
      }
    } catch (error) {
      console.error('Error parsing enhanced section:', error);
    }

    // Fallback
    return {
      type: 'concept',
      title: 'Enhanced Content',
      content: response,
      teachingStyle,
      keyPoints: [response.substring(0, 150)]
    };
  }

  /**
   * Generate learning objectives with optional KB context
   */
  private async generateLearningObjectives(
    content: string,
    chapterTitle: string,
    kbContext?: string
  ): Promise<string[]> {
    const hasKBContext = kbContext && kbContext.trim().length > 0;

    const prompt = `
      Based on this chapter content${hasKBContext ? ' and additional knowledge base context' : ''}, create 3-5 clear learning objectives.
      What should a student be able to DO after learning this?

      Chapter: ${chapterTitle}
      Content: ${content.substring(0, 2000)}
      ${hasKBContext ? `\nAdditional Context:\n${kbContext.substring(0, 1000)}` : ''}

      Format: Return as JSON array of strings.
      Example: ["Define key terms", "Explain the main concept", "Apply to real-world scenarios"]

      ${hasKBContext ? 'Incorporate insights from the knowledge base to create comprehensive, well-rounded objectives.' : ''}
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 400,
        temperature: 0.6
      });

      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error generating learning objectives:', error);
    }

    return [
      `Understand the key concepts in ${chapterTitle}`,
      `Apply the main principles`,
      `Connect to broader learning objectives`
    ];
  }

  /**
   * Extract key vocabulary
   */
  private async extractKeyVocabulary(content: string): Promise<{ term: string; definition: string }[]> {
    const prompt = `
      Extract 5-8 key terms from this content with clear definitions.

      Content: ${content.substring(0, 2000)}

      Return as JSON array:
      [{"term": "Term", "definition": "Clear definition"}]
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 600,
        temperature: 0.5
      });

      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error extracting vocabulary:', error);
    }

    return [];
  }

  /**
   * Generate chapter summary with optional KB context
   */
  private async generateSummary(
    content: string,
    chapterTitle: string,
    kbContext?: string
  ): Promise<string> {
    const hasKBContext = kbContext && kbContext.trim().length > 0;

    const prompt = `
      Create a concise, engaging summary of this chapter.
      Focus on the main ideas and why they matter.

      Chapter: ${chapterTitle}
      Content: ${content.substring(0, 2000)}
      ${hasKBContext ? `\nAdditional Context from Knowledge Base:\n${kbContext.substring(0, 1000)}` : ''}

      Return 2-3 sentences that capture the essence${hasKBContext ? ', incorporating insights from the knowledge base where relevant' : ''}.
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 300,
        temperature: 0.7
      });

      return response.content.trim();
    } catch (error) {
      console.error('Error generating summary:', error);
      return `This chapter covers important concepts in ${chapterTitle}.`;
    }
  }

  /**
   * Generate quick quiz
   */
  private async generateQuickQuiz(content: string, chapterTitle: string): Promise<any[]> {
    const prompt = `
      Create 3 multiple-choice questions based on this chapter content.

      Chapter: ${chapterTitle}
      Content: ${content.substring(0, 2000)}

      Return as JSON array:
      [{
        "question": "Question text",
        "options": ["A", "B", "C", "D"],
        "correctAnswer": 0,
        "explanation": "Why this is correct"
      }]
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 800,
        temperature: 0.7
      });

      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
    }

    return [];
  }

  /**
   * Generate comprehensive lesson from course outline
   * Searches ALL knowledge bases and synthesizes information from all sources
   */
  async generateComprehensiveLesson(
    courseOutline: {
      title: string;
      description: string;
      topics: Array<{
        title: string;
        description: string;
        keyPoints: string[];
      }>;
    },
    subjectIds: string[],
    teachingStyle: 'socratic' | 'direct' | 'constructivist' | 'encouraging' = 'direct'
  ): Promise<EnhancedLesson> {
    console.log(`🎓 Generating comprehensive lesson: "${courseOutline.title}" with ${subjectIds.length} subjects`);

    const enhancedSections: EnhancedLessonSection[] = [];
    const allReferences: any[] = [];

    // Process each topic in the course outline
    for (const topic of courseOutline.topics) {
      console.log(`  📚 Processing topic: ${topic.title}`);

      // Search for relevant content from knowledge bases for THIS specific topic
      const topicContextResult = await this.searchAllSubjectsForTopic(
        topic,
        subjectIds
      );

      // Enhance the topic with relevant KB context
      const topicSection = await this.enhanceTopicWithComprehensiveContext(
        topic,
        teachingStyle,
        topicContextResult
      );

      enhancedSections.push(topicSection);
      allReferences.push(...topicContextResult.references);
    }

    // Generate learning objectives from entire outline
    const learningObjectives = await this.generateLearningObjectivesFromOutline(courseOutline);

    // Generate key vocabulary
    const keyVocabulary = await this.extractKeyVocabularyFromOutline(courseOutline);

    // Generate summary
    const summary = await this.generateSummaryFromOutline(courseOutline);

    // Generate quick quiz
    const quickQuiz = await this.generateQuickQuizFromOutline(courseOutline);

    return {
      chapterId: `comprehensive-${Date.now()}`,
      originalContent: courseOutline.description,
      enhancedSections,
      teachingApproach: this.getTeachingApproachDescription(teachingStyle),
      learningObjectives,
      keyVocabulary,
      summary,
      quickQuiz,
      knowledgeBaseContext: {
        context: '', // Context is integrated into sections
        references: allReferences
      }
    };
  }

  /**
   * Search all subjects for relevant content about a topic
   * Fetches full content ONLY for the most relevant chapters
   */
  private async searchAllSubjectsForTopic(
    topic: { title: string; description: string; keyPoints: string[] },
    subjectIds: string[]
  ): Promise<{ context: string; references: any[] }> {
    const allResults: any[] = [];

    // Create comprehensive search query
    const searchQuery = `${topic.title}: ${topic.description} ${topic.keyPoints.join(' ')}`;

    // Search each subject for relevant content
    for (const subjectId of subjectIds) {
      try {
        const results = await ragService.search(searchQuery, {
          subjectIds: [subjectId],
          limit: 6, // Reduced to stay under TPM limit
          minRelevanceScore: 0.6 // Higher threshold for more relevant content
        });

        allResults.push(...results);
      } catch (error) {
        console.error(`Error searching subject ${subjectId}:`, error);
      }
    }

    // Sort by relevance score
    allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Get top 6 results to stay under TPM limit
    const topResults = allResults.slice(0, 6);

    // Build context and references
    let context = '\n\n--- COMPREHENSIVE KNOWLEDGE BASE CONTENT ---\n\n';
    const references: any[] = [];

    for (const result of topResults) {
      context += `Source: ${result.source.subjectName} > ${result.source.documentTitle} > ${result.source.chapterTitle}\n`;
      // Truncate to 4000 characters per chapter to stay under TPM limit
      const truncatedContent = result.content.length > 4000
        ? result.content.substring(0, 4000) + '\n\n[Content continues...]'
        : result.content;
      context += `${truncatedContent}\n\n`;

      references.push({
        source: `${result.source.subjectName} > ${result.source.documentTitle} > ${result.source.chapterTitle}`,
        relevanceScore: result.relevanceScore,
        excerpt: result.content.substring(0, 300) + '...',
        chapterId: result.source.chapterId,
        documentId: result.source.documentId,
        subjectId: result.source.subjectId,
        subjectName: result.source.subjectName
      });
    }

    // Limit to ~70,000 characters to stay under TPM limit (roughly 18K tokens)
    if (context.length > 70000) {
      context = context.substring(0, 70000);
      context += '\n\n[Additional content truncated...]';
    }

    return { context, references };
  }

  /**
   * Enhance a topic with comprehensive context from all sources
   */
  private async enhanceTopicWithComprehensiveContext(
    topic: { title: string; description: string; keyPoints: string[] },
    teachingStyle: 'socratic' | 'direct' | 'constructivist' | 'encouraging',
    contextResult: { context: string; references: any[] }
  ): Promise<EnhancedLessonSection> {
    const prompt = `
      Create a COMPREHENSIVE ${teachingStyle} lesson using ALL the knowledge base content.
      This should be EXHAUSTIVE, DETAILED, and use every piece of relevant information.

      Topic: ${topic.title}
      Description: ${topic.description}
      Key Points:
      ${topic.keyPoints.map((kp, i) => `  ${i + 1}. ${kp}`).join('\n')}

      **COMPREHENSIVE KNOWLEDGE BASE CONTENT:**
      ${contextResult.context}

      **INSTRUCTIONS:**
      - Create COMPREHENSIVE content (2000-3000 words)
      - Use EVERY piece of relevant information from the KB content
      - Provide detailed explanations with examples, case studies, applications
      - Reference specific sources ("According to Chapter X...")
      - Include definitions, theories, frameworks, practical applications
      - Make it pedagogically rich and thorough
      - This is NOT a summary - it's a comprehensive lesson using ALL KB material

      Format as JSON:
      {
        "type": "concept",
        "title": "${topic.title}",
        "content": "comprehensive, detailed explanation (2000-3000 words) using ALL KB content...",
        "keyPoints": ["detailed point 1", "detailed point 2", "detailed point 3", "detailed point 4"],
        "examples": ["comprehensive example 1", "comprehensive example 2", "comprehensive example 3"]
      }
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 4000, // Increased for more comprehensive content
        temperature: 0.7
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          // Clean the JSON - remove trailing commas before parsing
          let jsonStr = jsonMatch[0];
          // Remove trailing commas before } or ]
          jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');
          const sectionData = JSON.parse(jsonStr);
          return {
            type: sectionData.type || 'concept',
            title: sectionData.title || topic.title,
            content: sectionData.content || topic.description,
            teachingStyle,
            keyPoints: sectionData.keyPoints || topic.keyPoints,
            examples: sectionData.examples || [],
            knowledgeBaseReferences: contextResult.references.map(ref => ({
              source: ref.source,
              relevanceScore: ref.relevanceScore
            }))
          };
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          console.error('Response content:', response.content);
          // Try to extract partial data from the response
          return this.createFallbackSection(topic, contextResult, teachingStyle);
        }
      }
    } catch (error) {
      console.error('Error enhancing topic with context:', error);
    }

    // Fallback
    return {
      type: 'concept',
      title: topic.title,
      content: topic.description,
      teachingStyle,
      keyPoints: topic.keyPoints,
      knowledgeBaseReferences: []
    };
  }

  /**
   * Generate learning objectives from course outline
   */
  private async generateLearningObjectivesFromOutline(outline: any): Promise<string[]> {
    const prompt = `
      Based on this course outline, create 5-7 clear, actionable learning objectives.

      Course: ${outline.title}
      Description: ${outline.description}
      Topics: ${outline.topics.map((t: any) => t.title).join(', ')}

      Return as JSON array of strings.
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 400,
        temperature: 0.7
      });

      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error generating learning objectives:', error);
    }

    return outline.topics.map((t: any) => `Understand ${t.title}`);
  }

  /**
   * Extract key vocabulary from outline
   */
  private async extractKeyVocabularyFromOutline(outline: any): Promise<any[]> {
    const allText = outline.topics.map((t: any) => `${t.title}: ${t.description}`).join(' ');

    const prompt = `
      Extract 8-10 key terms from this course content.

      Content: ${allText.substring(0, 1500)}

      Return as JSON array:
      [{"term": "term", "definition": "definition"}]
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 500,
        temperature: 0.7
      });

      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error extracting vocabulary:', error);
    }

    return [];
  }

  /**
   * Generate summary from outline
   */
  private async generateSummaryFromOutline(outline: any): Promise<string> {
    const prompt = `
      Create a comprehensive summary of this course.

      Course: ${outline.title}
      Description: ${outline.description}
      Topics: ${outline.topics.map((t: any) => `- ${t.title}: ${t.description}`).join('\n')}

      Return 3-4 sentences capturing the essence and importance.
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 400,
        temperature: 0.7
      });

      return response.content.trim();
    } catch (error) {
      console.error('Error generating summary:', error);
      return `This course covers ${outline.title} with emphasis on ${outline.topics[0]?.title}.`;
    }
  }

  /**
   * Generate quiz from outline
   */
  private async generateQuickQuizFromOutline(outline: any): Promise<any[]> {
    const prompt = `
      Create 4 multiple-choice questions covering the entire course outline.

      Course: ${outline.title}
      Topics: ${outline.topics.map((t: any) => t.title).join(', ')}

      Return as JSON array:
      [{
        "question": "Question text",
        "options": ["A", "B", "C", "D"],
        "correctAnswer": 0,
        "explanation": "Why this is correct"
      }]
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 1000,
        temperature: 0.7
      });

      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
    }

    return [];
  }

  /**
   * Create fallback section when JSON parsing fails
   */
  private createFallbackSection(
    topic: { title: string; description: string; keyPoints: string[] },
    contextResult: { context: string; references: any[] },
    teachingStyle: 'socratic' | 'direct' | 'constructivist' | 'encouraging'
  ): EnhancedLessonSection {
    // Include more context for comprehensive content
    const content = `${topic.description}\n\n${contextResult.context.substring(0, 15000)}`;

    return {
      type: 'concept',
      title: topic.title,
      content: content,
      teachingStyle,
      keyPoints: [
        ...topic.keyPoints,
        'Comprehensive coverage of the topic from multiple sources',
        'Detailed explanation with theoretical foundations',
        'Practical applications and examples',
        'Integration of concepts from various chapters'
      ],
      examples: [],
      knowledgeBaseReferences: contextResult.references.map(ref => ({
        source: ref.source,
        relevanceScore: ref.relevanceScore
      }))
    };
  }

  /**
   * Get teaching approach description
   */
  private getTeachingApproachDescription(style: string): string {
    const descriptions = {
      socratic: 'Learn through guided questioning and discovery',
      direct: 'Clear, structured instruction and explanation',
      constructivist: 'Build knowledge through connections and examples',
      encouraging: 'Supportive mentorship with positive reinforcement'
    };
    return descriptions[style] || 'Engaging pedagogical approach';
  }
}

export const enhancedLessonGenerator = new EnhancedLessonGenerator();
