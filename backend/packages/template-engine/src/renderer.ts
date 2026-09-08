import * as cheerio from 'cheerio';
import { getByPath, escapeHtml, interpolateString } from './parser.js';
import { sanitizeHtml } from './sanitizer.js';

export interface RenderContext {
  site?: {
    name?: string;
    tagline?: string;
    description?: string;
    logo?: { url?: string; alt?: string };
    favicon?: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    contact?: {
      address?: string;
      email?: string;
      phone?: string;
      whatsapp?: string;
      whatsappUrl?: string;
      operationalHours?: string;
      googleMapsUrl?: string;
      googleMapsEmbedUrl?: string;
      hasContent?: boolean;
    };
    social?: {
      instagram?: string;
      facebook?: string;
      youtube?: string;
      tiktok?: string;
      twitter?: string;
    };
  };
  settings?: Record<string, any>;
  modules?: {
    hero_slides?: any[];
    programs?: any[];
    facilities?: any[];
    news?: any[];
    vision_mission?: any;
    mission_values?: any[];
    statistics?: any;
    staff?: any[];
    student_organizations?: any[];
    testimonials?: any[];
    ppdb?: any;
    video_profile?: any;
    media?: any[];
  };
  navigation?: {
    header?: any[];
    footer?: any[];
  };
  seo?: {
    title?: string;
    description?: string;
    canonicalUrl?: string;
    socialImage?: string;
    keywords?: string[];
  };
  meta?: {
    isPreview?: boolean;
    previewToken?: string;
    siteId?: string;
    slug?: string;
  };
}

export function renderTemplate(templateHtml: string, context: RenderContext): string {
  if (!templateHtml) return '';

  const $ = cheerio.load(templateHtml);

  // 1. Process data-cms-repeat elements
  $('[data-cms-repeat]').each((_, el) => {
    const $el = $(el);
    const moduleKey = $el.attr('data-cms-repeat') || '';
    const limitAttr = $el.attr('data-cms-limit');
    const limit = limitAttr ? parseInt(limitAttr, 10) : undefined;

    // Get array from context.modules[moduleKey] or context[moduleKey]
    let items: any[] = [];
    if (context.modules && Array.isArray((context.modules as any)[moduleKey])) {
      items = (context.modules as any)[moduleKey];
    } else {
      const val = getByPath(context, moduleKey, []);
      if (Array.isArray(val)) items = val;
    }

    if (limit && limit > 0) {
      items = items.slice(0, limit);
    }

    if (items.length === 0) {
      $el.remove();
      return;
    }

    // Template of the child element (or the element itself if it represents one item)
    // If element contains a single direct child or itself represents item
    const parent = $el.parent();
    const templateOuter = $.html($el);

    const renderedItems: string[] = [];

    for (const item of items) {
      const itemContext = {
        ...context,
        item
      };

      const item$ = cheerio.load(templateOuter, null, false);
      const $item = item$.root().children().first();
      $item.removeAttr('data-cms-repeat');
      $item.removeAttr('data-cms-limit');

      // Bind data inside the item
      bindNodeData(item$.root(), itemContext, item$);

      renderedItems.push(item$.html($item));
    }

    $el.replaceWith(renderedItems.join('\n'));
  });

  // 2. Process conditional sections (data-cms-if is retained for backwards compatibility)
  $('[data-cms-if], [data-cms-show]').each((_, el) => {
    const $el = $(el);
    const conditionPath = $el.attr('data-cms-if') || $el.attr('data-cms-show') || '';
    const val = getByPath(context, conditionPath, null);
    if (!val || (Array.isArray(val) && val.length === 0)) {
      $el.remove();
    } else {
      $el.removeAttr('data-cms-if');
      $el.removeAttr('data-cms-show');
    }
  });

  // 3. Process remaining bindings on the page
  bindNodeData($.root(), context, $);

  // 4. Inject Dynamic SEO & Metadata
  injectSeoAndMeta($, context);

  // 5. Inject Theme CSS Variables
  injectThemeStyles($, context);

  // 6. Inject Official Declarative Runtime Helper (for mobile menu toggle & tabs without unsafe scripts)
  injectRuntimeHelper($);

  // 7. Render Server-Side Lucide SVG Icons for instant zero-delay icon display
  renderServerIcons($);

  return sanitizeHtml($.html());
}

