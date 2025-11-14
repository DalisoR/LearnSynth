/**
 * AI Teaching Assistant
 * Acts as a virtual teacher providing personalized instruction, guidance, and support
 */

import { llmService } from '../llm/factory';
import { supabase } from '../supabase';

export interface TeachingStyle {
  id: string;
  name: string;
  description: string;
  characteristics: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  chapterId?: string;
  messageType: 'question' | 'explanation' | 'clarification' | 'motivation' | 'summary';
}

export interface StudySession {
  id: string;
  userId: string;
  chapterId: string;
  startTime: Date;
  endTime?: Date;
  messages: ChatMessage[];
  progressMade: number;
  conceptsCovered: string[];
}

export interface TeachingRecommendation {
  type: 'review' | 'practice' | 'explain' | 'encourage' | 'challenge';
  content: string;
  confidence: number;
  reason: string;
}

export class AITeachingAssistant {
  private teachingStyles: TeachingStyle[] = [
    {
      id: 'socratic',
      name: 'Socratic Method',
      description: 'Uses guided questioning to help students discover answers',
      characteristics: ['Asks probing questions', 'Encourages critical thinking', 'Guides discovery']
    },
    {
      id: 'direct',
      name: 'Direct Instruction',
      description: 'Clear, straightforward explanations and demonstrations',
      characteristics: ['Clear explanations', 'Step-by-step guidance', 'Structured approach']
    },
    {
      id: 'constructivist',
      name: 'Constructivist',
      description: 'Builds on existing knowledge to create new understanding',
      characteristics: ['Connects to prior knowledge', 'Hands-on learning', 'Real-world applications']
    },
    {
      id: 'encouraging',
      name: 'Encouraging Mentor',
      description: 'Supportive and motivational approach',
      characteristics: ['Positive reinforcement', 'Emotional support', 'Growth mindset']
    }
  ];

  /**
   * Answer a student's question with teaching approach
   */
  async answerQuestion(
    question: string,
    chapterId: string,
    userId: string,
    userProgress: any,
    teachingStyle: string = 'socratic'
  ): Promise<ChatMessage> {
    // Get chapter context
    const { data: chapter } = await supabase
      .from('chapters')
      .select('*')
      .eq('id', chapterId)
      .single();

    if (!chapter) {
      throw new Error('Chapter not found');
    }

    // Get user's learning history
    const { data: progress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .single();

    // Build context-aware prompt
    const prompt = this.buildQuestionAnsweringPrompt(
      question,
      chapter,
      userProgress,
      teachingStyle
    );

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 1500,
        temperature: 0.7
      });

