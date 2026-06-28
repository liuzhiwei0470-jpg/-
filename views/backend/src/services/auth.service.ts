import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../models/database.js';
import { config } from '../config/index.js';
import type { User, UserCreateInput, UserResponse } from '../models/user.js';

export class AuthService {
  // 注册
  async register(input: UserCreateInput): Promise<{ token: string; user: UserResponse }> {
    const { email, password } = input;

    // 检查邮箱是否已存在
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      throw new Error('EMAIL_EXISTS');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 插入用户
    const result = db.prepare(
      'INSERT INTO users (email, password) VALUES (?, ?)'
    ).run(email, hashedPassword);

    const userId = result.lastInsertRowid as number;

    // 生成Token
    const token = this.generateToken(userId, email);

    return {
      token,
      user: this.toUserResponse({ id: userId, email, password: hashedPassword, role: 'user', created_at: new Date().toISOString() }),
    };
  }

  // 登录
  async login(input: UserCreateInput): Promise<{ token: string; user: UserResponse }> {
    const { email, password } = input;

    // 查找用户
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // 验证密码
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // 生成Token
    const token = this.generateToken(user.id, user.email);

    return {
      token,
      user: this.toUserResponse(user),
    };
  }

  // 获取当前用户
  getUserById(id: number): UserResponse | null {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    if (!user) return null;
    return this.toUserResponse(user);
  }

  // 生成Token
  private generateToken(userId: number, email: string): string {
    return jwt.sign(
      { userId, email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  // 验证Token
  verifyToken(token: string): { userId: number; email: string } {
    return jwt.verify(token, config.jwt.secret) as { userId: number; email: string };
  }

  // 转换响应格式
  private toUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
    };
  }
}

export const authService = new AuthService();
