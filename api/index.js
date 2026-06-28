import serverless from 'serverless';
import app from './dist/app.js';

const handler = serverless(app);

export default handler;
