import { performanceAnalyzer } from './performanceAnalyzer.js';
import type { PageContext } from '../../browser/types.js';

function createMockContext(overrides: Partial<PageContext>): PageContext {
  return {
    url: 'https://example.com',
    finalUrl: 'https://example.com',
    statusCode: 200,
    headers: {},
    html: '<!DOCTYPE html><html><head><title>Test</title></head><body></body></html>',
    title: 'Test',
    metaTags: [],
    links: [],
    images: [],
    scripts: [],
    stylesheets: [],
    headings: [],
    forms: [],
    buttons: [],
    timing: {
      navigationStart: 0,
      responseStart: 120, // Fast 120ms TTFB
      responseEnd: 150,
      domContentLoaded: 250,
      loadEvent: 300,
      totalDurationMs: 300,
    },
    resourceSummary: {
      totalCount: 5,
      totalBytes: 250 * 1024, // 250 KB
      imagesBytes: 100 * 1024,
      scriptsBytes: 100 * 1024,
      stylesheetsBytes: 50 * 1024,
      fontsBytes: 0,
      otherBytes: 0,
    },
    resources: [],
    consoleMessages: [],
    ...overrides,
  };
}

console.log('--- Testing Performance Analyzer ---');

// Test 1: Fast, optimized site
const fastCtx = createMockContext({
  scripts: [{ src: 'https://example.com/app.js', async: true, defer: false, isRenderBlocking: false }],
  images: [{ src: 'https://example.com/logo.png', alt: 'Logo', hasAlt: true, width: 200, height: 50, loading: 'lazy', selector: 'img.logo' }],
});
const fastRes = performanceAnalyzer.analyze(fastCtx);
console.log('Fast Site Score:', fastRes.score, 'Findings count:', fastRes.findings.length);

// Test 2: Site with render-blocking script, heavy payload, and slow TTFB
const slowCtx = createMockContext({
  timing: {
    navigationStart: 0,
    responseStart: 950, // Slow TTFB > 800ms
    responseEnd: 1100,
    domContentLoaded: 2500,
    loadEvent: 4500,
    totalDurationMs: 4500,
  },
  resourceSummary: {
    totalCount: 45,
    totalBytes: 3.5 * 1024 * 1024, // 3.5 MB > 3MB
    imagesBytes: 2 * 1024 * 1024,
    scriptsBytes: 1.2 * 1024 * 1024, // 1.2 MB > 1MB
    stylesheetsBytes: 300 * 1024,
    fontsBytes: 0,
    otherBytes: 0,
  },
  scripts: [
    { src: 'https://example.com/blocking.js', async: false, defer: false, isRenderBlocking: true },
    { src: 'https://example.com/blocking2.js', async: false, defer: false, isRenderBlocking: true },
    { src: 'https://example.com/blocking3.js', async: false, defer: false, isRenderBlocking: true },
  ],
  images: [
    { src: 'https://example.com/img1.png', alt: 'Img 1', hasAlt: true, selector: 'img.hero' }, // unsized
    { src: 'https://example.com/img2.png', alt: 'Img 2', hasAlt: true, selector: 'img.card' }, // unsized
  ],
});
const slowRes = performanceAnalyzer.analyze(slowCtx);
console.log('Slow Site Score:', slowRes.score, 'Findings count:', slowRes.findings.length);
console.log('Rule IDs triggered on slow site:', slowRes.findings.map(f => f.ruleId));

const hasBlocking = slowRes.findings.some(f => f.ruleId === 'PERF-001');
const hasWeight = slowRes.findings.some(f => f.ruleId === 'PERF-002');
const hasUnsized = slowRes.findings.some(f => f.ruleId === 'PERF-003');
const hasTtfb = slowRes.findings.some(f => f.ruleId === 'PERF-005');
const hasJsWeight = slowRes.findings.some(f => f.ruleId === 'PERF-006');

if (fastRes.score === 100 && fastRes.findings.length === 0 && hasBlocking && hasWeight && hasUnsized && hasTtfb && hasJsWeight) {
  console.log(' Performance Analyzer Tests Passed Successfully!');
} else {
  console.error(' Performance Analyzer Tests Failed!');
  process.exit(1);
}
