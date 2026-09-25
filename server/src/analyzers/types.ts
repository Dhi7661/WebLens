import type { PageContext } from '../browser/types.js';
import type { FindingCategory, FindingSeverity, IFindingEvidence } from '../modules/findings/finding.model.js';

export interface FindingDraft {
  ruleId: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  summary: string;
  explanation: string;
  remediation: string;
  evidence: IFindingEvidence[];
  location?: string;
  docsUrl?: string;
  fingerprint: string;
}

export interface AnalyzerResult {
  category: FindingCategory;
  score: number;
  findings: FindingDraft[];
}

export interface Analyzer {
  key: string;
  version: string;
  analyze(context: PageContext): AnalyzerResult;
}
