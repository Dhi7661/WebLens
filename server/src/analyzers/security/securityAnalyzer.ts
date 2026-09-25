import type { PageContext } from '../../browser/types.js';
import type { Analyzer, AnalyzerResult, FindingDraft } from '../types.js';
import {
  evaluateHttpsRule,
  evaluateHstsRule,
  evaluateCspRule,
  evaluateContentTypeOptionsRule,
  evaluateClickjackingRule,
  evaluateReferrerPolicyRule,
  evaluatePermissionsPolicyRule,
  evaluateServerDisclosureRule,
} from './rules.js';

/**
 * SecurityAnalyzer evaluates passive security posture and HTTP header configuration.
 * Adheres strictly to non-intrusive security auditing (Specification Section 7).
 */
export class SecurityAnalyzer implements Analyzer {
  public readonly key = 'security';
  public readonly version = '1.0.0';

  public analyze(context: PageContext): AnalyzerResult {
    const findings: FindingDraft[] = [
      ...evaluateHttpsRule(context),
      ...evaluateHstsRule(context),
      ...evaluateCspRule(context),
      ...evaluateContentTypeOptionsRule(context),
      ...evaluateClickjackingRule(context),
      ...evaluateReferrerPolicyRule(context),
      ...evaluatePermissionsPolicyRule(context),
      ...evaluateServerDisclosureRule(context),
    ];

    // Compute reproducible score based on finding severities (Spec Section 7)
    let score = 100;
    for (const f of findings) {
      switch (f.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
        case 'info':
          break;
      }
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      category: 'Security',
      score: finalScore,
      findings,
    };
  }
}

export const securityAnalyzer = new SecurityAnalyzer();
