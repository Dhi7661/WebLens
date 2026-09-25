import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getCurrentUser,
} from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
authRouter.get('/me', requireAuth, getCurrentUser);
