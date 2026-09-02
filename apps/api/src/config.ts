import * as dotenv from 'dotenv';
import * as path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.API_PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_min_32_characters_long_sobatweb_2026',
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'sobatweb_session',
  baseDomain: process.env.BASE_DOMAIN || 'localhost:3000',
  storageLocalPath: process.env.STORAGE_LOCAL_PATH || './storage',
  tokenExpiresInSec: 7 * 24 * 60 * 60 // 7 days
};
