<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="auth-modal-overlay" @click.self="handleClose">
        <div class="auth-modal">
          <button class="modal-close" @click="handleClose" title="关闭">
            <X :size="20" />
          </button>

          <div class="auth-modal-header">
            <div class="auth-logo">
              <Rss :size="32" class="logo-icon" />
            </div>
            <h2 class="auth-title">{{ mode === 'login' ? '欢迎回来' : '创建账号' }}</h2>
            <p class="auth-desc">
              {{ mode === 'login' ? '登录你的个人情报官账号' : '开始你的信息聚合之旅' }}
            </p>
          </div>

          <div class="mode-tabs">
            <button
              :class="['mode-tab', { active: mode === 'login' }]"
              @click="switchMode('login')"
            >
              登录
            </button>
            <button
              :class="['mode-tab', { active: mode === 'register' }]"
              @click="switchMode('register')"
            >
              注册
            </button>
          </div>

          <form @submit.prevent="handleSubmit" class="auth-form">
            <div class="form-group">
              <label class="form-label">邮箱</label>
              <input
                v-model="form.email"
                type="email"
                class="form-input"
                placeholder="请输入邮箱"
                required
                autocomplete="email"
              />
            </div>

            <div class="form-group">
              <label class="form-label">密码</label>
              <div class="password-input-wrapper">
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  class="form-input password-input"
                  placeholder="请输入密码"
                  required
                  :minlength="mode === 'register' ? 6 : undefined"
                  autocomplete="current-password"
                />
                <button
                  type="button"
                  class="password-toggle"
                  @click="showPassword = !showPassword"
                  :title="showPassword ? '隐藏密码' : '显示密码'"
                >
                  <Eye v-if="!showPassword" :size="16" />
                  <EyeOff v-else :size="16" />
                </button>
              </div>
            </div>

            <div v-if="mode === 'register'" class="form-group">
              <label class="form-label">确认密码</label>
              <input
                v-model="form.confirmPassword"
                :type="showPassword ? 'text' : 'password'"
                class="form-input"
                placeholder="请再次输入密码"
                required
                autocomplete="new-password"
              />
            </div>

            <div v-if="error" class="form-error">
              <AlertCircle :size="16" />
              {{ error }}
            </div>

            <button type="submit" class="btn btn-primary btn-block" :disabled="submitting">
              <Loader2 v-if="submitting" :size="18" class="spinning" />
              {{ submitting ? (mode === 'login' ? '登录中...' : '注册中...') : (mode === 'login' ? '登录' : '注册') }}
            </button>
          </form>

          <div class="auth-footer">
            {{ mode === 'login' ? '还没有账号？' : '已有账号？' }}
            <button class="link-btn" @click="switchMode(mode === 'login' ? 'register' : 'login')">
              {{ mode === 'login' ? '立即注册' : '立即登录' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { X, Rss, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-vue-next';

const props = defineProps<{
  modelValue: boolean;
  initialMode?: 'login' | 'register';
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const authStore = useAuthStore();
const router = useRouter();
const { success } = useToast();

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const mode = ref<'login' | 'register'>(props.initialMode || 'login');
const form = ref({
  email: '',
  password: '',
  confirmPassword: '',
});
const submitting = ref(false);
const error = ref('');
const showPassword = ref(false);

function switchMode(newMode: 'login' | 'register') {
  mode.value = newMode;
  error.value = '';
}

function handleClose() {
  visible.value = false;
  error.value = '';
  form.value = { email: '', password: '', confirmPassword: '' };
}

watch(
  () => props.initialMode,
  (val) => {
    if (val) mode.value = val;
  }
);

watch(visible, (val) => {
  if (val) {
    nextTick(() => {
      const input = document.querySelector('.auth-modal .form-input') as HTMLInputElement;
      input?.focus();
    });
  }
});

async function handleSubmit() {
  if (submitting.value) return;

  error.value = '';

  if (mode.value === 'register' && form.value.password !== form.value.confirmPassword) {
    error.value = '两次密码输入不一致';
    return;
  }

  submitting.value = true;
  try {
    if (mode.value === 'login') {
      await authStore.login(form.value.email, form.value.password);
      success('登录成功');
    } else {
      await authStore.register(form.value.email, form.value.password);
      success('注册成功');
    }
    visible.value = false;
    form.value = { email: '', password: '', confirmPassword: '' };
    if (authStore.redirectAfterLogin) {
      const redirect = authStore.redirectAfterLogin;
      authStore.redirectAfterLogin = null;
      router.push(redirect);
    } else {
      router.push('/dashboard');
    }
  } catch (e: any) {
    error.value = e.response?.data?.error?.message || (mode.value === 'login' ? '登录失败' : '注册失败');
  } finally {
    submitting.value = false;
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && visible.value) {
    handleClose();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', onKeydown);
}
</script>

<style scoped>
.auth-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.auth-modal {
  width: 100%;
  max-width: 420px;
  background: var(--color-white);
  border-radius: 16px;
  padding: 32px;
  position: relative;
  animation: modal-in 0.3s ease;
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.modal-close:hover {
  background: var(--color-border);
  color: var(--color-text-primary);
}

.auth-modal-header {
  text-align: center;
  margin-bottom: 24px;
}

.auth-logo {
  width: 56px;
  height: 56px;
  background: var(--color-primary-light);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.logo-icon {
  color: var(--color-primary);
}

.auth-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 6px 0;
}

.auth-desc {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
}

.mode-tabs {
  display: flex;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  padding: 4px;
  margin-bottom: 20px;
}

.mode-tab {
  flex: 1;
  padding: 8px 16px;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
  font-weight: 500;
}

.mode-tab.active {
  background: var(--color-white);
  color: var(--color-primary);
}

.auth-form {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 6px;
}

.password-input-wrapper {
  position: relative;
}

.password-input {
  padding-right: 40px !important;
}

.password-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.password-toggle:hover {
  color: var(--color-text-secondary);
  background: var(--color-bg);
}

.btn-block {
  width: 100%;
  height: 42px;
  font-size: 15px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.auth-footer {
  text-align: center;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.link-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  margin-left: 4px;
  text-decoration: underline;
}

.link-btn:hover {
  color: var(--color-primary-dark);
}

.form-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 12px;
  background: #fef2f2;
  border-radius: var(--radius-md);
  color: var(--color-error);
  font-size: 13px;
}

/* Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-active .auth-modal,
.modal-leave-active .auth-modal {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .auth-modal,
.modal-leave-to .auth-modal {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

@media (max-width: 480px) {
  .auth-modal {
    padding: 24px 20px;
  }

  .auth-title {
    font-size: 20px;
  }
}
</style>
