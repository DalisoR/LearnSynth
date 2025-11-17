export interface TestUser {
  id: string;
  email: string;
  password: string;
  fullName: string;
  role: 'student' | 'instructor' | 'admin';
}

export const testUsers: TestUser[] = [
  {
    id: 'test-student-1',
    email: 'student@test.com',
    password: 'TestPassword123!',
    fullName: 'Test Student',
    role: 'student',
  },
  {
    id: 'test-instructor-1',
    email: 'instructor@test.com',
    password: 'TestPassword123!',
    fullName: 'Test Instructor',
    role: 'instructor',
  },
  {
    id: 'test-admin-1',
    email: 'admin@test.com',
    password: 'TestPassword123!',
    fullName: 'Test Admin',
    role: 'admin',
  },
];

export const testSubjects = [
  {
    id: 'subject-1',
    name: 'Introduction to Biology',
    description: 'Basic concepts in biology',
    color: '#3b82f6',
  },
  {
    id: 'subject-2',
    name: 'Advanced Mathematics',
    description: 'Calculus and beyond',
    color: '#10b981',
  },
];

export const testDocuments = [
  {
    id: 'doc-1',
    title: 'Biology Textbook Chapter 1',
    fileType: 'pdf',
    subjectId: 'subject-1',
  },
  {
    id: 'doc-2',
    title: 'Mathematics Formulas',
    fileType: 'pdf',
    subjectId: 'subject-2',
  },
];

export const testChapters = [
  {
    id: 'chapter-1',
    title: 'Cell Structure',
    content: 'Cells are the basic building blocks of all living things...',
    documentId: 'doc-1',
    chapterNumber: 1,
  },
  {
    id: 'chapter-2',
    title: 'Derivatives',
    content: 'A derivative represents the rate of change...',
    documentId: 'doc-2',
    chapterNumber: 1,
  },
];

export const testLessons = [
  {
    id: 'lesson-1',
    title: 'Understanding Cell Membrane',
    chapterId: 'chapter-1',
    summary: 'Learn about the structure and function of cell membranes',
  },
  {
    id: 'lesson-2',
    title: 'Power Rule',
    chapterId: 'chapter-2',
    summary: 'Master the power rule for derivatives',
  },
];

export const testStudyGroups = [
  {
    id: 'group-1',
    name: 'Biology Study Group',
    description: 'Study group for biology students',
    isPrivate: false,
    ownerId: 'test-instructor-1',
  },
];

export const testFlashcards = [
  {
    id: 'flashcard-1',
    front: 'What is photosynthesis?',
    back: 'The process by which plants convert light energy into chemical energy',
    deckId: 'deck-1',
  },
  {
    id: 'flashcard-2',
    front: 'What is a derivative?',
    back: 'The rate of change of a function',
    deckId: 'deck-1',
  },
];

export const testMindMaps = [
  {
    id: 'mindmap-1',
    title: 'Cell Biology Overview',
    sourceType: 'lesson',
    sourceId: 'lesson-1',
    aiGenerated: true,
  },
];

export const testPracticeProblems = [
  {
    id: 'problem-1',
    question: 'What is the primary function of mitochondria?',
    problemType: 'multiple_choice',
    options: [
      'Protein synthesis',
      'Energy production',
      'DNA storage',
      'Waste removal',
    ],
    correctAnswer: 'Energy production',
    difficulty: 50,
    topic: 'Cell Biology',
  },
];
