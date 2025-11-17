export enum LMSProvider {
  CANVAS = 'canvas',
  BLACKBOARD = 'blackboard',
  MOODLE = 'moodle',
  GOOGLE_CLASSROOM = 'google_classroom',
  SCHOOLOGY = 'schoology',
}

export interface LMSConfig {
  provider: LMSProvider;
  baseUrl: string;
  apiKey: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
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

export interface ILMSIntegration {
  getUser(): Promise<LMSUser>;
  getCourses(): Promise<LMSCourse[]>;
  getCourseById(courseId: string): Promise<LMSCourse | null>;
  getAssignments(courseId: string): Promise<LMSAssignment[]>;
  getGrades(courseId: string, userId?: string): Promise<LMSGrade[]>;
  syncGrade(assignmentId: string, userId: string, score: number): Promise<LMSGrade>;
  getEnrollments(courseId: string): Promise<LMSUser[]>;
  createAssignment(courseId: string, assignment: Partial<LMSAssignment>): Promise<LMSAssignment>;
}

export class LMSFactory {
  static create(config: LMSConfig): ILMSIntegration {
    switch (config.provider) {
      case LMSProvider.CANVAS:
        return new CanvasIntegration(config);
      case LMSProvider.BLACKBOARD:
        return new BlackboardIntegration(config);
      case LMSProvider.MOODLE:
        return new MoodleIntegration(config);
      case LMSProvider.GOOGLE_CLASSROOM:
        return new GoogleClassroomIntegration(config);
      case LMSProvider.SCHOOLOGY:
        return new SchoologyIntegration(config);
      default:
        throw new Error(`Unsupported LMS provider: ${config.provider}`);
    }
  }
}

class CanvasIntegration implements ILMSIntegration {
  private config: LMSConfig;

