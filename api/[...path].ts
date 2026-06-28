import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';

const app = express();

app.get('/test', (req, res) => {
  res.json({ message: 'Express works!' });
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const path = req.query.path as string[];
    const pathStr = Array.isArray(path) ? path.join('/') : path;
    req.url = '/' + pathStr;

    app(req as any, res as any);
  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
