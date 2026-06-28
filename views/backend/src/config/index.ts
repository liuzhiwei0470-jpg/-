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
    url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || '',
    token: process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_TOKEN || '',
  },
  app: {
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:6001',
  },
  rsshub: {
    baseUrl: process.env.RSSHUB_BASE_URL || 'https://rsshub.app',
  },
};
