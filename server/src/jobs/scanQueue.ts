import { Scan } from '../modules/scans/scan.model.js';

export interface ScanJob {
  scanId: string;
  targetUrl: string;
  ownerId: string;
}

export type ScanJobHandler = (job: ScanJob) => Promise<void>;

/**
 * Asynchronous job queue runner with concurrency control.
 * Decoupled interface matching Spec Section 13 so Redis or BullMQ can be swapped in later.
 */
class ScanJobQueue {
  private queue: ScanJob[] = [];
  private activeCount = 0;
  private maxConcurrency = 2; // Protects CPU & memory bounds
  private handler: ScanJobHandler | null = null;

  public setHandler(handler: ScanJobHandler): void {
    this.handler = handler;
  }

  public enqueue(job: ScanJob): void {
    this.queue.push(job);
    console.log(`[ScanQueue] Job enqueued for scan ${job.scanId}. Queue depth: ${this.queue.length}`);
    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    this.activeCount++;

    try {
      if (this.handler) {
        await this.handler(job);
      } else {
        await this.defaultJobHandler(job);
      }
    } catch (err) {
      console.error(`[ScanQueue] Error processing scan ${job.scanId}:`, err);
      await Scan.findByIdAndUpdate(job.scanId, {
        status: 'FAILED',
        errorCode: 'PROCESSING_ERROR',
        errorMessage: err instanceof Error ? err.message : 'Unknown scan error',
        completedAt: new Date(),
      });
    } finally {
      this.activeCount--;
      this.processNext(); // Process any remaining jobs
    }
  }

  /**
   * Safe baseline execution cycle for Phase 3 scan lifecycle verification.
   * Phase 4 attaches the full Puppeteer PageContext collector here.
   */
  private async defaultJobHandler(job: ScanJob): Promise<void> {
    const startTime = Date.now();
    console.log(`[ScanWorker] Started processing scan: ${job.scanId} (${job.targetUrl})`);

    // 1. Mark as RUNNING
    await Scan.findByIdAndUpdate(job.scanId, {
      status: 'RUNNING',
      startedAt: new Date(startTime),
    });

    // 2. Controlled processing simulation (2.5 seconds to demonstrate polling)
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const durationMs = Date.now() - startTime;

    // 3. Mark as COMPLETED with initial scoring
    await Scan.findByIdAndUpdate(job.scanId, {
      status: 'COMPLETED',
      completedAt: new Date(),
      durationMs,
      overallScore: 86,
      categoryScores: {
        performance: 84,
        seo: 92,
        accessibility: 88,
        security: 90,
        technology: 85,
      },
    });

    console.log(`[ScanWorker] Completed scan: ${job.scanId} in ${durationMs}ms`);
  }
}

export const scanQueue = new ScanJobQueue();
