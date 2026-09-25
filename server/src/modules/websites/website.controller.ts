import type { Request, Response } from 'express';
import { Website } from './website.model.js';
import { Scan } from '../scans/scan.model.js';
import { scanQueue } from '../../jobs/scanQueue.js';
import { calculateNextScheduledDate } from '../../jobs/scheduler.js';

/**
 * Lists all websites owned by the user along with their latest scan stats and monitoring status.
 */
export async function listWebsites(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;

  try {
    const websites = await Website.find({ ownerId: userId }).sort({ updatedAt: -1 });

    const websiteDtos = await Promise.all(
      websites.map(async (site) => {
        const [latestScan, scanCount] = await Promise.all([
          Scan.findOne({ websiteId: site._id }).sort({ createdAt: -1 }),
          Scan.countDocuments({ websiteId: site._id }),
        ]);

        return {
          ...site.toJSON(),
          scanCount,
          latestScan: latestScan ? latestScan.toJSON() : null,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        websites: websiteDtos,
      },
    });
  } catch (error) {
    console.error('[List Websites Error]:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_WEBSITES_FAILED', message: 'Could not load websites' },
    });
  }
}

/**
 * Updates scheduled monitoring settings (enabled, frequency) for a website.
 */
export async function updateMonitoring(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { monitoringEnabled, frequency } = req.body;
  const userId = req.user?.userId;

  try {
    const website = await Website.findById(id);
    if (!website) {
      res.status(404).json({
        success: false,
        error: { code: 'WEBSITE_NOT_FOUND', message: 'Website not found' },
      });
      return;
    }

    if (website.ownerId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not own this website' },
      });
      return;
    }

    if (typeof monitoringEnabled === 'boolean') {
      website.monitoringEnabled = monitoringEnabled;
      if (monitoringEnabled) {
        website.nextScheduledAt = calculateNextScheduledDate(
          frequency || website.frequency || 'daily'
        );
      } else {
        website.nextScheduledAt = undefined;
      }
    }

    if (frequency && ['hourly', 'daily', 'weekly'].includes(frequency)) {
      website.frequency = frequency;
      if (website.monitoringEnabled) {
        website.nextScheduledAt = calculateNextScheduledDate(frequency);
      }
    }

    await website.save();

    res.status(200).json({
      success: true,
      data: {
        website: website.toJSON(),
      },
    });
  } catch (error) {
    console.error('[Update Monitoring Error]:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_MONITORING_FAILED', message: 'Failed to update schedule' },
    });
  }
}

/**
 * Returns historical time-series analytics and scan timeline for a specific website.
 */
export async function getWebsiteHistory(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user?.userId;

  try {
    const website = await Website.findById(id);
    if (!website) {
      res.status(404).json({
        success: false,
        error: { code: 'WEBSITE_NOT_FOUND', message: 'Website not found' },
      });
      return;
    }

    if (website.ownerId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this website' },
      });
      return;
    }

    const scans = await Scan.find({ websiteId: website._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const completedScans = scans.filter((s) => s.status === 'COMPLETED');
    const totalScans = scans.length;

    const averageScore =
      completedScans.length > 0
        ? Math.round(
            completedScans.reduce((acc, s) => acc + s.overallScore, 0) / completedScans.length
          )
        : 0;

    // Time-series points ordered chronologically (oldest to newest) for charts
    const timeSeries = [...completedScans].reverse().map((s) => ({
      id: s._id.toString(),
      date: s.createdAt,
      overallScore: s.overallScore,
      categoryScores: s.categoryScores,
      durationMs: s.durationMs || 0,
    }));

    // Calculate score delta between first and latest scan
    const scoreDelta =
      completedScans.length >= 2
        ? completedScans[0].overallScore - completedScans[completedScans.length - 1].overallScore
        : 0;

    res.status(200).json({
      success: true,
      data: {
        website: website.toJSON(),
        stats: {
          totalScans,
          completedScans: completedScans.length,
          averageScore,
          scoreDelta,
        },
        timeSeries,
        scans: scans.map((s) => s.toJSON()),
      },
    });
  } catch (error) {
    console.error('[Get Website History Error]:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_HISTORY_FAILED', message: 'Failed to retrieve website history' },
    });
  }
}

/**
 * Triggers an immediate audit scan for an existing registered website.
 */
export async function triggerScan(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user?.userId;

  try {
    const website = await Website.findById(id);
    if (!website) {
      res.status(404).json({
        success: false,
        error: { code: 'WEBSITE_NOT_FOUND', message: 'Website not found' },
      });
      return;
    }

    if (website.ownerId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not own this website' },
      });
      return;
    }

    const scan = await Scan.create({
      websiteId: website._id,
      ownerId: userId,
      requestedUrl: website.url,
      finalUrl: website.normalizedUrl,
      status: 'QUEUED',
    });

    scanQueue.enqueue({
      scanId: scan._id.toString(),
      targetUrl: website.normalizedUrl,
      ownerId: userId!,
    });

    res.status(202).json({
      success: true,
      data: {
        scan: scan.toJSON(),
      },
    });
  } catch (error) {
    console.error('[Trigger Scan Error]:', error);
    res.status(500).json({
      success: false,
      error: { code: 'TRIGGER_SCAN_FAILED', message: 'Failed to schedule scan' },
    });
  }
}
