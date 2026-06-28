import serverless from 'serverless-http';
import app from './dist/app.js';
import { initDatabase } from './dist/models/database.js';

let dbInitialized = false;

const handler = async (req, res) => {
  if (!dbInitialized) {
    try {
      await initDatabase();
      dbInitialized = true;
    } catch (err) {
      console.error('数据库初始化失败:', err);
      return res.status(500).json({
        success: false,
        message: '数据库初始化失败',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }
  const serverlessHandler = serverless(app);
  return serverlessHandler(req, res);
};

export default handler;
