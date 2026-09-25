import type { Request, Response } from 'express';
import { Website } from '../websites/website.model.js';
import { Scan } from './scan.model.js';
import { validateAndNormalizeUrl } from '../../utils/ssrf.js';
import { scanQueue } from '../../jobs/scanQueue.js';

export async function createScan(req: Request, res: Response): Promise<void> {
  const { url } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return;
  }

  // 1. SSRF & URL Safety Validation
  const validation = await validateAndNormalizeUrl(url);
  if (!validation.valid || !validation.normalizedUrl || !validation.hostname) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_OR_UNSAFE_URL',
        message: validation.error || 'The submitted URL is invalid or blocked for safety reasons.',
      },
    });
    return;
  }

  try {
    // 2. Find or create Website entity for this user
    let website = await Website.findOne({
      ownerId: userId,
      normalizedUrl: validation.normalizedUrl,
    });

    if (!website) {
      website = await Website.create({
        ownerId: userId,
        url: url.trim(),
        normalizedUrl: validation.normalizedUrl,
        hostname: validation.hostname,
        displayName: validation.hostname,
      });
    }

    // 3. Create Scan record with initial QUEUED status
    const scan = await Scan.create({
      websiteId: website._id,
      ownerId: userId,
      requestedUrl: url.trim(),
      finalUrl: validation.normalizedUrl,
      status: 'QUEUED',
    });

    // 4. Enqueue background scan job
    scanQueue.enqueue({
      scanId: scan._id.toString(),
      targetUrl: validation.normalizedUrl,
      ownerId: userId,
    });

    // 5. Return 202 Accepted with scan record
    res.status(202).json({
      success: true,
      data: {
        scan: scan.toJSON(),
      },
    });
  } catch (error) {
    console.error('[Create Scan Error]:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SCAN_CREATION_FAILED',
        message: 'Could not schedule scan job.',
      },
    });
  }
}

export async function getScanStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user?.userId;

  try {
    const scan = await Scan.findById(id);

    if (!scan) {
      res.status(404).json({
        success: false,
        error: { code: 'SCAN_NOT_FOUND', message: 'Scan record does not exist' },
      });
      return;
    }

    // Ownership check (Section 12: Every scan/report endpoint must verify resource ownership)
    if (scan.ownerId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this scan' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        scan: scan.toJSON(),
      },
    });
  } catch (error) {
    console.error('[Get Scan Status Error]:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_SCAN_FAILED', message: 'Failed to retrieve scan status' },
    });
  }
}

export async function listUserScans(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;

  try {
    const scans = await Scan.find({ ownerId: userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: {
        scans: scans.map((s) => s.toJSON()),
      },
    });
  } catch (error) {
    console.error('[List Scans Error]:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_SCANS_FAILED', message: 'Failed to list user scans' },
    });
  }
}

export async function retryScan(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user?.userId;

  try {
    const scan = await Scan.findById(id);
    if (!scan || scan.ownerId.toString() !== userId) {
      res.status(404).json({
        success: false,
        error: { code: 'SCAN_NOT_FOUND', message: 'Scan record not found' },
      });
      return;
    }

    scan.status = 'QUEUED';
    scan.startedAt = undefined;
    scan.completedAt = undefined;
    scan.errorCode = undefined;
    scan.errorMessage = undefined;
    await scan.save();

    scanQueue.enqueue({
      scanId: scan._id.toString(),
      targetUrl: scan.finalUrl,
      ownerId: userId!,
    });

    res.status(200).json({
      success: true,
      data: {
        scan: scan.toJSON(),
      },
    });
  } catch (error) {
    console.error('[Retry Scan Error]:', error);
    res.status(500).json({
      success: false,
      error: { code: 'RETRY_FAILED', message: 'Failed to retry scan' },
    });
  }
}

export async function getScanReport(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user?.userId;

  try {
    const scan = await Scan.findById(id);
    if (!scan) {
      res.status(404).json({
        success: false,
        error: { code: 'SCAN_NOT_FOUND', message: 'Scan not found' },
      });
      return;
    }

    if (scan.ownerId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this scan report' },
      });
      return;
    }

    const { Finding } = await import('../findings/finding.model.js');
    const findings = await Finding.find({ scanId: scan._id }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: {
        scan: scan.toJSON(),
        findings: findings.map((f) => f.toJSON()),
      },
    });
  } catch (error) {
    console.error('[Get Scan Report Error]:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_REPORT_FAILED', message: 'Failed to retrieve scan report' },
    });
  }
}

