import { app } from './app.js';
import { config } from './config.js';
import { runSeed } from '@sobatweb/database';

declare const Bun: { version: string } | undefined;

// Initialize database with schema & default school and templates
try {
  await runSeed();
} catch (e) {
  console.warn('Database initialization note:', e);
}

// Native Bun HTTP Server
if (typeof Bun !== 'undefined') {
  console.log(`🚀 SobatWeb API running on BUN v${Bun.version} -> http://localhost:${config.port}`);
} else {
  const { serve } = await import('@hono/node-server');
  serve({
    fetch: app.fetch,
    port: config.port
  }, (info) => {
    console.log(`🚀 SobatWeb API running on Node -> http://localhost:${info.port}`);
  });
}

export default {
  port: config.port,
  fetch: app.fetch
};
