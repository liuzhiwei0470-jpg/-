import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getRow, runSql } from '../models/database';
import { config } from '../config/index';
import type { User, UserCreateInput, UserResponse } from '../models/user';

export class AuthService {
  async register(input: UserCreateInput): Promise<{ token: string; user: UserResponse }> {
    const { email, password } = input;

    const existing = await getRow('SELECT id FROM users WHERE email = ?', email);
    if (existing) {
      throw new Error('EMAIL_EXISTS');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await runSql(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      email,
      hashedPassword
    );

    const userId = result.lastInsertRowid;

    const token = this.generateToken(userId, email);

    return {
      token,
      user: this.toUserResponse({
        id: userId,
        email,
        password: hashedPassword,
        role: 'user',
        created_at: new Date().toISOString(),
      }),
    };
  }

  async login(input: UserCreateInput): Promise<{ token: string; user: UserResponse }> {
    const { email, password } = input;

    const user = (await getRow('SELECT * FROM users WHERE email = ?', email)) as User | undefined;
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const token = this.generateToken(user.id, user.email);

    return {
      token,
      user: this.toUserResponse(user),
    };
  }

  async getUserById(id: number): Promise<UserResponse | null> {
    const user = (await getRow('SELECT * FROM users WHERE id = ?', id)) as User | undefined;
    if (!user) return null;
    return this.toUserResponse(user);
  }

  private generateToken(userId: number, email: string): string {
    return jwt.sign(
      { userId, email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  verifyToken(token: string): { userId: number; email: string } {
    return jwt.verify(token, config.jwt.secret) as { userId: number; email: string };
  }

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
