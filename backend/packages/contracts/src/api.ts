import { z } from 'zod';

export interface ApiResponseSuccess<T = any> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
}

export interface ApiResponseError {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
    requestId?: string;
  };
}

export type ApiResponse<T = any> = ApiResponseSuccess<T> | ApiResponseError;

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).default('desc')
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
