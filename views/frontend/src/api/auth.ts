import api from './request';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  role: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const authApi = {
  login(data: LoginRequest) {
    return api.post<any, any>('/auth/login', data);
  },

  register(data: RegisterRequest) {
    return api.post<any, any>('/auth/register', data);
  },

  getCurrentUser() {
    return api.get<any, any>('/auth/me');
  },
};
