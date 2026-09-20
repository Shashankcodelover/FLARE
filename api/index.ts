import type { VercelRequest, VercelResponse } from '@vercel/node';

let appModule: any = null;
let dbModule: any = null;
let dbReady: Promise<void> | null = null;
let initError: Error | null = null;

// Eagerly try to import modules — catch any module resolution failures
try {
  appModule = require('../apps/server/src/app').default;
  dbModule = require('../apps/server/src/db');
} catch (err) {
  initError = err instanceof Error ? err : new Error(String(err));
  console.error('[FLARE] Module import failed:', initError.message);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // If module loading failed, return a useful error
  if (initError || !appModule) {
    return res.status(500).json({
      error: 'Server initialization failed',
      message: initError?.message ?? 'App module not loaded',
      timestamp: new Date().toISOString(),
    });
  }

  // Ensure DB connects exactly once across warm invocations
  try {
    if (!dbReady && dbModule?.connectDB) {
      dbReady = dbModule.connectDB().catch((err: Error) => {
        dbReady = null; // allow retry on next invocation
        console.error('[FLARE] MongoDB connection failed:', err.message);
      });
    }
    if (dbReady) await dbReady;
  } catch (err) {
    console.error('[FLARE] DB await error:', err);
    // Continue anyway — routes may still work without DB
  }

  // Delegate to Express
  return appModule(req as any, res as any);
}
