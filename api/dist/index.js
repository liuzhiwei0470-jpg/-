import app from './app';
import { config } from './config/index';
import { initDatabase } from './models/database';
import { startCronJobs } from './services/index';
async function startServer() {
    await initDatabase();
    app.listen(config.port, () => {
        console.log(`✅ 服务器启动: http://localhost:${config.port}`);
        console.log(`📚 API文档: http://localhost:${config.port}/api/health`);
        startCronJobs();
    });
}
startServer();
//# sourceMappingURL=index.js.map