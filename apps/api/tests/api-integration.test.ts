import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../src/app.js';
import { runSeed } from '@sobatweb/database';

describe('SobatWeb API: Comprehensive Multi-Tenant Integration Tests', () => {
  let superAdminToken: string;
  let school1AdminToken: string;
  let school1SiteId: string;
  let school1Id: string;

  beforeAll(async () => {
    // Ensure database is seeded with superadmin and demo schools
    await runSeed();

    // 1. Login as Super Admin
    const loginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@sobat.com',
        password: 'SuperAdminPassword123!'
      })
    });
    const loginJson = await loginRes.json();
    expect(loginJson.success).toBe(true);
    superAdminToken = loginJson.data.token;

    // 2. Login as School 1 Admin
    const school1LoginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin.man5sleman@sobat.com',
        password: 'SchoolAdmin123!'
      })
    });
    const school1Json = await school1LoginRes.json();
    expect(school1Json.success).toBe(true);
    school1AdminToken = school1Json.data.token;
    school1Id = school1Json.data.user.school.id;

    // Get school 1 site ID from onboarding progress
    const obRes = await app.request(`/api/v1/schools/${school1Id}/onboarding`, {
      headers: { 'Authorization': `Bearer ${school1AdminToken}` }
    });
    const obJson = await obRes.json();
    school1SiteId = obJson.data.siteId;
  });

  it('1. should resolve published school via public subdomain endpoint', async () => {
    const res = await app.request('/api/v1/public/resolve?slug=man5sleman');
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.tenant.schoolName).toBe('MAN 5 Sleman');
    expect(json.data.release.settings.siteName).toBe('MAN 5 Sleman');
  });

  it('2. should enforce cross-tenant isolation (School 1 user cannot access random unowned UUID)', async () => {
    const fakeSiteId = '00000000-0000-0000-0000-000000000099';
    const res = await app.request(`/api/v1/sites/${fakeSiteId}/settings`, {
      headers: { 'Authorization': `Bearer ${school1AdminToken}` }
    });

    expect(res.status).toBe(404);
  });

  it('3. should check and suggest subdomain collision safely', async () => {
    const res = await app.request(`/api/v1/schools/${school1Id}/subdomain/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${school1AdminToken}`
      },
      body: JSON.stringify({ slug: 'man5sleman' }) // already taken
    });

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.isAvailable).toBe(false);
    expect(json.data.suggestions.length).toBeGreaterThan(0);
    expect(json.data.suggestions[0]).toMatch(/man5sleman-\d/);
  });

  it('4. should update site settings in draft without changing live published release', async () => {
    // 1. Update draft settings
    const updateRes = await app.request(`/api/v1/sites/${school1SiteId}/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${school1AdminToken}`
      },
      body: JSON.stringify({
        tagline: 'Tagline Draft Baru Yang Belum Terbit'
      })
    });
    const updateJson = await updateRes.json();
    expect(updateJson.success).toBe(true);
    expect(updateJson.data.tagline).toBe('Tagline Draft Baru Yang Belum Terbit');

    // 2. Public live site still shows original published tagline
    const publicRes = await app.request('/api/v1/public/resolve?slug=man5sleman');
    const publicJson = await publicRes.json();
    expect(publicJson.data.release.settings.tagline).not.toBe('Tagline Draft Baru Yang Belum Terbit');
  });

  it('4b. should persist all repaired CMS modules, sanitize news, and render the latest draft preview', async () => {
    const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${school1AdminToken}` };
    const create = async (body: any) => {
      const response = await app.request(`/api/v1/sites/${school1SiteId}/content`, { method: 'POST', headers: authHeaders, body: JSON.stringify(body) });
      const json = await response.json();
      expect(response.status, JSON.stringify(json)).toBe(200);
      expect(json.success).toBe(true);
      return json.data;
    };

    const news = await create({ type: 'news', title: 'Berita Integrasi Aman', status: 'DRAFT', payload: {
      title: 'Berita Integrasi Aman', summary: 'Ringkasan integrasi', contentHtml: '<h2>Konten Lengkap</h2><p onclick="evil()">Isi aman</p><script>alert(1)</script>',
      coverImageUrl: 'https://example.com/news.jpg', category: 'Berita', author: 'Tester'
    }});
    expect(news.slug).toBe('berita-integrasi-aman');
    expect(news.payload.contentHtml).toContain('<h2>Konten Lengkap</h2>');
    expect(news.payload.contentHtml).not.toContain('script');
    expect(news.payload.contentHtml).not.toContain('onclick');

    const facility = await create({ type: 'facility', title: 'Studio Integrasi', status: 'DRAFT', sortOrder: 99, payload: {
      name: 'Studio Integrasi', description: 'Fasilitas uji end-to-end', thumbnailUrl: 'https://example.com/facility.jpg', category: 'Teknologi', isActive: true
    }});
    await create({ type: 'vision_mission', entryKey: 'vision_mission', title: 'Visi dan Misi Sekolah', status: 'DRAFT', payload: {
      visionContent: 'Visi Integrasi Terbaru', missionItems: ['Misi Integrasi Pertama', 'Misi Integrasi Kedua']
    }});
    await create({ type: 'history_statistic', entryKey: 'history_statistic', title: 'Sejarah & Statistik Sekolah', status: 'DRAFT', payload: {
      historyTitle: 'Jejak Integrasi', establishmentYear: 1994, historySummary: 'Sejarah Integrasi Terbaru', accreditation: 'A Unggul',
      stats: [{ key: 'students', label: 'Siswa Integrasi', rawValue: 777, suffix: '+', icon: 'Users', sortOrder: 0, isActive: true }]
    }});
    await create({ type: 'testimonial', title: 'Alumni Integrasi', status: 'DRAFT', payload: {
      name: 'Alumni Integrasi', graduationYear: '2020', currentRole: 'Tokoh Masyarakat', photoUrl: null, quote: 'Testimoni Integrasi Terbaru', sortOrder: 99, isActive: true
    }});
    await create({ type: 'ppdb', entryKey: 'ppdb', title: 'PPDB Integrasi', status: 'DRAFT', payload: {
      isActive: true, title: 'PPDB Integrasi Terbuka', academicYear: '2026/2027', description: 'Deskripsi PPDB Integrasi', formMode: 'external', ctaText: 'Daftar Integrasi', ctaUrl: 'https://example.com/daftar',
      registrationPaths: [{ title: 'Jalur Integrasi', description: 'Jalur uji', isActive: true, sortOrder: 0 }], requirements: ['Syarat Integrasi']
    }});
    await create({ type: 'video_profile', entryKey: 'video_profile', title: 'Video Profil Integrasi', status: 'DRAFT', payload: {
      title: 'Video Profil Integrasi', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', description: 'Deskripsi Video Integrasi', isActive: true
    }});
    await create({ type: 'staff', title: 'Guru Integrasi', status: 'DRAFT', payload: {
      name: 'Guru Integrasi', position: 'Guru Pengujian', photoUrl: null, bio: 'Biografi Guru Integrasi', sortOrder: 99, isActive: true
    }});

    const menuRes = await app.request(`/api/v1/sites/${school1SiteId}/menu-items`, { method: 'POST', headers: authHeaders, body: JSON.stringify({
      label: 'Menu Integrasi', linkType: 'section', target: '#guru-staf', location: 'header', sortOrder: 99, isActive: true
    }) });
    expect(menuRes.status).toBe(200);

    const mediaForm = new FormData();
    mediaForm.append('file', new File([new Uint8Array([137, 80, 78, 71])], 'galeri-integrasi.png', { type: 'image/png' }));
    mediaForm.append('altText', 'Media Integrasi');
    const mediaRes = await app.request(`/api/v1/sites/${school1SiteId}/media/upload`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${school1AdminToken}` }, body: mediaForm
    });
    expect(mediaRes.status).toBe(200);

    const contactRes = await app.request(`/api/v1/sites/${school1SiteId}/settings`, { method: 'PATCH', headers: authHeaders, body: JSON.stringify({
      address: 'Alamat Kontak Integrasi', phone: '0274-123456', operationalHours: 'Senin-Jumat Integrasi'
    }) });
    expect(contactRes.status).toBe(200);

    const patchRes = await app.request(`/api/v1/sites/${school1SiteId}/content/${facility.id}`, { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ payload: { description: 'Fasilitas berhasil diedit' } }) });
    expect(patchRes.status).toBe(200);

    const tokenRes = await app.request(`/api/v1/sites/${school1SiteId}/preview-token`, { method: 'POST', headers: { 'Authorization': `Bearer ${school1AdminToken}` } });
    const tokenJson = await tokenRes.json();
    const preview = await app.request(`/api/v1/public/render?token=${tokenJson.data.token}`);
    const html = await preview.text();
    for (const marker of ['Berita Integrasi Aman', 'Studio Integrasi', 'Visi Integrasi Terbaru', 'Misi Integrasi Kedua', 'Sejarah Integrasi Terbaru', '777+', 'Testimoni Integrasi Terbaru', 'PPDB Integrasi Terbuka', 'Video Profil Integrasi', 'Guru Integrasi', 'Menu Integrasi', 'Media Integrasi', 'Alamat Kontak Integrasi']) {
      expect(html).toContain(marker);
    }

    const publicBeforePublish = await app.request('/api/v1/public/render?slug=man5sleman');
    expect(await publicBeforePublish.text()).not.toContain('Berita Integrasi Aman');
  });

  it('5. should publish release v2 and update live public site snapshot atomically', async () => {
    const publishRes = await app.request(`/api/v1/sites/${school1SiteId}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${school1AdminToken}`
      },
      body: JSON.stringify({
        summary: 'Update rilis v2 dengan tagline baru'
      })
    });
    const publishJson = await publishRes.json();
    expect(publishJson.success).toBe(true);
    expect(publishJson.data.release.versionNumber).toBeGreaterThanOrEqual(2);

    // Public live site now shows updated tagline
    const publicRes = await app.request('/api/v1/public/resolve?slug=man5sleman');
    const publicJson = await publicRes.json();
    expect(publicJson.data.release.settings.tagline).toBe('Tagline Draft Baru Yang Belum Terbit');

    const rendered = await app.request('/api/v1/public/render?slug=man5sleman');
    const html = await rendered.text();
    expect(html).toContain('Berita Integrasi Aman');
    expect(html).toContain('Studio Integrasi');
    expect(html).toContain('PPDB Integrasi Terbuka');
    expect(html).toContain('Video Profil Integrasi');
    expect(html).toContain('Guru Integrasi');
    expect(html).toContain('Menu Integrasi');
    expect(html).toContain('Media Integrasi');
    expect(html).toContain('Alamat Kontak Integrasi');
  });

  it('6. should rollback to Release v1 and restore original state immediately', async () => {
    // Get release list
    const listRes = await app.request(`/api/v1/sites/${school1SiteId}/releases`, {
      headers: { 'Authorization': `Bearer ${school1AdminToken}` }
    });
    const listJson = await listRes.json();
    const releaseV1 = listJson.data.find((r: any) => r.versionNumber === 1);
    expect(releaseV1).toBeDefined();

    // Rollback to v1
    const rollbackRes = await app.request(`/api/v1/sites/${school1SiteId}/releases/${releaseV1.id}/rollback`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${school1AdminToken}` }
    });
    const rollbackJson = await rollbackRes.json();
    expect(rollbackJson.success).toBe(true);

    // Verify public site now displays v1 state again
    const publicRes = await app.request('/api/v1/public/resolve?slug=man5sleman');
    const publicJson = await publicRes.json();
    expect(publicJson.data.release.settings.tagline).toBe('Madrasah Aliyah Negeri Unggul - Ikhlas Beramal');
  });

  it('7. Super Admin can view platform metrics and audit logs', async () => {
    const dashRes = await app.request('/api/v1/admin/dashboard', {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    const dashJson = await dashRes.json();
    expect(dashJson.success).toBe(true);
    expect(dashJson.data.totalSchools).toBeGreaterThanOrEqual(1);

    const auditRes = await app.request('/api/v1/admin/audit-logs', {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    const auditJson = await auditRes.json();
    expect(auditJson.success).toBe(true);
    expect(auditJson.data.length).toBeGreaterThan(0);
  });

  it('8. Super Admin can preview an uploaded template version without activating it', async () => {
    const headers = { 'Authorization': `Bearer ${superAdminToken}` };
    const templatesRes = await app.request('/api/v1/admin/templates', { headers });
    const templatesJson = await templatesRes.json();
    const version = templatesJson.data.flatMap((template: any) => template.versions).find(Boolean);
    expect(version).toBeDefined();

    const previewRes = await app.request(`/api/v1/admin/templates/versions/${version.id}/preview`, { headers });
    const previewJson = await previewRes.json();
    expect(previewRes.status, JSON.stringify(previewJson)).toBe(200);
    expect(previewJson.success).toBe(true);
    expect(previewJson.data.html).toContain('<!DOCTYPE html>');
    expect(previewJson.data.html).toContain('data-cms-');
  });

  it('9. preserves a standalone app runtime only inside the sandboxed preview source', async () => {
    const html = '<!DOCTYPE html><html><head><title>Test Preview App</title></head><body><div id="root"></div><script>document.getElementById("root").textContent="Preview hidup";</script></body></html>';
    const form = new FormData();
    form.append('file', new File([html], 'test-preview-app.html', { type: 'text/html' }));

    const uploadRes = await app.request('/api/v1/admin/templates/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${superAdminToken}` },
      body: form
    });
    const uploadJson = await uploadRes.json();
    expect(uploadRes.status, JSON.stringify(uploadJson)).toBe(200);

    const previewRes = await app.request(`/api/v1/admin/templates/versions/${uploadJson.data.templateVersion.id}/preview`, {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    const previewJson = await previewRes.json();
    expect(previewRes.status, JSON.stringify(previewJson)).toBe(200);
    expect(previewJson.data.html).toContain('Preview hidup');
    expect(previewJson.data.html).toContain('<script>');
  });
});
