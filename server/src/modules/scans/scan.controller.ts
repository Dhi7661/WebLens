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

/**
 * Compares two completed scans, computing score deltas and identifying
 * regressions, resolved issues, and persistent debt using SHA-256 fingerprints (Spec Section 8).
 */
export async function compareScans(req: Request, res: Response): Promise<void> {
  const { baseScanId, targetScanId } = req.query;
  const userId = req.user?.userId;

  if (!baseScanId || !targetScanId || typeof baseScanId !== 'string' || typeof targetScanId !== 'string') {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_SCAN_IDS',
        message: 'Both baseScanId and targetScanId query parameters are required for comparison.',
      },
    });
    return;
  }

  try {
    const [baseScan, targetScan] = await Promise.all([
      Scan.findById(baseScanId),
      Scan.findById(targetScanId),
    ]);

    if (!baseScan || !targetScan) {
      res.status(404).json({
        success: false,
        error: {
          code: 'SCAN_NOT_FOUND',
          message: 'One or both scan records could not be found.',
        },
      });
      return;
    }

    // Ownership check (Section 12: Every scan/report endpoint must verify resource ownership)
    if (baseScan.ownerId.toString() !== userId || targetScan.ownerId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to compare these scans.',
        },
      });
      return;
    }

    const { Finding } = await import('../findings/finding.model.js');
    const [baseFindings, targetFindings] = await Promise.all([
      Finding.find({ scanId: baseScan._id }),
      Finding.find({ scanId: targetScan._id }),
    ]);

    const baseFingerprintMap = new Map(baseFindings.map((f) => [f.fingerprint, f]));
    const targetFingerprintMap = new Map(targetFindings.map((f) => [f.fingerprint, f]));

    // 1. Regressions: New issues appearing in targetScan not found in baseScan
    const regressions = targetFindings
      .filter((f) => !baseFingerprintMap.has(f.fingerprint))
      .map((f) => f.toJSON());

    // 2. Resolved: Issues fixed in targetScan that previously existed in baseScan
    const resolved = baseFindings
      .filter((f) => !targetFingerprintMap.has(f.fingerprint))
      .map((f) => f.toJSON());

    // 3. Persistent: Issues recurring across both scans
    const persistent = targetFindings
      .filter((f) => baseFingerprintMap.has(f.fingerprint))
      .map((f) => f.toJSON());

    // Score deltas
    const overallDelta = targetScan.overallScore - baseScan.overallScore;
    const categoryDeltas = {
      performance: targetScan.categoryScores.performance - baseScan.categoryScores.performance,
      seo: targetScan.categoryScores.seo - baseScan.categoryScores.seo,
      accessibility: targetScan.categoryScores.accessibility - baseScan.categoryScores.accessibility,
      security: targetScan.categoryScores.security - baseScan.categoryScores.security,
      technology: targetScan.categoryScores.technology - baseScan.categoryScores.technology,
    };

    res.status(200).json({
      success: true,
      data: {
        baseScan: baseScan.toJSON(),
        targetScan: targetScan.toJSON(),
        deltas: {
          overall: overallDelta,
          categories: categoryDeltas,
        },
        counts: {
          regressions: regressions.length,
          resolved: resolved.length,
          persistent: persistent.length,
        },
        regressions,
        resolved,
        persistent,
      },
    });
  } catch (error) {
    console.error('[Compare Scans Error]:', error);
    res.status(500).json({
      success: false,
      error: { code: 'COMPARISON_FAILED', message: 'Could not complete scan comparison' },
    });
  }
}

/**
 * Generates or activates a cryptographically unguessable public share token for a scan.
 */
export async function shareScan(req: Request, res: Response): Promise<void> {
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
        error: { code: 'FORBIDDEN', message: 'You do not own this scan' },
      });
      return;
    }

    if (!scan.shareToken) {
      const crypto = await import('node:crypto');
      scan.shareToken = crypto.randomBytes(24).toString('hex');
    }
    scan.isPublic = true;
    await scan.save();

    res.status(200).json({
      success: true,
      data: {
        shareToken: scan.shareToken,
        isPublic: true,
      },
    });
  } catch (error) {
    console.error('[Share Scan Error]:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SHARE_FAILED', message: 'Failed to share scan' },
    });
  }
}

