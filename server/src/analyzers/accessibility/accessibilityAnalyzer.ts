import type { PageContext } from '../../browser/types.js';
import type { Analyzer, AnalyzerResult, FindingDraft } from '../types.js';
import {
  evaluateImageAltRule,
  evaluateFormLabelRule,
  evaluateButtonNameRule,
  evaluateLangRule,
  evaluateLandmarksRule,
} from './rules.js';

export class AccessibilityAnalyzer implements Analyzer {
  public readonly key = 'accessibility';
  public readonly version = '1.0.0';

  public analyze(context: PageContext): AnalyzerResult {
    const findings: FindingDraft[] = [
      ...evaluateImageAltRule(context),
      ...evaluateFormLabelRule(context),
      ...evaluateButtonNameRule(context),
      ...evaluateLangRule(context),
      ...evaluateLandmarksRule(context),
    ];

    // Compute reproducible score based on WCAG finding severities (Spec Section 7)
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
      category: 'Accessibility',
      score: finalScore,
      findings,
    };
  }
}

export const accessibilityAnalyzer = new AccessibilityAnalyzer();