  constructor(config: LMSConfig) {
    this.config = config;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Canvas API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getUser(): Promise<LMSUser> {
    const data = await this.makeRequest('/api/v1/users/self/profile');
    return {
      id: data.id.toString(),
      name: data.name,
      email: data.primary_email,
      avatarUrl: data.avatar_url,
      role: 'student',
    };
  }

  async getCourses(): Promise<LMSCourse[]> {
    const courses = await this.makeRequest('/api/v1/courses?enrollment_state=active');
    return courses.map((course: any) => ({
      id: course.id.toString(),
      name: course.name,
      courseCode: course.course_code,
      description: course.public_description,
      enrollmentCount: course.enrollments?.length,
      status: course.workflow_state as 'active' | 'completed' | 'archived',
    }));
  }

  async getCourseById(courseId: string): Promise<LMSCourse | null> {
    try {
      const course = await this.makeRequest(`/api/v1/courses/${courseId}`);
      return {
        id: course.id.toString(),
        name: course.name,
        courseCode: course.course_code,
        description: course.public_description,
        enrollmentCount: course.enrollments?.length,
        status: course.workflow_state as 'active' | 'completed' | 'archived',
      };
    } catch {
      return null;
    }
  }

  async getAssignments(courseId: string): Promise<LMSAssignment[]> {
    const assignments = await this.makeRequest(`/api/v1/courses/${courseId}/assignments`);
    return assignments.map((assignment: any) => ({
      id: assignment.id.toString(),
      courseId,
      name: assignment.name,
      description: assignment.description,
      dueDate: assignment.due_at ? new Date(assignment.due_at) : undefined,
      pointsPossible: assignment.points_possible,
      status: assignment.published ? 'published' : 'draft',
    }));
  }

  async getGrades(courseId: string, userId?: string): Promise<LMSGrade[]> {
    const endpoint = userId
      ? `/api/v1/courses/${courseId}/students/submissions?student_ids[]=${userId}`
      : `/api/v1/courses/${courseId}/students/submissions`;

    const submissions = await this.makeRequest(endpoint);
    return submissions.map((submission: any) => ({
      id: submission.id.toString(),
      userId: submission.user_id.toString(),
      assignmentId: submission.assignment_id.toString(),
      score: submission.score || 0,
      grade: submission.grade || 'N/A',
      submittedAt: submission.submitted_at ? new Date(submission.submitted_at) : undefined,
      gradedAt: submission.graded_at ? new Date(submission.graded_at) : undefined,
    }));
  }

  async syncGrade(assignmentId: string, userId: string, score: number): Promise<LMSGrade> {
    const submission = await this.makeRequest(
      `/api/v1/courses/assignments/${assignmentId}/submissions/${userId}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          submission: {
            posted_grade: score,
          },
        }),
      }
    );

    return {
      id: submission.id.toString(),
      userId: submission.user_id.toString(),
      assignmentId: submission.assignment_id.toString(),
      score: submission.score || 0,
      grade: submission.grade || 'N/A',
      submittedAt: submission.submitted_at ? new Date(submission.submitted_at) : undefined,
      gradedAt: new Date(),
    };
  }

  async getEnrollments(courseId: string): Promise<LMSUser[]> {
    const enrollments = await this.makeRequest(`/api/v1/courses/${courseId}/enrollments`);
    return enrollments.map((enrollment: any) => ({
      id: enrollment.user_id.toString(),
      name: enrollment.user.sortable_name,
      email: enrollment.user.email,
      avatarUrl: enrollment.user.avatar_url,
      role: enrollment.type.includes('Teacher') ? 'teacher' : 'student',
    }));
  }

  async createAssignment(courseId: string, assignment: Partial<LMSAssignment>): Promise<LMSAssignment> {
    const created = await this.makeRequest(`/api/v1/courses/${courseId}/assignments`, {
      method: 'POST',
      body: JSON.stringify({
        assignment: {
          name: assignment.name,
          description: assignment.description,
          due_at: assignment.dueDate?.toISOString(),
          points_possible: assignment.pointsPossible,
          published: assignment.status === 'published',
        },
      }),
    });

    return {
      id: created.id.toString(),
      courseId,
      name: created.name,
      description: created.description,
      dueDate: created.due_at ? new Date(created.due_at) : undefined,
      pointsPossible: created.points_possible,
      status: created.published ? 'published' : 'draft',
    };
  }
}

class BlackboardIntegration implements ILMSIntegration {
  private config: LMSConfig;

  constructor(config: LMSConfig) {
    this.config = config;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Blackboard API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getUser(): Promise<LMSUser> {
    const data = await this.makeRequest('/learn/api/public/v1/users/me');
    return {
      id: data.id,
      name: data.name.given + ' ' + data.name.family,
      email: data.contact?.email,
      avatarUrl: data.avatar?.viewUrl,
      role: 'student',
    };
  }

  async getCourses(): Promise<LMSCourse[]> {
    const data = await this.makeRequest('/learn/api/public/v1/courses');
    return data.results.map((course: any) => ({
      id: course.id,
      name: course.name,
      courseCode: course.courseId,
      description: course.description,
      enrollmentCount: course.enrollments?.length,
      status: course.availability?.available === 'Yes' ? 'active' : 'archived',
    }));
  }

  async getCourseById(courseId: string): Promise<LMSCourse | null> {
    try {
      const course = await this.makeRequest(`/learn/api/public/v1/courses/${courseId}`);
      return {
        id: course.id,
        name: course.name,
        courseCode: course.courseId,
        description: course.description,
        status: course.availability?.available === 'Yes' ? 'active' : 'archived',
      };
    } catch {
      return null;
    }
  }

  async getAssignments(courseId: string): Promise<LMSAssignment[]> {
    const data = await this.makeRequest(`/learn/api/public/v1/courses/${courseId}/gradebook/columns`);
    return data.results
      .filter((col: any) => col.contentHandler?.id !== 'resource/x-bb-assignment')
      .map((assignment: any) => ({
        id: assignment.id,
        courseId,
        name: assignment.name,
        description: assignment.description,
        dueDate: assignment.due ? new Date(assignment.due) : undefined,
        pointsPossible: assignment.score?.possible,
        status: assignment.availability?.available === 'Yes' ? 'published' : 'draft',
      }));
  }

  async getGrades(courseId: string, userId?: string): Promise<LMSGrade[]> {
    const endpoint = userId
      ? `/learn/api/public/v1/courses/${courseId}/gradebook/users/${userId}/grades`
      : `/learn/api/public/v1/courses/${courseId}/gradebook/users`;

    const data = await this.makeRequest(endpoint);
    return (data.results || [data]).map((grade: any) => ({
      id: grade.id || `${grade.columnId}-${grade.userId}`,
      userId: grade.userId,
      assignmentId: grade.columnId,
      score: grade.score || 0,
      grade: grade.score || 'N/A',
      submittedAt: grade.created ? new Date(grade.created) : undefined,
      gradedAt: grade.modified ? new Date(grade.modified) : undefined,
    }));
  }

  async syncGrade(assignmentId: string, userId: string, score: number): Promise<LMSGrade> {
    await this.makeRequest(
      `/learn/api/public/v2/courses/contents/${assignmentId}/users/${userId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          score: score,
        }),
      }
    );

