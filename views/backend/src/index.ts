import app from './app.js';
import { config } from './config/index.js';
import { initDatabase } from './models/database.js';
import { startCronJobs } from './services/index.js';

async function startServer() {
  await initDatabase();

  app.listen(config.port, () => {
    console.log(`✅ 服务器启动: http://localhost:${config.port}`);
    console.log(`📚 API文档: http://localhost:${config.port}/api/health`);

    startCronJobs();
  });
}

startServer();
