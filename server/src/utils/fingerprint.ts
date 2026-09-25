import crypto from 'node:crypto';

/**
 * Creates a deterministic, collision-resistant fingerprint string
 * based on rule identifier and specific DOM or attribute evidence.
 * This allows the scan history system to identify recurring issues over time.
 */
export function generateFingerprint(ruleId: string, discriminator: string): string {
  const normalized = `${ruleId.trim()}:${discriminator.trim().toLowerCase()}`;
  return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 24);
}
