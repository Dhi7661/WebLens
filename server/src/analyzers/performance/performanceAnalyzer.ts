import type { PageContext } from '../../browser/types.js';
import type { Analyzer, AnalyzerResult, FindingDraft } from '../types.js';
import {
  evaluateRenderBlockingScriptsRule,
  evaluateTotalPageWeightRule,
  evaluateImageDimensionsRule,
  evaluateLazyLoadingRule,
  evaluateTtfbRule,
  evaluateScriptWeightRule,
  evaluateRequestCountRule,
} from './rules.js';

/**
 * PerformanceAnalyzer assesses resource loading performance, render-blocking assets,
 * Core Web Vitals proxies (CLS / TTFB), and network transfer budgets (Spec Section 7).
 */
export class PerformanceAnalyzer implements Analyzer {
  public readonly key = 'performance';
  public readonly version = '1.0.0';

  public analyze(context: PageContext): AnalyzerResult {
    const findings: FindingDraft[] = [
      ...evaluateRenderBlockingScriptsRule(context),
      ...evaluateTotalPageWeightRule(context),
      ...evaluateImageDimensionsRule(context),
      ...evaluateLazyLoadingRule(context),
      ...evaluateTtfbRule(context),
      ...evaluateScriptWeightRule(context),
      ...evaluateRequestCountRule(context),
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
      category: 'Performance',
      score: finalScore,
      findings,
    };
  }
}

export const performanceAnalyzer = new PerformanceAnalyzer();
