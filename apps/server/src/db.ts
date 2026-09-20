import mongoose from 'mongoose';
import logger from './logger';

export async function connectDB(): Promise<void> {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/mirage';
  await mongoose.connect(uri, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 10000,
  });
  logger.info({ uri: uri.replace(/\/\/.*@/, '//<credentials>@') }, '[mirage:db] connected to MongoDB');
}
