import { Website, type MonitoringFrequency } from '../modules/websites/website.model.js';
import { Scan } from '../modules/scans/scan.model.js';
import { scanQueue } from './scanQueue.js';

const CHECK_INTERVAL_MS = 60 * 1000; // Check every 60 seconds

export function calculateNextScheduledDate(frequency: MonitoringFrequency): Date {
  const now = Date.now();
  switch (frequency) {
    case 'hourly':
      return new Date(now + 60 * 60 * 1000);
    case 'weekly':
      return new Date(now + 7 * 24 * 60 * 60 * 1000);
    case 'daily':
    default:
      return new Date(now + 24 * 60 * 60 * 1000);
  }
}

/**
 * Background scheduler that periodically checks and enqueues recurring website audits.
 */
class ScheduledAuditRunner {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  public start(): void {
    if (this.timer) return;
    console.log('[Scheduler] Background recurring audit monitor initialized (checking every 60s)');
    this.timer = setInterval(() => this.checkDueWebsites(), CHECK_INTERVAL_MS);
    // Run an immediate check on startup
    this.checkDueWebsites().catch((err) =>
      console.error('[Scheduler] Initial schedule check error:', err)
    );
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[Scheduler] Background audit runner stopped');
    }
  }

  public async checkDueWebsites(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      // Find websites where monitoring is enabled and nextScheduledAt is in the past or undefined
      const dueWebsites = await Website.find({
        monitoringEnabled: true,
        $or: [{ nextScheduledAt: { $lte: now } }, { nextScheduledAt: { $exists: false } }],
      }).limit(10); // Process up to 10 due sites per tick to avoid spikes

      if (dueWebsites.length > 0) {
        console.log(`[Scheduler] Found ${dueWebsites.length} website(s) due for scheduled audit.`);

        for (const website of dueWebsites) {
          const nextDate = calculateNextScheduledDate(website.frequency || 'daily');

          website.lastScheduledAt = now;
          website.nextScheduledAt = nextDate;
          await website.save();

          // Create Scan entity
          const scan = await Scan.create({
            websiteId: website._id,
            ownerId: website.ownerId,
            requestedUrl: website.url,
            finalUrl: website.normalizedUrl,
            status: 'QUEUED',
          });

          // Enqueue for headless browser audit
          scanQueue.enqueue({
            scanId: scan._id.toString(),
            targetUrl: website.normalizedUrl,
            ownerId: website.ownerId.toString(),
          });

          console.log(
            `[Scheduler] Enqueued scheduled audit for ${website.hostname} (Scan ID: ${scan._id}). Next run: ${nextDate.toISOString()}`
          );
        }
      }
    } catch (err) {
      console.error('[Scheduler] Error checking due websites:', err);
    } finally {
      this.isProcessing = false;
    }
  }
}

export const scheduler = new ScheduledAuditRunner();
