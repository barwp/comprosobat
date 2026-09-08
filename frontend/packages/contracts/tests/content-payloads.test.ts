import { describe, expect, it } from 'vitest';
import { ContentEntryInputSchema, parseContentPayload } from '../src/content.js';

describe('CMS content contracts', () => {
  it('defaults new content entries to draft', () => {
    const entry = ContentEntryInputSchema.parse({ type: 'facility', title: 'Lab', payload: {} });
    expect(entry.status).toBe('DRAFT');
  });

  it('validates canonical payloads per module', () => {
    expect(() => parseContentPayload('facility', { name: '', thumbnailUrl: '' })).toThrow();
    expect(parseContentPayload('vision_mission', { visionContent: 'Visi baru', missionItems: ['Misi baru'] })).toMatchObject({ visionContent: 'Visi baru' });
    expect(parseContentPayload('testimonial', { name: 'Alumni', quote: 'Bagus' })).toMatchObject({ isActive: true, rating: 5 });
    expect(parseContentPayload('ppdb', { isActive: true, title: 'PPDB' })).toMatchObject({ isActive: true, formMode: 'external' });
  });
});
