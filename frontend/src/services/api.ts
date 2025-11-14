import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Documents
export const documentsAPI = {
  getAll: () => api.get('/documents').then(res => res.data),
  upload: (formData: FormData) =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data),
  getOne: (id: string) => api.get(`/documents/${id}`).then(res => res.data),
  getChapters: (id: string) => api.get(`/documents/${id}/chapters`).then(res => res.data),
  generateLessons: (id: string) => api.post(`/documents/${id}/generate-lessons`).then(res => res.data),
  generateEnhancedLessons: (id: string, config?: any) =>
    api.post(`/lessons/documents/${id}/generate-enhanced-lessons`, { config }).then(res => res.data),
  delete: (id: string) => api.delete(`/documents/${id}`).then(res => res.data),
};

// Lessons
export const lessonsAPI = {
  getOne: (id: string) => api.get(`/lessons/${id}`).then(res => res.data),
  getEnhanced: (id: string) => api.get(`/lessons/${id}/enhanced`).then(res => res.data),
  getLearningPath: (id: string) => api.get(`/lessons/${id}/learning-path`).then(res => res.data),
  getAssessmentResults: (id: string, userId: string) =>
    api.get(`/lessons/${id}/assessments/results`, { params: { userId } }).then(res => res.data),
  narrate: (id: string) => api.post(`/lessons/${id}/narrate`).then(res => res.data),
};

// Subjects
export const subjectsAPI = {
  getAll: () => api.get('/subjects').then(res => res.data),
  create: (data: { name: string; description?: string; color?: string }) =>
    api.post('/subjects', data).then(res => res.data),
  addDocument: (id: string, documentId: string) =>
    api.post(`/subjects/${id}/add-document`, { documentId }).then(res => res.data),
  retrieve: (id: string, query: string) =>
    api.get(`/subjects/${id}/retrieve`, { params: { query } }).then(res => res.data),
};

// Chat
export const chatAPI = {
  startSession: (sessionName?: string, subjectId?: string) =>
    api.post('/chat/start', { sessionName, subjectId }).then(res => res.data),
  sendMessage: (sessionId: string, message: string, includeKB = true) =>
    api.post(`/chat/${sessionId}/message`, { message, includeKB }).then(res => res.data),
  getHistory: (sessionId: string) => api.get(`/chat/${sessionId}/history`).then(res => res.data),
};

// SRS
export const srsAPI = {
  getDue: () => api.get('/srs/due').then(res => res.data),
  submitReview: (srsItemId: string, quality: number) =>
    api.post('/srs/review', { srsItemId, quality }).then(res => res.data),
};

// Groups
export const groupsAPI = {
  create: (data: { name: string; description?: string; isPrivate?: boolean }) =>
    api.post('/groups', data).then(res => res.data),
  getAll: () => api.get('/groups').then(res => res.data),
  assignLesson: (groupId: string, lessonId: string, dueDate?: string) =>
    api.post(`/groups/${groupId}/assign`, { lessonId, dueDate }).then(res => res.data),
  getAnalytics: (groupId: string) => api.get(`/groups/${groupId}/analytics`).then(res => res.data),
};

// Enhanced Lesson Generation
export const enhancedLessonsAPI = {
  generate: (documentId: string, config?: any) =>
    documentsAPI.generateEnhancedLessons(documentId, config),
  getLesson: (id: string) => lessonsAPI.getEnhanced(id),
  getLearningPath: (id: string) => lessonsAPI.getLearningPath(id),
  getAssessmentResults: (lessonId: string, userId: string) =>
    lessonsAPI.getAssessmentResults(lessonId, userId),
};

export default api;
