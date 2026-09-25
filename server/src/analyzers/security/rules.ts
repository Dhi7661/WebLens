import type { PageContext } from '../../browser/types.js';
import type { FindingDraft } from '../types.js';
import { generateFingerprint } from '../../utils/fingerprint.js';

/**
 * SEC-001: HTTPS Encryption & Protocol Security
 * Verifies the website is delivered securely over TLS/HTTPS.
 */
export function evaluateHttpsRule(context: PageContext): FindingDraft[] {
  const isHttps = context.finalUrl.startsWith('https://');

  if (!isHttps) {
    return [
      {
        ruleId: 'SEC-001',
        category: 'Security',
        severity: 'critical',
        title: 'Website is not served over HTTPS',
        summary: 'The target website was loaded over unencrypted HTTP rather than HTTPS.',
        explanation:
          'Plaintext HTTP connections transmit all traffic—including session cookies, credentials, and user data—in cleartext. This exposes users to eavesdropping, packet alteration, and man-in-the-middle (MitM) attacks by intermediate networks.',
        remediation:
          "Obtain an SSL/TLS certificate (e.g. from Let's Encrypt or your CDN) and configure your web server to enforce HTTPS with permanent 301 redirects from HTTP to HTTPS.",
        docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security',
        location: 'Network Protocol',
        evidence: [
          {
            selector: 'URL',
            value: context.finalUrl,
            detail: 'Protocol is unencrypted http:',
          },
        ],
        fingerprint: generateFingerprint('SEC-001', context.finalUrl),
      },
    ];
  }

  return [];
}

/**
 * SEC-002: Strict-Transport-Security (HSTS)
 * Verifies that the HSTS header is configured to protect against SSL-stripping.
 */
export function evaluateHstsRule(context: PageContext): FindingDraft[] {
  // Only applicable if the target is served over HTTPS
  const isHttps = context.finalUrl.startsWith('https://');
  if (!isHttps) {
    return [];
  }

  const hsts = context.headers['strict-transport-security'];

  if (!hsts) {
    return [
      {
        ruleId: 'SEC-002',
        category: 'Security',
        severity: 'high',
        title: 'Missing HTTP Strict Transport Security (HSTS)',
        summary: 'The Strict-Transport-Security header is not configured on the web server.',
        explanation:
          'HSTS informs compliant web browsers that they must only connect to your domain using HTTPS for a specified duration. Without HSTS, initial user connections are vulnerable to SSL-stripping and downgrade attacks.',
        remediation:
          "Add the 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload' header to all HTTPS responses.",
        docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security',
        location: 'HTTP Response Headers',
        evidence: [
          {
            selector: 'Strict-Transport-Security',
            value: undefined,
            detail: 'Header is missing in HTTP response',
          },
        ],
        fingerprint: generateFingerprint('SEC-002', 'hsts-missing'),
      },
    ];
  }

  // Check max-age duration (recommended >= 6 months, 15768000s)
  const maxAgeMatch = hsts.match(/max-age=(\d+)/i);
  if (maxAgeMatch) {
    const maxAge = parseInt(maxAgeMatch[1], 10);
    if (maxAge < 15768000) {
      return [
        {
          ruleId: 'SEC-002-SHORT',
          category: 'Security',
          severity: 'medium',
          title: 'Short HSTS max-age duration',
          summary: `HSTS max-age is set to ${maxAge} seconds (less than the recommended 6 months).`,
          explanation:
            'A short HSTS max-age does not provide durable protection against downgrade attacks for returning visitors.',
          remediation:
            "Increase the max-age directive to at least 15768000 (6 months) or 31536000 (1 year): 'max-age=31536000; includeSubDomains'.",
          docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security',
          location: 'HTTP Response Headers',
          evidence: [
            {
              selector: 'Strict-Transport-Security',
              value: hsts,
              detail: `Configured max-age is ${maxAge} seconds`,
            },
          ],
          fingerprint: generateFingerprint('SEC-002-SHORT', hsts),
        },
      ];
    }
  }

  return [];
}

/**
 * SEC-003: Content-Security-Policy (CSP)
 * Verifies CSP presence and checks for dangerous directives.
 */
