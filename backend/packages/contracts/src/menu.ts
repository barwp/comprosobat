import { z } from 'zod';

export const LinkTypeEnum = z.enum(['internal_page', 'section', 'external_url']);
export type LinkType = z.infer<typeof LinkTypeEnum>;

export const MenuLocationEnum = z.enum(['header', 'footer', 'sidebar']);
export type MenuLocation = z.infer<typeof MenuLocationEnum>;

export const MenuItemInputSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  location: MenuLocationEnum.default('header'),
  label: z.string().min(1, 'Label menu wajib diisi').max(50),
  linkType: LinkTypeEnum,
  target: z.string().min(1, 'Target menu wajib diisi'),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true)
}).refine((data) => {
  if (data.linkType === 'external_url') {
    return /^https?:\/\/.+/.test(data.target);
  }
  return true;
}, {
  message: 'External URL harus menggunakan protokol http:// atau https://',
  path: ['target']
});

export type MenuItemInput = z.infer<typeof MenuItemInputSchema>;

export interface MenuItemNode {
  id: string;
  parentId: string | null;
  location: MenuLocation;
  label: string;
  linkType: LinkType;
  target: string;
  sortOrder: number;
  isActive: boolean;
  children?: MenuItemNode[];
}

/**
 * Validates that adding/updating parentId does not cause a cyclical reference or exceed max depth (2 levels)
 */
export function validateMenuCycle(
  items: Array<{ id: string; parentId: string | null }>,
  targetId: string,
  newParentId: string | null
): boolean {
  if (!newParentId) return true;
  if (targetId === newParentId) return false;

  const parentMap = new Map<string, string | null>();
  for (const item of items) {
    parentMap.set(item.id, item.id === targetId ? newParentId : item.parentId);
  }

  // Detect loop by following parent chain
  let current: string | null = newParentId;
  const visited = new Set<string>();
  let depth = 1;

  while (current) {
    if (visited.has(current) || current === targetId) {
      return false; // Cycle detected
    }
    visited.add(current);
    current = parentMap.get(current) || null;
    depth++;
    if (depth > 2) {
      return false; // Exceeds max depth of 2
    }
  }

  return true;
}
