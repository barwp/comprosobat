import { pgTable, uuid, varchar, integer, boolean, pgEnum, index } from 'drizzle-orm/pg-core';
import { schoolSites } from './schools.js';

export const linkTypeEnum = pgEnum('link_type', ['internal_page', 'section', 'external_url']);
export const menuLocationEnum = pgEnum('menu_location', ['header', 'footer', 'sidebar']);

export const menuItems = pgTable('menu_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteId: uuid('site_id').references(() => schoolSites.id, { onDelete: 'cascade' }).notNull(),
  parentId: uuid('parent_id'),
  location: menuLocationEnum('location').default('header').notNull(),
  label: varchar('label', { length: 100 }).notNull(),
  linkType: linkTypeEnum('link_type').notNull(),
  target: varchar('target', { length: 255 }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull()
}, (table) => [
  index('menu_item_site_idx').on(table.siteId),
  index('menu_item_parent_idx').on(table.parentId),
  index('menu_item_sort_idx').on(table.siteId, table.location, table.sortOrder)
]);
