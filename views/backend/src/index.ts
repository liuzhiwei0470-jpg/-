import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { initDatabase, migrateSubscriptionsTable } from './models/database.js';
import { authRoutes, subscriptionRoutes, categoryRoutes, healthRoutes, articleRoutes, settingsRoutes, shareRoutes } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/index.js';
import { startCronJobs } from './services/index.js';

const app = express();

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json());

// 路由
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', shareRoutes); // 公开分享API（无需登录）
app.use('/api/subscriptions', articleRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api', settingsRoutes);

// 错误处理
app.use(notFoundHandler);
app.use(errorHandler);

// 初始化数据库
initDatabase();
migrateSubscriptionsTable();

// 启动服务器
app.listen(config.port, () => {
  console.log(`✅ 服务器启动: http://localhost:${config.port}`);
  console.log(`📚 API文档: http://localhost:${config.port}/api/health`);

  // 启动定时任务
  startCronJobs();
});
