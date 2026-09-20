import app from '../apps/server/src/app';
import { connectDB } from '../apps/server/src/db';

connectDB().catch(console.error);

export default app;
