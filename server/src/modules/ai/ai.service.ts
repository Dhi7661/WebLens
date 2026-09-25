import type { IScan } from '../scans/scan.model.js';
import type { IFinding } from '../findings/finding.model.js';

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export interface AiResponse {
  reply: string;
  citations: string[];
}

/**
 * WebLens Grounded AI Service.
 * Implements strict evidence grounding against scan findings (Specification Section 9 & 15).
 */
export class AiService {
  /**
   * Generates a grounded response for a scan, using Gemini/OpenAI if configured
   * or a deterministic domain-specific synthesizer as a resilient fallback.
   */
  public async generateResponse(
    scan: IScan,
    findings: IFinding[],
    userMessage: string,
    _history: ChatMessage[] = []
  ): Promise<AiResponse> {
    const apiKey = process.env.AI_API_KEY?.trim();

    if (apiKey) {
      try {
        const cloudReply = await this.callCloudAi(scan, findings, userMessage);
        if (cloudReply) {
          return cloudReply;
        }
      } catch (err) {
        console.warn('[AiService] Cloud AI request failed, falling back to local synthesizer:', err);
      }
    }

    // High-quality local grounded synthesis
    return this.synthesizeLocalResponse(scan, findings, userMessage);
  }

  /**
   * Calls Google Gemini API with strict system grounding.
   */
  private async callCloudAi(
    scan: IScan,
    findings: IFinding[],
    userMessage: string
  ): Promise<AiResponse | null> {
    const apiKey = process.env.AI_API_KEY!;
    const findingsContext = findings.map((f, idx) => ({
      index: idx + 1,
      ruleId: f.ruleId,
      category: f.category,
      severity: f.severity,
      title: f.title,
      summary: f.summary,
      explanation: f.explanation,
      remediation: f.remediation,
      evidence: f.evidence,
    }));

    const systemPrompt = `You are WebLens Copilot, an expert web quality assistant.
You are STRICTLY GROUNDED in this audit report for website: ${scan.finalUrl || scan.requestedUrl}.
Overall Composite Score: ${scan.overallScore}/100.
Category Scores:
- SEO: ${scan.categoryScores.seo}/100
- Accessibility: ${scan.categoryScores.accessibility}/100
- Security: ${scan.categoryScores.security}/100
- Performance: ${scan.categoryScores.performance}/100
- Technology: ${scan.categoryScores.technology}/100

Verifiable Findings in this audit:
${JSON.stringify(findingsContext, null, 2)}

STRICT RULES:
1. ONLY answer questions using evidence from the findings above. Never hallucinate issues not listed.
2. If the user asks for fixes, provide concise, production-ready code snippets (HTML, CSS, React, Express, or Nginx).
3. If the user asks what to fix first, prioritize Critical and High severity findings.
4. If the user asks about an unrelated topic, politely explain you can only advise on this specific website audit.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt },
              { text: `User Question: ${userMessage}` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2, // Low temperature for factual precision
          maxOutputTokens: 800,
        },
      }),
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) return null;

    // Extract mentioned rule citations
    const citations = findings
      .filter((f) => replyText.includes(f.ruleId))
      .map((f) => f.ruleId);

    return {
      reply: replyText.trim(),
      citations,
    };
  }

  /**
   * Deterministic, zero-hallucination local synthesizer tailored to WebLens audit findings.
   */
  private synthesizeLocalResponse(
    scan: IScan,
    findings: IFinding[],
    userMessage: string
  ): AiResponse {
    const q = userMessage.toLowerCase().trim();
    const targetUrl = scan.finalUrl || scan.requestedUrl;

    // 1. "What should I fix first?" / Priority Roadmap
    if (
      q.includes('what should i fix first') ||
      q.includes('prioritize') ||
      q.includes('priority') ||
      q.includes('top fix')
    ) {
      const criticals = findings.filter((f) => f.severity === 'critical');
      const highs = findings.filter((f) => f.severity === 'high');
      const mediums = findings.filter((f) => f.severity === 'medium');

      const topIssues = [...criticals, ...highs, ...mediums].slice(0, 3);

      if (topIssues.length === 0) {
        return {
          reply: `Great news! No critical or high-severity issues were found on ${targetUrl}. Your overall composite score is ${scan.overallScore}/100. Check low-severity findings to polish performance and accessibility.`,
          citations: [],
        };
      }

      const listStr = topIssues
        .map(
          (f, idx) =>
            `${idx + 1}. **[${f.category}] ${f.title}** (${f.severity.toUpperCase()} severity)\n` +
            `   - *Why it matters:* ${f.summary}\n` +
            `   - *Remediation:* ${f.remediation}`
        )
        .join('\n\n');

      return {
        reply:
          `Here is your recommended remediation roadmap for **${targetUrl}**:\n\n` +
          `${listStr}\n\n` +
          `Resolving these ${topIssues.length} issues first will yield the largest recovery in your composite quality score.`,
        citations: topIssues.map((f) => f.ruleId),
      };
    }

    // 2. Score Breakdown & Weights
    if (q.includes('score') || q.includes('grade') || q.includes('formula') || q.includes('weight')) {
      return {
        reply:
          `Your composite quality score for **${targetUrl}** is **${scan.overallScore}/100**.\n\n` +
          `In accordance with the WebLens platform specification, scores are computed using weighted independent quality pillars:\n` +
          `- **Accessibility:** ${scan.categoryScores.accessibility}/100 (Weight: 25%)\n` +
          `- **Performance:** ${scan.categoryScores.performance}/100 (Weight: 25%)\n` +
          `- **SEO:** ${scan.categoryScores.seo}/100 (Weight: 20%)\n` +
          `- **Security:** ${scan.categoryScores.security}/100 (Weight: 15%)\n` +
          `- **Technology Stack:** ${scan.categoryScores.technology}/100 (Weight: 15%)\n\n` +
          `Each category starts at 100 with reproducible point deductions applied per finding severity (Critical: -25, High: -15, Medium: -10, Low: -5).`,
        citations: [],
      };
    }

    // 3. Rule-specific queries (Alt text, HSTS, CSP, Titles, Headings, Render-blocking, Clickjacking)
    const matchedFinding = findings.find((f) => {
      const rule = f.ruleId.toLowerCase();
      const title = f.title.toLowerCase();
      return (
        (q.includes('alt') && (rule.includes('alt') || title.includes('alt'))) ||
        (q.includes('hsts') && (rule.includes('hsts') || title.includes('hsts'))) ||
        (q.includes('csp') && (rule.includes('csp') || title.includes('csp'))) ||
        (q.includes('https') && (rule.includes('https') || title.includes('https'))) ||
        (q.includes('title') && (rule.includes('title') || title.includes('title'))) ||
        (q.includes('heading') && (rule.includes('heading') || title.includes('h1'))) ||
        (q.includes('script') && (rule.includes('script') || title.includes('script'))) ||
        (q.includes('label') && (rule.includes('label') || title.includes('label'))) ||
        (q.includes('button') && (rule.includes('button') || title.includes('button'))) ||
        (q.includes('clickjack') && (rule.includes('clickjack') || title.includes('clickjack'))) ||
        (q.includes('dimension') && (rule.includes('dimension') || title.includes('width')))
      );
    });

    if (matchedFinding) {
      const evidenceStr = matchedFinding.evidence
        ?.map((e) => (e.selector ? `\`${e.selector}\`: ${e.value || e.detail}` : e.value || e.detail))
        .filter(Boolean)
        .join(', ');

      return {
        reply:
          `### Analysis for ${matchedFinding.ruleId}: ${matchedFinding.title}\n\n` +
          `**Category:** ${matchedFinding.category} | **Severity:** ${matchedFinding.severity.toUpperCase()}\n\n` +
          `**Observed Evidence:** ${evidenceStr || 'Verified in rendered DOM'}\n\n` +
          `**Explanation:** ${matchedFinding.explanation}\n\n` +
          `**Remediation Steps:**\n${matchedFinding.remediation}` +
          (matchedFinding.docsUrl ? `\n\n[Official Documentation](${matchedFinding.docsUrl})` : ''),
        citations: [matchedFinding.ruleId],
      };
    }

    // 4. Default Grounded Executive Summary
    const totalCount = findings.length;
    return {
      reply:
        `Based on the audit data for **${targetUrl}**:\n` +
        `- Total findings identified: **${totalCount}**\n` +
        `- Overall quality score: **${scan.overallScore}/100**\n` +
        `- Lowest scoring pillar: **${this.getLowestPillar(scan)}**\n\n` +
        `You can ask me questions like:\n` +
        `• *"What should I fix first?"*\n` +
        `• *"How do I fix the missing security headers?"*\n` +
        `• *"Explain the accessibility finding on form labels"*\n` +
        `• *"How can I improve my Performance score?"*`,
      citations: [],
    };
  }

  private getLowestPillar(scan: IScan): string {
    const scores = scan.categoryScores;
    const entries = [
      { name: 'SEO', score: scores.seo },
      { name: 'Accessibility', score: scores.accessibility },
      { name: 'Security', score: scores.security },
      { name: 'Performance', score: scores.performance },
      { name: 'Technology', score: scores.technology },
    ];
    entries.sort((a, b) => a.score - b.score);
    return `${entries[0].name} (${entries[0].score}/100)`;
  }
}

export const aiService = new AiService();
