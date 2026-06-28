import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import healthRoutes from './dist/routes/health.routes.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api', healthRoutes);

export default async function handler(req, res) {
  try {
    const path = req.query.path;
    const pathStr = Array.isArray(path) ? path.join('/') : path;
    req.url = '/' + pathStr;

    app(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
