import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { errorHandler } from './middleware/error.js';
import { authRoutes } from './routes/auth.routes.js';
import { schoolsRoutes } from './routes/schools.routes.js';
import { sitesRoutes } from './routes/sites.routes.js';
import { templatesRoutes } from './routes/templates.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { publicRoutes } from './routes/public.routes.js';

export function createApp() {
  const app = new Hono<{ Variables: { requestId: string } }>();

  // Global Request ID
  app.use('*', async (c, next) => {
    const reqId = c.req.header('x-request-id') || `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    c.set('requestId', reqId);
    c.header('X-Request-Id', reqId);
    await next();
  });

  // Logging & CORS
  app.use('*', logger());
  app.use('*', cors({
    origin: (origin) => origin || '*',
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Tenant-Slug']
  }));

  // Security Headers
  app.use('*', async (c, next) => {
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    await next();
  });

  // Health Check
  app.get('/health', (c) => {
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'sobatweb-api'
    });
  });

  // Mount API v1 Routers
  app.route('/api/v1/auth', authRoutes);
  app.route('/api/v1/schools', schoolsRoutes);
  app.route('/api/v1/sites', sitesRoutes);
  app.route('/api/v1/templates', templatesRoutes);
  app.route('/api/v1/admin', adminRoutes);
  app.route('/api/v1/public', publicRoutes);

  // Global Error Handler
  app.onError(errorHandler);

  return app;
}

export const app = createApp();
