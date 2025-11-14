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
  }
};