      const message: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        chapterId,
        messageType: 'explanation'
      };

      // Save to database
      await this.saveChatMessage(userId, message);

      return message;
    } catch (error) {
      console.error('Error answering question:', error);

      // Fallback response
      return {
        id: `msg-${Date.now()}-fallback`,
        role: 'assistant',
        content: `I understand you're asking about: "${question}". Let me help you with that. Could you tell me what specific part of the chapter you'd like me to clarify?`,
        timestamp: new Date(),
        chapterId,
        messageType: 'clarification'
      };
    }
  }

  /**
   * Provide personalized teaching moment during reading
   */
  async provideTeachingMoment(
    chapterId: string,
    userId: string,
    contentContext: string,
    momentType: 'encourage' | 'explain' | 'challenge' | 'review' | 'socratic'
  ): Promise<TeachingRecommendation> {
    const { data: userProgress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .single();

    const { data: chapter } = await supabase
      .from('chapters')
      .select('*')
      .eq('id', chapterId)
      .single();

    const prompt = this.buildTeachingMomentPrompt(
      contentContext,
      chapter,
      userProgress,
      momentType
    );

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 500,
        temperature: 0.8
      });

      return {
        type: momentType,
        content: response.content,
        confidence: 0.85,
        reason: `Teaching moment generated based on ${momentType} approach`
      };
    } catch (error) {
      console.error('Error generating teaching moment:', error);

      return {
        type: 'encourage',
        content: "You're doing great! Keep reading and I'll help you understand any challenging concepts.",
        confidence: 0.9,
        reason: 'Fallback encouragement'
      };
    }
  }

  /**
   * Generate Socratic questions to guide student thinking
   */
  async generateSocraticQuestions(
    concept: string,
    chapterContext: string
  ): Promise<string[]> {
    const prompt = `
      Based on this concept: "${concept}"
      And this chapter context: "${chapterContext.substring(0, 1000)}"

      Generate 3-5 Socratic questions that will help a student think critically about this concept.
      The questions should:
      1. Guide the student to discover the answer themselves
      2. Build on prior knowledge
      3. Encourage deeper thinking
      4. Be open-ended (not yes/no)

      Return as JSON array of strings.
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 600,
        temperature: 0.9
      });

      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error generating Socratic questions:', error);
    }

    return [
      `What do you already know about ${concept}?`,
      `How does ${concept} connect to what we've learned before?`,
      `What might happen if ${concept} didn't exist?`,
      `Can you think of a real-world example of ${concept}?`
    ];
  }

  /**
   * Create personalized study plan
   */
  async createStudyPlan(
    userId: string,
    documentId: string,
    goals: string[]
  ): Promise<any> {
    // Get user's learning analytics
    const { data: analytics } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId);

    const { data: chapters } = await supabase
      .from('chapters')
      .select('*')
      .eq('document_id', documentId)
      .order('chapter_number');

    const prompt = `
      Based on the user's learning analytics and goals, create a personalized study plan.

      Goals: ${goals.join(', ')}

      Learning Analytics: ${JSON.stringify(analytics?.slice(0, 10))}
      Available Chapters: ${chapters?.map(c => c.title).join(', ')}

      Create a 7-day study plan with:
      - Daily objectives
      - Recommended chapters to study
      - Practice activities
      - Review sessions
      - Time estimates

      Return as JSON.
    `;

    try {
      const response = await llmService.complete({
        prompt,
        maxTokens: 2000,
        temperature: 0.7
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error creating study plan:', error);
    }

    // Fallback study plan
    return {
      days: chapters?.slice(0, 7).map((chapter, idx) => ({
        day: idx + 1,
        chapter: chapter.title,
        objectives: ['Read chapter', 'Complete practice questions', 'Review key concepts'],
        timeEstimate: '45-60 minutes'
      })) || []
    };
  }

  /**
   * Track study session
   */
  async startStudySession(
    userId: string,
    chapterId: string
  ): Promise<StudySession> {
    const session: StudySession = {
      id: `session-${Date.now()}-${userId}`,
      userId,
      chapterId,
      startTime: new Date(),
      messages: [],
      progressMade: 0,
      conceptsCovered: []
    };

    // Save to database
    await supabase
      .from('study_sessions')
      .insert({
        id: session.id,
        user_id: userId,
        chapter_id: chapterId,
        start_time: session.startTime,
        messages: [],
        progress_made: 0,
        concepts_covered: []
      });

    return session;
  }

  /**
   * End study session and generate insights
   */
  async endStudySession(sessionId: string): Promise<any> {
    const { data: session } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session) return null;

    const insights = {
      duration: new Date().getTime() - new Date(session.start_time).getTime(),
      messageCount: session.messages?.length || 0,
      progressMade: session.progress_made,
      conceptsCovered: session.concepts_covered || [],
      engagement: this.calculateEngagementScore(session)
    };

    return insights;
  }

  /**
   * Get teaching style recommendations
   */
  getRecommendedStyle(userId: string): TeachingStyle {
    // For now, return Socratic method as it's most effective for deep learning
    // In production, this would analyze user preferences and learning patterns
    return this.teachingStyles[0];
  }

  /**
   * Build question answering prompt
   */
  private buildQuestionAnsweringPrompt(
    question: string,
    chapter: any,
    userProgress: any,
    teachingStyle: string
  ): string {
    const style = this.teachingStyles.find(s => s.id === teachingStyle) || this.teachingStyles[0];

    return `
      You are an expert AI teaching assistant with a ${style.name} teaching style.

      Teaching Style Description: ${style.description}
      Characteristics: ${style.characteristics.join(', ')}

      Chapter: ${chapter.title}
      Content: ${chapter.content.substring(0, 2000)}

      Student's question: ${question}

      ${userProgress ? `
        Student Progress:
        - Reading Progress: ${userProgress.reading_progress || 0}%
        - Quiz Scores: ${userProgress.quiz_scores || 'N/A'}
        - Time Spent: ${userProgress.time_spent || 0} minutes
      ` : 'This is the student\'s first interaction with this chapter.'}

      Provide a helpful response that:
      1. Directly addresses the student's question
      2. Uses the ${style.name} teaching approach
      3. Is encouraging and supportive
      4. If explaining a concept, provide examples
      5. Ask follow-up questions to check understanding

      Keep your response conversational and engaging, as if you're a patient teacher helping a student.
    `;
  }

  /**
   * Build teaching moment prompt
   */
  private buildTeachingMomentPrompt(
    contentContext: string,
    chapter: any,
    userProgress: any,
    momentType: string
  ): string {
    const messages = {
      encourage: "Provide encouraging words that motivate the student to continue learning.",
      explain: "Explain the concept in the content context clearly and simply.",
      challenge: "Pose a thought-provoking question that extends the student's thinking.",
      review: "Remind the student of key concepts they've learned.",
      socratic: "Ask a question that guides the student to think deeper."
    };

    return `
      You are an AI teaching assistant. Generate a ${momentType} teaching moment.

      Chapter: ${chapter.title}
      Content Context: ${contentContext.substring(0, 800)}

      ${messages[momentType] || messages.encourage}

      Be brief but impactful (2-3 sentences max). Sound like a supportive teacher.
    `;
  }

  /**
   * Save chat message to database
   */
  private async saveChatMessage(userId: string, message: ChatMessage): Promise<void> {
    await supabase
      .from('chat_messages')
      .insert({
        id: message.id,
        user_id: userId,
        chapter_id: message.chapterId,
        role: message.role,
        content: message.content,
        message_type: message.messageType,
        timestamp: message.timestamp
      });
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(session: any): number {
    let score = 0;

    // Time spent (more time = higher engagement)
    const duration = new Date().getTime() - new Date(session.start_time).getTime();
    if (duration > 30 * 60 * 1000) score += 30; // 30+ minutes
    else if (duration > 15 * 60 * 1000) score += 20; // 15+ minutes
    else if (duration > 5 * 60 * 1000) score += 10; // 5+ minutes

    // Messages exchanged
    const messageCount = session.messages?.length || 0;
    score += Math.min(messageCount * 5, 30);

    // Progress made
    score += session.progress_made || 0;

    return Math.min(score, 100);
  }
}

export const aiTeachingAssistant = new AITeachingAssistant();
