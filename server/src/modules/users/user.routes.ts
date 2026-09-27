import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  getProfile,
  updateProfile,
  changePassword,
  listApiKeys,
  createApiKey,
  revokeApiKey,
} from './user.controller.js';

export const userRouter = Router();

// All user routes require authentication
userRouter.use(requireAuth);

userRouter.get('/profile', getProfile);
userRouter.patch('/profile', updateProfile);
userRouter.post('/change-password', changePassword);
userRouter.get('/api-keys', listApiKeys);
userRouter.post('/api-keys', createApiKey);
userRouter.delete('/api-keys/:id', revokeApiKey);
