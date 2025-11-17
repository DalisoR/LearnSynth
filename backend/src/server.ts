import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from './config/config';
import logger from './utils/logger';
import socketService from './services/socket/socketService';

// Routes
import healthRoutes from './routes/health';
import documentRoutes from './routes/documents';
import lessonRoutes from './routes/lessons';
import subjectRoutes from './routes/subjects';
import chatRoutes from './routes/chat';
import srsRoutes from './routes/srs';
import groupRoutes from './routes/groups';
import groupMaterialsRoutes from './routes/groupMaterials';
import groupQuizzesRoutes from './routes/groupQuizzes';
import groupDiscussionsRoutes from './routes/groupDiscussions';
import studyPlansRoutes from './routes/studyPlans';
import studySessionsRoutes from './routes/studySessions';
import studyGoalsRoutes from './routes/studyGoals';
import studyPomodoroRoutes from './routes/studyPomodoro';
import studyAnalyticsRoutes from './routes/studyAnalytics';
import studyRecommendationsRoutes from './routes/studyRecommendations';
import studyPreferencesRoutes from './routes/studyPreferences';
import learningRoutes from './routes/learning';
import gamificationRoutes from './routes/gamification';
import analyticsRoutes from './routes/analytics';
import aiTutorRoutes from './routes/aiTutor';
import socraticTutorRoutes from './routes/socraticTutor';
import analyticsDashboardRoutes from './routes/analyticsDashboard';
import productivityRoutes from './routes/productivity';
import flashcardsRoutes from './routes/flashcards';
import practiceProblemsRoutes from './routes/practiceProblems';
import mindMapsRoutes from './routes/mindMaps';
import subscriptionRoutes from './routes/subscription';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
});

app.use(limiter);

// CORS configuration
app.use(cors({
  origin: [config.frontendUrl, 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// API routes
app.use('/api/health', healthRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/srs', srsRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/groups', groupMaterialsRoutes);
app.use('/api/groups', groupQuizzesRoutes);
app.use('/api/groups', groupDiscussionsRoutes);
app.use('/api/study-plans', studyPlansRoutes);
app.use('/api/study-sessions', studySessionsRoutes);
app.use('/api/study-goals', studyGoalsRoutes);
app.use('/api/study-pomodoro', studyPomodoroRoutes);
app.use('/api/study-analytics', studyAnalyticsRoutes);
app.use('/api/study-recommendations', studyRecommendationsRoutes);
app.use('/api/study-preferences', studyPreferencesRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/analytics-dashboard', analyticsDashboardRoutes);
app.use('/api/productivity', productivityRoutes);
app.use('/api/flashcards', flashcardsRoutes);
app.use('/api/practice-problems', practiceProblemsRoutes);
app.use('/api/ai-tutor', aiTutorRoutes);
app.use('/api/socratic-tutor', socraticTutorRoutes);
app.use('/api/subscription', subscriptionRoutes);

// Welcome endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to LearnSynth API',
    version: '1.0.0',
    status: 'running',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error:', { error: err.message, stack: err.stack });
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : 'Something went wrong',
  });
});

// Create HTTP server and initialize Socket.io
const httpServer = createServer(app);
socketService.initialize(httpServer);

// Start server
httpServer.listen(config.port, () => {
  logger.info(`🚀 LearnSynth Backend running on port ${config.port}`);
  logger.info(`📍 Health check: http://localhost:${config.port}/api/health`);
  logger.info(`🌍 Environment: ${config.nodeEnv}`);
  logger.info(`🔌 WebSocket server ready`);
});

export default app;