function bindNodeData($root: cheerio.Cheerio<any>, context: RenderContext, $: cheerio.CheerioAPI) {
  // Resolve conditions inside repeated fragments while their item context is still available.
  $root.find('[data-cms-if], [data-cms-show]').addBack('[data-cms-if], [data-cms-show]').each((_, el) => {
    const $el = $(el);
    const key = $el.attr('data-cms-if') || $el.attr('data-cms-show') || '';
    const value = getByPath(context, key, null);
    if (!value || (Array.isArray(value) && value.length === 0)) $el.remove();
    else $el.removeAttr('data-cms-if').removeAttr('data-cms-show');
  });

  // Resolve hide/unless conditions inside repeated fragments
  $root.find('[data-cms-hide], [data-cms-unless]').addBack('[data-cms-hide], [data-cms-unless]').each((_, el) => {
    const $el = $(el);
    const key = $el.attr('data-cms-hide') || $el.attr('data-cms-unless') || '';
    const value = getByPath(context, key, null);
    if (value && (!Array.isArray(value) || value.length > 0)) $el.remove();
    else $el.removeAttr('data-cms-hide').removeAttr('data-cms-unless');
  });

  // Bind data-cms-text
  $root.find('[data-cms-text]').addBack('[data-cms-text]').each((_, el) => {
    const $el = $(el);
    const key = $el.attr('data-cms-text') || '';
    const val = getByPath(context, key, '');
    $el.text(typeof val === 'object' ? '' : String(val));
    $el.removeAttr('data-cms-text');
  });

  // Bind data-cms-html (rich text)
  $root.find('[data-cms-html]').addBack('[data-cms-html]').each((_, el) => {
    const $el = $(el);
    const key = $el.attr('data-cms-html') || '';
    const val = getByPath(context, key, '');
    $el.html(sanitizeHtml(String(val || '')));
    $el.removeAttr('data-cms-html');
  });

  // Bind data-cms-image
  $root.find('[data-cms-image]').addBack('[data-cms-image]').each((_, el) => {
    const $el = $(el);
    const key = $el.attr('data-cms-image') || '';
    const imgObj = getByPath(context, key, {});
    if (typeof imgObj === 'string') {
      $el.attr('src', imgObj);
    } else if (imgObj && typeof imgObj === 'object') {
      if (imgObj.url) $el.attr('src', imgObj.url);
      if (imgObj.alt) $el.attr('alt', imgObj.alt);
    }
    $el.removeAttr('data-cms-image');
  });

  // Bind data-cms-link
  $root.find('[data-cms-link]').addBack('[data-cms-link]').each((_, el) => {
    const $el = $(el);
    const key = $el.attr('data-cms-link') || '';
    const linkUrl = getByPath(context, key, '#');
    $el.attr('href', String(linkUrl));
    $el.removeAttr('data-cms-link');
  });

  // Alias used by newer templates; resolves exactly like data-cms-link.
  $root.find('[data-cms-href]').addBack('[data-cms-href]').each((_, el) => {
    const $el = $(el);
    const key = $el.attr('data-cms-href') || '';
    $el.attr('href', String(getByPath(context, key, '#')));
    $el.removeAttr('data-cms-href');
  });

  // Generic safe source binding, used by video embeds.
  $root.find('[data-cms-src]').addBack('[data-cms-src]').each((_, el) => {
    const $el = $(el);
    const key = $el.attr('data-cms-src') || '';
    $el.attr('src', String(getByPath(context, key, '')));
    $el.removeAttr('data-cms-src');
  });

  // Interpolate attributes and text nodes with {{ path }}
  $root.find('*').each((_, el) => {
    if ('attribs' in el && el.attribs) {
      const attribs = el.attribs;
      for (const [attr, val] of Object.entries(attribs)) {
        if (val && val.includes('{{')) {
          $(el).attr(attr, interpolateString(val, context));
        }
      }
    }
  });
}

