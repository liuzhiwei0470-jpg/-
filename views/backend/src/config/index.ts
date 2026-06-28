import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  database: {
    path: process.env.DATABASE_PATH || path.resolve(__dirname, '../../../../../', 'data/database.db'),
  },
  app: {
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:6001',
  },
  rsshub: {
    baseUrl: process.env.RSSHUB_BASE_URL || 'https://rsshub.app',
  },
};
