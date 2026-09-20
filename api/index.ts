import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../apps/server/src/app';

let dbReady: Promise<void> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Lazy-connect to MongoDB once per cold start
  try {
    if (!dbReady) {
      const { connectDB } = await import('../apps/server/src/db');
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
