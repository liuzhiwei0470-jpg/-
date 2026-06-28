<template>
  <div id="app">
    <router-view />
    <Toast />
    <ConfirmDialog ref="confirmRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Toast from '@/components/Toast.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { useConfirm } from '@/composables/useConfirm';
import { useAuthStore } from '@/stores';

const confirmRef = ref<InstanceType<typeof ConfirmDialog> | null>(null);
const { setConfirmRef } = useConfirm();
const authStore = useAuthStore();

onMounted(() => {
  setConfirmRef(confirmRef.value);
  if (authStore.isLoggedIn) {
    authStore.fetchCurrentUser();
  }
});
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f9fafb;
  color: #1f2937;
  line-height: 1.5;
}

#app {
  min-height: 100vh;
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 20px;
  color: #6b7280;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
