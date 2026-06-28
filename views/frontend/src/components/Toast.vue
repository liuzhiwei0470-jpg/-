<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast', `toast-${toast.type}`]"
      >
        <span class="toast-icon">{{ getIcon(toast.type) }}</span>
        <span class="toast-message">{{ toast.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast';

const { toasts } = useToast();

function getIcon(type: string): string {
  const icons: Record<string, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };
  return icons[type] || icons.info;
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--color-white);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  max-width: 360px;
  font-size: 14px;
  border-left: 4px solid var(--color-primary);
}

.toast-success {
  border-left-color: var(--color-success, #10b981);
}

.toast-success .toast-icon {
  color: var(--color-success, #10b981);
}

.toast-error {
  border-left-color: var(--color-danger, #ef4444);
}

.toast-error .toast-icon {
  color: var(--color-danger, #ef4444);
}

.toast-warning {
  border-left-color: var(--color-warning, #f59e0b);
}

.toast-warning .toast-icon {
  color: var(--color-warning, #f59e0b);
}

.toast-info {
  border-left-color: var(--color-primary);
}

.toast-info .toast-icon {
  color: var(--color-primary);
}

.toast-icon {
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.toast-message {
  color: var(--color-text-primary);
  line-height: 1.4;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