    return {
      id: `${assignmentId}-${userId}`,
      userId,
      assignmentId,
      score,
      grade: score.toString(),
      gradedAt: new Date(),
    };
  }

  async getEnrollments(courseId: string): Promise<LMSUser[]> {
    const data = await this.makeRequest(`/learn/api/public/v1/courses/${courseId}/users`);
    return data.results.map((user: any) => ({
      id: user.id,
      name: user.name.given + ' ' + user.name.family,
      email: user.contact?.email,
      role: user.systemRoleIds?.includes('Instructor') ? 'teacher' : 'student',
    }));
  }

  async createAssignment(courseId: string, assignment: Partial<LMSAssignment>): Promise<LMSAssignment> {
    const created = await this.makeRequest(`/learn/api/public/v1/courses/${courseId}/contents`, {
      method: 'POST',
      body: JSON.stringify({
        title: assignment.name,
        description: assignment.description,
        availability: {
          available: assignment.status === 'published' ? 'Yes' : 'No',
        },
        due: assignment.dueDate?.toISOString(),
      }),
    });

    return {
      id: created.id,
      courseId,
      name: created.title,
      description: created.description,
      dueDate: assignment.dueDate,
      status: assignment.status || 'draft',
    };
  }
}

class MoodleIntegration implements ILMSIntegration {
  private config: LMSConfig;

  constructor(config: LMSConfig) {
    this.config = config;
  }

