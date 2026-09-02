import { Hono } from 'hono';
import {
  CreateSchoolInputSchema,
  UpdateSchoolProfileSchema,
  CheckSubdomainInputSchema,
  ReserveSubdomainInputSchema,
  SelectTemplateInputSchema
} from '@sobatweb/contracts';
import { authMiddleware, type AuthUser } from '../middleware/auth.js';
import { requireSchoolAccess } from '../middleware/tenant.js';
import * as schoolService from '../services/school.service.js';

export const schoolsRoutes = new Hono<{
  Variables: {
    user: AuthUser;
    schoolId: string;
  };
}>();

// Apply auth middleware to all school routes
schoolsRoutes.use('*', authMiddleware);

// Create new school (starts onboarding)
schoolsRoutes.post('/', async (c) => {
  const user = c.get('user') as AuthUser;
  const body = await c.req.json();
  const input = CreateSchoolInputSchema.parse(body);

  const result = await schoolService.createSchool(user.id, input);
  return c.json({ success: true, data: result });
});

// Check subdomain availability
schoolsRoutes.post('/:schoolId/subdomain/check', requireSchoolAccess, async (c) => {
  const body = await c.req.json();
  const input = CheckSubdomainInputSchema.parse(body);
  const result = await schoolService.checkSubdomainAvailability(input.slug);
  return c.json({ success: true, data: result });
});

// Reserve unique subdomain
schoolsRoutes.put('/:schoolId/subdomain', requireSchoolAccess, async (c) => {
  const user = c.get('user') as AuthUser;
  const schoolId = c.req.param('schoolId')!;
  const body = await c.req.json();
  const input = ReserveSubdomainInputSchema.parse(body);

  const result = await schoolService.reserveSubdomain(schoolId, input, user.id);
  return c.json({ success: true, data: result });
});

// Select school template
schoolsRoutes.put('/:schoolId/template', requireSchoolAccess, async (c) => {
  const user = c.get('user') as AuthUser;
  const schoolId = c.req.param('schoolId')!;
  const body = await c.req.json();
  const input = SelectTemplateInputSchema.parse(body);

  const result = await schoolService.selectTemplate(schoolId, input, user.id);
  return c.json({ success: true, data: result });
});

// Complete onboarding
schoolsRoutes.post('/:schoolId/onboarding/complete', requireSchoolAccess, async (c) => {
  const user = c.get('user') as AuthUser;
  const schoolId = c.req.param('schoolId')!;

  const result = await schoolService.completeOnboarding(schoolId, user.id);
  return c.json({ success: true, data: result });
});

// Get onboarding progress & checklist
schoolsRoutes.get('/:schoolId/onboarding', requireSchoolAccess, async (c) => {
  const schoolId = c.req.param('schoolId')!;
  const result = await schoolService.getOnboardingProgress(schoolId);
  return c.json({ success: true, data: result });
});
