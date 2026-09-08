import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as schema from './schema/index.js';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Pool } = pg;

export type DbClient = ReturnType<typeof drizzlePg<typeof schema>> | ReturnType<typeof drizzlePglite<typeof schema>>;

let _db: any = null;
let _pgliteInstance: PGlite | null = null;
let _pool: pg.Pool | null = null;

function findMonorepoRoot(startDir: string = process.cwd()): string {
  let cur = startDir;
  while (cur && cur !== path.dirname(cur)) {
    if (fs.existsSync(path.join(cur, 'pnpm-workspace.yaml'))) {
      return cur;
    }
    cur = path.dirname(cur);
  }
  return startDir;
}

export function getDatabaseClient(): DbClient {
  if (_db) return _db;

  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl && dbUrl.startsWith('postgres')) {
    try {
      _pool = new Pool({
        connectionString: dbUrl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 3000
      });
      _db = drizzlePg(_pool, { schema });
      return _db;
    } catch (err) {
      console.warn('⚠️ Could not connect to PostgreSQL URL, falling back to local PGlite engine:', err);
    }
  }

  // High-performance self-contained PGlite engine
  if (!_pgliteInstance) {
    _pgliteInstance = new PGlite();
  }
  _db = drizzlePglite(_pgliteInstance, { schema });
  return _db;
}

export function getPgliteInstance(): PGlite | null {
  return _pgliteInstance;
}

export const db = getDatabaseClient();
export { schema };
