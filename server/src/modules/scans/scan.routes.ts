import { Router } from 'express';
import {
  createScan,
  getScanStatus,
  listUserScans,
  retryScan,
  getScanReport,
  compareScans,
} from './scan.controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const scanRouter = Router();

// All scan endpoints require authenticated ownership
scanRouter.use(requireAuth);

scanRouter.post('/', createScan);
scanRouter.get('/', listUserScans);
scanRouter.get('/compare', compareScans);
scanRouter.get('/:id', getScanStatus);
scanRouter.get('/:id/report', getScanReport);
scanRouter.post('/:id/retry', retryScan);

