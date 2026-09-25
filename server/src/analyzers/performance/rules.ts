import type { PageContext } from '../../browser/types.js';
import type { FindingDraft } from '../types.js';
import { generateFingerprint } from '../../utils/fingerprint.js';

/**
 * PERF-001: Render-blocking resources
 * Detects synchronous scripts in the document that block HTML parsing and First Contentful Paint.
 */
export function evaluateRenderBlockingScriptsRule(context: PageContext): FindingDraft[] {
  const blockingScripts = context.scripts.filter((s) => s.isRenderBlocking);

  if (blockingScripts.length > 0) {
    const isSevere = blockingScripts.length >= 3;
    const evidenceList = blockingScripts.slice(0, 5).map((s) => ({
      selector: 'script',
      value: s.src || '<inline script>',
      detail: 'Synchronous script blocks HTML parsing',
    }));

    return [
      {
        ruleId: 'PERF-001',
        category: 'Performance',
        severity: isSevere ? 'high' : 'medium',
        title: `Render-blocking JavaScript detected (${blockingScripts.length} script${blockingScripts.length > 1 ? 's' : ''})`,
        summary: `${blockingScripts.length} synchronous script(s) are delaying the browser from parsing HTML and rendering the initial paint.`,
        explanation:
          'Synchronous scripts without async or defer attributes force the browser parser to halt HTML document construction while the script is downloaded and executed, directly delaying First Contentful Paint (FCP) and Time to Interactive (TTI).',
        remediation:
          'Add defer or async attributes to non-critical scripts, or migrate to type="module" which defers script execution by default until HTML parsing completes.',
        docsUrl: 'https://web.dev/render-blocking-resources/',
        location: '<head> / <body>',
        evidence: evidenceList,
        fingerprint: generateFingerprint('PERF-001', `${blockingScripts.length}-blocking-scripts`),
      },
    ];
  }

  return [];
}

/**
 * PERF-002: Total Page Transfer Weight Budget
 * Evaluates the total byte size of all network assets transferred.
 */
export function evaluateTotalPageWeightRule(context: PageContext): FindingDraft[] {
  const totalBytes = context.resourceSummary.totalBytes;
  const totalKb = Math.round(totalBytes / 1024);

  // Budgets: > 3MB (high), > 1.5MB (medium), > 1MB (low)
  if (totalBytes > 1024 * 1024) {
    let severity: 'high' | 'medium' | 'low' = 'low';
    if (totalBytes > 3 * 1024 * 1024) severity = 'high';
    else if (totalBytes > 1.5 * 1024 * 1024) severity = 'medium';

    return [
      {
        ruleId: 'PERF-002',
        category: 'Performance',
        severity,
        title: `Heavy page payload (${totalKb} KB transferred)`,
        summary: `The total network transfer size of ${totalKb} KB exceeds recommended performance budgets for responsive web pages.`,
        explanation:
          'Large payloads increase mobile cellular data consumption, drain battery, and noticeably degrade load times on 3G/4G connections. Industry best practice targets initial page loads under 1MB.',
        remediation:
          'Compress images using modern WebP or AVIF formats, enable Gzip or Brotli compression on your web server, and tree-shake unused code from JavaScript bundles.',
        docsUrl: 'https://web.dev/total-byte-weight/',
        location: 'Network Transfers',
        evidence: [
          {
            selector: 'Payload Size',
            value: `${totalKb} KB`,
            detail: `Images: ${Math.round(context.resourceSummary.imagesBytes / 1024)} KB, Scripts: ${Math.round(context.resourceSummary.scriptsBytes / 1024)} KB, Stylesheets: ${Math.round(context.resourceSummary.stylesheetsBytes / 1024)} KB`,
          },
        ],
        fingerprint: generateFingerprint('PERF-002', severity),
      },
    ];
  }

  return [];
}

/**
 * PERF-003: Unsized Images (Cumulative Layout Shift prevention)
 * Checks that images specify explicit width and height attributes.
 */
export function evaluateImageDimensionsRule(context: PageContext): FindingDraft[] {
  const unsizedImages = context.images.filter((img) => !img.width || !img.height);

  if (unsizedImages.length > 0) {
    const isHigh = unsizedImages.length >= 4;
    return [
      {
        ruleId: 'PERF-003',
        category: 'Performance',
        severity: isHigh ? 'medium' : 'low',
        title: `Images missing explicit width/height dimensions (${unsizedImages.length} image${unsizedImages.length > 1 ? 's' : ''})`,
        summary: `${unsizedImages.length} image(s) lack explicit width and height attributes in HTML.`,
        explanation:
          'When images do not declare width and height dimensions in HTML, the browser cannot pre-allocate the required layout space before the image is downloaded. When the image suddenly renders, existing content jumps abruptly, causing high Cumulative Layout Shift (CLS).',
        remediation:
          'Always specify explicit width and height attributes (or CSS aspect-ratio) on <img> tags so the browser can calculate the aspect ratio and reserve layout space immediately.',
        docsUrl: 'https://web.dev/optimize-cls/#images-without-dimensions',
        location: '<img> elements',
        evidence: unsizedImages.slice(0, 5).map((img) => ({
          selector: img.selector,
          value: img.src.length > 80 ? `${img.src.substring(0, 80)}...` : img.src,
          detail: 'Missing explicit width or height attributes',
        })),
        fingerprint: generateFingerprint('PERF-003', `${unsizedImages.length}-unsized-images`),
      },
    ];
  }

  return [];
}

/**
 * PERF-004: Off-screen image lazy loading
 * Recommends lazy loading when multiple images are present.
 */
