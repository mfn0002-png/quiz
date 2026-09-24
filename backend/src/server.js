import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import quizRouter from './routes/quiz.js';
import assistantRouter from './routes/assistant.js';
import sourcesRouter from './routes/sources.js';
import learningRouter from './routes/learning.js';
import hadithsRouter from './routes/hadiths.js';
import adminRagRouter from './routes/adminRag.js';
import {
  createAppRateLimiter,
  createGenerateRateLimiter,
  createChatRateLimiter,
} from './middleware/rateLimit.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS : seules les origines autorisées peuvent interroger le backend
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,https://quiz-1-g31z.onrender.com')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Middlewares
app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '100kb' }));

// Protection globale contre les abus (par IP)
app.use(createAppRateLimiter());

// Limiteurs ciblés sur les endpoints coûteux (par IP + sessionId)
app.use('/api/quiz/generate', createGenerateRateLimiter());
app.use('/api/assistant/chat', createChatRateLimiter());

// Routes
app.use('/api/quiz', quizRouter);
app.use('/api/assistant', assistantRouter);
app.use('/api/sources', sourcesRouter);
app.use('/api/learning', learningRouter);
app.use('/api/hadiths', hadithsRouter);
app.use('/api/admin/rag', adminRagRouter);

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend Gemini Quiz Agent est en ligne 🚀' });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
