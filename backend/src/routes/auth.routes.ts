import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import {
  RegisterInputSchema,
  LoginInputSchema,
  VerifyEmailInputSchema,
  ForgotPasswordInputSchema,
  ResetPasswordInputSchema
} from '@sobatweb/contracts';
import { authMiddleware, type AuthUser } from '../middleware/auth.js';
import { config } from '../config.js';
import * as authService from '../services/auth.service.js';

export const authRoutes = new Hono<{
  Variables: {
    user: AuthUser;
  };
}>();

authRoutes.post('/register', async (c) => {
  const body = await c.req.json();
  const input = RegisterInputSchema.parse(body);
  const ip = c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip');
  const userAgent = c.req.header('user-agent');

  const result = await authService.registerUser(input, ip, userAgent);

  setCookie(c, config.sessionCookieName, result.token, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'Lax',
    maxAge: config.tokenExpiresInSec,
    path: '/'
  });

  return c.json({ success: true, data: result });
});

authRoutes.post('/verify-email', async (c) => {
  const body = await c.req.json();
  const input = VerifyEmailInputSchema.parse(body);
  const ip = c.req.header('x-forwarded-for');

  const result = await authService.verifyUserEmail(input, ip);

  setCookie(c, config.sessionCookieName, result.token, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'Lax',
    maxAge: config.tokenExpiresInSec,
    path: '/'
  });

  return c.json({ success: true, data: result });
});

authRoutes.post('/login', async (c) => {
  const body = await c.req.json();
  const input = LoginInputSchema.parse(body);
  const ip = c.req.header('x-forwarded-for');
  const userAgent = c.req.header('user-agent');

  const result = await authService.loginUser(input, ip, userAgent);

  setCookie(c, config.sessionCookieName, result.token, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'Lax',
    maxAge: config.tokenExpiresInSec,
    path: '/'
  });

  return c.json({ success: true, data: result });
});

authRoutes.post('/forgot-password', async (c) => {
  const body = await c.req.json();
  const input = ForgotPasswordInputSchema.parse(body);
  const result = await authService.forgotPassword(input);
  return c.json({ success: true, data: result });
});

authRoutes.post('/reset-password', async (c) => {
  const body = await c.req.json();
  const input = ResetPasswordInputSchema.parse(body);
  const result = await authService.resetPassword(input);
  return c.json({ success: true, data: result });
});

authRoutes.post('/logout', (c) => {
  deleteCookie(c, config.sessionCookieName, { path: '/' });
  return c.json({ success: true, data: { message: 'Berhasil keluar.' } });
});

authRoutes.get('/me', authMiddleware, async (c) => {
  const user = c.get('user') as AuthUser;
  return c.json({ success: true, data: { user } });
});
