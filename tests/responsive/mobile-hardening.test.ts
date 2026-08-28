import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 12D — Mobile Optimization & Responsive Hardening', () => {
  const rootDir = process.cwd();

  it('1. Viewport Meta Tag Invariant', () => {
    const indexPath = path.join(rootDir, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
      const html = fs.readFileSync(indexPath, 'utf-8');
      expect(html).toContain('name="viewport"');
      expect(html).toContain('width=device-width');
    }
  });

  it('2. Global Responsive Container & Text Wrap Rules', () => {
    const globalCss = fs.readFileSync(path.join(rootDir, 'src', 'styles', 'global.css'), 'utf-8');
    expect(globalCss).toContain('@media (max-width: 640px)');
    expect(globalCss).toContain('overflow-wrap: break-word');
  });

  it('3. Header & Mobile Drawer Accessibility', () => {
    const headerCode = fs.readFileSync(path.join(rootDir, 'src', 'components', 'Header.astro'), 'utf-8');
    expect(headerCode).toContain('min-height: 44px');
    expect(headerCode).toContain('mobile-nav-link');
    expect(headerCode).toContain('@media (max-width: 640px)');
  });

  it('4. Hero Slider Mobile Aspect Ratio & No Blank Media Voids', () => {
    const heroCode = fs.readFileSync(path.join(rootDir, 'src', 'components', 'HeroSlider.astro'), 'utf-8');
    expect(heroCode).toContain('aspect-ratio: 16 / 9');
    expect(heroCode).toContain('@media (max-width: 640px)');
    expect(heroCode).toContain('slider-arrow-btn');
    expect(heroCode).toContain('min-height: 44px');
  });

  it('5. Article Card Flex Wrap & Zero Overflow Protection', () => {
    const articleCardCode = fs.readFileSync(path.join(rootDir, 'src', 'components', 'ArticleCard.astro'), 'utf-8');
    expect(articleCardCode).toContain('min-width: 0');
    expect(articleCardCode).toContain('flex-wrap: wrap');
    expect(articleCardCode).toContain('@media (max-width: 768px)');
    expect(articleCardCode).toContain('@media (max-width: 640px)');
  });

  it('6. Product Card Mobile Responsive Hardening & Full-Width CTA', () => {
    const productCardCode = fs.readFileSync(path.join(rootDir, 'src', 'components', 'ProductCard.astro'), 'utf-8');
    expect(productCardCode).toContain('@media (max-width: 820px)');
    expect(productCardCode).toContain('@media (max-width: 640px)');
    expect(productCardCode).toContain('min-height: 44px');
  });

  it('7. Markdown Table Responsive Containment in ArticleLayout', () => {
    const articleLayoutCode = fs.readFileSync(path.join(rootDir, 'src', 'layouts', 'ArticleLayout.astro'), 'utf-8');
    expect(articleLayoutCode).toContain('overflow-x: auto');
    expect(articleLayoutCode).toContain('-webkit-overflow-scrolling: touch');
    expect(articleLayoutCode).toContain('@media (max-width: 640px)');
  });

  it('8. All Built Pages Contain Responsive Table & Card Styles in Production Dist', () => {
    const neckbandsHtmlPath = path.join(rootDir, 'dist', 'best-wireless-neckbands-under-2000', 'index.html');
    if (fs.existsSync(neckbandsHtmlPath)) {
      const html = fs.readFileSync(neckbandsHtmlPath, 'utf-8');
      expect(html).toContain('<table');
      expect(html).toContain('product-card');
      expect(html).toContain('quick-picks-section');
    }
  });
});
