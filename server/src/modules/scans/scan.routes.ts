import { Router } from 'express';
import {
  createScan,
  getScanStatus,
  listUserScans,
  retryScan,
  getScanReport,
  compareScans,
  shareScan,
  revokeShareScan,
  getSharedScanReport,
  exportScanJson,
  chatWithCopilot,
} from './scan.controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const scanRouter = Router();

// Public unauthenticated endpoints
scanRouter.get('/shared/:token', getSharedScanReport);

// Dual-mode export endpoint (accessible by owner or public viewer with ?token=...)
scanRouter.get('/:id/export/json', (req, res) => {
  if (req.query.token) {
    return exportScanJson(req, res);
  }
  requireAuth(req, res, () => exportScanJson(req, res));
});

// Dual-mode grounded AI copilot chat endpoint
scanRouter.post('/:id/chat', (req, res) => {
  if (req.query.token) {
    return chatWithCopilot(req, res);
  }
  requireAuth(req, res, () => chatWithCopilot(req, res));
});

// All subsequent endpoints require authenticated ownership
scanRouter.use(requireAuth);

scanRouter.post('/', createScan);
scanRouter.get('/', listUserScans);
scanRouter.get('/compare', compareScans);
scanRouter.get('/:id', getScanStatus);
scanRouter.get('/:id/report', getScanReport);
scanRouter.post('/:id/retry', retryScan);
scanRouter.post('/:id/share', shareScan);
scanRouter.delete('/:id/share', revokeShareScan);


