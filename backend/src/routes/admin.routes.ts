import { Hono } from 'hono';
import {
  UpdateSchoolStatusInputSchema,
  UpdateUserStatusInputSchema
} from '@sobatweb/contracts';
import { authMiddleware, requireRole, type AuthUser } from '../middleware/auth.js';
import * as adminService from '../services/admin.service.js';
import * as templateService from '../services/template.service.js';

export const adminRoutes = new Hono<{
  Variables: {
    user: AuthUser;
  };
}>();

// All admin routes strictly require SUPER_ADMIN platform role
adminRoutes.use('*', authMiddleware, requireRole('SUPER_ADMIN'));

// Platform dashboard statistics
adminRoutes.get('/dashboard', async (c) => {
  const stats = await adminService.getPlatformDashboardStats();
  return c.json({ success: true, data: stats });
});

// Schools list & status toggle
adminRoutes.get('/schools', async (c) => {
  const schools = await adminService.listAllSchools();
  return c.json({ success: true, data: schools });
});

adminRoutes.patch('/schools/:id/status', async (c) => {
  const user = c.get('user') as AuthUser;
  const schoolId = c.req.param('id');
  const body = await c.req.json();
  const input = UpdateSchoolStatusInputSchema.parse(body);

  const updated = await adminService.updateSchoolStatus(schoolId, input, user.id);
  return c.json({ success: true, data: updated });
});

// Users list & status toggle
adminRoutes.get('/users', async (c) => {
  const users = await adminService.listAllUsers();
  return c.json({ success: true, data: users });
});

adminRoutes.patch('/users/:id/status', async (c) => {
  const superAdmin = c.get('user') as AuthUser;
  const userId = c.req.param('id');
  const body = await c.req.json();
  const input = UpdateUserStatusInputSchema.parse(body);

  const updated = await adminService.updateUserStatus(userId, input, superAdmin.id);
  return c.json({ success: true, data: updated });
});

// Templates management & ZIP package upload
adminRoutes.get('/templates', async (c) => {
  const templates = await templateService.listAllTemplatesForAdmin();
  return c.json({ success: true, data: templates });
});

adminRoutes.post('/templates/versions/:versionId/preview-image', async (c) => {
  const user = c.get('user') as AuthUser;
  const body = await c.req.parseBody();
  const file = body['file'];
  if (!file || typeof file === 'string') return c.json({ success: false, error: { code: 'NO_FILE', message: 'File gambar wajib diunggah.' } }, 400);
  const result = await templateService.saveTemplatePreviewImage(c.req.param('versionId'), file.name, Buffer.from(await file.arrayBuffer()), user.id);
  return c.json({ success: true, data: result });
});

adminRoutes.post('/templates/upload', async (c) => {
  const superAdmin = c.get('user') as AuthUser;
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || typeof file === 'string') {
    return c.json({ success: false, error: { code: 'NO_FILE', message: 'File template (.zip atau .html) wajib diunggah.' } }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await templateService.processUploadedTemplate(file.name, buffer, superAdmin.id);

  if (!result.isValid) {
    return c.json({
      success: false,
      error: {
        code: 'TEMPLATE_VALIDATION_FAILED',
        message: 'Validasi paket template gagal. Perbaiki error yang ditemukan.',
        fields: {
          validationErrors: JSON.stringify(result.errors)
        }
      },
      validationReport: result
    }, 422);
  }

  return c.json({ success: true, data: result });
});

adminRoutes.get('/templates/versions/:versionId/preview', async (c) => {
  const result = await templateService.getTemplateVersionPreview(c.req.param('versionId'));
  return c.json({ success: true, data: result });
});

adminRoutes.patch('/templates/versions/:versionId/status', async (c) => {
  const superAdmin = c.get('user') as AuthUser;
  const versionId = c.req.param('versionId');
  const body = await c.req.json();
  const isActive = Boolean(body.isActive);

  const result = await templateService.toggleTemplateVersionStatus(versionId, isActive, superAdmin.id);
  return c.json({ success: true, data: result });
});

// Platform audit logs stream
adminRoutes.get('/audit-logs', async (c) => {
  const limit = parseInt(c.req.query('limit') || '100', 10);
  const logs = await adminService.listAuditLogs(limit);
  return c.json({ success: true, data: logs });
});
