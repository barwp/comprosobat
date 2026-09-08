import { getDatabaseClient, getPgliteInstance } from './client.js';
import { sql } from 'drizzle-orm';

export async function runMigrations() {
  console.log('🔄 Running database migrations...');
  const pglite = getPgliteInstance();
  if (pglite?.waitReady) {
    await pglite.waitReady;
  }
  const db = getDatabaseClient();

  // Create individual tables
  const tableStatements = [
    `CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(150) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      platform_role VARCHAR(64) DEFAULT 'SCHOOL_ADMIN' NOT NULL,
      status VARCHAR(64) DEFAULT 'PENDING_VERIFICATION' NOT NULL,
      email_verified_at TIMESTAMPTZ,
      verification_token VARCHAR(255),
      reset_password_token VARCHAR(255),
      reset_password_expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS auth_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key VARCHAR(64) UNIQUE NOT NULL,
      name VARCHAR(150) NOT NULL,
      category VARCHAR(64) DEFAULT 'Umum' NOT NULL,
      status VARCHAR(64) DEFAULT 'ACTIVE' NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS template_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
      version VARCHAR(32) NOT NULL,
      schema_version VARCHAR(16) DEFAULT '1.0' NOT NULL,
      manifest JSONB NOT NULL,
      storage_path TEXT NOT NULL,
      checksum VARCHAR(64) NOT NULL,
      validation_status VARCHAR(64) DEFAULT 'VALID' NOT NULL,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      CONSTRAINT template_version_unique UNIQUE(template_id, version)
    )`,

    `CREATE TABLE IF NOT EXISTS schools (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      official_name VARCHAR(150) NOT NULL,
      npsn VARCHAR(20),
      education_level VARCHAR(64) DEFAULT 'SMA' NOT NULL,
      school_type VARCHAR(64) DEFAULT 'NEGERI' NOT NULL,
      province VARCHAR(100) NOT NULL,
      city VARCHAR(100) NOT NULL,
      address VARCHAR(255),
      phone VARCHAR(50),
      email VARCHAR(255),
      status VARCHAR(64) DEFAULT 'ACTIVE' NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS school_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(64) DEFAULT 'SCHOOL_ADMIN' NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      CONSTRAINT school_user_unique UNIQUE(school_id, user_id)
    )`,

    `CREATE TABLE IF NOT EXISTS school_sites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID UNIQUE NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      template_version_id UUID NOT NULL REFERENCES template_versions(id),
      status VARCHAR(64) DEFAULT 'DRAFT' NOT NULL,
      active_release_id UUID,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS site_domains (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id UUID NOT NULL REFERENCES school_sites(id) ON DELETE CASCADE,
      hostname VARCHAR(255) UNIQUE NOT NULL,
      slug VARCHAR(64) UNIQUE NOT NULL,
      type VARCHAR(64) DEFAULT 'SUBDOMAIN' NOT NULL,
      status VARCHAR(64) DEFAULT 'ACTIVE' NOT NULL,
      is_primary BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS site_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id UUID UNIQUE NOT NULL REFERENCES school_sites(id) ON DELETE CASCADE,
      settings JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS content_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id UUID NOT NULL REFERENCES school_sites(id) ON DELETE CASCADE,
      type VARCHAR(64) NOT NULL,
      entry_key VARCHAR(64),
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255),
      payload JSONB NOT NULL,
      status VARCHAR(64) DEFAULT 'PUBLISHED' NOT NULL,
      sort_order INTEGER DEFAULT 0 NOT NULL,
      published_at TIMESTAMPTZ,
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      CONSTRAINT site_type_slug_unique UNIQUE(site_id, type, slug)
    )`,

    `CREATE TABLE IF NOT EXISTS content_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entry_id UUID NOT NULL REFERENCES content_entries(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      snapshot JSONB NOT NULL,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      CONSTRAINT entry_version_unique UNIQUE(entry_id, version_number)
    )`,

    `CREATE TABLE IF NOT EXISTS menu_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id UUID NOT NULL REFERENCES school_sites(id) ON DELETE CASCADE,
      parent_id UUID,
      location VARCHAR(64) DEFAULT 'header' NOT NULL,
      label VARCHAR(100) NOT NULL,
      link_type VARCHAR(64) NOT NULL,
      target VARCHAR(255) NOT NULL,
      sort_order INTEGER DEFAULT 0 NOT NULL,
      is_active BOOLEAN DEFAULT TRUE NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS media_assets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id UUID NOT NULL REFERENCES school_sites(id) ON DELETE CASCADE,
      storage_key TEXT NOT NULL,
      filename VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      size_bytes INTEGER NOT NULL,
      alt_text VARCHAR(255) DEFAULT '' NOT NULL,
      variants JSONB,
      usage_count INTEGER DEFAULT 0 NOT NULL,
      uploaded_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMPTZ
    )`,

    `CREATE TABLE IF NOT EXISTS publication_releases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id UUID NOT NULL REFERENCES school_sites(id) ON DELETE CASCADE,
      template_version_id UUID NOT NULL REFERENCES template_versions(id),
      version_number INTEGER NOT NULL,
      status VARCHAR(64) DEFAULT 'ACTIVE' NOT NULL,
      summary TEXT,
      snapshot_manifest JSONB NOT NULL,
      created_by UUID REFERENCES users(id),
      published_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      CONSTRAINT site_release_version_unique UNIQUE(site_id, version_number)
    )`,

    `CREATE TABLE IF NOT EXISTS release_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      release_id UUID NOT NULL REFERENCES publication_releases(id) ON DELETE CASCADE,
      item_type VARCHAR(64) NOT NULL,
      source_id UUID,
      snapshot JSONB NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS ppdb_submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id UUID NOT NULL REFERENCES school_sites(id) ON DELETE CASCADE,
      student_name VARCHAR(150) NOT NULL,
      nisn VARCHAR(10) NOT NULL,
      whatsapp VARCHAR(20) NOT NULL,
      status VARCHAR(30) DEFAULT 'NEW' NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )`,

    `CREATE INDEX IF NOT EXISTS ppdb_submission_site_idx ON ppdb_submissions(site_id)`,

    `CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_user_id UUID REFERENCES users(id),
      school_id UUID REFERENCES schools(id),
      action VARCHAR(100) NOT NULL,
      target_type VARCHAR(100) NOT NULL,
      target_id UUID,
      before_data JSONB,
      after_data JSONB,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )`
  ];

  for (const stmt of tableStatements) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (err: any) {
      console.error(`Migration error on statement:`, err.message);
      throw err;
    }
  }

  console.log('✅ Migrations completed successfully.');
}

if (process.argv[1]?.includes('migrate')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}
