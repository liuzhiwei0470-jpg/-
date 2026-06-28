import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {
  authRoutes,
  subscriptionRoutes,
  categoryRoutes,
  healthRoutes,
  articleRoutes,
  settingsRoutes,
  shareRoutes,
} from './_backend/routes';
import { errorHandler, notFoundHandler } from './_backend/middleware';
import { initDatabase } from './_backend/models/database';

let dbInitialized = false;

async function ensureDatabase() {
  if (!dbInitialized) {
    await initDatabase();
    dbInitialized = true;
  }
}

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', shareRoutes);
app.use('/api/subscriptions', articleRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api', settingsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureDatabase();

    const path = req.query.path as string[];
    const pathStr = Array.isArray(path) ? path.join('/') : path;
    req.url = '/' + pathStr;

    app(req as any, res as any);
  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
