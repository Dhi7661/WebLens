import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Badge } from '../components/ui';
import {
  Compass,
  Zap,
  Search,
  Eye,
  Lock,
  Cpu,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ShieldCheck,
  BarChart3,
  Terminal,
} from 'lucide-react';

export function LandingPage() {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const navigate = useNavigate();

  const handleQuickScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setUrlError('Please enter a website URL');
      return;
    }
    // Basic format test
    if (!/^https?:\/\//i.test(url.trim())) {
      setUrlError('URL must start with http:// or https://');
      return;
    }
    setUrlError('');
    // Navigate to analyze or login/dashboard with prefilled URL
    navigate(`/analyze?url=${encodeURIComponent(url.trim())}`);
  };

  const categories = [
    {
      icon: Zap,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      title: 'Performance & Latency',
      weight: '25% Weight',
      desc: 'Inspects navigation timing, DOM load, render-blocking scripts, resource size anomalies, and image compression.',
    },
    {
      icon: Search,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      title: 'Search Engine Optimization',
      weight: '20% Weight',
      desc: 'Validates title/meta tags, canonical links, OpenGraph cards, heading hierarchies (H1-H6), and crawlability directives.',
    },
    {
      icon: Eye,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      title: 'WCAG Accessibility',
      weight: '25% Weight',
      desc: 'Detects missing alt text, unlabelled inputs, unlabelled interactive buttons, document language, and landmark regions.',
    },
    {
      icon: Lock,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      title: 'Security Configuration',
      weight: '15% Weight',
      desc: 'Audits public HTTP headers: Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), X-Content-Type-Options, and Referrer-Policy.',
    },
    {
      icon: Cpu,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      title: 'Technology & Stack Detection',
      weight: '15% Weight',
      desc: 'Identifies client frameworks (React, Vue, Next.js), web servers, CDNs, and libraries with confidence ratings and evidence traces.',
    },
  ];

  const steps = [
    {
      num: '01',
      title: 'Enter Public URL',
      desc: 'Submit any public website URL. Our SSRF protection engine ensures safe, non-intrusive scanning.',
    },
    {
      num: '02',
      title: 'Autonomous Scan',
      desc: 'A background worker spins up a headless browser, renders the DOM, and extracts a normalized PageContext.',
    },
    {
      num: '03',
      title: 'Actionable Remediation',
      desc: 'Findings are categorized by severity with exact DOM selectors, code fixes, and reproducible weighted scores.',
    },
    {
      num: '04',
      title: 'Track Health & Ask AI',
      desc: 'Compare historical audits over time and consult an AI copilot grounded exclusively in your scan report.',
    },
  ];

  const faqs = [
    {
      q: 'Is WebLens a penetration testing tool?',
      a: 'No. WebLens specifically performs non-destructive, safe quality and configuration audits on publicly observable HTTP headers and DOM elements. It strictly blocks internal IP ranges (SSRF protection) and does not perform active exploitation.',
    },
    {
      q: 'How does the scoring engine calculate scores?',
      a: 'WebLens does not invent arbitrary scores. Scores are mathematically determined through a weighted rule matrix: Performance (25%), Accessibility (25%), SEO (20%), Security (15%), and Tech Hygiene (15%). Findings deduce points deterministically based on severity.',
    },
    {
      q: 'How does the AI assistant avoid hallucinations?',
      a: 'Our AI service receives only the verified PageContext and structured findings list as prompt context. It is strictly constrained to cite actual evidence from the scan and state when information is unavailable.',
    },
    {
      q: 'Can I track scan improvements across repeated tests?',
      a: 'Yes! WebLens persists scan history and allows direct side-by-side comparison between any two scans to highlight regressions and fixes.',
    },
  ];

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-24 text-center overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-950/40 text-indigo-300 text-xs font-medium mb-6 backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>WebLens 1.0 • Full-Stack Website Intelligence Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.15] text-slate-100 mb-6">
          Understand what is happening{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-teal-300 bg-clip-text text-transparent">
            under the hood
          </span>{' '}
          of your website.
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Convert technical observations into understandable issues, explain why they matter,
          provide immediate code fixes, track health over time, and ask an AI copilot grounded in scan evidence.
        </p>

        {/* Scan Input Bar */}
        <form
          onSubmit={handleQuickScan}
          className="max-w-2xl mx-auto bg-slate-900/80 p-2 rounded-2xl border border-slate-700/80 shadow-2xl shadow-indigo-950/40 backdrop-blur-lg flex flex-col sm:flex-row items-center gap-2"
        >
          <div className="w-full relative flex-1">
            <Input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setUrlError('');
              }}
              error={urlError}
              leftIcon={<Compass className="w-5 h-5 text-indigo-400" />}
              className="bg-transparent border-0 focus:ring-0 text-base"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            variant="primary"
            className="w-full sm:w-auto shrink-0 shadow-lg shadow-indigo-600/30"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Audit Website
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> No signup required for quick test
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> SSRF Protected
          </span>
          <span className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-indigo-400" /> Reproducible scoring
          </span>
        </div>
      </section>

      {/* Category Preview Cards */}
      <section className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-800/60">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-3">
            5 Core Quality Dimensions
          </h2>
          <p className="text-sm text-slate-400">
            Every scan is evaluated across five distinct, independent analyzers with deterministic finding models.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <Card
                key={i}
                className="hover:border-slate-700 hover:bg-slate-900/80 transition-all hover:scale-[1.01] group"
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2.5 rounded-xl border ${cat.color} group-hover:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <Badge variant="default" size="sm">
                      {cat.weight}
                    </Badge>
                  </div>
                  <CardTitle>{cat.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-400 leading-relaxed">{cat.desc}</p>
                </CardContent>
              </Card>
            );
          })}

          {/* Bonus Callout Card */}
          <Card className="border-indigo-900/50 bg-gradient-to-br from-indigo-950/40 to-slate-900/60 flex flex-col justify-between">
            <CardHeader>
              <div className="p-2.5 w-fit rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 mb-2">
                <Sparkles className="w-5 h-5" />
              </div>
              <CardTitle>Report-Grounded AI Copilot</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400 mb-4">
                Have questions about a finding? Ask our copilot. It cites real selector evidence, explains root causes, and generates code snippets.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate('/dashboard')}
              >
                View Live Demo
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-800/60">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="queued" size="md" className="mb-3">
            Pipeline Architecture
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-3">
            How WebLens Works
          </h2>
          <p className="text-sm text-slate-400">
            From single URL submission to deep DOM extraction and reproducible reporting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
          {steps.map((st, i) => (
            <div
              key={i}
              className="relative p-6 rounded-xl border border-slate-800/80 bg-slate-900/40 flex flex-col space-y-3"
            >
              <span className="font-mono text-3xl font-bold text-indigo-500/40">
                {st.num}
              </span>
              <h4 className="text-base font-semibold text-slate-100">{st.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{st.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Example Report Interactive Preview */}
      <section className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-800/60">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 text-left space-y-4">
            <Badge variant="success" size="sm">
              Deterministic Output
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">
              Clear findings, DOM selectors, and code fixes.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              No cryptic logs or subjective ratings. Every issue pinpointed by WebLens includes the exact DOM element, the rationale, and copy-paste remediation instructions.
            </p>
            <div className="pt-2 flex flex-col gap-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Fingerprinted findings persist across repeated audits</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Side-by-side visual diffs when comparing historical runs</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Zero penetration risk: 100% passive, safe analysis</span>
              </div>
            </div>
          </div>

          {/* Interactive Card Mock */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-700/80 bg-slate-950 p-6 shadow-2xl shadow-indigo-950/50 text-left space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs text-slate-500 font-mono">AUDIT REPORT</span>
                  <h4 className="text-base font-semibold text-slate-100">https://mystore-demo.vercel.app</h4>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Overall Score</span>
                    <span className="text-2xl font-bold text-emerald-400">88<span className="text-xs text-slate-500">/100</span></span>
                  </div>
                </div>
              </div>

              {/* Sample Finding Item */}
              <div className="p-4 rounded-xl border border-amber-900/50 bg-amber-950/20 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="high" size="sm">High Severity</Badge>
                      <span className="text-xs font-mono text-slate-400">SEO-IMG-ALT-001</span>
                    </div>
                    <h5 className="text-sm font-semibold text-slate-100">
                      Images missing alternative text descriptions
                    </h5>
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  4 decorative or content images lack <code className="text-amber-300 bg-amber-950/60 px-1 py-0.5 rounded">alt</code> attributes, harming screen reader navigation and image indexing.
                </p>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
                  <div className="text-slate-500 text-[10px] mb-1 flex items-center gap-1">
                    <Terminal className="w-3 h-3" /> DOM Evidence:
                  </div>
                  <code>&lt;img src="/hero-banner.jpg" class="w-full h-auto"&gt;</code>
                </div>

                <div className="text-xs text-emerald-300 bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-800/40">
                  <strong className="text-emerald-200">Recommended Fix: </strong>
                  Add meaningful descriptive text: <code className="bg-emerald-900/40 px-1 py-0.5 rounded">alt="Spring collection promotional banner"</code> or <code className="bg-emerald-900/40 px-1 py-0.5 rounded">alt=""</code> if purely decorative.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-800/60">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-slate-400">
            Clear guidelines on scanning, scoring methodology, and security boundaries.
          </p>
        </div>

        <div className="space-y-3 text-left">
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={i}
                className="border border-slate-800 rounded-xl bg-slate-900/40 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left text-sm font-semibold text-slate-200 hover:text-white"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isOpen ? 'rotate-180 text-indigo-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-800/50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="rounded-3xl border border-indigo-900/50 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/60 p-10 sm:p-14 relative overflow-hidden">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-100 mb-4">
            Ready to audit your website's health?
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto mb-8">
            Experience our deterministic analyzer engine with normalized findings and AI assistance.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              variant="primary"
              onClick={() => navigate('/register')}
            >
              Create Free Account
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/dashboard')}
            >
              Explore Dashboard Demo
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
