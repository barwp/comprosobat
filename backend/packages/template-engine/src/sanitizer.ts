import * as cheerio from 'cheerio';

export interface SanitizeOptions {
  allowStyles?: boolean;
  allowImages?: boolean;
}

const DISALLOWED_TAGS = [
  'script',
  'object',
  'embed',
  'applet',
  'base',
  'frame',
  'frameset'
];

const DISALLOWED_ATTRIBUTES = [
  /^on[a-z]+/i, // onclick, onload, onmouseover, etc.
  /^formaction$/i,
  /^xlink:href$/i
];

/**
 * Sanitizes HTML to eliminate XSS vectors, inline JavaScript, and unsafe URLs
 */
export function sanitizeHtml(html: string, options: SanitizeOptions = {}): string {
  if (!html) return '';

  const $ = cheerio.load(html, { xml: false });

  // Remove disallowed tags except safe application/ld+json, official runtime, and safe CDNs
  $('script').each((_, el) => {
    const type = $(el).attr('type') || '';
    const id = $(el).attr('id') || '';
    const src = ($(el).attr('src') || '').toLowerCase();
    const isSafeCdn = src.includes('cdn.tailwindcss.com') ||
                      src.includes('cdnjs.cloudflare.com') ||
                      src.includes('cdn.jsdelivr.net') ||
                      src.includes('unpkg.com');
    const content = $(el).html() || '';
    const isSafeInlineScript = content.includes('tailwind.config') || content.includes('lucide.createIcons');

    if (type.toLowerCase() !== 'application/ld+json' && id !== 'sobatweb-runtime' && !isSafeCdn && !isSafeInlineScript) {
      $(el).remove();
    }
  });

  // Remove other disallowed tags
  $('object, embed, applet, base, frame, frameset').remove();

  // Sanitize all elements
  $('*').each((_, el) => {
    if ('attribs' in el && el.attribs) {
      const attribs = el.attribs;
      for (const attr of Object.keys(attribs)) {
        // Check for inline event handlers
        if (DISALLOWED_ATTRIBUTES.some(regex => regex.test(attr))) {
          $(el).removeAttr(attr);
          continue;
        }

        // Check href / src / action values
        const val = (attribs[attr] || '').trim();
        if (['href', 'src', 'action', 'data'].includes(attr.toLowerCase())) {
          const lowerVal = val.toLowerCase();
          if (
            lowerVal.startsWith('javascript:') ||
            lowerVal.startsWith('vbscript:') ||
            lowerVal.startsWith('data:text/html') ||
            lowerVal.startsWith('data:application/javascript')
          ) {
            $(el).removeAttr(attr);
          }
        }
      }
    }
  });

  return $.html();
}

/** Sanitizer khusus konten editor berita. Hanya elemen editorial dasar yang dipertahankan. */
export function sanitizeRichTextHtml(html: string): string {
  if (!html) return '';
  const $ = cheerio.load(html, null, false);
  const allowedTags = new Set([
    'p', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li',
    'blockquote', 'a', 'img', 'figure', 'figcaption', 'br', 'hr'
  ]);
  const allowedAttrs: Record<string, Set<string>> = {
    a: new Set(['href', 'title', 'target', 'rel']),
    img: new Set(['src', 'alt', 'title'])
  };

  $('script, style, iframe, object, embed, form, input, button, textarea, select, link, meta').remove();
  $('*').each((_, el) => {
    const tag = String((el as any).tagName || '').toLowerCase();
    if (!allowedTags.has(tag)) {
      $(el).replaceWith($(el).contents());
      return;
    }
    for (const attr of Object.keys((el as any).attribs || {})) {
      if (!allowedAttrs[tag]?.has(attr.toLowerCase())) $(el).removeAttr(attr);
    }
    if (tag === 'a') {
      const href = ($(el).attr('href') || '').trim();
      if (!isSafeEditorialUrl(href, false)) $(el).removeAttr('href');
      if ($(el).attr('target') === '_blank') $(el).attr('rel', 'noopener noreferrer');
    }
    if (tag === 'img') {
      const src = ($(el).attr('src') || '').trim();
      if (!isSafeEditorialUrl(src, true)) $(el).remove();
    }
  });
  return $.root().html() || '';
}

function isSafeEditorialUrl(value: string, image: boolean) {
  if (!value) return false;
  if (value.startsWith('/') || value.startsWith('#')) return true;
  if (!image && /^(mailto:|tel:)/i.test(value)) return true;
  return /^https?:\/\//i.test(value);
}

/**
 * Sanitizes CSS text to prevent dangerous URL injections or expression() attacks
 */
export function sanitizeCss(css: string): string {
  if (!css) return '';
  return css
    .replace(/expression\s*\(.*?\)/gi, '')
    .replace(/behavior\s*:/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/@import\s+url\((.*?)\)/gi, (match, url) => {
      if (url.includes('://') && !url.startsWith('https://fonts.googleapis.com')) {
        return '/* blocked remote import */';
      }
      return match;
    });
}
