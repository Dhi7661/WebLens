import mongoose from 'mongoose';
import dns from 'node:dns';

// Fix for Windows / ISP DNS causing querySrv ECONNREFUSED in Node c-ares
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  console.warn('[WebLens DB] Could not override DNS servers:', e);
}

/**
 * Manages the MongoDB database connection lifecycle with graceful reconnects.
 */
export async function connectDatabase(): Promise<void> {

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('[WebLens DB] Warning: MONGODB_URI is not defined in environment variables.');
    return;
  }

  try {
    mongoose.connection.on('connected', () => {
      console.log('[WebLens DB] Connected successfully to MongoDB Atlas.');
    });

    mongoose.connection.on('error', (err) => {
      console.error('[WebLens DB] Connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[WebLens DB] Disconnected from MongoDB.');
    });

    await mongoose.connect(uri);
  } catch (error) {
    console.error('[WebLens DB] Failed initial connection to MongoDB:', error instanceof Error ? error.message : error);
    console.info('[WebLens DB] Tip: Ensure your IP address is whitelisted in MongoDB Atlas Network Access.');
  }
}
