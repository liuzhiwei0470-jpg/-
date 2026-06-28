import axios from 'axios';
import { useToast } from '@/composables/useToast';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const toast = useToast();

    let message = '请求失败，请稍后重试';

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      message = '请求超时，请检查网络连接';
    } else if (error.code === 'ERR_NETWORK' || !error.response) {
      message = '网络连接失败，请检查网络';
    } else if (error.response?.data?.error?.message) {
      message = error.response.data.error.message;
    } else if (error.response?.status === 404) {
      message = '请求的资源不存在';
    } else if (error.response?.status === 500) {
      message = '服务器错误，请稍后重试';
    }

    console.error('API Error:', message);

    if (error.response?.status === 401) {
      const errorCode = error.response.data?.error?.code;
      if (errorCode === 'INVALID_TOKEN' || errorCode === 'TOKEN_EXPIRED') {
        localStorage.removeItem('token');
        window.location.href = '/login';
        toast.error('登录已过期，请重新登录');
      } else {
        toast.error(message);
      }
    } else if (error.response?.status !== 400) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;
