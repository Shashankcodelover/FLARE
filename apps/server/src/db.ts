import mongoose from 'mongoose';
import logger from './logger';

export async function connectDB(): Promise<void> {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/mirage';
  await mongoose.connect(uri);
  logger.info({ uri: uri.replace(/\/\/.*@/, '//<credentials>@') }, '[mirage:db] connected to MongoDB');
}
