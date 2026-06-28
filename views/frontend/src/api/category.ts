import api from './request';

export interface Category {
  id: number;
  userId: number;
  name: string;
  createdAt: string;
}

export const categoryApi = {
  list() {
    return api.get<any, any>('/categories');
  },

  create(name: string) {
    return api.post<any, any>('/categories', { name });
  },

  update(id: number, name: string) {
    return api.put<any, any>(`/categories/${id}`, { name });
  },

  delete(id: number) {
    return api.delete<any, any>(`/categories/${id}`);
  },
};
