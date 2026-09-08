import { getDatabaseClient, schema, eq, and, asc } from '@sobatweb/database';
import { AppError } from '../middleware/error.js';
import { validateMenuCycle, type MenuItemInput, type MenuItemNode } from '@sobatweb/contracts';
import { logAuditEvent } from './audit.service.js';

export async function listMenuItems(siteId: string) {
  const db = getDatabaseClient();
  const items = await db
    .select()
    .from(schema.menuItems)
    .where(eq(schema.menuItems.siteId, siteId))
    .orderBy(asc(schema.menuItems.sortOrder));

  // Build tree structure
  const itemMap = new Map<string, MenuItemNode>();
  const rootNodes: MenuItemNode[] = [];

  for (const item of items) {
    itemMap.set(item.id, {
      id: item.id,
      parentId: item.parentId,
      location: item.location as any,
      label: item.label,
      linkType: item.linkType as any,
      target: item.target,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
      children: []
    });
  }

  for (const item of items) {
    const node = itemMap.get(item.id)!;
    if (item.parentId && itemMap.has(item.parentId)) {
      itemMap.get(item.parentId)!.children!.push(node);
    } else {
      rootNodes.push(node);
    }
  }

  return { items, tree: rootNodes };
}

export async function createMenuItem(siteId: string, input: MenuItemInput, userId: string, schoolId: string) {
  const db = getDatabaseClient();

  if (input.parentId) {
    const existing = await db.select().from(schema.menuItems).where(eq(schema.menuItems.siteId, siteId));
    const isValid = validateMenuCycle(existing, 'new-item-id', input.parentId);
    if (!isValid) {
      throw new AppError('Kedalaman menu maksimal 2 level dan tidak boleh menyebabkan siklus perulangan.', 'INVALID_MENU_HIERARCHY', 400);
    }
  }

  const [created] = await db.insert(schema.menuItems).values({
    siteId,
    parentId: input.parentId || null,
    location: input.location,
    label: input.label.trim(),
    linkType: input.linkType,
    target: input.target.trim(),
    sortOrder: input.sortOrder || 0,
    isActive: input.isActive ?? true
  }).returning();

  await logAuditEvent({
    actorUserId: userId,
    schoolId,
    action: 'MENU_ITEM_CREATED',
    targetType: 'menu_item',
    targetId: created.id,
    afterData: created
  });

  return created;
}

export async function updateMenuItem(siteId: string, itemId: string, input: Partial<MenuItemInput>, userId: string, schoolId: string) {
  const db = getDatabaseClient();
  const [existing] = await db.select().from(schema.menuItems).where(and(
    eq(schema.menuItems.id, itemId),
    eq(schema.menuItems.siteId, siteId)
  )).limit(1);

  if (!existing) {
    throw new AppError('Menu item tidak ditemukan.', 'MENU_NOT_FOUND', 404);
  }

  if (input.parentId !== undefined && input.parentId !== existing.parentId) {
    const allItems = await db.select().from(schema.menuItems).where(eq(schema.menuItems.siteId, siteId));
    const isValid = validateMenuCycle(allItems, itemId, input.parentId);
    if (!isValid) {
      throw new AppError('Siklus menu atau kedalaman melebihi batas 2 level terdeteksi.', 'INVALID_MENU_HIERARCHY', 400);
    }
  }

  const [updated] = await db.update(schema.menuItems)
    .set({
      parentId: input.parentId !== undefined ? input.parentId : existing.parentId,
      location: input.location || existing.location,
      label: input.label ? input.label.trim() : existing.label,
      linkType: input.linkType || existing.linkType,
      target: input.target ? input.target.trim() : existing.target,
      sortOrder: input.sortOrder !== undefined ? input.sortOrder : existing.sortOrder,
      isActive: input.isActive !== undefined ? input.isActive : existing.isActive
    })
    .where(eq(schema.menuItems.id, itemId))
    .returning();

  await logAuditEvent({
    actorUserId: userId,
    schoolId,
    action: 'MENU_ITEM_UPDATED',
    targetType: 'menu_item',
    targetId: itemId,
    beforeData: existing,
    afterData: updated
  });

  return updated;
}

export async function deleteMenuItem(siteId: string, itemId: string, userId: string, schoolId: string) {
  const db = getDatabaseClient();

  // Also remove children or reassign to parent
  await db.delete(schema.menuItems).where(and(
    eq(schema.menuItems.parentId, itemId),
    eq(schema.menuItems.siteId, siteId)
  ));

  await db.delete(schema.menuItems).where(and(
    eq(schema.menuItems.id, itemId),
    eq(schema.menuItems.siteId, siteId)
  ));

  await logAuditEvent({
    actorUserId: userId,
    schoolId,
    action: 'MENU_ITEM_DELETED',
    targetType: 'menu_item',
    targetId: itemId
  });

  return { success: true };
}
