import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeRichTextHtml, sanitizeCss, renderTemplate, interpolateString } from '../src/index.js';

describe('Template Engine: Sanitizer', () => {
  it('should strip malicious <script> tags from HTML', () => {
    const raw = `<div><h1>Selamat Datang</h1><script>alert("XSS")</script></div>`;
    const clean = sanitizeHtml(raw);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('alert("XSS")');
    expect(clean).toContain('Selamat Datang');
  });

  it('should strip inline event handlers like onclick, onload, onerror', () => {
    const raw = `<img src="pic.jpg" onerror="alert(1)" onclick="stealCookies()" alt="Foto">`;
    const clean = sanitizeHtml(raw);
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('onclick');
    expect(clean).toContain('alt="Foto"');
  });

  it('should strip javascript: pseudoprotocol URLs', () => {
    const raw = `<a href="javascript:alert('pwned')">Klik Disini</a>`;
    const clean = sanitizeHtml(raw);
    expect(clean).not.toContain('javascript:');
  });

  it('should sanitize dangerous CSS expressions', () => {
    const rawCss = `body { background: expression(alert(1)); color: red; }`;
    const cleanCss = sanitizeCss(rawCss);
    expect(cleanCss).not.toContain('expression');
    expect(cleanCss).toContain('color: red;');
  });

  it('should preserve editorial markup but remove scripts, foreign iframes, handlers, and unsafe links', () => {
    const clean = sanitizeRichTextHtml('<h2>Judul</h2><p onclick="evil()"><strong>Teks</strong></p><iframe src="https://evil.test"></iframe><a href="javascript:evil()">tautan</a>');
    expect(clean).toContain('<h2>Judul</h2>');
    expect(clean).toContain('<strong>Teks</strong>');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('iframe');
    expect(clean).not.toContain('javascript:');
  });
});

describe('Template Engine: Parser & Renderer', () => {
  it('should interpolate string variables', () => {
    const context = { site: { name: 'SMAN 1 Nusantara', tagline: 'Cerdas & Berkarakter' } };
    const str = 'Selamat Datang di {{ site.name }} - {{ site.tagline }}';
    expect(interpolateString(str, context)).toBe('Selamat Datang di SMAN 1 Nusantara - Cerdas &amp; Berkarakter');
  });

  it('should render data-cms-text and data-cms-image bindings correctly', () => {
    const tpl = `
      <header>
        <h1 data-cms-text="site.name">{{ site.name }}</h1>
        <img data-cms-image="site.logo" src="" alt="">
      </header>
    `;
    const context = {
      site: {
        name: 'SMK Bintang Bangsa',
        logo: { url: 'https://example.com/logo.png', alt: 'Emblem SMK' }
      }
    };
    const rendered = renderTemplate(tpl, context);
    expect(rendered).toContain('SMK Bintang Bangsa');
    expect(rendered).toContain('src="https://example.com/logo.png"');
    expect(rendered).toContain('alt="Emblem SMK"');
  });

  it('should repeat items with data-cms-repeat and respect limits', () => {
    const tpl = `
      <section data-cms-repeat="news" data-cms-limit="2">
        <article>
          <h2 data-cms-text="item.title">{{ item.title }}</h2>
          <p data-cms-text="item.summary">{{ item.summary }}</p>
        </article>
      </section>
    `;
    const context = {
      modules: {
        news: [
          { title: 'Berita 1', summary: 'Ringkasan 1' },
          { title: 'Berita 2', summary: 'Ringkasan 2' },
          { title: 'Berita 3', summary: 'Ringkasan 3' }
        ]
      }
    };
    const rendered = renderTemplate(tpl, context);
    expect(rendered).toContain('Berita 1');
    expect(rendered).toContain('Berita 2');
    expect(rendered).not.toContain('Berita 3'); // limited to 2
  });

  it('should render repeat cards without nested html/body and obey data-cms-show', () => {
    const rendered = renderTemplate('<main><section data-cms-show="modules.ppdb.isActive">PPDB</section><div data-cms-repeat="modules.statistics.stats"><span data-cms-text="item.value"></span></div></main>', {
      modules: { ppdb: { isActive: true }, statistics: { stats: [{ value: '777+' }, { value: '88' }] } }
    });
    expect(rendered).toContain('PPDB');
    expect(rendered).toContain('777+');
    expect(rendered).toContain('88');
    expect((rendered.match(/<html/g) || []).length).toBe(1);
    expect(rendered).not.toMatch(/<div[^>]*>\s*<html/i);
  });

  it('should resolve conditional images and source bindings inside repeated cards', () => {
    const rendered = renderTemplate('<main><article data-cms-repeat="modules.staff"><span data-cms-text="item.name"></span><img data-cms-show="item.photoUrl" data-cms-image="item.photoUrl"><p data-cms-show="item.bio" data-cms-text="item.bio"></p></article><iframe data-cms-src="modules.video_profile.embedUrl"></iframe></main>', {
      modules: {
        staff: [{ name: 'Guru Dengan Foto', photoUrl: '/guru.jpg', bio: 'Biografi' }, { name: 'Guru Tanpa Foto', photoUrl: '', bio: '' }],
        video_profile: { embedUrl: 'https://www.youtube-nocookie.com/embed/example' }
      }
    });
    expect(rendered).toContain('Guru Dengan Foto');
    expect(rendered).toContain('src="/guru.jpg"');
    expect(rendered).toContain('Biografi');
    expect(rendered).toContain('src="https://www.youtube-nocookie.com/embed/example"');
    expect((rendered.match(/<img/g) || []).length).toBe(1);
  });

  it('should inject SEO metadata and JSON-LD EducationalOrganization schema', () => {
    const tpl = `<html><head></head><body><h1 data-cms-text="site.name">{{ site.name }}</h1></body></html>`;
    const context = {
      site: { name: 'SMAN 1 Nusantara' },
      seo: { title: 'SMAN 1 Nusantara - Website Resmi', description: 'Profil Sekolah' }
    };
    const rendered = renderTemplate(tpl, context);
    expect(rendered).toContain('<title>SMAN 1 Nusantara - Website Resmi</title>');
    expect(rendered).toContain('EducationalOrganization');
    expect(rendered).toContain('twitter:card');
  });
});
