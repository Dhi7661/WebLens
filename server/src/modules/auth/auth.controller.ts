import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../users/user.model.js';
import { registerSchema, loginSchema } from './auth.schema.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type TokenPayload,
} from '../../utils/jwt.js';

const COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

export async function register(req: Request, res: Response): Promise<void> {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0]?.message || 'Invalid input data',
      },
    });
    return;
  }

  const { name, email, password } = parseResult.data;

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'An account with this email address already exists',
        },
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'USER',
      lastLoginAt: new Date(),
    });

    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    res.cookie(COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      data: {
        user: user.toJSON(),
        accessToken,
      },
    });
  } catch (error) {
    console.error('[Auth Register Error]:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message: 'Could not complete registration. Ensure database is connected.',
      },
    });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0]?.message || 'Invalid input',
      },
    });
    return;
  }

  const { email, password } = parseResult.data;

  try {
    // Explicitly select passwordHash which is hidden by default in schema
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password combination',
        },
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password combination',
        },
      });
      return;
    }

    user.lastLoginAt = new Date();
    await user.save();

    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    res.cookie(COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      data: {
        user: user.toJSON(),
        accessToken,
      },
    });
  } catch (error) {
    console.error('[Auth Login Error]:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGIN_FAILED',
        message: 'Could not complete sign in. Please try again.',
      },
    });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'NO_REFRESH_TOKEN',
        message: 'No active session token provided',
      },
    });
    return;
  }

  const payload = verifyRefreshToken(token);
  if (!payload) {
    res.clearCookie(COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_OR_EXPIRED_REFRESH_TOKEN',
        message: 'Session has expired. Please log in again.',
      },
    });
    return;
  }

  try {
    const user = await User.findById(payload.userId);
    if (!user) {
      res.clearCookie(COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Account associated with session no longer exists',
        },
      });
      return;
    }

    const newAccessToken = signAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    console.error('[Auth Refresh Error]:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REFRESH_FAILED',
        message: 'Could not refresh session',
      },
    });
  }
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie(COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
  res.status(200).json({
    success: true,
    data: {
      message: 'Logged out successfully',
    },
  });
}

export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return;
  }

  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User profile not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: user.toJSON(),
      },
    });
  } catch (error) {
    console.error('[Get Current User Error]:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_PROFILE_FAILED',
        message: 'Could not retrieve user profile',
      },
    });
  }
}
