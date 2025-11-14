import { LLMService, LLMRequest, LLMResponse, LessonGenerationRequest, ChatRequest } from './types';

export class StubLLMService implements LLMService {
  private model = 'stub-model-v1';

  async generate(request: LLMRequest): Promise<LLMResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Detect request type and return appropriate stub
    const prompt = request.prompt.toLowerCase();

    if (prompt.includes('lesson') || prompt.includes('generate')) {
      return this.generateStubLesson(request);
    } else if (prompt.includes('chat') || prompt.includes('question')) {
      return this.generateStubChat(request);
    }

    return {
      content: `Stub response for: ${request.prompt.substring(0, 50)}...`,
      tokensUsed: Math.floor(Math.random() * 100) + 50,
      model: this.model,
    };
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    return this.generate(request);
  }

  private generateStubLesson(request: LLMRequest): LLMResponse {
    const lesson = {
      lesson_id: `lesson-${Date.now()}`,
      chapter_id: `chapter-${Date.now()}`,
      lesson_title: "Introduction to Key Concepts",
      summary: "This lesson covers fundamental concepts that build the foundation for understanding the topic. Key learning objectives include comprehension of core principles, application of theoretical knowledge, and development of critical thinking skills.",
      key_concepts: [
        "Core Principle 1: Fundamental concepts and definitions",
        "Core Principle 2: Historical context and development",
        "Core Principle 3: Practical applications and implications",
        "Core Principle 4: Connection to broader frameworks"
      ],
      quiz: [
        {
          question: "What is the most important concept introduced in this lesson?",
          options: [
            "Understanding the basic terminology",
            "Grasping the underlying principles",
            "Memorizing specific facts",
            "Repeating definitions verbatim"
          ],
          correct_index: 1,
          explanation: "The foundational understanding of principles is more valuable than rote memorization."
        },
        {
          question: "Which principle forms the basis for practical application?",
          options: [
            "Theoretical knowledge alone",
            "Memorized information",
            "Conceptual understanding combined with practice",
            "Repetitive review"
          ],
          correct_index: 2,
          explanation: "True mastery comes from combining conceptual understanding with practical application."
        }
      ],
      flashcards: [
        {
          id: "fc-1",
          front: "What are the three main components of this concept?",
          back: "1. Theoretical Foundation 2. Practical Application 3. Critical Analysis"
        },
        {
          id: "fc-2",
          front: "How does this concept relate to real-world scenarios?",
          back: "The concept provides a framework for understanding complex situations and making informed decisions based on evidence and logical reasoning."
        }
      ],
      narration_text: "Welcome to this comprehensive lesson on fundamental concepts. In this lesson, we will explore the key principles that form the foundation of this subject. Let's begin by examining the core ideas that will guide our understanding throughout this journey.",
      references: [
        {
          source_doc: "Chapter Reference",
          source_chapter: "Chapter 1: Introduction",
          chapter_id: "ch-1",
          source_origin: "chapter"
        }
      ],
      ai_log_id: `log-${Date.now()}`
    };

    return {
      content: JSON.stringify(lesson, null, 2),
      tokensUsed: 350,
      model: this.model,
    };
  }

  private generateStubChat(request: LLMRequest): LLMResponse {
    const responses = [
      "Based on the knowledge base information, I can help explain this concept clearly. Here's what I found: The topic involves several interconnected ideas that build upon each other. The key is understanding how these pieces fit together to form a cohesive framework.",
      "This is a great question! Drawing from the materials in your knowledge base, we can see that this concept relates to several fundamental principles. Let me break this down step by step for better understanding.",
      "Looking at your uploaded materials, I can provide context on this topic. The information suggests that this concept is part of a larger framework. Would you like me to explain how it connects to other ideas?",
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    return {
      content: randomResponse,
      tokensUsed: 75,
      model: this.model,
    };
  }
}