  private async makeRequest(functionName: string, params: any = {}) {
    const response = await fetch(`${this.config.baseUrl}/webservice/rest/server.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        wstoken: this.config.apiKey,
        wsfunction: functionName,
        moodlewsrestformat: 'json',
        ...Object.entries(params).reduce((acc, [key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((v, i) => {
              acc[`${key}[${i}]`] = String(v);
            });
          } else {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>),
      }),
    });

    const data = await response.json();

    if (data.exception) {
      throw new Error(`Moodle API error: ${data.message}`);
    }

    return data;
  }

  async getUser(): Promise<LMSUser> {
    const users = await this.makeRequest('core_webservice_get_site_info');
    return {
      id: users.userid.toString(),
      name: users.fullname,
      email: users.useremail,
      role: 'student',
    };
  }

  async getCourses(): Promise<LMSCourse[]> {
    const courses = await this.makeRequest('core_enrol_get_users_courses', {
      userid: await this.getUser().then(u => u.id),
    });

    return courses.map((course: any) => ({
      id: course.id.toString(),
      name: course.fullname,
      courseCode: course.shortname,
      description: course.summary,
      enrollmentCount: course.enrolledusercount,
      startDate: course.startdate ? new Date(course.startdate * 1000) : undefined,
      endDate: course.enddate ? new Date(course.enddate * 1000) : undefined,
      status: course.visible === 1 ? 'active' : 'archived',
    }));
  }

  async getCourseById(courseId: string): Promise<LMSCourse | null> {
    const courses = await this.getCourses();
    return courses.find(c => c.id === courseId) || null;
  }

  async getAssignments(courseId: string): Promise<LMSAssignment[]> {
    const assignments = await this.makeRequest('mod_assign_get_assignments', {
      courseids: [courseId],
    });

    return (assignments.courses || []).flatMap((course: any) =>
      (course.assignments || []).map((assignment: any) => ({
        id: assignment.id.toString(),
        courseId,
        name: assignment.name,
        description: assignment.intro,
        dueDate: assignment.duedate ? new Date(assignment.duedate * 1000) : undefined,
        pointsPossible: assignment.grade,
        status: assignment.visible === 1 ? 'published' : 'draft',
      }))
    );
  }

  async getGrades(courseId: string, userId?: string): Promise<LMSGrade[]> {
    const user = await this.getUser();
    const targetUserId = userId || user.id;

    const grades = await this.makeRequest('gradereport_user_get_grade_items', {
      courseid: courseId,
      userid: targetUserId,
    });

    return (gradeItems.gradeitems || []).map((item: any) => ({
      id: item.id?.toString() || `${item.itemid}-${targetUserId}`,
      userId: targetUserId,
      assignmentId: item.itemid?.toString() || '',
      score: item.graderaw || 0,
      grade: item.gradeformatted || 'N/A',
    }));
  }

  async syncGrade(assignmentId: string, userId: string, score: number): Promise<LMSGrade> {
    await this.makeRequest('mod_assign_save_grade', {
      assignmentid: assignmentId,
      userid: userId,
      grade: score,
    });

    return {
      id: `${assignmentId}-${userId}`,
      userId,
      assignmentId,
      score,
      grade: score.toString(),
      gradedAt: new Date(),
    };
  }

  async getEnrollments(courseId: string): Promise<LMSUser[]> {
    const users = await this.makeRequest('core_enrol_get_enrolled_users', {
      courseid: courseId,
    });

    return users.map((user: any) => ({
      id: user.id.toString(),
      name: user.fullname,
      email: user.email,
      role: user.roles?.some((r: any) => r.shortname === 'editingteacher' || r.shortname === 'teacher') ? 'teacher' : 'student',
    }));
  }

  async createAssignment(courseId: string, assignment: Partial<LMSAssignment>): Promise<LMSAssignment> {
    const created = await this.makeRequest('mod_assign_create_assignments', {
      assignments: [{
        courseid: courseId,
        name: assignment.name,
        intro: assignment.description,
        duedate: assignment.dueDate?.getTime() / 1000,
        grade: assignment.pointsPossible,
      }],
    });

    const assignmentData = created.assignments[0];
    return {
      id: assignmentData.id.toString(),
      courseId,
      name: assignmentData.name,
      description: assignmentData.intro,
      dueDate: assignment.dueDate,
      pointsPossible: assignmentData.grade,
      status: 'draft',
    };
  }
}

class GoogleClassroomIntegration implements ILMSIntegration {
  private config: LMSConfig;

  constructor(config: LMSConfig) {
    this.config = config;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`https://classroom.googleapis.com/v1${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Google Classroom API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getUser(): Promise<LMSUser> {
    const data = await this.makeRequest('/userProfiles/me');
    return {
      id: data.id,
      name: data.name?.fullName,
      email: data.emailAddress,
      avatarUrl: data.photoUrl,
      role: 'student',
    };
  }

  async getCourses(): Promise<LMSCourse[]> {
    const data = await this.makeRequest('/courses?courseStates=ACTIVE');
    return (data.courses || []).map((course: any) => ({
      id: course.id,
      name: course.name,
      courseCode: course.section || course.name,
      description: course.descriptionHeading,
      enrollmentCount: course.enrollmentCode ? undefined : undefined,
      startDate: course.updateTime ? new Date(course.updateTime) : undefined,
      status: course.courseState === 'ACTIVE' ? 'active' : 'archived',
    }));
  }

  async getCourseById(courseId: string): Promise<LMSCourse | null> {
    try {
      const course = await this.makeRequest(`/courses/${courseId}`);
      return {
        id: course.id,
        name: course.name,
        courseCode: course.section || course.name,
        description: course.descriptionHeading,
        status: course.courseState === 'ACTIVE' ? 'active' : 'archived',
      };
    } catch {
      return null;
    }
  }

  async getAssignments(courseId: string): Promise<LMSAssignment[]> {
    const data = await this.makeRequest(`/courses/${courseId}/courseWork`);
    return (data.courseWork || []).map((work: any) => ({
      id: work.id,
      courseId,
      name: work.title,
      description: work.description,
      dueDate: work.dueDate && work.dueTime
        ? new Date(`${work.dueDate.year}-${work.dueDate.month}-${work.dueDate.day}T${work.dueTime.hours}:${work.dueTime.minutes}`)
        : undefined,
      pointsPossible: work.maxPoints,
      status: work.state === 'PUBLISHED' ? 'published' : 'draft',
    }));
  }

  async getGrades(courseId: string, userId?: string): Promise<LMSGrade[]> {
    const data = await this.makeRequest(`/courses/${courseId}/studentSubmissions${userId ? `?userId=${userId}` : ''}`);
    return (data.studentSubmissions || []).map((submission: any) => ({
      id: submission.id,
      userId: submission.userId,
      assignmentId: submission.courseWorkId,
      score: submission.assignedGrade || 0,
      grade: submission.assignedGrade?.toString() || 'N/A',
      submittedAt: submission.updateTime ? new Date(submission.updateTime) : undefined,
      gradedAt: submission.gradeHistory?.gradeModifiedTime
        ? new Date(submission.gradeHistory.gradeModifiedTime)
        : undefined,
    }));
  }

  async syncGrade(assignmentId: string, userId: string, score: number): Promise<LMSGrade> {
    await this.makeRequest(
      `/courses/${assignmentId}/studentSubmissions:patch`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          assignedGrade: score,
          draftGrade: score,
        }),
      }
    );

    return {
      id: `${assignmentId}-${userId}`,
      userId,
      assignmentId,
      score,
      grade: score.toString(),
      gradedAt: new Date(),
    };
  }

  async getEnrollments(courseId: string): Promise<LMSUser[]> {
    const students = await this.makeRequest(`/courses/${courseId}/students`);
    const teachers = await this.makeRequest(`/courses/${courseId}/teachers`);

    return [
      ...(students.students || []).map((s: any) => ({
        id: s.userId,
        name: s.profile?.name?.fullName,
        email: s.profile?.emailAddress,
        avatarUrl: s.profile?.photoUrl,
        role: 'student',
      })),
      ...(teachers.teachers || []).map((t: any) => ({
        id: t.userId,
        name: t.profile?.name?.fullName,
        email: t.profile?.emailAddress,
        avatarUrl: t.profile?.photoUrl,
        role: 'teacher',
      })),
    ];
  }

  async createAssignment(courseId: string, assignment: Partial<LMSAssignment>): Promise<LMSAssignment> {
    const created = await this.makeRequest(`/courses/${courseId}/courseWork`, {
      method: 'POST',
      body: JSON.stringify({
        title: assignment.name,
        description: assignment.description,
        workType: 'ASSIGNMENT',
        state: assignment.status === 'published' ? 'PUBLISHED' : 'DRAFT',
        maxPoints: assignment.pointsPossible,
        dueDate: assignment.dueDate ? {
          year: assignment.dueDate.getFullYear(),
          month: assignment.dueDate.getMonth() + 1,
          day: assignment.dueDate.getDate(),
        } : undefined,
      }),
    });

    return {
      id: created.id,
      courseId,
      name: created.title,
      description: created.description,
      dueDate: assignment.dueDate,
      pointsPossible: created.maxPoints,
      status: created.state === 'PUBLISHED' ? 'published' : 'draft',
    };
  }
}