/**
 * Revokes public access to a scan report.
 */
export async function revokeShareScan(req: Request, res: Response): Promise<void> {
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
        error: { code: 'FORBIDDEN', message: 'You do not own this scan' },
      });
      return;
    }

    scan.isPublic = false;
    await scan.save();

    res.status(200).json({
      success: true,
      data: {
        isPublic: false,
      },
    });
  } catch (error) {
    console.error('[Revoke Share Error]:', error);
    res.status(500).json({
      success: false,
      error: { code: 'REVOKE_FAILED', message: 'Failed to revoke public access' },
    });
  }
}

/**
 * Public unauthenticated endpoint: retrieves a report via valid public share token.
 */
export async function getSharedScanReport(req: Request, res: Response): Promise<void> {
  const { token } = req.params;

  try {
    const scan = await Scan.findOne({ shareToken: token, isPublic: true });
    if (!scan) {
      res.status(404).json({
        success: false,
        error: {
          code: 'SHARED_REPORT_NOT_FOUND',
          message: 'The shared audit report does not exist or public access has been revoked.',
        },
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
    console.error('[Get Shared Scan Error]:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_SHARED_REPORT_FAILED', message: 'Could not load shared report' },
    });
  }
}

/**
 * Exports structured audit report data as downloadable JSON.
 */
export async function exportScanJson(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { token } = req.query;
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

    // Must be owner OR have active public share token
    const isOwner = userId && scan.ownerId.toString() === userId;
    const isPublicAuthorized = scan.isPublic && scan.shareToken === token;

    if (!isOwner && !isPublicAuthorized) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to export this report' },
      });
      return;
    }

    const { Finding } = await import('../findings/finding.model.js');
    const findings = await Finding.find({ scanId: scan._id }).sort({ createdAt: 1 });

    const exportPayload = {
      generator: 'WebLens Website Intelligence Platform',
      specVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      website: {
        requestedUrl: scan.requestedUrl,
        finalUrl: scan.finalUrl,
      },
      audit: {
        id: scan._id.toString(),
        completedAt: scan.completedAt,
        durationMs: scan.durationMs,
        overallScore: scan.overallScore,
        categoryScores: scan.categoryScores,
      },
      summary: {
        totalFindings: findings.length,
        byCategory: {
          seo: findings.filter((f) => f.category === 'SEO').length,
          accessibility: findings.filter((f) => f.category === 'Accessibility').length,
          security: findings.filter((f) => f.category === 'Security').length,
          performance: findings.filter((f) => f.category === 'Performance').length,
          technology: findings.filter((f) => f.category === 'Technology').length,
        },
        bySeverity: {
          critical: findings.filter((f) => f.severity === 'critical').length,
          high: findings.filter((f) => f.severity === 'high').length,
          medium: findings.filter((f) => f.severity === 'medium').length,
          low: findings.filter((f) => f.severity === 'low').length,
          info: findings.filter((f) => f.severity === 'info').length,
        },
      },
      findings: findings.map((f) => ({
        ruleId: f.ruleId,
        category: f.category,
        severity: f.severity,
        title: f.title,
        summary: f.summary,
        explanation: f.explanation,
        remediation: f.remediation,
        evidence: f.evidence,
        docsUrl: f.docsUrl,
        fingerprint: f.fingerprint,
      })),
    };

    let filename = `weblens-audit-${scan._id.toString().substring(0, 8)}.json`;
    try {
      const hostname = new URL(scan.finalUrl).hostname.replace(/[^a-z0-9]/gi, '_');
      filename = `weblens-${hostname}-${scan._id.toString().substring(0, 8)}.json`;
    } catch {}

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(exportPayload, null, 2));
  } catch (error) {
    console.error('[Export Scan Error]:', error);
    res.status(500).json({
      success: false,
      error: { code: 'EXPORT_FAILED', message: 'Could not export scan report' },
    });
  }
}



