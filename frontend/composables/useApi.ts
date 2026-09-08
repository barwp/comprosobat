import { useToast } from './useToast.js';

export async function useApiClient<T = any>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: any;
    params?: Record<string, any>;
    headers?: Record<string, string>;
  } = {}
): Promise<{ success: boolean; data?: T; error?: any }> {
  const toast = useToast();
  const token = typeof window !== 'undefined' ? localStorage.getItem('sobatweb_token') : null;

  const base = import.meta.server ? 'http://localhost:4000' : '';
  const url = path.startsWith('http') ? path : `${base}/api/v1${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    ...(options.headers || {})
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body instanceof FormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined),
      credentials: 'include'
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.success) {
      const errMsg = json?.error?.message || `Terjadi kesalahan (${res.status})`;
      // If 401 and on client, redirect to login if not already on login/register
      if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        localStorage.removeItem('sobatweb_token');
        localStorage.removeItem('sobatweb_user');
        window.location.href = '/login';
      }
      return { success: false, error: json.error || { message: errMsg } };
    }

    return { success: true, data: json.data };
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || 'Koneksi ke server gagal.' }
    };
  }
}
