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
  startSession: (sessionName?: string, subjectId?: string, subjectIds?: string[]) =>
    api.post('/chat/start', { sessionName, subjectId, subjectIds }).then(res => res.data),
  sendMessage: (
    sessionId: string,
    message: string,
    options: {
      includeKB?: boolean;
      subjectIds?: string[];
      includeWebSearch?: boolean;
    } = {}
  ) => api.post(`/chat/${sessionId}/message`, { message, ...options }).then(res => res.data),
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
  // Group Management
  create: (data: any) => api.post('/groups', data).then(res => res.data),
  getAll: () => api.get('/groups').then(res => res.data),
  getById: (groupId: string) => api.get(`/groups/${groupId}`).then(res => res.data),
  update: (groupId: string, data: any) => api.put(`/groups/${groupId}`, data).then(res => res.data),
  delete: (groupId: string) => api.delete(`/groups/${groupId}`).then(res => res.data),

  // Join/Leave
  join: (groupId: string) => api.post(`/groups/${groupId}/join`).then(res => res.data),
  requestToJoin: (groupId: string) => api.post(`/groups/${groupId}/request`).then(res => res.data),
  leave: (groupId: string) => api.post(`/groups/${groupId}/leave`).then(res => res.data),

  // Members
  getMembers: (groupId: string) => api.get(`/groups/${groupId}/members`).then(res => res.data),
  updateMember: (groupId: string, userId: string, data: any) =>
    api.put(`/groups/${groupId}/members/${userId}`, data).then(res => res.data),
  removeMember: (groupId: string, userId: string) =>
    api.delete(`/groups/${groupId}/members/${userId}`).then(res => res.data),

  // Invitations
  invite: (groupId: string, data: { email: string; role?: string }) =>
    api.post(`/groups/${groupId}/invite`, data).then(res => res.data),
  acceptInvite: (groupId: string, invite_code: string) =>
    api.post(`/groups/${groupId}/accept`, { invite_code }).then(res => res.data),

  // Materials
  getMaterials: (groupId: string) => api.get(`/groups/${groupId}/materials`).then(res => res.data),
  addMaterial: (groupId: string, data: any) =>
    api.post(`/groups/${groupId}/materials`, data).then(res => res.data),
  updateMaterial: (groupId: string, docId: string, data: any) =>
    api.put(`/groups/${groupId}/materials/${docId}`, data).then(res => res.data),
  removeMaterial: (groupId: string, docId: string) =>
    api.delete(`/groups/${groupId}/materials/${docId}`).then(res => res.data),
  pinMaterial: (groupId: string, docId: string, is_pinned: boolean) =>
    api.post(`/groups/${groupId}/materials/${docId}/pin`, { is_pinned }).then(res => res.data),

  // Quizzes
  getQuizzes: (groupId: string) => api.get(`/groups/${groupId}/quizzes`).then(res => res.data),
  getQuiz: (groupId: string, quizId: string) => api.get(`/groups/${groupId}/quizzes/${quizId}`).then(res => res.data),
  createQuiz: (groupId: string, data: any) => api.post(`/groups/${groupId}/quizzes`, data).then(res => res.data),
  updateQuiz: (groupId: string, quizId: string, data: any) =>
    api.put(`/groups/${groupId}/quizzes/${quizId}`, data).then(res => res.data),
  deleteQuiz: (groupId: string, quizId: string) =>
    api.delete(`/groups/${groupId}/quizzes/${quizId}`).then(res => res.data),
  takeQuiz: (groupId: string, quizId: string, data: any) =>
    api.post(`/groups/${groupId}/quizzes/${quizId}/attempt`, data).then(res => res.data),
  getQuizAttempts: (groupId: string, quizId: string) =>
    api.get(`/groups/${groupId}/quizzes/${quizId}/attempts`).then(res => res.data),
  getLeaderboard: (groupId: string, quizId: string) =>
    api.get(`/groups/${groupId}/quizzes/${quizId}/leaderboard`).then(res => res.data),

  // Discussions
  getDiscussions: (groupId: string) => api.get(`/groups/${groupId}/discussions`).then(res => res.data),
  getDiscussion: (groupId: string, discussionId: string) =>
    api.get(`/groups/${groupId}/discussions/${discussionId}`).then(res => res.data),
  createDiscussion: (groupId: string, data: any) =>
    api.post(`/groups/${groupId}/discussions`, data).then(res => res.data),
  updateDiscussion: (groupId: string, discussionId: string, data: any) =>
    api.put(`/groups/${groupId}/discussions/${discussionId}`, data).then(res => res.data),
  deleteDiscussion: (groupId: string, discussionId: string) =>
    api.delete(`/groups/${groupId}/discussions/${discussionId}`).then(res => res.data),
  pinDiscussion: (groupId: string, discussionId: string, is_pinned: boolean) =>
    api.post(`/groups/${groupId}/discussions/${discussionId}/pin`, { is_pinned }).then(res => res.data),

  // Analytics
  getAnalytics: (groupId: string) => api.get(`/groups/${groupId}/analytics`).then(res => res.data),
  getMemberAnalytics: (groupId: string) => api.get(`/groups/${groupId}/analytics/members`).then(res => res.data),

  // Legacy
  assignLesson: (groupId: string, lessonId: string, dueDate?: string) =>
    api.post(`/groups/${groupId}/assign`, { lessonId, dueDate }).then(res => res.data),
};

