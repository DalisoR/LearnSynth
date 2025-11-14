import { Router } from 'express';
import config from '../config/config';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'LearnSynth API is running',
    version: '1.0.0',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

export default router;
