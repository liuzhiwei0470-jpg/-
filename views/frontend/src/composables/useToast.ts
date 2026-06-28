import { ref } from 'vue';

export interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

const toasts = ref<ToastItem[]>([]);
let toastId = 0;

export function useToast() {
  function show(message: string, type: ToastItem['type'] = 'info', duration = 3000) {
    const id = ++toastId;
    toasts.value.push({ id, type, message });
    setTimeout(() => {
      const index = toasts.value.findIndex(t => t.id === id);
      if (index > -1) {
        toasts.value.splice(index, 1);
      }
    }, duration);
  }

  function success(message: string, duration = 3000) {
    show(message, 'success', duration);
  }

  function error(message: string, duration = 4000) {
    show(message, 'error', duration);
  }

  function warning(message: string, duration = 3000) {
    show(message, 'warning', duration);
  }

  function info(message: string, duration = 3000) {
    show(message, 'info', duration);
  }

  return {
    toasts,
    show,
    success,
    error,
    warning,
    info,
  };
}
