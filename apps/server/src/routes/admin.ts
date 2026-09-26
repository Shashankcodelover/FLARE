import { Router } from 'express';
import { UserModel } from '../models/User';
import { requireAuth, requireRole } from '../middleware/auth';
import logger from '../logger';

export const adminRouter = Router();

// Middleware to ensure admin role
adminRouter.use(requireAuth, requireRole('admin'));

// Get all users
adminRouter.get('/users', async (req, res) => {
  try {
    const users = await UserModel.find().select('-passwordHash');
    res.json(users);
  } catch (error) {
    logger.error(error, 'Admin get users error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user role/profile
adminRouter.put('/users/:id', async (req, res) => {
  try {
    const { role, profile } = req.body;
    const user = await UserModel.findByIdAndUpdate(
      req.params.id,
      { role, ...(profile && { profile }) },
      { new: true, runValidators: true }
    ).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    logger.error(error, 'Admin update user error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user
adminRouter.delete('/users/:id', async (req, res) => {
  try {
    const user = await UserModel.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(204).send();
  } catch (error) {
    logger.error(error, 'Admin delete user error');
    res.status(500).json({ error: 'Internal server error' });
  }
});
