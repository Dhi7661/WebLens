import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

export const app = express();

// Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

import mongoose from 'mongoose';
import { lastDbError } from './db/connection.js';

// Basic health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.status(200).json({
    status: 'ok',
    service: 'weblens-api',
    dbState: states[mongoose.connection.readyState] || 'unknown',
    lastDbError,
    timestamp: new Date().toISOString(),
  });
});

import { authRouter } from './modules/auth/auth.routes.js';
import { scanRouter } from './modules/scans/scan.routes.js';
import { websiteRouter } from './modules/websites/website.routes.js';
import { userRouter } from './modules/users/user.routes.js';
import { requireAuth } from './middleware/auth.js';
import { getCurrentUser } from './modules/auth/auth.controller.js';

app.use('/api/auth', authRouter);
app.get('/api/me', requireAuth, getCurrentUser);
app.use('/api/users', userRouter);
app.use('/api/scans', scanRouter);
app.use('/api/websites', websiteRouter);

// Local test website for deterministic analyzer testing (Spec Item 55)
import { serveDemoTarget } from './modules/demo/demoTarget.js';
app.get('/demo-target', serveDemoTarget);




// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Requested API endpoint not found',
    },
  });
});

// Centralized Error Handling Middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[WebLens Error]:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  });
});
