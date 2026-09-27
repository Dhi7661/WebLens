import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { verifyAccessToken, type TokenPayload } from '../utils/jwt.js';
import { User } from '../modules/users/user.model.js';

// Extend Express Request interface to include authenticated user payload
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      authMethod?: 'jwt' | 'apiKey';
    }
  }
}

/**
 * Authentication middleware that supports both standard JWT access tokens
 * and CI/CD personal API keys (starting with `wl_live_`).
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token missing or malformed',
      },
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  // Check if token is a WebLens Personal API Key
  if (token.startsWith('wl_live_')) {
    try {
      const keyHash = crypto.createHash('sha256').update(token).digest('hex');
      const user = await User.findOne({ 'apiKeys.keyHash': keyHash });

      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Provided API Key is invalid or has been revoked.',
          },
        });
        return;
      }

      // Update lastUsedAt timestamp on the matched key asynchronously
      const matchedKey = user.apiKeys.find((k) => k.keyHash === keyHash);
      if (matchedKey) {
        matchedKey.lastUsedAt = new Date();
        user.save().catch((err) => console.error('[API Key lastUsedAt save error]:', err));
      }

      req.user = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      };
      req.authMethod = 'apiKey';
      next();
      return;
    } catch (error) {
      console.error('[API Key Authentication Error]:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_PROCESSING_ERROR',
          message: 'An error occurred while validating API key.',
        },
      });
      return;
    }
  }

  // Otherwise, process as JWT access token
  const payload = verifyAccessToken(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED_OR_INVALID',
        message: 'Session has expired or token is invalid. Please refresh or sign in again.',
      },
    });
    return;
  }

  req.user = payload;
  req.authMethod = 'jwt';
  next();
}
