export interface User {
  id: number;
  email: string;
  password: string;
  role: string;
  created_at: string;
}

export interface UserCreateInput {
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  email: string;
  role: string;
  createdAt: string;
}
