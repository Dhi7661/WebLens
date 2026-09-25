import dns from 'node:dns/promises';
import { URL } from 'node:url';

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  hostname?: string;
  error?: string;
}

/**
 * Checks if an IPv4 address falls inside private, loopback, or link-local ranges.
 */
function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  // 127.0.0.0/8 (Loopback)
  if (parts[0] === 127) return true;

  // 10.0.0.0/8 (Private network)
  if (parts[0] === 10) return true;

  // 172.16.0.0/12 (Private network: 172.16.0.0 - 172.31.255.255)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

  // 192.168.0.0/16 (Private network)
  if (parts[0] === 192 && parts[1] === 168) return true;

  // 169.254.0.0/16 (Link-local & Cloud metadata e.g. 169.254.169.254)
  if (parts[0] === 169 && parts[1] === 254) return true;

  // 0.0.0.0/8 (Current network)
  if (parts[0] === 0) return true;

  return false;
}

/**
 * Validates and normalizes target URLs, strictly preventing SSRF attacks.
 */
export async function validateAndNormalizeUrl(rawUrl: string): Promise<UrlValidationResult> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'A valid URL string is required.' };
  }

  let parsed: URL;
  try {
    // Automatically prepend https:// if protocol is missing
    const withProtocol = /^https?:\/\//i.test(rawUrl.trim())
      ? rawUrl.trim()
      : `https://${rawUrl.trim()}`;

    parsed = new URL(withProtocol);
  } catch {
    return { valid: false, error: 'Malformed URL format.' };
  }

  // 1. Only allow http and https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTP and HTTPS protocols are permitted.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  const allowLocal = process.env.ALLOW_LOCAL_SCANS === 'true' && process.env.NODE_ENV !== 'production';

  // 2. Reject internal and loopback hostnames unless explicitly enabled in development
  const forbiddenHostnames = ['localhost', 'local', 'internal', '0.0.0.0'];
  if (!allowLocal && (forbiddenHostnames.includes(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal'))) {
    return {
      valid: false,
      error: 'Scanning localhost, loopback, and internal addresses is forbidden (SSRF Guard).',
    };
  }

  // Fast-track localhost in development mode if explicitly enabled
  if (allowLocal && (hostname === 'localhost' || hostname === '127.0.0.1')) {
    parsed.hash = '';
    return {
      valid: true,
      normalizedUrl: parsed.toString(),
      hostname,
    };
  }

  // 3. Resolve DNS to ensure the underlying IP is not a private/reserved address
  try {
    const addresses = await dns.lookup(hostname, { all: true });

    if (!addresses || addresses.length === 0) {
      return { valid: false, error: 'Target domain could not be resolved in public DNS.' };
    }

    for (const record of addresses) {
      // IPv4 checks
      if (record.family === 4 && isPrivateIpv4(record.address)) {
        return {
          valid: false,
          error: `Target domain resolves to a protected/private IP address (${record.address}). Scan blocked.`,
        };
      }

      // IPv6 checks (block ::1, fe80::/10 link local, fc00::/7 unique local)
      if (record.family === 6) {
        const addr = record.address.toLowerCase();
        if (
          addr === '::1' ||
          addr === '::' ||
          addr.startsWith('fe80:') ||
          addr.startsWith('fc00:') ||
          addr.startsWith('fd')
        ) {
          return {
            valid: false,
            error: 'Target domain resolves to a private IPv6 address. Scan blocked.',
          };
        }
      }
    }
  } catch (dnsErr) {
    return {
      valid: false,
      error: 'Target domain could not be reached or resolved via DNS.',
    };
  }

  // Normalize: remove query tracking if unwanted, strip fragments, lowercase hostname
  parsed.hash = ''; // Remove #hash
  const normalizedUrl = parsed.toString();

  return {
    valid: true,
    normalizedUrl,
    hostname,
  };
}
