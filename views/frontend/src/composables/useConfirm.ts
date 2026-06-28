import { ref } from 'vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';

export interface ConfirmOptions {
  title?: string;
  message: string;
  type?: 'info' | 'danger';
  confirmText?: string;
  cancelText?: string;
}

const confirmRef = ref<InstanceType<typeof ConfirmDialog> | null>(null);

export function useConfirm() {
  function confirm(options: ConfirmOptions): Promise<boolean> {
    if (!confirmRef.value) {
      console.warn('ConfirmDialog not mounted');
      return Promise.resolve(false);
    }
    return confirmRef.value.show(options);
  }

  function setConfirmRef(ref: InstanceType<typeof ConfirmDialog> | null) {
    confirmRef.value = ref;
  }

  return {
    confirm,
    setConfirmRef,
  };
}
