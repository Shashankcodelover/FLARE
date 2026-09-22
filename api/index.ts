import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import from the compiled JS output (built by `npm run build` / `tsc`).
// Vercel runs `buildCommand` first, which compiles apps/server/src → apps/server/dist.
// Then @vercel/node bundles this api/index.ts entry point.
// Importing from dist/ (JS) instead of src/ (TS) avoids bundler issues
// with TypeScript workspace resolution in monorepos.
import app from '../apps/server/dist/app';
import { connectDB } from '../apps/server/dist/db';

let dbReady: Promise<void> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
