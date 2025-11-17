import { createLLMService } from '../llm/factory';
import conversationMemoryService from './conversationMemoryService';

export interface SocraticSession {
  id: string;
  userId: string;
  topic: string;
  subject: string;
  currentStage: 'exploration' | 'questioning' | 'reflection' | 'conclusion';
  questionCount: number;
  understandingScore?: number;
  createdAt: number;
}

export interface SocraticQuestion {
  id: string;
  type: 'opening' | 'probing' | 'clarifying' | 'challenging' | 'reflective' | 'closing';
  question: string;
  hint?: string;
  followUpQuestions?: string[];
  expectedConcepts?: string[];
  reasoning?: string;
}

class SocraticTutorService {
  private llmService = createLLMService();

  /**
   * Initialize a Socratic tutoring session
   */
  async initializeSession(
    userId: string,
    topic: string,
    subject: string,
    userQuestion?: string
  ): Promise<SocraticSession> {
    const session: SocraticSession = {
      id: `socratic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      topic,
      subject,
      currentStage: 'exploration',
      questionCount: 0,
      createdAt: Date.now(),
    };

    // Create a conversation session for memory
    await conversationMemoryService.createSession(
      userId,
      `Socratic: ${topic}`,
      subject,
      topic
    );

    return session;
  }

  /**
   * Generate the next Socratic question
   */
  async generateQuestion(
    session: SocraticSession,
    userResponse: string,
    conversationHistory: string[]
  ): Promise<SocraticQuestion> {
    const systemPrompt = this.buildSystemPrompt(session);

    const context = {
      topic: session.topic,
      subject: session.subject,
      stage: session.currentStage,
      questionCount: session.questionCount,
      conversationHistory: conversationHistory.join('\n'),
      userResponse,
    };

    const prompt = `Generate the next Socratic question based on the student's response.
Current stage: ${session.currentStage}
Student response: ${userResponse}

Return a JSON object with the following structure:
{
  "type": "opening|probing|clarifying|challenging|reflective|closing",
  "question": "The actual question to ask",
  "hint": "Optional hint to guide thinking",
  "followUpQuestions": ["array", "of", "possible", "follow-ups"],
  "expectedConcepts": ["concepts", "student", "should", "know"],
  "reasoning": "Why this question was chosen"
}`;

    const response = await this.llmService.generate({
      prompt,
      context: JSON.stringify(context),
      systemPrompt,
    });

    try {
      const question = JSON.parse(response.content);
      return {
        ...question,
        id: `q-${Date.now()}`,
      };
    } catch (error) {
      // Fallback to a default probing question
      return this.createFallbackQuestion(session, userResponse);
    }
  }

  /**
   * Process user response and determine next action
   */
  async processResponse(
    session: SocraticSession,
    userResponse: string
  ): Promise<{
    question?: SocraticQuestion;
    feedback?: string;
    shouldAdvance: boolean;
    newStage: SocraticSession['currentStage'];
    understandingScore?: number;
  }> {
    // Add user response to memory
    const memorySession = await this.findMemorySession(session.userId, session.topic);
    if (memorySession) {
      await conversationMemoryService.addMessage(
        memorySession.id,
        session.userId,
        'user',
        userResponse,
        {
          subject: session.subject,
          topic: session.topic,
        }
      );
    }

    // Analyze understanding
    const understandingScore = await this.assessUnderstanding(session, userResponse);

    // Determine if should advance stage
    const shouldAdvance = this.shouldAdvanceStage(session, understandingScore);

    let newStage = session.currentStage;
    let feedback: string | undefined;

    if (shouldAdvance) {
      newStage = this.getNextStage(session.currentStage);
      feedback = this.getStageTransitionMessage(newStage);
    }

    // Generate next question if not at conclusion
    let question: SocraticQuestion | undefined;
    if (newStage !== 'conclusion') {
      const conversationHistory = await this.getConversationHistory(session.userId, session.topic);
      question = await this.generateQuestion(session, userResponse, conversationHistory);
    } else {
      feedback = this.getConclusionMessage(session.topic);
    }

    return {
      question,
      feedback,
      shouldAdvance,
      newStage,
      understandingScore,
    };
  }

  /**
   * Assess student understanding based on response
   */
  private async assessUnderstanding(
    session: SocraticSession,
    userResponse: string
  ): Promise<number> {
    const prompt = `Assess the student's understanding level from their response (0-100):

Topic: ${session.topic}
Response: ${userResponse}

Consider:
- Clarity of explanation
- Use of relevant concepts
- Depth of understanding
- Accuracy of information

Return just a number between 0-100.`;

    const response = await this.llmService.generate({
      prompt,
      systemPrompt: 'You are an expert educator. Rate understanding objectively.',
    });

    const score = parseInt(response.content.match(/\d+/)?.[0] || '50', 10);
    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Determine if stage should advance
   */
  private shouldAdvanceStage(
    session: SocraticSession,
    understandingScore: number
  ): boolean {
    const thresholds = {
      exploration: 30,
      questioning: 50,
      reflection: 70,
    };

    const threshold = thresholds[session.currentStage] || 100;
    return understandingScore >= threshold || session.questionCount >= 10;
  }

  /**
   * Get next stage in Socratic method
   */
  private getNextStage(
    currentStage: SocraticSession['currentStage']
  ): SocraticSession['currentStage'] {
    const stageOrder: SocraticSession['currentStage'][] = [
      'exploration',
      'questioning',
      'reflection',
      'conclusion',
    ];

    const currentIndex = stageOrder.indexOf(currentStage);
    if (currentIndex < stageOrder.length - 1) {
      return stageOrder[currentIndex + 1];
    }

    return 'conclusion';
  }

  /**
   * Build system prompt for Socratic tutoring
   */
  private buildSystemPrompt(session: SocraticSession): string {
    return `You are a Socratic tutor helping a student learn about "${session.topic}" in ${session.subject}.

Your teaching philosophy:
- Guide learning through questions, not answers
- Help students discover knowledge themselves
- Ask one question at a time
- Build on previous answers
- Encourage critical thinking
- Be patient and supportive

Current tutoring stage: ${session.currentStage}

Stages:
1. EXPLORATION: Discover what the student already knows
2. QUESTIONING: Probe deeper into concepts
3. REFLECTION: Help student synthesize learning
4. CONCLUSION: Summarize and reinforce learning

Rules:
- Never give direct answers
- Ask open-ended questions
- Use "What do you think about...?" or "How might...?"
- Build complexity gradually
- Encourage student to explain their reasoning
- Provide hints when stuck, not solutions`;
  }

  /**
   * Get stage transition message
   */
  private getStageTransitionMessage(stage: SocraticSession['currentStage']): string {
    const messages = {
      exploration: "Great! Let's dive deeper into your understanding.",
      questioning: "Excellent insights! Now let's explore this further.",
      reflection: " Wonderful! Let's reflect on what we've learned.",
      conclusion: "Let's wrap up our learning journey.",
    };

    return messages[stage];
  }

  /**
   * Get conclusion message
   */
  private getConclusionMessage(topic: string): string {
    return `We've completed our Socratic exploration of ${topic}. You've shown excellent thinking and deep understanding! Feel free to ask more questions anytime.`;
  }

  /**
   * Find memory session for Socratic session
   */
  private async findMemorySession(userId: string, topic: string): Promise<string | null> {
    const sessions = await conversationMemoryService.getUserSessions(userId);
    const socraticSession = sessions.find(
      s => s.title === `Socratic: ${topic}` || s.topic === topic
    );
    return socraticSession?.id || null;
  }

  /**
   * Get conversation history
   */
  private async getConversationHistory(userId: string, topic: string): Promise<string[]> {
    const sessionId = await this.findMemorySession(userId, topic);
    if (!sessionId) return [];

    const messages = await conversationMemoryService.getContextForAI(sessionId);
    return messages.map(m => `${m.role}: ${m.content}`);
  }

  /**
   * Create fallback question
   */
  private createFallbackQuestion(
    session: SocraticSession,
    userResponse: string
  ): SocraticQuestion {
    const fallbackQuestions = {
      exploration: `What is your initial understanding of ${session.topic}?`,
      questioning: `Can you elaborate on what you just said about ${session.topic}?`,
      reflection: `How does this connect to what you already know about ${session.topic}?`,
      conclusion: `What would you say is the most important thing you learned about ${session.topic}?`,
    };

    return {
      id: `fallback-${Date.now()}`,
      type: session.currentStage === 'exploration' ? 'opening' : 'probing',
      question: fallbackQuestions[session.currentStage] || `Let's explore ${session.topic} further.`,
      reasoning: 'Fallback question generated due to parsing error',
    };
  }

  /**
   * Get session summary
   */
  async getSessionSummary(session: SocraticSession): Promise<string> {
    const conversationHistory = await this.getConversationHistory(session.userId, session.topic);

    const prompt = `Create a learning summary based on this Socratic tutoring session:

Topic: ${session.topic}
Conversation:
${conversationHistory.join('\n')}

Provide a concise summary highlighting:
1. Key concepts explored
2. Student's understanding growth
3. Important insights discovered
4. Recommendations for further study`;

    const response = await this.llmService.generate({
      prompt,
      systemPrompt: 'You are creating an educational summary of a Socratic tutoring session.',
    });

    return response.content;
  }
}

export default new SocraticTutorService();
