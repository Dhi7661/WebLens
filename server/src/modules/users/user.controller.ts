import type { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User, type IApiKey } from './user.model.js';

/**
 * Returns full profile and preferences for the currently authenticated user.
 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User profile not found' },
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
    console.error('[Get Profile Error]:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_PROFILE_FAILED', message: 'Could not fetch profile' },
    });
  }
}

/**
 * Updates user profile information (display name, avatar, preferences).
 */
export async function updateProfile(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const { name, avatarUrl, preferences } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User profile not found' },
      });
      return;
    }

    if (typeof name === 'string' && name.trim()) {
      user.name = name.trim().slice(0, 100);
    }

    if (avatarUrl !== undefined) {
      user.avatarUrl = avatarUrl ? String(avatarUrl).trim() : undefined;
    }

    if (preferences && typeof preferences === 'object') {
      user.preferences = {
        theme: ['system', 'dark', 'light'].includes(preferences.theme)
          ? preferences.theme
          : user.preferences?.theme || 'dark',
        emailAlerts:
          typeof preferences.emailAlerts === 'boolean'
            ? preferences.emailAlerts
            : user.preferences?.emailAlerts ?? true,
        defaultFrequency: ['hourly', 'daily', 'weekly'].includes(preferences.defaultFrequency)
          ? preferences.defaultFrequency
          : user.preferences?.defaultFrequency || 'daily',
      };
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        user: user.toJSON(),
      },
    });
  } catch (error) {
    console.error('[Update Profile Error]:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_PROFILE_FAILED', message: 'Failed to update profile' },
    });
  }
}

/**
 * Changes user password after verifying current credentials.
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_FIELDS',
        message: 'Current password and new password are both required',
      },
    });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({
      success: false,
      error: {
        code: 'WEAK_PASSWORD',
        message: 'New password must be at least 8 characters long',
      },
    });
    return;
  }

  try {
    // Explicitly select passwordHash since it is excluded by default in schema
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User profile not found' },
      });
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'The current password provided is incorrect',
        },
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'Password updated successfully',
      },
    });
  } catch (error) {
    console.error('[Change Password Error]:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CHANGE_PASSWORD_FAILED', message: 'Failed to change password' },
    });
  }
}

/**
 * Lists all active API keys for the current user.
 */
export async function listApiKeys(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User profile not found' },
      });
      return;
    }

    const sanitizedKeys = (user.apiKeys || []).map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        apiKeys: sanitizedKeys,
      },
    });
  } catch (error) {
    console.error('[List API Keys Error]:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_API_KEYS_FAILED', message: 'Failed to list API keys' },
    });
  }
}

/**
 * Creates a new personal API key for CI/CD or CLI usage.
 * Returns the plaintext key once upon generation.
 */
export async function createApiKey(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const { name } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_NAME', message: 'API key name is required' },
    });
    return;
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User profile not found' },
      });
      return;
    }

    if (user.apiKeys && user.apiKeys.length >= 10) {
      res.status(400).json({
        success: false,
        error: {
          code: 'KEY_LIMIT_REACHED',
          message: 'Maximum limit of 10 API keys reached. Revoke an unused key first.',
        },
      });
      return;
    }

    // Generate secure random key: wl_live_ + 48 hex characters
    const randomBytes = crypto.randomBytes(24).toString('hex');
    const rawApiKey = `wl_live_${randomBytes}`;
    const keyPrefix = `wl_live_${randomBytes.slice(0, 6)}...${randomBytes.slice(-4)}`;
    const keyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');
    const keyId = `key_${crypto.randomBytes(8).toString('hex')}`;

    const newKey: IApiKey = {
      id: keyId,
      name: name.trim().slice(0, 100),
      keyPrefix,
      keyHash,
      createdAt: new Date(),
    };

    if (!user.apiKeys) {
      user.apiKeys = [];
    }
    user.apiKeys.push(newKey);
    await user.save();

    res.status(201).json({
      success: true,
      data: {
        apiKey: {
          id: newKey.id,
          name: newKey.name,
          keyPrefix: newKey.keyPrefix,
          createdAt: newKey.createdAt,
          secretKey: rawApiKey, // Only returned at creation!
        },
      },
    });
  } catch (error) {
    console.error('[Create API Key Error]:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_API_KEY_FAILED', message: 'Failed to generate API key' },
    });
  }
}

/**
 * Revokes an existing API key.
 */
export async function revokeApiKey(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const { id } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User profile not found' },
      });
      return;
    }

    const keyIndex = (user.apiKeys || []).findIndex((k) => k.id === id);
    if (keyIndex === -1) {
      res.status(404).json({
        success: false,
        error: { code: 'KEY_NOT_FOUND', message: 'API key not found' },
      });
      return;
    }

    user.apiKeys.splice(keyIndex, 1);
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'API key revoked successfully',
      },
    });
  } catch (error) {
    console.error('[Revoke API Key Error]:', error);
    res.status(500).json({
      success: false,
      error: { code: 'REVOKE_API_KEY_FAILED', message: 'Failed to revoke API key' },
    });
  }
}
