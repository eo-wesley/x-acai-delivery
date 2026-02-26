import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import healthRouter from './routes/health';
import ordersRouter from './routes/orders';
import webhookRouter from './routes/webhook';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use(healthRouter);
app.use(ordersRouter);
app.use(webhookRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(port, () => {
  console.log(`\n🚀 X-Açaí Backend running on http://localhost:${port}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   LLM Provider: ${process.env.LLM_PROVIDER || 'mock'}`);
  console.log(`   Firestore Project: ${process.env.FIREBASE_PROJECT_ID}\n`);
});
