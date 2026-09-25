import type { PageContext } from '../../browser/types.js';
import type { Analyzer, AnalyzerResult, FindingDraft } from '../types.js';
import {
  evaluateTitleRule,
  evaluateMetaDescriptionRule,
  evaluateHeadingsRule,
  evaluateCanonicalRule,
  evaluateImageAltSeoRule,
  evaluateOpenGraphRule,
} from './rules.js';

export class SeoAnalyzer implements Analyzer {
  public readonly key = 'seo';
  public readonly version = '1.0.0';

  public analyze(context: PageContext): AnalyzerResult {
    const findings: FindingDraft[] = [
      ...evaluateTitleRule(context),
      ...evaluateMetaDescriptionRule(context),
      ...evaluateHeadingsRule(context),
      ...evaluateCanonicalRule(context),
      ...evaluateImageAltSeoRule(context),
      ...evaluateOpenGraphRule(context),
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
          // Observations do not reduce score
          break;
      }
    }

    // Clamp score strictly between 0 and 100
    const finalScore = Math.max(0, Math.min(100, score));

    return {
      category: 'SEO',
      score: finalScore,
      findings,
    };
  }
}

export const seoAnalyzer = new SeoAnalyzer();