export function evaluateCspRule(context: PageContext): FindingDraft[] {
  const cspHeader = context.headers['content-security-policy'];
  const metaCsp = context.metaTags.find(
    (m) => m.httpEquiv?.toLowerCase() === 'content-security-policy'
  )?.content;

  const csp = cspHeader || metaCsp;

  if (!csp) {
    return [
      {
        ruleId: 'SEC-003',
        category: 'Security',
        severity: 'high',
        title: 'Missing Content Security Policy (CSP)',
        summary: 'No Content-Security-Policy header or meta tag is defined.',
        explanation:
          'Content Security Policy (CSP) is a foundational defense-in-depth standard that restricts the origins from which scripts, styles, and other resources can be loaded, mitigating Cross-Site Scripting (XSS) and data injection vulnerabilities.',
        remediation:
          "Define a restrictive Content Security Policy header on your server: Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none';",
        docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP',
        location: 'HTTP Response Headers',
        evidence: [
          {
            selector: 'Content-Security-Policy',
            value: undefined,
            detail: 'CSP header and meta tag are absent',
          },
        ],
        fingerprint: generateFingerprint('SEC-003', 'csp-missing'),
      },
    ];
  }

  const findings: FindingDraft[] = [];

  // Check for unsafe-inline or unsafe-eval without nonces/hashes
  if (csp.includes("'unsafe-inline'") || csp.includes("'unsafe-eval'")) {
    findings.push({
      ruleId: 'SEC-003-UNSAFE',
      category: 'Security',
      severity: 'medium',
      title: 'Permissive Content Security Policy directives detected',
      summary: "CSP includes 'unsafe-inline' or 'unsafe-eval' directives.",
      explanation:
        "Using 'unsafe-inline' or 'unsafe-eval' significantly weakens CSP protections against Cross-Site Scripting by allowing inline scripts and dynamic code evaluation to execute.",
      remediation:
        'Refactor inline scripts into external files or use cryptographic nonces (nonce-...) / hashes (sha256-...) rather than allowing unsafe-inline.',
      docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src',
      location: 'Content-Security-Policy',
      evidence: [
        {
          selector: 'Content-Security-Policy',
          value: csp.length > 120 ? `${csp.substring(0, 120)}...` : csp,
          detail: 'Contains unsafe directives',
        },
      ],
      fingerprint: generateFingerprint('SEC-003-UNSAFE', 'unsafe-directives'),
    });
  }

  return findings;
}

/**
 * SEC-004: X-Content-Type-Options
 * Ensures MIME-type sniffing is disabled.
 */
export function evaluateContentTypeOptionsRule(context: PageContext): FindingDraft[] {
  const header = context.headers['x-content-type-options'];

  if (!header || header.toLowerCase().trim() !== 'nosniff') {
    return [
      {
        ruleId: 'SEC-004',
        category: 'Security',
        severity: 'medium',
        title: 'Missing X-Content-Type-Options header',
        summary: "The X-Content-Type-Options header is missing or not set to 'nosniff'.",
        explanation:
          "Without 'X-Content-Type-Options: nosniff', browsers may inspect file payloads and attempt to execute them based on inferred content rather than the declared MIME type, leading to drive-by script execution via user-uploaded files.",
        remediation:
          "Configure your web server to return 'X-Content-Type-Options: nosniff' on all responses.",
        docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options',
        location: 'HTTP Response Headers',
        evidence: [
          {
            selector: 'X-Content-Type-Options',
            value: header || undefined,
            detail: header ? `Current value: "${header}" (expected "nosniff")` : 'Header is absent',
          },
        ],
        fingerprint: generateFingerprint('SEC-004', 'nosniff-missing'),
      },
    ];
  }

  return [];
}

/**
 * SEC-005: Clickjacking & Frame Protection
 * Ensures the site is protected from being embedded in unauthorized frames.
 */
export function evaluateClickjackingRule(context: PageContext): FindingDraft[] {
  const xfo = context.headers['x-frame-options']?.toUpperCase().trim();
  const csp = context.headers['content-security-policy']?.toLowerCase();
  const hasFrameAncestors = csp && csp.includes('frame-ancestors');

  const isProtected =
    hasFrameAncestors || (xfo && (xfo === 'DENY' || xfo === 'SAMEORIGIN'));

  if (!isProtected) {
    return [
      {
        ruleId: 'SEC-005',
        category: 'Security',
        severity: 'medium',
        title: 'Missing Clickjacking protection',
        summary: 'Neither X-Frame-Options nor CSP frame-ancestors is configured.',
        explanation:
          'Without frame protection, malicious websites can embed your application inside transparent or disguised iframes, deceiving users into clicking authenticated actions (Clickjacking / UI Redress attack).',
        remediation:
          "Set the 'X-Frame-Options: DENY' (or 'SAMEORIGIN') header, or specify the 'frame-ancestors' directive in your Content-Security-Policy (e.g. frame-ancestors 'none';).",
        docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options',
        location: 'HTTP Response Headers',
        evidence: [
          {
            selector: 'X-Frame-Options',
            value: xfo || undefined,
            detail: 'Neither X-Frame-Options nor CSP frame-ancestors is active',
          },
        ],
        fingerprint: generateFingerprint('SEC-005', 'clickjacking-unprotected'),
      },
    ];
  }

  return [];
}

/**
 * SEC-006: Referrer-Policy
 * Verifies referrer policy is set to prevent leakage of URL query strings.
 */
