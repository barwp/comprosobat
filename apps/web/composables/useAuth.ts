import { ref, computed } from 'vue';
import { useApiClient } from './useApi.js';
import { useToast } from './useToast.js';

export interface UserState {
  id: string;
  name: string;
  email: string;
  platformRole: 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'SCHOOL_EDITOR' | 'PUBLIC_VISITOR';
  status: string;
  school?: {
    id: string;
    name: string;
    role: string;
  } | null;
}

const currentUser = ref<UserState | null>(null);
const isInitialized = ref(false);

export function useAuth() {
  const toast = useToast();

  const isAuthenticated = computed(() => Boolean(currentUser.value));
  const isSuperAdmin = computed(() => (currentUser.value?.platformRole || (currentUser.value as any)?.role) === 'SUPER_ADMIN');
  const isSchoolAdmin = computed(() => (currentUser.value?.platformRole || (currentUser.value as any)?.role) === 'SCHOOL_ADMIN');
  const school = computed(() => currentUser.value?.school);

  function initAuth() {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('sobatweb_user');
    if (stored) {
      try {
        currentUser.value = JSON.parse(stored);
      } catch (e) {
        localStorage.removeItem('sobatweb_user');
      }
    }
    isInitialized.value = true;
  }

  async function login(email: string, password: string) {
    const res = await useApiClient<{ user: UserState; token: string }>('/auth/login', {
      method: 'POST',
      body: { email, password }
    });

    if (!res.success || !res.data) {
      toast.error('Gagal Masuk', res.error?.message || 'Email atau password salah.');
      return false;
    }

    currentUser.value = res.data.user;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sobatweb_token', res.data.token);
      localStorage.setItem('sobatweb_user', JSON.stringify(res.data.user));
    }

    toast.success('Berhasil Masuk', `Selamat datang kembali, ${res.data.user.name}!`);
    return true;
  }

  async function register(data: { name: string; email: string; password: string; whatsappNumber?: string; agreeTerms: boolean }) {
    const res = await useApiClient<{ user: UserState; token: string }>('/auth/register', {
      method: 'POST',
      body: data
    });

    if (!res.success || !res.data) {
      toast.error('Pendaftaran Gagal', res.error?.message || 'Gagal mendaftarkan akun.');
      return false;
    }

    currentUser.value = res.data.user;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sobatweb_token', res.data.token);
      localStorage.setItem('sobatweb_user', JSON.stringify(res.data.user));
    }

    toast.success('Pendaftaran Berhasil', 'Akun berhasil dibuat.');
    return true;
  }

  async function logout() {
    try {
      await useApiClient('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout API error (proceeding with local cleanup):', err);
    } finally {
      currentUser.value = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sobatweb_token');
        localStorage.removeItem('sobatweb_user');
        document.cookie = 'sobatweb_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'sobatweb_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      }
      toast.info('Keluar', 'Anda telah berhasil keluar dari sistem.');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }

  function setUser(user: UserState) {
    currentUser.value = user;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sobatweb_user', JSON.stringify(user));
    }
  }

  return {
    user: currentUser,
    isAuthenticated,
    isSuperAdmin,
    isSchoolAdmin,
    school,
    isInitialized,
    initAuth,
    login,
    register,
    logout,
    setUser
  };
}
