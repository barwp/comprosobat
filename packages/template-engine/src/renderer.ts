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
            lucide.createIcons();
          }
        }
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