// ============================================================
// STUDY PLANNER API
// ============================================================

export const studyPlansAPI = {
  create: (data: any) => api.post('/study-plans', data).then(res => res.data),
  getAll: (params?: any) => api.get('/study-plans', { params }).then(res => res.data),
  getById: (planId: string) => api.get(`/study-plans/${planId}`).then(res => res.data),
  update: (planId: string, data: any) => api.put(`/study-plans/${planId}`, data).then(res => res.data),
  delete: (planId: string) => api.delete(`/study-plans/${planId}`).then(res => res.data),
  generateFromDocument: (data: { name: string; document_id: string; exam_date: string; daily_hours: number }) =>
    api.post('/study-plans/generate-from-document', data).then(res => res.data),
  updateProgress: (planId: string, total_hours_completed: number) =>
    api.put(`/study-plans/${planId}/progress`, { total_hours_completed }).then(res => res.data),
};

export const studySessionsAPI = {
  create: (data: any) => api.post('/study-sessions', data).then(res => res.data),
  getAll: (params?: any) => api.get('/study-sessions', { params }).then(res => res.data),
  getUpcoming: (daysAhead?: number) => api.get('/study-sessions/upcoming', { params: { days_ahead: daysAhead } }).then(res => res.data),
  getById: (sessionId: string) => api.get(`/study-sessions/${sessionId}`).then(res => res.data),
  update: (sessionId: string, data: any) => api.put(`/study-sessions/${sessionId}`, data).then(res => res.data),
  delete: (sessionId: string) => api.delete(`/study-sessions/${sessionId}`).then(res => res.data),
  start: (sessionId: string) => api.post(`/study-sessions/${sessionId}/start`).then(res => res.data),
  complete: (sessionId: string, data: any) => api.post(`/study-sessions/${sessionId}/complete`, data).then(res => res.data),
  reschedule: (sessionId: string, new_start: string, new_end: string) =>
    api.post(`/study-sessions/${sessionId}/reschedule`, { new_start, new_end }).then(res => res.data),
  markMissed: (sessionId: string) => api.post(`/study-sessions/${sessionId}/missed`).then(res => res.data),
};

export const studyGoalsAPI = {
  create: (data: any) => api.post('/study-goals', data).then(res => res.data),
  getAll: (params?: any) => api.get('/study-goals', { params }).then(res => res.data),
  updateProgress: (goalId: string, current_value: number) =>
    api.put(`/study-goals/${goalId}/progress`, { current_value }).then(res => res.data),
  delete: (goalId: string) => api.delete(`/study-goals/${goalId}`).then(res => res.data),
};

export const pomodoroAPI = {
  start: (data: any) => api.post('/study-pomodoro/start', data).then(res => res.data),
  complete: (pomodoroId: string) => api.post(`/study-pomodoro/${pomodoroId}/complete`).then(res => res.data),
  getAll: (params?: any) => api.get('/study-pomodoro', { params }).then(res => res.data),
};

export const studyAnalyticsAPI = {
  getAll: (params?: any) => api.get('/study-analytics', { params }).then(res => res.data),
  getStreak: (daysBack?: number) => api.get('/study-analytics/streak', { params: { days_back: daysBack } }).then(res => res.data),
  getWeeklySummary: () => api.get('/study-analytics/weekly-summary').then(res => res.data),
  getMonthlySummary: () => api.get('/study-analytics/monthly-summary').then(res => res.data),
  getInsights: (studyPlanId?: string) => api.get('/study-analytics/insights', { params: { study_plan_id: studyPlanId } }).then(res => res.data),
};

export const studyRecommendationsAPI = {
  getAll: (studyPlanId?: string) =>
    api.get('/study-recommendations', { params: { study_plan_id: studyPlanId } }).then(res => res.data),
  dismiss: (recommendationId: string) =>
    api.put(`/study-recommendations/${recommendationId}/dismiss`).then(res => res.data),
  generate: (studyPlanId?: string) =>
    api.post('/study-recommendations/generate', { study_plan_id: studyPlanId }).then(res => res.data),
};

export const studyPreferencesAPI = {
  get: () => api.get('/study-preferences').then(res => res.data),
  update: (data: any) => api.put('/study-preferences', data).then(res => res.data),
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
