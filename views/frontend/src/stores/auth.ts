import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi, type User } from '@/api/auth';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('token'));
  const loading = ref(false);

  const showAuthModal = ref(false);
  const authModalMode = ref<'login' | 'register'>('login');
  const redirectAfterLogin = ref<string | null>(null);

  const isLoggedIn = computed(() => !!token.value);

  function openLoginModal(redirect?: string) {
    authModalMode.value = 'login';
    if (redirect) redirectAfterLogin.value = redirect;
    showAuthModal.value = true;
  }

  function openRegisterModal() {
    authModalMode.value = 'register';
    showAuthModal.value = true;
  }

  function closeAuthModal() {
    showAuthModal.value = false;
    redirectAfterLogin.value = null;
  }

  async function login(email: string, password: string) {
    loading.value = true;
    try {
      const res = await authApi.login({ email, password });
      token.value = res.data.token;
      user.value = res.data.user;
      localStorage.setItem('token', res.data.token);
      return res;
    } finally {
      loading.value = false;
    }
  }

  async function register(email: string, password: string) {
    loading.value = true;
    try {
      const res = await authApi.register({ email, password });
      token.value = res.data.token;
      user.value = res.data.user;
      localStorage.setItem('token', res.data.token);
      return res;
    } finally {
      loading.value = false;
    }
  }

  async function fetchCurrentUser() {
    if (!token.value) return;
    try {
      const res = await authApi.getCurrentUser();
      user.value = res.data;
    } catch (error) {
      logout();
    }
  }

  function logout() {
    user.value = null;
    token.value = null;
    localStorage.removeItem('token');
  }

  return {
    user,
    token,
    loading,
    isLoggedIn,
    showAuthModal,
    authModalMode,
    redirectAfterLogin,
    openLoginModal,
    openRegisterModal,
    closeAuthModal,
    login,
    register,
    fetchCurrentUser,
    logout,
  };
});
