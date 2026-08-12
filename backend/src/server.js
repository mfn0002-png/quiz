import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import quizRouter from './routes/quiz.js';
import assistantRouter from './routes/assistant.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/quiz', quizRouter);
app.use('/api/assistant', assistantRouter);

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend Gemini Quiz Agent est en ligne 🚀' });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
