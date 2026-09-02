import { Hono } from 'hono';
import * as templateService from '../services/template.service.js';

export const templatesRoutes = new Hono();

// Public active template list for onboarding & preview
templatesRoutes.get('/', async (c) => {
  const templates = await templateService.listActiveTemplates();
  return c.json({ success: true, data: templates });
});
