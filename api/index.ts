import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../apps/server/src/app';
import { connectDB } from '../apps/server/src/db';

let dbReady: Promise<void> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!dbReady) {
      dbReady = connectDB().catch((err: Error) => {
        dbReady = null; 
        console.error('[FLARE] MongoDB connection failed:', err.message);
      });
    }
    if (dbReady) await dbReady;
  } catch (err) {
    console.error('[FLARE] DB init error:', err);
  }

  return app(req as any, res as any);
}
