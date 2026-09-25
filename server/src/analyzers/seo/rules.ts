import type { PageContext } from '../../browser/types.js';
import type { FindingDraft } from '../types.js';
import { generateFingerprint } from '../../utils/fingerprint.js';

// Rule 1: Title tag checks (Spec Item 56)
export function evaluateTitleRule(ctx: PageContext): FindingDraft[] {
  const findings: FindingDraft[] = [];
  const title = (ctx.title || '').trim();

  if (!title) {
    findings.push({
      ruleId: 'SEO-TITLE-MISSING',
      category: 'SEO',
      severity: 'critical',
      title: 'Missing Document Title Element',
      summary: 'The page lacks a <title> element in the HTML head.',
      explanation: 'Search engines and browser tabs rely on the <title> tag as the primary descriptive headline for page indexing.',
      remediation: 'Add a concise, descriptive <title> tag inside the <head> section (e.g., <title>Product Name | Brand</title>).',
      evidence: [{ selector: 'head', value: 'missing <title>' }],
      fingerprint: generateFingerprint('SEO-TITLE-MISSING', ctx.url),
    });
  } else if (title.length < 10) {
    findings.push({
      ruleId: 'SEO-TITLE-SHORT',
      category: 'SEO',
      severity: 'medium',
      title: 'Document Title Is Too Brief',
      summary: `Title is only ${title.length} characters long (recommended: 30-60 characters).`,
      explanation: 'Short titles often fail to provide sufficient context for search intent and competitive ranking.',
      remediation: 'Expand the title to 30-60 characters incorporating primary keywords and company branding.',
      evidence: [{ selector: 'title', value: title }],
      fingerprint: generateFingerprint('SEO-TITLE-SHORT', title),
    });
  } else if (title.length > 65) {
    findings.push({
      ruleId: 'SEO-TITLE-LONG',
      category: 'SEO',
      severity: 'low',
      title: 'Document Title Exceeds Recommended Length',
      summary: `Title contains ${title.length} characters, which may truncate in SERPs.`,
      explanation: 'Search engine results pages typically truncate titles longer than 60-65 characters with an ellipsis.',
      remediation: 'Shorten title to under 60 characters so it displays cleanly in search results.',
      evidence: [{ selector: 'title', value: title }],
      fingerprint: generateFingerprint('SEO-TITLE-LONG', title),
    });
  }

  return findings;
}

// Rule 2: Meta description checks (Spec Item 57)
export function evaluateMetaDescriptionRule(ctx: PageContext): FindingDraft[] {
  const findings: FindingDraft[] = [];
  const descTag = ctx.metaTags.find(
    (m) => m.name?.toLowerCase() === 'description' || m.property?.toLowerCase() === 'description'
  );
  const desc = (descTag?.content || '').trim();

  if (!desc) {
    findings.push({
      ruleId: 'SEO-DESC-MISSING',
      category: 'SEO',
      severity: 'high',
      title: 'Missing Meta Description Tag',
      summary: 'No <meta name="description"> tag was found in the page head.',
      explanation: 'Meta descriptions serve as preview snippets in search engine results and influence organic click-through rates (CTR).',
      remediation: 'Add a <meta name="description" content="..."> summarizing the page content in 120-160 characters.',
      evidence: [{ selector: 'head', value: 'missing meta description' }],
      fingerprint: generateFingerprint('SEO-DESC-MISSING', ctx.url),
    });
  } else if (desc.length < 50) {
    findings.push({
      ruleId: 'SEO-DESC-SHORT',
      category: 'SEO',
      severity: 'medium',
      title: 'Meta Description Is Too Short',
      summary: `Meta description contains only ${desc.length} characters (recommended: 120-160).`,
      explanation: 'Underfilled descriptions miss valuable opportunities to capture organic search traffic and user intent.',
      remediation: 'Expand the meta description to between 120 and 160 characters.',
      evidence: [{ selector: 'meta[name="description"]', value: desc }],
      fingerprint: generateFingerprint('SEO-DESC-SHORT', desc),
    });
  } else if (desc.length > 160) {
    findings.push({
      ruleId: 'SEO-DESC-LONG',
      category: 'SEO',
      severity: 'low',
      title: 'Meta Description May Be Truncated',
      summary: `Meta description is ${desc.length} characters, exceeding the 160-character threshold.`,
      explanation: 'Search engines typically truncate snippets past 155-160 characters.',
      remediation: 'Trim non-essential words to keep the description within 120-160 characters.',
      evidence: [{ selector: 'meta[name="description"]', value: desc }],
      fingerprint: generateFingerprint('SEO-DESC-LONG', desc),
    });
  }

  return findings;
}