export function evaluateReferrerPolicyRule(context: PageContext): FindingDraft[] {
  const header = context.headers['referrer-policy']?.toLowerCase().trim();
  const metaReferrer = context.metaTags
    .find((m) => m.name?.toLowerCase() === 'referrer')
    ?.content?.toLowerCase().trim();

  const policy = header || metaReferrer;

  if (!policy) {
    return [
      {
        ruleId: 'SEC-006',
        category: 'Security',
        severity: 'low',
        title: 'Missing Referrer-Policy header',
        summary: 'No explicit Referrer-Policy is defined in HTTP headers or meta tags.',
        explanation:
          'Without an explicit Referrer-Policy, user agents may leak complete URL paths and query parameters (which may contain internal IDs or tokens) to external domains when users follow outbound links.',
        remediation:
          "Configure 'Referrer-Policy: strict-origin-when-cross-origin' or 'no-referrer' on your web server.",
        docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy',
        location: 'HTTP Response Headers',
        evidence: [
          {
            selector: 'Referrer-Policy',
            value: undefined,
            detail: 'No Referrer-Policy header or meta tag found',
          },
        ],
        fingerprint: generateFingerprint('SEC-006', 'referrer-policy-missing'),
      },
    ];
  }

  if (policy === 'unsafe-url') {
    return [
      {
        ruleId: 'SEC-006-UNSAFE',
        category: 'Security',
        severity: 'medium',
        title: 'Insecure Referrer-Policy: unsafe-url',
        summary: "The Referrer-Policy is set to 'unsafe-url', exposing complete URLs to third parties.",
        explanation:
          "'unsafe-url' leaks full URLs including query strings on all requests, even over unencrypted connections.",
        remediation: "Change Referrer-Policy to 'strict-origin-when-cross-origin'.",
        docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy',
        location: 'Referrer-Policy',
        evidence: [
          {
            selector: 'Referrer-Policy',
            value: policy,
            detail: "Policy is set to 'unsafe-url'",
          },
        ],
        fingerprint: generateFingerprint('SEC-006-UNSAFE', 'unsafe-url'),
      },
    ];
  }

  return [];
}

/**
 * SEC-007: Permissions-Policy
 * Verifies restrictions on sensitive browser hardware APIs.
 */
export function evaluatePermissionsPolicyRule(context: PageContext): FindingDraft[] {
  const policy = context.headers['permissions-policy'] || context.headers['feature-policy'];

  if (!policy) {
    return [
      {
        ruleId: 'SEC-007',
        category: 'Security',
        severity: 'low',
        title: 'Missing Permissions-Policy header',
        summary: 'The Permissions-Policy header is not defined.',
        explanation:
          'Permissions-Policy allows developers to explicitly restrict access to sensitive device hardware and browser capabilities (such as microphone, camera, geolocation, and payment requests) for the page and embedded iframes.',
        remediation:
          "Add 'Permissions-Policy: camera=(), microphone=(), geolocation=()' to disable unnecessary browser APIs.",
        docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy',
        location: 'HTTP Response Headers',
        evidence: [
          {
            selector: 'Permissions-Policy',
            value: undefined,
            detail: 'Header is absent',
          },
        ],
        fingerprint: generateFingerprint('SEC-007', 'permissions-policy-missing'),
      },
    ];
  }

  return [];
}

/**
 * SEC-008: Server Version Disclosure
 * Checks for detailed software/version banners in response headers.
 */
export function evaluateServerDisclosureRule(context: PageContext): FindingDraft[] {
  const poweredBy = context.headers['x-powered-by'];
  const server = context.headers['server'];

  const findings: FindingDraft[] = [];

  if (poweredBy) {
    findings.push({
      ruleId: 'SEC-008-POWERED-BY',
      category: 'Security',
      severity: 'low',
      title: 'Server reveals X-Powered-By technology header',
      summary: `The server exposes '${poweredBy}' via the X-Powered-By response header.`,
      explanation:
        'Advertising server-side frameworks (such as Express, ASP.NET, or PHP) simplifies automated reconnaissance for attackers seeking framework-specific vulnerabilities.',
      remediation:
        "Remove the X-Powered-By header (e.g. in Express: app.disable('x-powered-by')).",
      docsUrl:
        'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/01-Information_Gathering/02-Fingerprint_Web_Server',
      location: 'HTTP Response Headers',
      evidence: [
        {
          selector: 'X-Powered-By',
          value: poweredBy,
          detail: `Exposes: ${poweredBy}`,
        },
      ],
      fingerprint: generateFingerprint('SEC-008-POWERED-BY', poweredBy),
    });
  }

  // Check if server header reveals granular version numbers (e.g., Apache/2.4.41 or nginx/1.18.0)
  if (server && /\d+\.\d+/.test(server)) {
    findings.push({
      ruleId: 'SEC-008-SERVER-VERSION',
      category: 'Security',
      severity: 'low',
      title: 'Web server discloses exact version number',
      summary: `The Server header reveals exact version information: "${server}".`,
      explanation:
        'Exposing granular web server version numbers allows automated vulnerability scanners to pinpoint version-specific CVEs and exploits.',
      remediation:
        "Configure your web server to suppress version numbers (e.g. 'ServerTokens Prod' in Apache or 'server_tokens off;' in Nginx).",
      docsUrl:
        'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/01-Information_Gathering/02-Fingerprint_Web_Server',
      location: 'HTTP Response Headers',
      evidence: [
        {
          selector: 'Server',
          value: server,
          detail: `Exposes: ${server}`,
        },
      ],
      fingerprint: generateFingerprint('SEC-008-SERVER-VERSION', server),
    });
  }

  return findings;
}
