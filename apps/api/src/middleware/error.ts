import type { Context } from 'hono';
import { ZodError } from 'zod';

export class AppError extends Error {
  public code: string;
  public status: number;
  public fields?: Record<string, string>;

  constructor(message: string, code = 'BAD_REQUEST', status = 400, fields?: Record<string, string>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

export function errorHandler(err: Error, c: Context) {
  const requestId = c.get('requestId') || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const schoolId = c.get('schoolId') || 'public';
  const moduleName = c.req.path.split('/').filter(Boolean).slice(0, 4).join(':') || 'unknown';
  console.error(`[API] module=${moduleName} schoolId=${schoolId} endpoint=${c.req.method} ${c.req.path} requestId=${requestId} cause=${err.message}`);

  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      fields[issue.path.join('.')] = issue.message;
    }
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validasi form tidak berhasil. Silakan periksa kolom yang ditandai.',
        fields,
        requestId
      }
    }, 400);
  }

  if (err instanceof AppError) {
    return c.json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        fields: err.fields,
        requestId
      }
    }, err.status as any);
  }

  console.error(`[Error] [${requestId}]`, err);

  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.',
      requestId
    }
  }, 500);
}
