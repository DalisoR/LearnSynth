import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from './config/config';
import logger from './utils/logger';

// Routes
import healthRoutes from './routes/health';
import documentRoutes from './routes/documents';
import lessonRoutes from './routes/lessons';
import subjectRoutes from './routes/subjects';
import chatRoutes from './routes/chat';
import srsRoutes from './routes/srs';
import groupRoutes from './routes/groups';
import learningRoutes from './routes/learning';
import gamificationRoutes from './routes/gamification';

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
app.use('/api/learning', learningRoutes);
app.use('/api/gamification', gamificationRoutes);

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

// Start server
app.listen(config.port, () => {
  logger.info(`🚀 LearnSynth Backend running on port ${config.port}`);
  logger.info(`📍 Health check: http://localhost:${config.port}/api/health`);
  logger.info(`🌍 Environment: ${config.nodeEnv}`);
});

export default app;
