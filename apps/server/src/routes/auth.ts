import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { requireAuth } from '../middleware/auth';
import logger from '../logger';

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET ?? 'change_me_in_production';

// Register
authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, role, profile } = req.body;
    if (!email || !password || !role || !profile?.name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
      email,
      passwordHash,
      role,
      profile,
    });

    const token = jwt.sign({ sub: user._id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    const userObj = user.toObject();
    delete userObj.passwordHash;

    res.status(201).json({ user: userObj, token });
  } catch (error) {
    logger.error(error, 'Register error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ sub: user._id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    const userObj = user.toObject();
    delete userObj.passwordHash;

    res.json({ user: userObj, token });
  } catch (error) {
    logger.error(error, 'Login error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Demo Mode
authRouter.post('/demo', async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ error: 'Role is required for demo' });
    }
    
    // Create a temporary demo user
    const user = await UserModel.create({
      email: `demo-${Date.now()}@flare.local`,
      role,
      profile: { name: `Demo ${role.toUpperCase()}` },
    });

    const token = jwt.sign({ sub: user._id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ user, token });
  } catch (error) {
    logger.error(error, 'Demo login error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Profile
authRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user?.sub).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Profile
authRouter.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, phone, bio } = req.body;
    const user = await UserModel.findByIdAndUpdate(
      req.user?.sub,
      { 'profile.name': name, 'profile.phone': phone, 'profile.bio': bio },
      { new: true, runValidators: true }
    ).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
