import { Router } from 'express';
import { LMSFactory, LMSProvider, LMSConfig } from '../services/lms/lmsFactory';
import logger from '../utils/logger';

const router = Router();

// Store LMS configurations (in production, use a secure database)
const lmsConfigurations = new Map<string, LMSConfig>();

// Connect to an LMS platform
router.post('/connect', async (req, res) => {
  try {
    const { provider, baseUrl, apiKey, clientId, clientSecret } = req.body;

    if (!provider || !baseUrl || !apiKey) {
      return res.status(400).json({
        error: 'Missing required fields: provider, baseUrl, apiKey',
      });
    }

    const config: LMSConfig = {
      provider,
      baseUrl,
      apiKey,
      clientId,
      clientSecret,
    };

    // Test the connection
    const lms = LMSFactory.create(config);
    const user = await lms.getUser();

    // Store configuration (associate with authenticated user)
    const userId = req.user?.id || 'test-user';
    lmsConfigurations.set(userId, config);

    res.json({
      success: true,
      message: `Successfully connected to ${provider}`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: any) {
    logger.error('LMS connection error:', error);
    res.status(500).json({
      error: 'Failed to connect to LMS',
      details: error.message,
    });
  }
});

// Get LMS courses
router.get('/courses', async (req, res) => {
  try {
    const userId = req.user?.id || 'test-user';
    const config = lmsConfigurations.get(userId);

    if (!config) {
      return res.status(404).json({
        error: 'No LMS configuration found. Please connect to an LMS first.',
      });
    }

    const lms = LMSFactory.create(config);
    const courses = await lms.getCourses();

    res.json({ courses });
  } catch (error: any) {
    logger.error('Error fetching LMS courses:', error);
    res.status(500).json({
      error: 'Failed to fetch courses',
      details: error.message,
    });
  }
});

// Get a specific course
router.get('/courses/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id || 'test-user';
    const config = lmsConfigurations.get(userId);

    if (!config) {
      return res.status(404).json({
        error: 'No LMS configuration found',
      });
    }

    const lms = LMSFactory.create(config);
    const course = await lms.getCourseById(courseId);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({ course });
  } catch (error: any) {
    logger.error('Error fetching LMS course:', error);
    res.status(500).json({
      error: 'Failed to fetch course',
      details: error.message,
    });
  }
});

// Get assignments for a course
router.get('/courses/:courseId/assignments', async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id || 'test-user';
    const config = lmsConfigurations.get(userId);

    if (!config) {
      return res.status(404).json({
        error: 'No LMS configuration found',
      });
    }

    const lms = LMSFactory.create(config);
    const assignments = await lms.getAssignments(courseId);

    res.json({ assignments });
  } catch (error: any) {
    logger.error('Error fetching LMS assignments:', error);
    res.status(500).json({
      error: 'Failed to fetch assignments',
      details: error.message,
    });
  }
});

// Get grades for a course
router.get('/courses/:courseId/grades', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { userId: queryUserId } = req.query;
    const userId = req.user?.id || 'test-user';
    const config = lmsConfigurations.get(userId);

    if (!config) {
      return res.status(404).json({
        error: 'No LMS configuration found',
      });
    }

    const lms = LMSFactory.create(config);
    const grades = await lms.getGrades(courseId, queryUserId as string);

    res.json({ grades });
  } catch (error: any) {
    logger.error('Error fetching LMS grades:', error);
    res.status(500).json({
      error: 'Failed to fetch grades',
      details: error.message,
    });
  }
});

// Sync a grade to LMS
router.post('/sync-grade', async (req, res) => {
  try {
    const { assignmentId, userId, score } = req.body;

    if (!assignmentId || !userId || score === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: assignmentId, userId, score',
      });
    }

    const configUserId = req.user?.id || 'test-user';
    const config = lmsConfigurations.get(configUserId);

    if (!config) {
      return res.status(404).json({
        error: 'No LMS configuration found',
      });
    }

    const lms = LMSFactory.create(config);
    const grade = await lms.syncGrade(assignmentId, userId, score);

    res.json({
      success: true,
      message: 'Grade synced successfully',
      grade,
    });
  } catch (error: any) {
    logger.error('Error syncing grade:', error);
    res.status(500).json({
      error: 'Failed to sync grade',
      details: error.message,
    });
  }
});

// Get course enrollments
router.get('/courses/:courseId/enrollments', async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id || 'test-user';
    const config = lmsConfigurations.get(userId);

    if (!config) {
      return res.status(404).json({
        error: 'No LMS configuration found',
      });
    }

    const lms = LMSFactory.create(config);
    const enrollments = await lms.getEnrollments(courseId);

    res.json({ enrollments });
  } catch (error: any) {
    logger.error('Error fetching LMS enrollments:', error);
    res.status(500).json({
      error: 'Failed to fetch enrollments',
      details: error.message,
    });
  }
});

// Create an assignment in LMS
router.post('/courses/:courseId/assignments', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { name, description, dueDate, pointsPossible, status } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Assignment name is required',
      });
    }

    const userId = req.user?.id || 'test-user';
    const config = lmsConfigurations.get(userId);

    if (!config) {
      return res.status(404).json({
        error: 'No LMS configuration found',
      });
    }

    const lms = LMSFactory.create(config);
    const assignment = await lms.createAssignment(courseId, {
      name,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      pointsPossible,
      status,
    });

    res.json({
      success: true,
      message: 'Assignment created successfully',
      assignment,
    });
  } catch (error: any) {
    logger.error('Error creating LMS assignment:', error);
    res.status(500).json({
      error: 'Failed to create assignment',
      details: error.message,
    });
  }
});

// Get connection status
router.get('/status', (req, res) => {
  const userId = req.user?.id || 'test-user';
  const isConnected = lmsConfigurations.has(userId);

  res.json({
    connected: isConnected,
    provider: isConnected ? lmsConfigurations.get(userId)?.provider : null,
  });
});

// Disconnect from LMS
router.post('/disconnect', (req, res) => {
  const userId = req.user?.id || 'test-user';
  lmsConfigurations.delete(userId);

  res.json({
    success: true,
    message: 'Disconnected from LMS successfully',
  });
});

export default router;
