import mongoose from 'mongoose';

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
