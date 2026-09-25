import type { PageContext } from '../../browser/types.js';
import type { Analyzer, AnalyzerResult, FindingDraft } from '../types.js';
import { generateFingerprint } from '../../utils/fingerprint.js';
import { TECH_DETECTORS, type TechDetection } from './definitions.js';

/**
 * TechnologyAnalyzer detects frameworks, CMS platforms, UI libraries, analytics tools,
 * CDNs, and server technologies based on HTTP headers, HTML DOM signatures, and asset URLs.
 */
export class TechnologyAnalyzer implements Analyzer {
  public readonly key = 'technology';
  public readonly version = '1.0.0';

  public analyze(context: PageContext): AnalyzerResult {
    const detectedMap = new Map<string, TechDetection>();

    // 1. Run all signature detectors
    for (const detector of TECH_DETECTORS) {
      try {
        const result = detector(context);
        if (result && !detectedMap.has(result.name)) {
          detectedMap.set(result.name, result);
        }
      } catch (err) {
        console.warn('[TechnologyAnalyzer] Error in detector:', err);
      }
    }

    const detections = Array.from(detectedMap.values());

    // 2. Transform into FindingDrafts
    const findings: FindingDraft[] = detections.map((tech) => {
      const severity = tech.isOutdated ? 'medium' : 'info';
      const versionStr = tech.version ? ` v${tech.version}` : '';

      return {
        ruleId: `TECH-${tech.name.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`,
        category: 'Technology',
        severity,
        title: `${tech.name}${versionStr} (${tech.category})`,
        summary: `${tech.name} was detected on this website with ${tech.confidence}% confidence via ${tech.evidenceSource}.`,
        explanation: `${tech.description}${tech.isOutdated ? ' Notice: This version appears to be outdated and may contain unpatched security vulnerabilities or missing features.' : ''}`,
        remediation: tech.isOutdated
          ? `Upgrade ${tech.name} to the latest stable release to benefit from performance improvements and security patches.`
          : `Ensure ${tech.name} is maintained and updated along with its core dependencies.`,
        docsUrl: tech.docsUrl,
        location: tech.evidenceSource,
        evidence: [
          {
            selector: tech.evidenceSource,
            value: tech.matchValue,
            detail: `Confidence: ${tech.confidence}%`,
          },
        ],
        fingerprint: generateFingerprint('TECH', tech.name),
      };
    });

    // 3. Compute Technology Stack Score (100 base score; deductions for outdated/vulnerable components)
    let score = 100;
    for (const tech of detections) {
      if (tech.isOutdated) {
        score -= 15;
      }
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      category: 'Technology',
      score: finalScore,
      findings,
    };
  }
}

export const technologyAnalyzer = new TechnologyAnalyzer();
