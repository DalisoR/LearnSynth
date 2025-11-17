export const learningApi = {
  // Get all chapters for a document
  getChapters: async (documentId: string, userId: string) => {
    const response = await fetch(
      `http://localhost:4000/api/learning/chapters/${documentId}?userId=${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch chapters');
    }
    return data.chapters;
  },

  // Get specific chapter content
  getChapter: async (chapterId: string, userId: string) => {
    const response = await fetch(
      `http://localhost:4000/api/learning/chapter/${chapterId}?userId=${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch chapter');
    }
    return data.chapter;
  },

  // Generate enhanced lesson from chapter
  generateLesson: async (chapterId: string, config?: any) => {
    const response = await fetch(`http://localhost:4000/api/lessons/chapters/${chapterId}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        config: config || {
          level: 'intermediate',
          includeVisuals: false,
          includeAssessments: false,
          targetTime: 20
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate lesson');
    }

    return response.json();
  },

  // Parse free-form course outline into structured format
  parseCourseOutline: async (outlineText: string) => {
    const response = await fetch(`http://localhost:4000/api/learning/parse-course-outline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ outlineText })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to parse course outline');
    }

    return response.json();
  },

  // Generate comprehensive lesson from course outline
  generateComprehensiveLesson: async (
    courseOutline: any,
    subjectIds: string[],
    teachingStyle: 'socratic' | 'direct' | 'constructivist' | 'encouraging' = 'direct'
  ) => {
    const response = await fetch(`http://localhost:4000/api/learning/generate-enhanced-lesson-with-kb`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        mode: 'comprehensive',
        courseOutline,
        subjectIds,
        teachingStyle
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate comprehensive lesson');
    }

    return response.json();
  },

  // Generate enhanced lesson with KB support (standard mode)
  generateLessonWithKB: async (
    chapterId: string,
    chapterTitle: string,
    chapterContent: string,
    teachingStyle: 'socratic' | 'direct' | 'constructivist' | 'encouraging',
    knowledgeBaseIds: string[] = []
  ) => {
    const response = await fetch(`http://localhost:4000/api/learning/generate-enhanced-lesson-with-kb`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        mode: 'standard',
        chapterId,
        chapterTitle,
        chapterContent,
        teachingStyle,
        knowledgeBaseIds
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate lesson with KB');
    }

    return response.json();
  }
};