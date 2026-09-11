import mongoose from 'mongoose';
import logger from './logger';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/mirage';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    logger.info({ uri: uri.replace(/\/\/.*@/, '//<credentials>@') }, '[mirage:db] connected to MongoDB');
  } catch (err: any) {
    logger.warn({ error: err?.message }, '[mirage:db] MongoDB unavailable - operating in standalone autonomous mesh mode');
  }
}
