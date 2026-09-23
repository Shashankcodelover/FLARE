import mongoose from 'mongoose';
import logger from './logger';

export async function connectDB(): Promise<void> {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/mirage';
  try {
    await mongoose.connect(uri, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });
    logger.info({ uri: uri.replace(/\/\/.*@/, '//<credentials>@') }, '[mirage:db] connected to MongoDB');
  } catch (err) {
    logger.error('[mirage:db] Could not connect to MongoDB. Running in degraded mode.');
  }
}
