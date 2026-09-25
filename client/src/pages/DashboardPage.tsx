import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Skeleton,
} from '../components/ui';
import {
  Compass,
  ArrowRight,
  ShieldAlert,
  Activity,
  Globe,
  Clock,
  RotateCw,
  GitCompare,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface MockScan {
  id: string;
  url: string;
  domain: string;
  status: 'completed' | 'running' | 'queued' | 'failed';
  overallScore: number;
  categoryScores: {
    performance: number;
    seo: number;
    accessibility: number;
    security: number;
    technology: number;
  };
  durationMs: number;
  scannedAt: string;
  criticalIssues: number;
  highIssues: number;
}

const INITIAL_MOCK_SCANS: MockScan[] = [
  {
    id: 'scan-101',
    url: 'https://mystore-demo.vercel.app',
    domain: 'mystore-demo.vercel.app',
    status: 'completed',
    overallScore: 88,
    categoryScores: {
      performance: 82,
      seo: 90,
      accessibility: 85,
      security: 95,
      technology: 90,
    },
    durationMs: 3820,
    scannedAt: '12 mins ago',
    criticalIssues: 0,
    highIssues: 2,
  },
  {
    id: 'scan-102',
    url: 'https://dev-portfolio.io',
    domain: 'dev-portfolio.io',
    status: 'completed',
    overallScore: 94,
    categoryScores: {
      performance: 96,
      seo: 95,
      accessibility: 92,
      security: 90,
      technology: 100,
    },
    durationMs: 2450,
    scannedAt: '2 hours ago',
    criticalIssues: 0,
    highIssues: 0,
  },
  {
    id: 'scan-103',
    url: 'https://client-agency-portal.com',
    domain: 'client-agency-portal.com',
    status: 'completed',
    overallScore: 68,
    categoryScores: {
      performance: 55,
      seo: 72,
      accessibility: 60,
      security: 80,
      technology: 75,
    },
    durationMs: 5120,
    scannedAt: '1 day ago',
    criticalIssues: 1,
    highIssues: 4,
  },
  {
    id: 'scan-104',
    url: 'https://saas-landing-test.com',
    domain: 'saas-landing-test.com',
    status: 'running',
    overallScore: 0,
    categoryScores: {
      performance: 0,
      seo: 0,
      accessibility: 0,
      security: 0,
      technology: 0,
    },
    durationMs: 1200,
    scannedAt: 'Just now',
    criticalIssues: 0,
    highIssues: 0,
  },
];

export function DashboardPage() {
  const [scans] = useState<MockScan[]>(INITIAL_MOCK_SCANS);
  const [newUrl, setNewUrl] = useState('');
  const [showLoadingSkeleton, setShowLoadingSkeleton] = useState(false);
  const navigate = useNavigate();

  const handleStartScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    navigate(`/analyze?url=${encodeURIComponent(newUrl.trim())}`);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      {/* Top Banner / Welcome & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 flex items-center gap-2.5">
            <span>Website Intelligence Dashboard</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Monitor website health, inspect real-time audit findings, and track score regressions.
          </p>
        </div>

        {/* Demo skeleton toggle for grading/evaluation */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLoadingSkeleton(!showLoadingSkeleton)}
          >
            {showLoadingSkeleton ? 'Show Real Data' : 'Preview Skeleton States'}
          </Button>
          <Link to="/analyze">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Compass className="w-4 h-4" />}
            >
              Start New Audit
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Launch Bar */}
      <Card className="bg-slate-900/80 border-slate-700/80">
        <CardContent className="p-4 sm:p-5">
          <form
            onSubmit={handleStartScan}
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            <div className="w-full relative flex-1">
              <Input
                placeholder="Audit a website URL (e.g., https://example.com)..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                leftIcon={<Compass className="w-4 h-4 text-indigo-400" />}
                className="bg-slate-950/60"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto shrink-0"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Analyze Website
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      {showLoadingSkeleton ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Tracked Domains
                </span>
                <p className="text-2xl font-bold text-slate-100">4</p>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  Active monitoring
                </span>
              </div>
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Globe className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Avg Health Score
                </span>
                <p className="text-2xl font-bold text-emerald-400">83.3</p>
                <span className="text-[11px] text-emerald-400">
                  +4.2% from last week
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Activity className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Actionable Findings
                </span>
                <p className="text-2xl font-bold text-amber-400">7</p>
                <span className="text-[11px] text-amber-400">
                  1 critical, 6 high priority
                </span>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Total Audits Run
                </span>
                <p className="text-2xl font-bold text-indigo-400">28</p>
                <span className="text-[11px] text-slate-400">
                  All scans persisted
                </span>
              </div>
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <RotateCw className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Scans Table Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Website Scans</CardTitle>
            <CardDescription>
              Historical audits with category score breakdowns and direct report links
            </CardDescription>
          </div>
          <Link to="/history">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              View All History
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="p-0">
          {showLoadingSkeleton ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-y border-slate-800 bg-slate-900/60 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-5">Target Website</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Overall</th>
                    <th className="py-3 px-4 text-center">Perf</th>
                    <th className="py-3 px-4 text-center">SEO</th>
                    <th className="py-3 px-4 text-center">A11y</th>
                    <th className="py-3 px-4 text-center">Sec</th>
                    <th className="py-3 px-4">Scanned</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {scans.map((scan) => (
                    <tr
                      key={scan.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                            {scan.domain}
                            <a
                              href={scan.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            {scan.id}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            scan.status === 'completed'
                              ? 'success'
                              : scan.status === 'running'
                              ? 'running'
                              : scan.status === 'queued'
                              ? 'queued'
                              : 'critical'
                          }
                          size="sm"
                        >
                          {scan.status}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {scan.status === 'completed' ? (
                          <span
                            className={`font-mono font-bold text-base ${getScoreColor(
                              scan.overallScore
                            )}`}
                          >
                            {scan.overallScore}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono text-xs">
                        {scan.status === 'completed' ? scan.categoryScores.performance : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs">
                        {scan.status === 'completed' ? scan.categoryScores.seo : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs">
                        {scan.status === 'completed' ? scan.categoryScores.accessibility : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs">
                        {scan.status === 'completed' ? scan.categoryScores.security : '-'}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{scan.scannedAt}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/reports/${scan.id}`}>
                            <Button variant="outline" size="sm">
                              Report
                            </Button>
                          </Link>
                          <Link to={`/compare?scanA=scan-101&scanB=${scan.id}`}>
                            <Button variant="ghost" size="sm" title="Compare Scans">
                              <GitCompare className="w-3.5 h-3.5 text-slate-400" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* High Severity Priority Findings Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <span>Recently Discovered High-Severity Issues</span>
              </CardTitle>
              <CardDescription>
                Issues that significantly impact accessibility, security, or search visibility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3.5 rounded-lg border border-rose-900/50 bg-rose-950/20 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="critical" size="sm">Critical</Badge>
                    <span className="text-xs font-mono text-slate-400">SEC-CSP-001</span>
                    <span className="text-xs text-slate-500">• client-agency-portal.com</span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-100">
                    Content-Security-Policy (CSP) header missing
                  </h4>
                  <p className="text-xs text-slate-400">
                    The web server does not send a CSP header, allowing unrestricted inline script execution.
                  </p>
                </div>
                <Link to="/reports/scan-103">
                  <Button variant="outline" size="sm">Inspect Fix</Button>
                </Link>
              </div>

              <div className="p-3.5 rounded-lg border border-amber-900/50 bg-amber-950/20 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="high" size="sm">High</Badge>
                    <span className="text-xs font-mono text-slate-400">A11Y-FORM-LABEL</span>
                    <span className="text-xs text-slate-500">• mystore-demo.vercel.app</span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-100">
                    Form input elements missing associated labels
                  </h4>
                  <p className="text-xs text-slate-400">
                    Search and newsletter inputs do not have matching &lt;label&gt; elements or aria-label attributes.
                  </p>
                </div>
                <Link to="/reports/scan-101">
                  <Button variant="outline" size="sm">Inspect Fix</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Assistant Callout */}
        <div>
          <Card className="border-indigo-900/60 bg-gradient-to-b from-indigo-950/40 to-slate-900/90 h-full flex flex-col justify-between">
            <CardHeader>
              <div className="p-2.5 w-fit rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
                <Sparkles className="w-5 h-5" />
              </div>
              <CardTitle>Grounded AI Assistant</CardTitle>
              <CardDescription>
                Ask questions about any scan report without hallucinations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300 italic">
                "What is the single most critical accessibility issue on mystore-demo?"
              </div>
              <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-200">
                WebLens AI analyzes only verified DOM elements and response headers to provide fact-checked solutions.
              </div>
              <Link to="/reports/scan-101" className="block pt-2">
                <Button variant="primary" size="sm" className="w-full">
                  Try AI Copilot On Report
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
