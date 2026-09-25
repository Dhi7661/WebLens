import mongoose from 'mongoose';
import dns from 'node:dns';

// Fix for Windows / ISP DNS causing querySrv ECONNREFUSED in Node c-ares
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  console.warn('[WebLens DB] Could not override DNS servers:', e);
}

/**
 * Automatically ensures the demo developer account exists for seamless review and login.
 */
async function seedDemoUser(): Promise<void> {
  try {
    const { User } = await import('../modules/users/user.model.js');
    const demoEmail = 'developer@weblens.dev';
    const existing = await User.findOne({ email: demoEmail });

    if (!existing) {
      const bcrypt = (await import('bcryptjs')).default;
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('WebLens2026!', salt);

      await User.create({
        name: 'Demo Developer',
        email: demoEmail,
        passwordHash,
        role: 'USER',
      });
      console.log('[WebLens DB] Seeded demo user: developer@weblens.dev (password: WebLens2026!)');
    }
  } catch (err) {
    console.error('[WebLens DB] Could not seed demo user:', err);
  }
}

/**
 * Manages the MongoDB database connection lifecycle with graceful reconnects.
 */
export let lastDbError: string | null = null;

export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    lastDbError = 'MONGODB_URI is not defined in environment variables.';
    console.warn('[WebLens DB] Warning: MONGODB_URI is not defined in environment variables.');
    return;
  }

  try {
    mongoose.connection.on('error', (err) => {
      lastDbError = err.message;
      console.error('[WebLens DB] Connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[WebLens DB] Disconnected from MongoDB.');
    });

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    lastDbError = null;
    console.log('[WebLens DB] Connected successfully to MongoDB Atlas.');
    await seedDemoUser();
  } catch (error) {
    lastDbError = error instanceof Error ? error.message : String(error);
    console.error('[WebLens DB] Failed initial connection to MongoDB:', lastDbError);
    console.info('[WebLens DB] Tip: Ensure your IP address is whitelisted (0.0.0.0/0) in MongoDB Atlas Network Access.');
  }
}
