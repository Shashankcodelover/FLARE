import { Schema, model } from 'mongoose';
import type { User } from '@mirage/shared-types';

export interface IUserDoc extends Omit<User, '_id'> {
  passwordHash?: string; // Optional for demo users
}

const userSchema = new Schema<IUserDoc>(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String },
    role: { type: String, enum: ['admin', 'hq', 'responder', 'logistics', 'demo'], required: true },
    profile: {
      name: { type: String, required: true },
      phone: { type: String },
      bio: { type: String },
    },
  },
  { timestamps: true }
);

export const UserModel = model<IUserDoc>('User', userSchema);
