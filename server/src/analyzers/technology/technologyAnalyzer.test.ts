import { technologyAnalyzer } from './technologyAnalyzer.js';
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
      responseStart: 100,
      responseEnd: 150,
      domContentLoaded: 250,
      loadEvent: 300,
      totalDurationMs: 300,
    },
    resourceSummary: {
      totalCount: 1,
      totalBytes: 500,
      imagesBytes: 0,
      scriptsBytes: 0,
      stylesheetsBytes: 0,
      fontsBytes: 0,
      otherBytes: 500,
    },
    resources: [],
    consoleMessages: [],
    ...overrides,
  };
}

console.log('--- Testing Technology Analyzer ---');

// Test 1: Next.js + React + Tailwind + Vercel detection
const nextjsCtx = createMockContext({
  html: '<!DOCTYPE html><html><head><title>Next App</title></head><body><div id="__next"><script id="__NEXT_DATA__"></script><div class="flex items-center p-4"></div></div></body></html>',
  headers: {
    'x-vercel-id': 'iad1::12345',
    server: 'Vercel',
  },
  scripts: [
    { src: 'https://example.com/_next/static/chunks/main.js', async: true, defer: false, isRenderBlocking: false },
  ],
});
const nextjsRes = technologyAnalyzer.analyze(nextjsCtx);
console.log('Detected Next.js stack:', nextjsRes.findings.map(f => f.title));
console.log('Score:', nextjsRes.score);

const hasNext = nextjsRes.findings.some(f => f.title.includes('Next.js'));
const hasVercel = nextjsRes.findings.some(f => f.title.includes('Vercel'));
const hasTailwind = nextjsRes.findings.some(f => f.title.includes('Tailwind'));

// Test 2: WordPress detection
const wpCtx = createMockContext({
  metaTags: [{ name: 'generator', content: 'WordPress 6.4.2' }],
  html: '<link rel="stylesheet" href="/wp-content/themes/twentytwentyfour/style.css">',
  headers: {
    'cf-ray': '82a1b2c3d4e5-IAD',
    server: 'cloudflare',
  },
});
const wpRes = technologyAnalyzer.analyze(wpCtx);
console.log('Detected WordPress stack:', wpRes.findings.map(f => f.title));

const hasWp = wpRes.findings.some(f => f.title.includes('WordPress'));
const hasCf = wpRes.findings.some(f => f.title.includes('Cloudflare'));

if (hasNext && hasVercel && hasTailwind && hasWp && hasCf && nextjsRes.score === 100) {
  console.log(' Technology Analyzer Tests Passed Successfully!');
} else {
  console.error(' Technology Analyzer Tests Failed!');
  process.exit(1);
}