function injectSeoAndMeta($: cheerio.CheerioAPI, context: RenderContext) {
  const seo = context.seo || {};
  const site = context.site || {};
  const pageTitle = seo.title || site.name || 'Website Sekolah';
  const pageDesc = seo.description || site.description || site.tagline || '';
  const canonical = seo.canonicalUrl || '';
  const ogImage = seo.socialImage || site.logo?.url || '';

  if ($('title').length === 0) {
    $('head').prepend(`<title>${escapeHtml(pageTitle)}</title>`);
  } else {
    $('title').text(pageTitle);
  }

  // Meta tags
  $('head').append(`
    <meta name="description" content="${escapeHtml(pageDesc)}">
    <meta property="og:title" content="${escapeHtml(pageTitle)}">
    <meta property="og:description" content="${escapeHtml(pageDesc)}">
    <meta property="og:type" content="website">
    ${canonical ? `<meta property="og:url" content="${escapeHtml(canonical)}">` : ''}
    ${canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}">` : ''}
    ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}">` : ''}
    <meta name="twitter:card" content="summary_large_image">
  `);

  // EducationalOrganization JSON-LD Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: site.name || 'Sekolah',
    description: pageDesc,
    url: canonical || undefined,
    logo: site.logo?.url || undefined,
    address: site.contact?.address ? {
      '@type': 'PostalAddress',
      streetAddress: site.contact.address
    } : undefined,
    telephone: site.contact?.phone || undefined,
    email: site.contact?.email || undefined
  };

  $('head').append(`
    <script type="application/ld+json">
      ${JSON.stringify(jsonLd)}
    </script>
  `);
}

function injectThemeStyles($: cheerio.CheerioAPI, context: RenderContext) {
  const primary = context.site?.primaryColor || '#1a6b2f';
  const secondary = context.site?.secondaryColor || '#c9a227';
  const font = context.site?.fontFamily || 'Plus Jakarta Sans, sans-serif';

  // Ensure Tailwind CDN is loaded if not present
  if ($('script[src*="tailwindcss"]').length === 0) {
    $('head').prepend('<script src="https://cdn.tailwindcss.com"></script>');
  }

  // Ensure Lucide CDN is loaded if not present
  if ($('script[src*="lucide"]').length === 0) {
    $('head').append('<script src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"></script>');
    $('head').append('<script src="https://unpkg.com/lucide@latest"></script>');
  }

  $('head').append(`
    <style id="sobatweb-theme-vars">
      :root {
        --color-primary: ${primary};
        --color-secondary: ${secondary};
        --font-family-base: '${font}', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .bg-theme-primary { background-color: var(--color-primary, #1a6b2f) !important; }
      .text-theme-primary { color: var(--color-primary, #1a6b2f) !important; }
      .border-theme-primary { border-color: var(--color-primary, #1a6b2f) !important; }
      .bg-theme-secondary { background-color: var(--color-secondary, #c9a227) !important; }
      .text-theme-secondary { color: var(--color-secondary, #c9a227) !important; }

      /* Robust Brand & Gold Fallbacks */
      .bg-brand-900 { background-color: #082811 !important; color: #ffffff !important; }
      .bg-brand-800 { background-color: #0d3d1a !important; color: #ffffff !important; }
      .bg-brand-700 { background-color: #11461e !important; }
      .bg-brand-600 { background-color: #155826 !important; }
      .bg-brand-500 { background-color: var(--color-primary, #1a6b2f) !important; }
      .bg-brand-50 { background-color: #f2faf4 !important; }
      .bg-brand-50\\/40 { background-color: rgba(242, 250, 244, 0.4) !important; }
      .bg-brand-50\\/80 { background-color: rgba(242, 250, 244, 0.8) !important; }

      .text-brand-900 { color: #082811 !important; }
      .text-brand-800 { color: #0d3d1a !important; }
      .text-brand-700 { color: #11461e !important; }
      .text-brand-600 { color: #155826 !important; }
      .text-brand-500 { color: var(--color-primary, #1a6b2f) !important; }

      .bg-gold-500 { background-color: var(--color-secondary, #c9a227) !important; }
      .bg-gold-400 { background-color: #e8c84a !important; }
      .text-gold-300 { color: #f5e082 !important; }
      .text-gold-400 { color: #e8c84a !important; }
      .text-gold-500 { color: var(--color-secondary, #c9a227) !important; }
      .text-gold-600 { color: #b08a1c !important; }

      .border-brand-800 { border-color: #11461e !important; }
      .border-brand-500 { border-color: var(--color-primary, #1a6b2f) !important; }

      .hero-slide:not(:first-child) { display: none; }
    </style>
  `);
}

function injectRuntimeHelper($: cheerio.CheerioAPI) {
  // Inject safe declarative runtime script (handles mobile menu toggle, hero slider carousel, PPDB forms, & Lucide icon render)
  $('body').append(`
    <script id="sobatweb-runtime">
      (function() {
        function initIcons() {
          if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
            try {
              lucide.createIcons();
            } catch (e) {
              console.error('Lucide render error:', e);
            }
          }
        }

        // Retry loop to ensure Lucide renders even if script loads asynchronously
        var lucideAttempts = 0;
        var lucideInterval = setInterval(function() {
          lucideAttempts++;
          if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
            initIcons();
            clearInterval(lucideInterval);
          } else if (lucideAttempts >= 50) {
            clearInterval(lucideInterval);
          }
        }, 100);

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initIcons);
        } else {
          initIcons();
        }
        window.addEventListener('load', initIcons);

        function initHeroSliders() {
          document.querySelectorAll('[data-hero-slider]').forEach(function(slider) {
            if (slider.getAttribute('data-slider-bound') === 'true') return;
            slider.setAttribute('data-slider-bound', 'true');

            var slides = slider.querySelectorAll('.hero-slide');
            if (!slides || slides.length === 0) return;

            var prevBtn = slider.querySelector('[data-hero-prev]');
            var nextBtn = slider.querySelector('[data-hero-next]');
            var dotsContainer = slider.querySelector('[data-hero-dots]');
            var currentIndex = 0;
            var timer = null;

            if (slides.length <= 1) {
              if (prevBtn) prevBtn.style.display = 'none';
              if (nextBtn) nextBtn.style.display = 'none';
              if (dotsContainer) dotsContainer.style.display = 'none';
              slides[0].style.display = 'block';
              slides[0].classList.remove('hidden');
              return;
            }

            // Build dot buttons
            if (dotsContainer) {
              dotsContainer.innerHTML = '';
              for (var i = 0; i < slides.length; i++) {
                var dot = document.createElement('button');
                dot.setAttribute('type', 'button');
                dot.setAttribute('aria-label', 'Slide ' + (i + 1));
                dot.className = 'w-3 h-3 rounded-full transition-all duration-300 ' + (i === 0 ? 'bg-white w-8 shadow-sm' : 'bg-white/40 hover:bg-white/70');
                (function(idx) {
                  dot.addEventListener('click', function(e) {
                    e.preventDefault();
                    showSlide(idx);
                    restartTimer();
                  });
                })(i);
                dotsContainer.appendChild(dot);
              }
            }

            function showSlide(index) {
              for (var j = 0; j < slides.length; j++) {
                if (j === index) {
                  slides[j].style.display = 'block';
                  slides[j].classList.remove('hidden');
                  slides[j].style.opacity = '1';
                } else {
                  slides[j].style.display = 'none';
                  slides[j].classList.add('hidden');
                  slides[j].style.opacity = '0';
                }
              }

              if (dotsContainer) {
                var dots = dotsContainer.querySelectorAll('button');
                dots.forEach(function(d, idx) {
                  if (idx === index) {
                    d.className = 'w-8 h-3 rounded-full bg-white transition-all duration-300 shadow-sm';
                  } else {
                    d.className = 'w-3 h-3 rounded-full bg-white/40 hover:bg-white/70 transition-all duration-300';
                  }
                });
              }

              currentIndex = index;
            }

            function nextSlide() {
              var next = (currentIndex + 1) % slides.length;
              showSlide(next);
            }

            function prevSlide() {
              var prev = (currentIndex - 1 + slides.length) % slides.length;
              showSlide(prev);
            }

            function restartTimer() {
              if (timer) clearInterval(timer);
              timer = setInterval(nextSlide, 5000);
            }

            if (prevBtn) {
              prevBtn.addEventListener('click', function(e) {
                e.preventDefault();
                prevSlide();
                restartTimer();
              });
            }

            if (nextBtn) {
              nextBtn.addEventListener('click', function(e) {
                e.preventDefault();
                nextSlide();
                restartTimer();
              });
            }

            slider.addEventListener('mouseenter', function() {
              if (timer) clearInterval(timer);
            });

            slider.addEventListener('mouseleave', function() {
              restartTimer();
            });

            showSlide(0);
            restartTimer();
          });
        }

        function initPpdbForms() {
          document.querySelectorAll('[data-ppdb-form]').forEach(function(form) {
            if (form.getAttribute('data-bound') === 'true') return;
            form.setAttribute('data-bound', 'true');
            form.addEventListener('submit', async function(event) {
              event.preventDefault();
              var button = form.querySelector('button[type="submit"]');
              var message = form.querySelector('[data-ppdb-message]');
              var siteId = form.getAttribute('data-ppdb-form');
              var data = new FormData(form);
              if (button) button.disabled = true;
              if (message) message.textContent = 'Mengirim formulir...';
              try {
                var response = await fetch('/api/v1/public/ppdb/' + encodeURIComponent(siteId) + '/submissions', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ studentName: data.get('studentName'), nisn: data.get('nisn'), whatsapp: data.get('whatsapp') })
                });
                var result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.error && result.error.message || 'Formulir gagal dikirim.');
                if (message) { message.textContent = result.data.message; message.style.color = '#047857'; }
                form.reset();
              } catch (error) {
                if (message) { message.textContent = error.message || 'Formulir gagal dikirim.'; message.style.color = '#be123c'; }
              } finally { if (button) button.disabled = false; }
            });
          });
        }

        // Mobile navigation toggle & sliders
        document.addEventListener('DOMContentLoaded', function() {
          initHeroSliders();
          initPpdbForms();
          var toggleBtns = document.querySelectorAll('[data-toggle="menu"]');
          toggleBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
              var targetId = btn.getAttribute('data-target') || 'mobile-menu';
              var target = document.getElementById(targetId);
              if (target) {
                target.classList.toggle('hidden');
              }
            });
          });
        });
        window.addEventListener('load', function() {
          initHeroSliders();
        });
      })();
    </script>
  `);
}

const LUCIDE_ICONS: Record<string, string> = {
  'book-open': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  'user': '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  'user-plus': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>',
  'award': '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
  'trophy': '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.45.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  'graduation-cap': '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  'map-pin': '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  'phone': '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  'mail': '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  'menu': '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-up': '<path d="m18 15-6-6-6 6"/>',
  'sparkles': '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
  'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
  'check-circle-2': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  'check': '<polyline points="20 6 9 17 4 12"/>',
  'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'calendar': '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  'quote': '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>',
  'cpu': '<rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>',
  'flask-conical': '<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
  'code': '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  'laptop': '<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>',
  'globe': '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  'languages': '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
  'heart': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  'shield': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  'compass': '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
  'play': '<polygon points="6 3 20 12 6 21 6 3"/>',
  'microscope': '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>',
  'school': '<path d="m4 6 8-4 8 4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4"/><path d="M18 5v17"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/>',
  'building': '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
  'building-2': '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
  'briefcase': '<rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  'info': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  'help-circle': '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'eye': '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  'send': '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  'facebook': '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
  'instagram': '<rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>',
  'youtube': '<path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><polygon points="10 15 15 12 10 9 10 15"/>'
};

function renderServerIcons($: cheerio.CheerioAPI) {
  $('[data-lucide]').each((_, el) => {
    const $el = $(el);
    const iconName = ($el.attr('data-lucide') || '').trim().toLowerCase();
    const className = $el.attr('class') || '';
    const path = LUCIDE_ICONS[iconName] || LUCIDE_ICONS['award'] || '<circle cx="12" cy="12" r="10"/>';
    const svgHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${escapeHtml(iconName)} ${escapeHtml(className)}">${path}</svg>`;
    $el.replaceWith(svgHtml);
  });
}
