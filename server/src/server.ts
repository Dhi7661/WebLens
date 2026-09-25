import { app } from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[WebLens Server] Running on http://localhost:${PORT}`);
  console.log(`[WebLens Server] Health check available at http://localhost:${PORT}/api/health`);
});
