import 'dotenv/config';
import dns from 'node:dns';

// Ensure public DNS resolver is configured before MongoDB client initializes (fixes Windows c-ares SRV lookup)
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  console.warn('[WebLens Server] Could not set DNS servers:', e);
}

import { app } from './app.js';
import { connectDatabase } from './db/connection.js';

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`[WebLens Server] Running on http://localhost:${PORT}`);
    console.log(`[WebLens Server] Health check available at http://localhost:${PORT}/api/health`);
  });
}

bootstrap().catch((err) => {
  console.error('[WebLens Server] Bootstrap failure:', err);
});

