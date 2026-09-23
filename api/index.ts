import type { VercelRequest, VercelResponse } from '@vercel/node';

let app: any;
let connectDB: any;
let importError: Error | null = null;

try {
  // Import from the compiled JS output (built by `npm run build` / `tsc`).
  // Vercel runs `buildCommand` first, which compiles apps/server/src → apps/server/dist.
  const appModule = require('../apps/server/dist/app');
  const dbModule = require('../apps/server/dist/db');
  app = appModule.default || appModule;
  connectDB = dbModule.connectDB;
} catch (err) {
  importError = err as Error;
  console.error('[FLARE] Failed to import server build output:', (err as Error).message);
  console.error('[FLARE] Stack:', (err as Error).stack);
}

let dbReady: Promise<void> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // If imports failed, return diagnostic error
  if (importError || !app) {
    res.status(503).json({
      error: 'Server build output not available',
      message: importError?.message || 'app module not loaded',
      hint: 'Check Vercel build logs — the turbo build may have failed',
    });
    return;
  }

  // Lazy-connect to MongoDB once per cold start
  try {
    if (!dbReady) {
      dbReady = connectDB().catch((err: Error) => {
        dbReady = null; // allow retry on next invocation
        console.error('[FLARE] MongoDB connection failed:', err.message);
      });
    }
    if (dbReady) await dbReady;
  } catch (err) {
    console.error('[FLARE] DB init error:', err);
    // Continue — routes may work without DB (health endpoint etc.)
  }

  // Delegate to Express
  return app(req as any, res as any);
}
