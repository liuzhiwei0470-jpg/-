import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const Router = express.Router;

app.use(helmet());
app.use(cors());
app.use(express.json());

// 健康检查路由
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  });
});

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
