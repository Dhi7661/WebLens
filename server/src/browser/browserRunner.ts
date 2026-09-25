import puppeteer, { type Browser, type Page } from 'puppeteer';
import { validateAndNormalizeUrl } from '../utils/ssrf.js';
import type { PageContext, ResourceTimingInfo, ResourceSummary, TimingMetrics } from './types.js';

const SCAN_TIMEOUT_MS = 20000; // 20s hard timeout
const MAX_REDIRECTS = 5;
const MAX_RESOURCE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit per resource

const DEFAULT_USER_AGENT =
  process.env.SCAN_USER_AGENT ||
  'WebLens-Scanner/1.0 (+https://weblens.dev/bot; website intelligence engine)';

/**
 * Executes a controlled, safe headless browser session and extracts the normalized PageContext.
 */
export async function collectPageContext(targetUrl: string): Promise<PageContext> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Launch headless Chromium with security hardening flags
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--disable-extensions',
      ],
    });

    page = await browser.newPage();

    // Configure scanner identity and viewport
    await page.setUserAgent(DEFAULT_USER_AGENT);
    await page.setViewport({ width: 1366, height: 768 });
    page.setDefaultNavigationTimeout(SCAN_TIMEOUT_MS);

    let redirectCount = 0;
    const responseHeaders: Record<string, string> = {};
    let mainStatusCode = 200;
    let initialResponseTime = 0;
    const startTime = Date.now();
    const consoleMessages: Array<{ type: string; text: string }> = [];

    // Capture console messages for hygiene/troubleshooting
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Request interception for SSRF redirect protection & resource limits
    await page.setRequestInterception(true);

    page.on('request', async (interceptedRequest) => {
      const reqUrl = interceptedRequest.url();

      // Block non-HTTP protocols
      if (!reqUrl.startsWith('http://') && !reqUrl.startsWith('https://')) {
        return interceptedRequest.abort();
      }

      // Check redirects for SSRF
      if (interceptedRequest.isNavigationRequest() && interceptedRequest.frame() === page?.mainFrame()) {
        redirectCount++;
        if (redirectCount > MAX_REDIRECTS) {
          console.warn(`[BrowserRunner] Exceeded max redirects (${MAX_REDIRECTS}) for ${targetUrl}`);
          return interceptedRequest.abort();
        }

        // Validate redirected destination against SSRF rules
        const validation = await validateAndNormalizeUrl(reqUrl);
        if (!validation.valid) {
          console.warn(`[BrowserRunner] Blocked SSRF attempt via redirect to ${reqUrl}`);
          return interceptedRequest.abort();
        }
      }

      interceptedRequest.continue();
    });

    // Capture primary navigation response
    page.on('response', (response) => {
      if (response.url() === page?.url() || response.frame() === page?.mainFrame()) {
        mainStatusCode = response.status();
        const headers = response.headers();
        for (const [k, v] of Object.entries(headers)) {
          responseHeaders[k.toLowerCase()] = v;
        }
        if (initialResponseTime === 0) {
          initialResponseTime = Date.now() - startTime;
        }
      }
    });

    // Navigate to target URL
    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: SCAN_TIMEOUT_MS,
    });

    // Allow dynamic hydration to settle briefly (500ms)
    await new Promise((r) => setTimeout(r, 500));

    const finalUrl = page.url();

    // Extract DOM metrics and elements directly from the rendered browser page
    const extractedData = await page.evaluate(() => {
      const getSelector = (el: Element): string => {
        if (el.id) return `#${el.id}`;
        let path = el.tagName.toLowerCase();
        if (el.className && typeof el.className === 'string') {
          const firstClass = el.className.trim().split(/\s+/)[0];
          if (firstClass) path += `.${firstClass}`;
        }
        return path;
      };

      // 1. Meta tags
      const metaEls = Array.from(document.querySelectorAll('meta'));
      const metaTags = metaEls.map((m) => ({
        name: m.getAttribute('name') || undefined,
        property: m.getAttribute('property') || undefined,
        content: m.getAttribute('content') || undefined,
        httpEquiv: m.getAttribute('http-equiv') || undefined,
      }));

      // 2. Images
      const imgEls = Array.from(document.querySelectorAll('img'));
      const images = imgEls.map((img) => {
        const alt = img.getAttribute('alt');
        return {
          src: img.src || img.getAttribute('src') || '',
          alt: alt !== null ? alt : null,
          hasAlt: alt !== null,
          width: img.naturalWidth || img.width || undefined,
          height: img.naturalHeight || img.height || undefined,
          loading: img.getAttribute('loading') || undefined,
          selector: getSelector(img),
        };
      });

      // 3. Headings
      const headingEls = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      const headings = headingEls.map((h) => ({
        level: parseInt(h.tagName.substring(1), 10),
        text: (h.textContent || '').trim(),
        selector: getSelector(h),
      }));

      // 4. Links
      const linkEls = Array.from(document.querySelectorAll('a[href]'));
      const links = linkEls.map((a) => {
        const href = (a.getAttribute('href') || '').trim();
        return {
          href,
          text: (a.textContent || '').trim(),
          rel: a.getAttribute('rel') || undefined,
          target: a.getAttribute('target') || undefined,
          isExternal: href.startsWith('http') && !href.includes(window.location.hostname),
        };
      });

      // 5. Scripts
      const scriptEls = Array.from(document.querySelectorAll('script'));
      const scripts = scriptEls.map((s) => ({
        src: s.src || s.getAttribute('src') || undefined,
        async: s.async,
        defer: s.defer,
        type: s.type || undefined,
        isRenderBlocking: !s.async && !s.defer && !!s.src && !s.type?.includes('module'),
      }));

      // 6. Stylesheets
      const styleEls = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      const stylesheets = styleEls.map((l) => ({
        href: l.getAttribute('href') || undefined,
        media: l.getAttribute('media') || undefined,
        rel: l.getAttribute('rel') || undefined,
      }));

      // 7. Buttons
      const buttonEls = Array.from(document.querySelectorAll('button, [role="button"]'));
      const buttons = buttonEls.map((b) => {
        const text = (b.textContent || '').trim();
        const ariaLabel = b.getAttribute('aria-label');
        const ariaLabelledBy = b.getAttribute('aria-labelledby');
        return {
          text,
          ariaLabel,
          hasAccessibleName: Boolean(text || ariaLabel || ariaLabelledBy),
          type: b.getAttribute('type') || undefined,
          selector: getSelector(b),
        };
      });

      // 8. Forms & input labels
      const formEls = Array.from(document.querySelectorAll('form'));
      const forms = formEls.map((form) => {
        const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"]):not([type="submit"])'));
        let missingCount = 0;
        inputs.forEach((input) => {
          const id = input.id;
          const hasLabel = id && document.querySelector(`label[for="${id}"]`);
          const hasAria = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
          const hasParentLabel = input.closest('label');
          if (!hasLabel && !hasAria && !hasParentLabel) {
            missingCount++;
          }
        });

        return {
          action: form.getAttribute('action') || undefined,
          method: form.getAttribute('method') || undefined,
          inputsCount: inputs.length,
          hasLabels: missingCount === 0,
          missingLabelsCount: missingCount,
        };
      });

      // 9. Document metadata
      const htmlLang = document.documentElement.getAttribute('lang') || undefined;
      const viewportEl = document.querySelector('meta[name="viewport"]');
      const viewport = viewportEl ? viewportEl.getAttribute('content') || undefined : undefined;
      const title = document.title || '';

      // 10. Performance timings
      const perf = window.performance;
      const timingEntry = perf.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;

      let navTiming: TimingMetrics = {
        navigationStart: 0,
        responseStart: 0,
        responseEnd: 0,
        domContentLoaded: 0,
        loadEvent: 0,
        totalDurationMs: 0,
      };

      if (timingEntry) {
        navTiming = {
          navigationStart: 0,
          responseStart: Math.round(timingEntry.responseStart),
          responseEnd: Math.round(timingEntry.responseEnd),
          domContentLoaded: Math.round(timingEntry.domContentLoadedEventEnd),
          loadEvent: Math.round(timingEntry.loadEventEnd),
          totalDurationMs: Math.round(timingEntry.duration),
        };
      }

      // Resource timings
      const resourceEntries = perf.getEntriesByType('resource') as PerformanceResourceTiming[];
      const resources: ResourceTimingInfo[] = resourceEntries.slice(0, 50).map((r) => ({
        name: r.name,
        initiatorType: r.initiatorType,
        duration: Math.round(r.duration),
        transferSize: r.transferSize || 0,
        encodedBodySize: r.encodedBodySize || 0,
        decodedBodySize: r.decodedBodySize || 0,
      }));

      const summary: ResourceSummary = {
        totalCount: resourceEntries.length,
        totalBytes: resourceEntries.reduce((acc, r) => acc + (r.transferSize || 0), 0),
        imagesBytes: resourceEntries
          .filter((r) => r.initiatorType === 'img' || r.initiatorType === 'image')
          .reduce((acc, r) => acc + (r.transferSize || 0), 0),
        scriptsBytes: resourceEntries
          .filter((r) => r.initiatorType === 'script')
          .reduce((acc, r) => acc + (r.transferSize || 0), 0),
        stylesheetsBytes: resourceEntries
          .filter((r) => r.initiatorType === 'css' || r.initiatorType === 'link')
          .reduce((acc, r) => acc + (r.transferSize || 0), 0),
        fontsBytes: resourceEntries
          .filter((r) => r.initiatorType === 'font')
          .reduce((acc, r) => acc + (r.transferSize || 0), 0),
        otherBytes: 0,
      };

      summary.otherBytes = Math.max(
        0,
        summary.totalBytes -
          (summary.imagesBytes + summary.scriptsBytes + summary.stylesheetsBytes + summary.fontsBytes)
      );

      return {
        title,
        metaTags,
        images,
        headings,
        links,
        scripts,
        stylesheets,
        buttons,
        forms,
        lang: htmlLang,
        viewport,
        timing: navTiming,
        resources,
        resourceSummary: summary,
      };
    });

    const fullHtml = await page.content();

    return {
      url: targetUrl,
      finalUrl,
      statusCode: mainStatusCode,
      headers: responseHeaders,
      html: fullHtml,
      title: extractedData.title,
      metaTags: extractedData.metaTags,
      links: extractedData.links,
      images: extractedData.images,
      scripts: extractedData.scripts,
      stylesheets: extractedData.stylesheets,
      headings: extractedData.headings,
      forms: extractedData.forms,
      buttons: extractedData.buttons,
      lang: extractedData.lang,
      viewport: extractedData.viewport,
      timing: {
        ...extractedData.timing,
        totalDurationMs: extractedData.timing.totalDurationMs || Date.now() - startTime,
      },
      resourceSummary: extractedData.resourceSummary,
      resources: extractedData.resources,
      consoleMessages: consoleMessages.slice(0, 20),
    };
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}
