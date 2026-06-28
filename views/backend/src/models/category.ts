export interface Category {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
}

export interface CategoryCreateInput {
  userId: number;
  name: string;
}

export interface CategoryResponse {
  id: number;
  userId: number;
  name: string;
  createdAt: string;
}
