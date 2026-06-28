<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1 class="auth-title">注册</h1>
      <p class="auth-desc">创建个人情报官账号</p>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label class="form-label">邮箱</label>
          <input
            v-model="form.email"
            type="email"
            class="form-input"
            placeholder="请输入邮箱"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label">密码</label>
          <input
            v-model="form.password"
            type="password"
            class="form-input"
            placeholder="请输入密码（至少6位）"
            required
            minlength="6"
          />
        </div>

        <div class="form-group">
          <label class="form-label">确认密码</label>
          <input
            v-model="form.confirmPassword"
            type="password"
            class="form-input"
            placeholder="请再次输入密码"
            required
          />
        </div>

        <div v-if="error" class="form-error">{{ error }}</div>

        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          {{ loading ? '注册中...' : '注册' }}
        </button>
      </form>

      <div class="auth-footer">
        已有账号？<router-link to="/login">立即登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const form = ref({
  email: '',
  password: '',
  confirmPassword: '',
});

const loading = ref(false);
const error = ref('');

async function handleSubmit() {
  if (form.value.password !== form.value.confirmPassword) {
    error.value = '两次密码输入不一致';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    await authStore.register(form.value.email, form.value.password);
    router.push('/dashboard');
  } catch (e: any) {
    error.value = e.response?.data?.error?.message || '注册失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
}

.auth-card {
  width: 100%;
  max-width: 400px;
  background: var(--color-white);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.auth-title {
  font-size: 24px;
  text-align: center;
  margin-bottom: var(--space-xs);
}

.auth-desc {
  text-align: center;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-lg);
}

.auth-form {
  margin-bottom: var(--space-lg);
}

.btn-block {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  height: 44px;
}

.auth-footer {
  text-align: center;
  color: var(--color-text-secondary);
}

.form-error {
  margin-bottom: var(--space-md);
  padding: var(--space-sm);
  background: #fef2f2;
  border-radius: var(--radius-md);
  color: var(--color-error);
  font-size: 14px;
}
</style>
