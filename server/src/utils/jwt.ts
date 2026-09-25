import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_fallback_access_secret_min_32_characters';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_fallback_refresh_secret_min_32_characters';

const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';

/**
 * Signs a short-lived access token (15 mins) for API authorization headers.
 */
export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRY,
  });
}

/**
 * Signs a long-lived refresh token (7 days) stored securely in HttpOnly cookies.
 */
export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRY,
  });
}

/**
 * Verifies and decodes an access token.
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Verifies and decodes a refresh token.
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
