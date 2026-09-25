import { Router } from 'express';
import {
  listWebsites,
  updateMonitoring,
  getWebsiteHistory,
  triggerScan,
} from './website.controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const websiteRouter = Router();

// All website endpoints require authenticated ownership
websiteRouter.use(requireAuth);

websiteRouter.get('/', listWebsites);
websiteRouter.patch('/:id/monitoring', updateMonitoring);
websiteRouter.get('/:id/history', getWebsiteHistory);
websiteRouter.post('/:id/scan', triggerScan);