export function evaluateLazyLoadingRule(context: PageContext): FindingDraft[] {
  if (context.images.length <= 3) {
    return [];
  }

  const unlazyImages = context.images.filter((img) => img.loading !== 'lazy');

  // If there are more than 3 images and more than 2 lack loading="lazy"
  if (unlazyImages.length > 2) {
    return [
      {
        ruleId: 'PERF-004',
        category: 'Performance',
        severity: 'low',
        title: `Images not configured with loading="lazy" (${unlazyImages.length} image${unlazyImages.length > 1 ? 's' : ''})`,
        summary: `Multiple images are loaded immediately without lazy-loading attributes.`,
        explanation:
          'Loading all page images eagerly on initial page load consumes unnecessary bandwidth and CPU for elements that may never be scrolled into view by the user.',
        remediation:
          'Add loading="lazy" to all off-screen and below-the-fold images to defer network fetching until the user scrolls near them.',
        docsUrl: 'https://web.dev/browser-level-image-lazy-loading/',
        location: '<img> elements',
        evidence: unlazyImages.slice(0, 5).map((img) => ({
          selector: img.selector,
          value: img.src.length > 80 ? `${img.src.substring(0, 80)}...` : img.src,
          detail: 'Missing loading="lazy"',
        })),
        fingerprint: generateFingerprint('PERF-004', `${unlazyImages.length}-unlazy-images`),
      },
    ];
  }

  return [];
}

/**
 * PERF-005: Time to First Byte (TTFB) / Server Response Time
 * Evaluates the responsiveness of the web server.
 */
export function evaluateTtfbRule(context: PageContext): FindingDraft[] {
  const ttfb = context.timing.responseStart;

  // Thresholds: > 800ms (high), > 500ms (medium), > 350ms (low)
  if (ttfb > 350) {
    let severity: 'high' | 'medium' | 'low' = 'low';
    if (ttfb > 800) severity = 'high';
    else if (ttfb > 500) severity = 'medium';

    return [
      {
        ruleId: 'PERF-005',
        category: 'Performance',
        severity,
        title: `Slow server response time (TTFB: ${ttfb}ms)`,
        summary: `The server took ${ttfb}ms to return the initial HTML response byte.`,
        explanation:
          'Time to First Byte (TTFB) measures the round-trip latency between the browser sending the HTTP request and receiving the first byte of response data. High TTFB stalls all subsequent browser rendering and resource discovery.',
        remediation:
          'Optimize database queries, introduce server-side memory caching (e.g. Redis), leverage a Content Delivery Network (CDN) edge cache, and ensure server compute resources are adequately provisioned.',
        docsUrl: 'https://web.dev/ttfb/',
        location: 'Server Response Timing',
        evidence: [
          {
            selector: 'responseStart',
            value: `${ttfb}ms`,
            detail: 'Server initial response time exceeds 350ms budget',
          },
        ],
        fingerprint: generateFingerprint('PERF-005', severity),
      },
    ];
  }

  return [];
}

/**
 * PERF-006: JavaScript Bundle Payload Budget
 * Flags heavy client-side JavaScript execution footprints.
 */
export function evaluateScriptWeightRule(context: PageContext): FindingDraft[] {
  const jsBytes = context.resourceSummary.scriptsBytes;
  const jsKb = Math.round(jsBytes / 1024);

  if (jsBytes > 500 * 1024) {
    const isHigh = jsBytes > 1024 * 1024; // > 1MB
    return [
      {
        ruleId: 'PERF-006',
        category: 'Performance',
        severity: isHigh ? 'high' : 'medium',
        title: `Large JavaScript payload (${jsKb} KB)`,
        summary: `Client-side JavaScript bundles total ${jsKb} KB, exceeding recommended transfer budgets.`,
        explanation:
          'JavaScript is computationally expensive: in addition to network download time, browsers must parse, compile, and execute all scripts on the main thread, directly contributing to high Interaction to Next Paint (INP) and sluggish interactions.',
        remediation:
          'Employ route-based code splitting with dynamic import(), audit npm package dependencies for lighter alternatives, and enable aggressive minification and dead code elimination.',
        docsUrl: 'https://web.dev/reduce-javascript-payloads-with-code-splitting/',
        location: 'JavaScript Assets',
        evidence: [
          {
            selector: 'scriptsBytes',
            value: `${jsKb} KB`,
            detail: 'Total JavaScript transferred exceeds 500 KB',
          },
        ],
        fingerprint: generateFingerprint('PERF-006', isHigh ? 'high' : 'medium'),
      },
    ];
  }

  return [];
}

/**
 * PERF-007: Excessive Total HTTP Requests
 * Flags pages with too many individual resource round-trips.
 */
export function evaluateRequestCountRule(context: PageContext): FindingDraft[] {
  const count = context.resourceSummary.totalCount;

  if (count > 30) {
    const isMedium = count > 50;
    return [
      {
        ruleId: 'PERF-007',
        category: 'Performance',
        severity: isMedium ? 'medium' : 'low',
        title: `High number of network requests (${count} requests)`,
        summary: `The page triggers ${count} individual resource requests during initial load.`,
        explanation:
          'Each HTTP request incurs TCP handshakes, TLS negotiation, and HTTP header overhead. While HTTP/2 multiplexing helps, excessive requests still exhaust browser connection pools and increase mobile latency.',
        remediation:
          'Bundle small assets, inline critical icons/SVGs, combine stylesheet files, and remove unnecessary third-party tracking scripts.',
        docsUrl: 'https://web.dev/resource-summary/',
        location: 'Network Requests',
        evidence: [
          {
            selector: 'Resource Count',
            value: `${count} requests`,
            detail: 'Exceeds standard 30 request budget',
          },
        ],
        fingerprint: generateFingerprint('PERF-007', isMedium ? 'medium' : 'low'),
      },
    ];
  }

  return [];
}
