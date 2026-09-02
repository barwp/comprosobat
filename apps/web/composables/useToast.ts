import { ref } from 'vue';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

const toasts = ref<ToastItem[]>([]);

export function useToast() {
  function show(toast: Omit<ToastItem, 'id'>) {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const item: ToastItem = {
      id,
      duration: 4000,
      ...toast
    };
    toasts.value.push(item);

    setTimeout(() => {
      remove(id);
    }, item.duration);
  }

  function success(title: string, message?: string) {
    show({ type: 'success', title, message });
  }

  function error(title: string, message?: string) {
    show({ type: 'error', title, message });
  }

  function info(title: string, message?: string) {
    show({ type: 'info', title, message });
  }

  function remove(id: string) {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }

  return {
    toasts,
    show,
    success,
    error,
    info,
    remove
  };
}