class SchoologyIntegration implements ILMSIntegration {
  private config: LMSConfig;

  constructor(config: LMSConfig) {
    this.config = config;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Schoology API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getUser(): Promise<LMSUser> {
    const data = await this.makeRequest('/users/me');
    return {
      id: data.id,
      name: `${data.name_first} ${data.name_last}`,
      email: data.email,
      avatarUrl: data.picture_url,
      role: data.role === 'teacher' ? 'teacher' : 'student',
    };
  }

  async getCourses(): Promise<LMSCourse[]> {
    const data = await this.makeRequest('/sections');
    return data.map((section: any) => ({
      id: section.id,
      name: section.title,
      courseCode: section.section_code,
      description: section.description,
      enrollmentCount: section.enrollment_count,
      status: section.active === '1' ? 'active' : 'archived',
    }));
  }

  async getCourseById(courseId: string): Promise<LMSCourse | null> {
    try {
      const course = await this.makeRequest(`/sections/${courseId}`);
      return {
        id: course.id,
        name: course.title,
        courseCode: course.section_code,
        description: course.description,
        status: course.active === '1' ? 'active' : 'archived',
      };
    } catch {
      return null;
    }
  }

  async getAssignments(courseId: string): Promise<LMSAssignment[]> {
    const data = await this.makeRequest(`/sections/${courseId}/assignments`);
    return data.map((assignment: any) => ({
      id: assignment.id,
      courseId,
      name: assignment.title,
      description: assignment.description,
      dueDate: assignment.due ? new Date(assignment.due * 1000) : undefined,
      pointsPossible: assignment.points,
      status: assignment.published === '1' ? 'published' : 'draft',
    }));
  }

  async getGrades(courseId: string, userId?: string): Promise<LMSGrade[]> {
    const endpoint = userId
      ? `/sections/${courseId}/grades/${userId}`
      : `/sections/${courseId}/grades`;

    const data = await this.makeRequest(endpoint);
    return (Array.isArray(data) ? data : [data]).map((grade: any) => ({
      id: grade.id?.toString() || `${grade.assignment_id}-${grade.uid}`,
      userId: grade.uid?.toString() || userId || '',
      assignmentId: grade.assignment_id?.toString() || '',
      score: grade.score || 0,
      grade: grade.score?.toString() || 'N/A',
    }));
  }

  async syncGrade(assignmentId: string, userId: string, score: number): Promise<LMSGrade> {
    await this.makeRequest(
      `/sections/assignments/${assignmentId}/grades/${userId}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          score: score,
        }),
      }
    );

    return {
      id: `${assignmentId}-${userId}`,
      userId,
      assignmentId,
      score,
      grade: score.toString(),
      gradedAt: new Date(),
    };
  }

  async getEnrollments(courseId: string): Promise<LMSUser[]> {
    const data = await this.makeRequest(`/sections/${courseId}/enrollments`);
    return data.map((enrollment: any) => ({
      id: enrollment.uid,
      name: `${enrollment.name_first} ${enrollment.name_last}`,
      email: enrollment.email,
      role: enrollment.role === 'Teacher' ? 'teacher' : 'student',
    }));
  }

  async createAssignment(courseId: string, assignment: Partial<LMSAssignment>): Promise<LMSAssignment> {
    const created = await this.makeRequest(`/sections/${courseId}/assignments`, {
      method: 'POST',
      body: JSON.stringify({
        title: assignment.name,
        description: assignment.description,
        due: assignment.dueDate?.getTime() / 1000,
        points: assignment.pointsPossible,
        published: assignment.status === 'published' ? 1 : 0,
      }),
    });

    return {
      id: created.id,
      courseId,
      name: created.title,
      description: created.description,
      dueDate: assignment.dueDate,
      pointsPossible: created.points,
      status: created.published === '1' ? 'published' : 'draft',
    };
  }
}
