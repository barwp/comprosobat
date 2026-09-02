import * as path from 'node:path';
import * as fs from 'node:fs';
import * as cheerio from 'cheerio';
import { TemplateManifestSchema, type TemplateManifest, type TemplateValidationResult } from '@sobatweb/contracts';

const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.php', '.py', '.vbs', '.msi', '.ps1', '.dll'];
const MAX_TOTAL_FILES = 500;
const MAX_DECOMPRESSED_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export interface FileEntry {
  relativePath: string;
  sizeBytes: number;
  content?: string | Buffer;
}

/**
 * Validates a template package directory or list of file entries
 */
export async function validateTemplateFiles(files: FileEntry[]): Promise<TemplateValidationResult> {
  const errors: Array<{ file?: string; field?: string; message: string }> = [];
  const warnings: Array<{ file?: string; message: string }> = [];

  // 1. Check file counts and total size (anti zip-bomb)
  if (files.length > MAX_TOTAL_FILES) {
    errors.push({ message: `Jumlah file (${files.length}) melebihi batas maksimal ${MAX_TOTAL_FILES} file.` });
  }

  let totalSize = 0;
  for (const file of files) {
    totalSize += file.sizeBytes;
    
    // Path traversal check
    const normalized = path.normalize(file.relativePath).replace(/\\/g, '/');
    if (normalized.startsWith('../') || normalized.includes('/../') || path.isAbsolute(normalized)) {
      errors.push({ file: file.relativePath, message: 'Deteksi path traversal yang tidak aman.' });
    }

    // Dangerous extension check
    const ext = path.extname(file.relativePath).toLowerCase();
    if (DANGEROUS_EXTENSIONS.includes(ext)) {
      errors.push({ file: file.relativePath, message: `Ekstensi file ${ext} tidak diizinkan untuk alasan keamanan.` });
    }
  }

  if (totalSize > MAX_DECOMPRESSED_SIZE_BYTES) {
    errors.push({ message: `Total ukuran file (${(totalSize / 1024 / 1024).toFixed(1)}MB) melebihi batas ${MAX_DECOMPRESSED_SIZE_BYTES / 1024 / 1024}MB.` });
  }

  // 2. Validate manifest.json
  const manifestFile = files.find(f => f.relativePath === 'manifest.json' || f.relativePath.endsWith('/manifest.json'));
  let parsedManifest: TemplateManifest | undefined;

  if (!manifestFile || !manifestFile.content) {
    errors.push({ file: 'manifest.json', message: 'File manifest.json wajib ada di root paket template.' });
  } else {
    try {
      const manifestRaw = typeof manifestFile.content === 'string' 
        ? JSON.parse(manifestFile.content) 
        : JSON.parse(manifestFile.content.toString('utf-8'));
      
      const parseResult = TemplateManifestSchema.safeParse(manifestRaw);
      if (!parseResult.success) {
        for (const issue of parseResult.error.issues) {
          errors.push({
            file: 'manifest.json',
            field: issue.path.join('.'),
            message: issue.message
          });
        }
      } else {
        parsedManifest = parseResult.data;
      }
    } catch (e: any) {
      errors.push({ file: 'manifest.json', message: `Format JSON tidak valid: ${e.message}` });
    }
  }

  // 3. Validate entry file
  const entryPath = parsedManifest ? parsedManifest.entry : 'index.html';
  const entryFile = files.find(f => f.relativePath === entryPath || f.relativePath.endsWith(`/${entryPath}`));

  if (!entryFile) {
    errors.push({ file: entryPath, message: `Entry point file '${entryPath}' tidak ditemukan dalam paket template.` });
  }

  // 4. Scan HTML files for disallowed elements
  for (const file of files) {
    if (file.relativePath.endsWith('.html') && file.content) {
      const contentStr = typeof file.content === 'string' ? file.content : file.content.toString('utf-8');
      const $ = cheerio.load(contentStr);

      // Check for <script> tags
      if ($('script').length > 0) {
        errors.push({
          file: file.relativePath,
          message: 'Ditemukan tag <script>. Template HTML tidak boleh mengeksekusi JavaScript kustom demi keamanan.'
        });
      }

      // Check for inline event handlers
      $('*').each((_, el) => {
        if ('attribs' in el && el.attribs) {
          const attribs = el.attribs;
          const tagName = 'tagName' in el ? (el as any).tagName : 'element';
          for (const attr of Object.keys(attribs)) {
            if (/^on[a-z]+/i.test(attr)) {
              errors.push({
                file: file.relativePath,
                message: `Ditemukan atribut event inline '${attr}' pada elemen <${tagName}>. Hapus atribut event.`
              });
            }
            const val = (attribs[attr] || '').trim().toLowerCase();
            if (val.startsWith('javascript:')) {
              errors.push({
                file: file.relativePath,
                message: `Ditemukan 'javascript:' URI pada atribut '${attr}' file ${file.relativePath}.`
              });
            }
          }
        }
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    manifest: parsedManifest,
    extractedFilesCount: files.length,
    totalSizeBytes: totalSize
  };
}
