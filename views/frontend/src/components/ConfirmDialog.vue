<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div v-if="visible" class="confirm-overlay" @click.self="handleCancel">
        <div class="confirm-modal">
          <div class="confirm-icon" v-if="type === 'danger'">⚠</div>
          <div class="confirm-icon confirm-info" v-else>ℹ</div>
          <h3 class="confirm-title">{{ title }}</h3>
          <p class="confirm-message">{{ message }}</p>
          <div class="confirm-actions">
            <button @click="handleCancel" class="btn btn-ghost">取消</button>
            <button
              @click="handleConfirm"
              :class="['btn', type === 'danger' ? 'btn-danger' : 'btn-primary']"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface ConfirmOptions {
  title?: string;
  message: string;
  type?: 'info' | 'danger';
  confirmText?: string;
  cancelText?: string;
}

const visible = ref(false);
const title = ref('');
const message = ref('');
const type = ref<'info' | 'danger'>('info');
const confirmText = ref('确定');
const cancelText = ref('取消');

let resolveFn: ((value: boolean) => void) | null = null;

function show(options: ConfirmOptions): Promise<boolean> {
  title.value = options.title || '提示';
  message.value = options.message;
  type.value = options.type || 'info';
  confirmText.value = options.confirmText || '确定';
  cancelText.value = options.cancelText || '取消';
  visible.value = true;

  return new Promise((resolve) => {
    resolveFn = resolve;
  });
}

function handleConfirm() {
  visible.value = false;
  if (resolveFn) {
    resolveFn(true);
    resolveFn = null;
  }
}

function handleCancel() {
  visible.value = false;
  if (resolveFn) {
    resolveFn(false);
    resolveFn = null;
  }
}

defineExpose({ show });
</script>

<style>
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.confirm-modal {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 360px;
  text-align: center;
}

.confirm-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: #fef3c7;
  color: #d97706;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.confirm-icon.confirm-info {
  background: #dbeafe;
  color: #3b82f6;
}

.confirm-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #1f2937;
}

.confirm-message {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 24px;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.2s;
}

.confirm-enter-active .confirm-modal,
.confirm-leave-active .confirm-modal {
  transition: transform 0.2s, opacity 0.2s;
}

.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}

.confirm-enter-from .confirm-modal,
.confirm-leave-to .confirm-modal {
  opacity: 0;
  transform: scale(0.95);
}
</style>
