import { securityAnalyzer } from './securityAnalyzer.js';
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

console.log('--- Testing Security Analyzer ---');

// Test 1: Insecure HTTP
const insecureCtx = createMockContext({
  url: 'http://insecure-site.org',
  finalUrl: 'http://insecure-site.org',
});
const insecureRes = securityAnalyzer.analyze(insecureCtx);
console.log('Insecure HTTP Score:', insecureRes.score);
const httpsFinding = insecureRes.findings.find(f => f.ruleId === 'SEC-001');
console.log('Found SEC-001 finding:', !!httpsFinding && httpsFinding.severity === 'critical');

// Test 2: Missing headers on HTTPS
const missingHeadersCtx = createMockContext({
  url: 'https://example.com',
  finalUrl: 'https://example.com',
  headers: {},
});
const missingRes = securityAnalyzer.analyze(missingHeadersCtx);
console.log('Missing Headers Score:', missingRes.score);
console.log('Total Security Findings:', missingRes.findings.length);
console.log('Rule IDs triggered:', missingRes.findings.map(f => f.ruleId));

// Test 3: Fully hardened headers
const hardenedCtx = createMockContext({
  url: 'https://secure-bank.example.com',
  finalUrl: 'https://secure-bank.example.com',
  headers: {
    'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
    'content-security-policy': "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none';",
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  },
});
const hardenedRes = securityAnalyzer.analyze(hardenedCtx);
console.log('Hardened Site Score:', hardenedRes.score);
console.log('Hardened Findings count:', hardenedRes.findings.length);

if (hardenedRes.score === 100 && hardenedRes.findings.length === 0 && httpsFinding) {
  console.log(' Security Analyzer Tests Passed Successfully!');
} else {
  console.error(' Security Analyzer Tests Failed!');
  process.exit(1);
}
