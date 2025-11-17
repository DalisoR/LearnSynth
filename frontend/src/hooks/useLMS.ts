import { useState, useEffect } from 'react';
import { LMSProvider } from '@/types/lms';

interface LMSUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'student' | 'teacher' | 'ta' | 'admin';
}

interface LMSCourse {
  id: string;
  name: string;
  courseCode: string;
  description?: string;
  enrollmentCount?: number;
  startDate?: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'archived';
}

interface LMSAssignment {
  id: string;
  courseId: string;
  name: string;
  description?: string;
  dueDate?: Date;
  pointsPossible?: number;
  status: 'draft' | 'published' | 'completed';
}

interface LMSGrade {
  id: string;
  userId: string;
  assignmentId: string;
  score: number;
  grade: string;
  submittedAt?: Date;
  gradedAt?: Date;
}

interface LMSConnectionStatus {
  connected: boolean;
  provider: LMSProvider | null;
}

export function useLMS() {
  const [status, setStatus] = useState<LMSConnectionStatus>({
    connected: false,
    provider: null,
  });
  const [courses, setCourses] = useState<LMSCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/lms/status');
      const data = await response.json();
      setStatus(data);
      return data;
    } catch (err) {
      console.error('Failed to check LMS connection:', err);
      return { connected: false, provider: null };
    }
  };

  const connect = async (config: {
    provider: LMSProvider;
    baseUrl: string;
    apiKey: string;
    clientId?: string;
    clientSecret?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/lms/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to connect to LMS');
      }

      const data = await response.json();
      await checkConnection();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      setLoading(true);
      await fetch('/api/lms/disconnect', { method: 'POST' });
      await checkConnection();
      setCourses([]);
    } catch (err) {
      console.error('Failed to disconnect from LMS:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/lms/courses');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch courses');
      }

      const data = await response.json();
      setCourses(data.courses);
      return data.courses;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchCourse = async (courseId: string): Promise<LMSCourse | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/lms/courses/${courseId}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch course');
      }

      const data = await response.json();
      return data.course;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async (courseId: string): Promise<LMSAssignment[]> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/lms/courses/${courseId}/assignments`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch assignments');
      }

      const data = await response.json();
      return data.assignments;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async (
    courseId: string,
    userId?: string
  ): Promise<LMSGrade[]> => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL(`/api/lms/courses/${courseId}/grades`, window.location.origin);
      if (userId) {
        url.searchParams.append('userId', userId);
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch grades');
      }

      const data = await response.json();
      return data.grades;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const syncGrade = async (
    assignmentId: string,
    userId: string,
    score: number
  ): Promise<LMSGrade> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/lms/sync-grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignmentId, userId, score }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to sync grade');
      }

      const data = await response.json();
      return data.grade;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollments = async (courseId: string): Promise<LMSUser[]> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/lms/courses/${courseId}/enrollments`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch enrollments');
      }

      const data = await response.json();
      return data.enrollments;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async (
    courseId: string,
    assignment: Partial<LMSAssignment>
  ): Promise<LMSAssignment> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/lms/courses/${courseId}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignment),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create assignment');
      }

      const data = await response.json();
      return data.assignment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return {
    status,
    courses,
    loading,
    error,
    connect,
    disconnect,
    fetchCourses,
    fetchCourse,
    fetchAssignments,
    fetchGrades,
    syncGrade,
    fetchEnrollments,
    createAssignment,
    refreshStatus: checkConnection,
  };
}
