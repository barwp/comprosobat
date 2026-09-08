import { describe, it, expect } from 'vitest';
import { sanitizeSlug, isReservedSlug, validateMenuCycle } from '../src/index.js';

describe('Contracts: Slug Utilities', () => {
  it('should normalize and sanitize school name to clean slug', () => {
    expect(sanitizeSlug('SMAN 1 Kota Bandung')).toBe('sman-1-kota-bandung');
    expect(sanitizeSlug('  SMA   Negeri 2 -- Jakarta!!  ')).toBe('sma-negeri-2-jakarta');
    expect(sanitizeSlug('Madrasah Aliyah Negeri 5 Sleman (MAN 5)')).toBe('madrasah-aliyah-negeri-5-sleman-man-5');
  });

  it('should identify reserved slugs correctly', () => {
    expect(isReservedSlug('admin')).toBe(true);
    expect(isReservedSlug('superadmin')).toBe(true);
    expect(isReservedSlug('api')).toBe(true);
    expect(isReservedSlug('sobat')).toBe(true);
    expect(isReservedSlug('sman1nusantara')).toBe(false);
  });
});

describe('Contracts: Navigation Menu Cycle Validator', () => {
  it('should allow valid parent-child relationships within 2 levels', () => {
    const items = [
      { id: '1', parentId: null },
      { id: '2', parentId: null }
    ];
    // Making item 2 child of item 1 is valid (depth 2)
    expect(validateMenuCycle(items, '2', '1')).toBe(true);
  });

  it('should reject self-parenting', () => {
    const items = [{ id: '1', parentId: null }];
    expect(validateMenuCycle(items, '1', '1')).toBe(false);
  });

  it('should reject circular references', () => {
    const items = [
      { id: '1', parentId: null },
      { id: '2', parentId: '1' }
    ];
    // Making item 1 child of item 2 would create cycle 1->2->1
    expect(validateMenuCycle(items, '1', '2')).toBe(false);
  });

  it('should reject nesting deeper than 2 levels', () => {
    const items = [
      { id: '1', parentId: null },
      { id: '2', parentId: '1' },
      { id: '3', parentId: null }
    ];
    // Making item 3 child of item 2 would create depth 3 (1 -> 2 -> 3)
    expect(validateMenuCycle(items, '3', '2')).toBe(false);
  });
});
