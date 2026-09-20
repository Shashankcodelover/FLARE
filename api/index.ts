import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../apps/server/src/app';
import { connectDB } from '../apps/server/src/db';

let dbReady: Promise<void> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure DB connects exactly once across warm invocations
  if (!dbReady) {
    dbReady = connectDB().catch((err) => {
      dbReady = null; // allow retry on next invocation
      console.error('[FLARE] MongoDB connection failed:', err);
    });
  }
  await dbReady;

  // Delegate to Express
  return app(req as any, res as any);
}
