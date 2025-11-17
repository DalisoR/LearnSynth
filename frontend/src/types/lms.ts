export enum LMSProvider {
  CANVAS = 'canvas',
  BLACKBOARD = 'blackboard',
  MOODLE = 'moodle',
  GOOGLE_CLASSROOM = 'google_classroom',
  SCHOOLOGY = 'schoology',
}

export interface LMSUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'student' | 'teacher' | 'ta' | 'admin';
}

export interface LMSCourse {
  id: string;
  name: string;
  courseCode: string;
  description?: string;
  enrollmentCount?: number;
  startDate?: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'archived';
}

export interface LMSAssignment {
  id: string;
  courseId: string;
  name: string;
  description?: string;
  dueDate?: Date;
  pointsPossible?: number;
  status: 'draft' | 'published' | 'completed';
}

export interface LMSGrade {
  id: string;
  userId: string;
  assignmentId: string;
  score: number;
  grade: string;
  submittedAt?: Date;
  gradedAt?: Date;
}

export interface LMSConnection {
  id: string;
  userId: string;
  provider: LMSProvider;
  baseUrl: string;
  createdAt: Date;
  lastSync?: Date;
}

export interface LMSIntegrationConfig {
  provider: LMSProvider;
  baseUrl: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}