// Rule 3: Heading structure and hierarchy (Spec Item 58)
export function evaluateHeadingsRule(ctx: PageContext): FindingDraft[] {
  const findings: FindingDraft[] = [];
  const h1s = ctx.headings.filter((h) => h.level === 1);

  if (h1s.length === 0) {
    findings.push({
      ruleId: 'SEO-H1-MISSING',
      category: 'SEO',
      severity: 'high',
      title: 'Primary <h1> Heading Missing',
      summary: 'No top-level <h1> heading element was found on the page.',
      explanation: 'A single <h1> communicates the core subject matter of the page to search engines and screen readers.',
      remediation: 'Include exactly one descriptive <h1> heading summarizing the main page topic.',
      evidence: [{ selector: 'body', detail: '0 <h1> elements located' }],
      fingerprint: generateFingerprint('SEO-H1-MISSING', ctx.url),
    });
  } else if (h1s.length > 1) {
    findings.push({
      ruleId: 'SEO-H1-MULTIPLE',
      category: 'SEO',
      severity: 'medium',
      title: 'Multiple <h1> Headings Detected',
      summary: `Page contains ${h1s.length} separate <h1> tags.`,
      explanation: 'Using multiple <h1> tags can dilute semantic hierarchy and confuse search crawlers regarding page hierarchy.',
      remediation: 'Reserve <h1> for the primary title and convert secondary headers to <h2> or <h3> tags.',
      evidence: h1s.map((h) => ({ selector: h.selector, value: h.text })),
      fingerprint: generateFingerprint('SEO-H1-MULTIPLE', ctx.url),
    });
  }

  // Check hierarchy skips (e.g. H1 followed immediately by H3 or H4)
  let lastLevel = 0;
  for (const h of ctx.headings) {
    if (lastLevel > 0 && h.level > lastLevel + 1) {
      findings.push({
        ruleId: 'SEO-HEADING-SKIP',
        category: 'SEO',
        severity: 'medium',
        title: 'Non-Sequential Heading Hierarchy',
        summary: `Heading hierarchy skipped from <h${lastLevel}> directly to <h${h.level}>.`,
        explanation: 'Skipping heading levels (e.g. <h1> straight to <h3>) creates disjointed semantic structure for crawlers and assistive devices.',
        remediation: `Restructure headings sequentially so that an <h${lastLevel}> is followed by an <h${lastLevel + 1}>.`,
        evidence: [{ selector: h.selector, value: `<h${h.level}> ${h.text}` }],
        fingerprint: generateFingerprint('SEO-HEADING-SKIP', `${lastLevel}->${h.level}:${h.selector}`),
      });
      break; // Report first skipped hierarchy issue
    }
    lastLevel = h.level;
  }

  return findings;
}

// Rule 4: Canonical link checks (Spec Item 59)
export function evaluateCanonicalRule(ctx: PageContext): FindingDraft[] {
  const findings: FindingDraft[] = [];
  const canonical = ctx.links.find((l) => l.rel?.toLowerCase() === 'canonical');

  if (!canonical || !canonical.href) {
    findings.push({
      ruleId: 'SEO-CANONICAL-MISSING',
      category: 'SEO',
      severity: 'medium',
      title: 'Missing Canonical Link Tag',
      summary: 'No <link rel="canonical"> tag was detected.',
      explanation: 'Canonical tags prevent duplicate content penalties by instructing crawlers which URL is the authoritative source.',
      remediation: `Add a canonical reference in the <head>: <link rel="canonical" href="${ctx.url}" />.`,
      evidence: [{ selector: 'head', value: 'missing rel="canonical"' }],
      fingerprint: generateFingerprint('SEO-CANONICAL-MISSING', ctx.url),
    });
  }

  return findings;
}

// Rule 5: Image Alt checks in SEO context (Spec Item 60)
export function evaluateImageAltSeoRule(ctx: PageContext): FindingDraft[] {
  const findings: FindingDraft[] = [];
  const missingAlt = ctx.images.filter((img) => !img.hasAlt);

  if (missingAlt.length > 0) {
    findings.push({
      ruleId: 'SEO-IMG-ALT-MISSING',
      category: 'SEO',
      severity: 'medium',
      title: 'Images Missing Alt Attributes',
      summary: `${missingAlt.length} image(s) do not have an alt attribute.`,
      explanation: 'Search crawlers cannot index visual content effectively without descriptive alt text.',
      remediation: 'Provide descriptive alt text for meaningful images, or alt="" if purely decorative.',
      evidence: missingAlt.slice(0, 5).map((img) => ({
        selector: img.selector,
        value: img.src.substring(0, 80),
      })),
      fingerprint: generateFingerprint('SEO-IMG-ALT-MISSING', ctx.url),
    });
  }

  return findings;
}

// Rule 6: Open Graph metadata (Spec Item 61)
export function evaluateOpenGraphRule(ctx: PageContext): FindingDraft[] {
  const findings: FindingDraft[] = [];
  const ogTitle = ctx.metaTags.find((m) => m.property?.toLowerCase() === 'og:title');
  const ogDesc = ctx.metaTags.find((m) => m.property?.toLowerCase() === 'og:description');
  const ogImage = ctx.metaTags.find((m) => m.property?.toLowerCase() === 'og:image');

  const missingOg: string[] = [];
  if (!ogTitle) missingOg.push('og:title');
  if (!ogDesc) missingOg.push('og:description');
  if (!ogImage) missingOg.push('og:image');

  if (missingOg.length > 0) {
    findings.push({
      ruleId: 'SEO-OG-MISSING',
      category: 'SEO',
      severity: 'low',
      title: 'Incomplete Open Graph Metadata',
      summary: `Missing social sharing meta tags: ${missingOg.join(', ')}.`,
      explanation: 'Open Graph meta tags control how links display with rich previews when shared on Twitter/X, LinkedIn, Slack, and Discord.',
      remediation: 'Add <meta property="og:title">, <meta property="og:description">, and <meta property="og:image"> inside the <head>.',
      evidence: [{ selector: 'head', value: `Missing: ${missingOg.join(', ')}` }],
      fingerprint: generateFingerprint('SEO-OG-MISSING', missingOg.join(',')),
    });
  }

  return findings;
}
