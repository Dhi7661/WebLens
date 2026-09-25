import type { PageContext } from '../../browser/types.js';
import type { FindingDraft } from '../types.js';
import { generateFingerprint } from '../../utils/fingerprint.js';

// Rule 1: Image Alt Presence (WCAG 2.1 - 1.1.1 Non-text Content, Spec Item 64)
export function evaluateImageAltRule(ctx: PageContext): FindingDraft[] {
  const findings: FindingDraft[] = [];
  const missingAltImages = ctx.images.filter((img) => !img.hasAlt);

  if (missingAltImages.length > 0) {
    findings.push({
      ruleId: 'A11Y-IMG-ALT',
      category: 'Accessibility',
      severity: 'high',
      title: 'Images Missing Alternative Text (alt attribute)',
      summary: `${missingAltImages.length} image element(s) do not contain an alt attribute.`,
      explanation:
        'Screen readers cannot interpret images without an alt attribute. If an image is informative, the alt text conveys its meaning; if purely decorative, an empty alt="" is required to prevent screen readers from announcing raw file paths.',
      remediation:
        'Add concise, meaningful alt text describing each image (e.g., alt="Quarterly revenue chart"). For purely decorative images, explicitly specify alt="".',
      evidence: missingAltImages.slice(0, 5).map((img) => ({
        selector: img.selector,
        value: img.src.substring(0, 90),
      })),
      docsUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
      fingerprint: generateFingerprint('A11Y-IMG-ALT', ctx.url),
    });
  }

  return findings;
}

// Rule 2: Form Label Association (WCAG 2.1 - 1.3.1 Info and Relationships & 4.1.2 Name, Spec Item 65)
export function evaluateFormLabelRule(ctx: PageContext): FindingDraft[] {
  const findings: FindingDraft[] = [];
  const unlabelledForms = ctx.forms.filter((f) => !f.hasLabels && f.missingLabelsCount > 0);

  if (unlabelledForms.length > 0) {
    const totalMissing = unlabelledForms.reduce((sum, f) => sum + f.missingLabelsCount, 0);

    findings.push({
      ruleId: 'A11Y-FORM-LABEL',
      category: 'Accessibility',
      severity: 'high',
      title: 'Form Input Elements Missing Associated Labels',
      summary: `${totalMissing} interactive form input(s) lack programmatic labels.`,
      explanation:
        'Every form field requires an accessible name via a <label for="id"> element, aria-label, or aria-labelledby. Relying solely on placeholder text fails accessibility standards because placeholders disappear once the user begins typing.',
      remediation:
        'Associate each <input> with a visible <label for="inputId">, or provide an aria-label="Search site" attribute if visually hidden.',
      evidence: unlabelledForms.map((f, i) => ({
        selector: `form:nth-of-type(${i + 1})`,
        detail: `${f.missingLabelsCount} input(s) unlabelled in form with action="${f.action || ''}"`,
      })),
      docsUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
      fingerprint: generateFingerprint('A11Y-FORM-LABEL', ctx.url),
    });
  }

  return findings;
}

// Rule 3: Button Accessible Name (WCAG 2.1 - 4.1.2 Name, Role, Value, Spec Item 66)
export function evaluateButtonNameRule(ctx: PageContext): FindingDraft[] {
  const findings: FindingDraft[] = [];
  const namelessButtons = ctx.buttons.filter((b) => !b.hasAccessibleName);

  if (namelessButtons.length > 0) {
    findings.push({
      ruleId: 'A11Y-BUTTON-NAME',
      category: 'Accessibility',
      severity: 'high',
      title: 'Interactive Buttons Missing Accessible Names',
      summary: `${namelessButtons.length} button element(s) have no readable text or aria-label.`,
      explanation:
        'Buttons that contain only icons or empty SVG elements without visible text or an aria-label are announced as generic "button" by screen readers, making navigation impossible for visually impaired users.',
      remediation:
        'Provide visible text inside the button or add an aria-label attribute (e.g., <button aria-label="Close dialog">).',
      evidence: namelessButtons.slice(0, 5).map((b) => ({
        selector: b.selector,
        detail: 'Button contains no inner text or aria-label',
      })),
      docsUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
      fingerprint: generateFingerprint('A11Y-BUTTON-NAME', ctx.url),
    });
  }

  return findings;
}

// Rule 4: Document Language Attribute (WCAG 2.1 - 3.1.1 Language of Page, Spec Item 67)
export function evaluateLangRule(ctx: PageContext): FindingDraft[] {
  const findings: FindingDraft[] = [];
  const lang = (ctx.lang || '').trim();

  if (!lang) {
    findings.push({
      ruleId: 'A11Y-LANG-MISSING',
      category: 'Accessibility',
      severity: 'medium',
      title: 'Document <html> Element Missing lang Attribute',
      summary: 'The top-level <html> tag does not specify a primary language.',
      explanation:
        'The lang attribute (e.g., <html lang="en">) enables screen readers and translation tools to correctly parse pronunciation, accents, and text direction.',
      remediation: 'Add a valid BCP 47 language code to the root element: <html lang="en">.',
      evidence: [{ selector: 'html', value: 'missing lang attribute' }],
      docsUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html',
      fingerprint: generateFingerprint('A11Y-LANG-MISSING', ctx.url),
    });
  }

  return findings;
}

// Rule 5: Semantic Landmarks & Structure (WCAG 2.1 - 1.3.1, Spec Item 68)
export function evaluateLandmarksRule(ctx: PageContext): FindingDraft[] {
  const findings: FindingDraft[] = [];
  const hasMain = /<main\b/i.test(ctx.html) || /role=["']main["']/i.test(ctx.html);

  if (!hasMain) {
    findings.push({
      ruleId: 'A11Y-LANDMARK-MAIN',
      category: 'Accessibility',
      severity: 'medium',
      title: 'Missing Primary <main> Landmark Region',
      summary: 'The document does not designate a <main> landmark region.',
      explanation:
        'Landmarks (<main>, <header>, <nav>, <footer>) enable keyboard and assistive technology users to skip repetitive navigation menus and jump directly to the primary page content.',
      remediation: 'Wrap your central page content in a semantic <main> element: <main id="content">...</main>.',
      evidence: [{ selector: 'body', detail: 'No <main> or role="main" element detected' }],
      docsUrl: 'https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/',
      fingerprint: generateFingerprint('A11Y-LANDMARK-MAIN', ctx.url),
    });
  }

  return findings;
}
