import { useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '../components/ui';
import { GitCompare, ArrowUpRight, CheckCircle2, XCircle } from 'lucide-react';

export function ComparePage() {
  const [searchParams] = useSearchParams();
  const scanA = searchParams.get('scanA') || 'scan-103';
  const scanB = searchParams.get('scanB') || 'scan-101';

  const compareData = {
    scanA: {
      id: scanA,
      url: 'https://mystore-demo.vercel.app (Initial)',
      score: 68,
      perf: 55,
      seo: 72,
      a11y: 60,
      sec: 80,
      date: 'Sep 24, 2026',
    },
    scanB: {
      id: scanB,
      url: 'https://mystore-demo.vercel.app (Latest)',
      score: 88,
      perf: 82,
      seo: 90,
      a11y: 85,
      sec: 95,
      date: 'Sep 25, 2026',
    },
    diff: {
      score: '+20 pts',
      fixedIssues: 4,
      newIssues: 0,
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-indigo-400" />
            <h1 className="text-2xl font-bold text-slate-100">Scan Comparison</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Compare two audit reports side-by-side to measure improvements and detect regressions
          </p>
        </div>
      </div>

      {/* Comparison Scoreboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Baseline Scan A */}
        <Card className="border-slate-800 bg-slate-900/40">
          <CardHeader>
            <Badge variant="default" size="sm">Baseline</Badge>
            <CardTitle className="text-base truncate">{compareData.scanA.url}</CardTitle>
            <CardDescription>{compareData.scanA.date} • {compareData.scanA.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-4xl font-extrabold text-amber-400 font-mono">
              {compareData.scanA.score}
              <span className="text-xs text-slate-500 font-normal"> / 100</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
              <div>Perf: <span className="text-slate-200 font-mono">{compareData.scanA.perf}</span></div>
              <div>SEO: <span className="text-slate-200 font-mono">{compareData.scanA.seo}</span></div>
              <div>A11y: <span className="text-slate-200 font-mono">{compareData.scanA.a11y}</span></div>
              <div>Sec: <span className="text-slate-200 font-mono">{compareData.scanA.sec}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Diff Callout */}
        <div className="text-center p-6 rounded-2xl border border-indigo-900/60 bg-indigo-950/30 flex flex-col items-center justify-center space-y-2">
          <div className="flex items-center gap-1 text-emerald-400 font-bold text-2xl font-mono">
            <ArrowUpRight className="w-6 h-6" />
            <span>{compareData.diff.score}</span>
          </div>
          <span className="text-xs font-semibold text-slate-300">Composite Health Improvement</span>
          <p className="text-xs text-slate-400">
            {compareData.diff.fixedIssues} issues resolved since baseline
          </p>
        </div>

        {/* Latest Scan B */}
        <Card className="border-indigo-900/50 bg-indigo-950/20">
          <CardHeader>
            <Badge variant="success" size="sm">Comparison Target</Badge>
            <CardTitle className="text-base truncate">{compareData.scanB.url}</CardTitle>
            <CardDescription>{compareData.scanB.date} • {compareData.scanB.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-4xl font-extrabold text-emerald-400 font-mono">
              {compareData.scanB.score}
              <span className="text-xs text-slate-500 font-normal"> / 100</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
              <div>Perf: <span className="text-emerald-400 font-mono">{compareData.scanB.perf}</span></div>
              <div>SEO: <span className="text-emerald-400 font-mono">{compareData.scanB.seo}</span></div>
              <div>A11y: <span className="text-emerald-400 font-mono">{compareData.scanB.a11y}</span></div>
              <div>Sec: <span className="text-emerald-400 font-mono">{compareData.scanB.sec}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delta Findings Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delta Findings Breakdown</CardTitle>
          <CardDescription>Status changes for individual rules between audits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-lg border border-emerald-900/60 bg-emerald-950/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              <span>Resolved: <strong>A11Y-FORM-LABEL</strong> Form inputs now properly linked with labels</span>
            </div>
            <Badge variant="success" size="sm">Fixed</Badge>
          </div>

          <div className="p-3 rounded-lg border border-emerald-900/60 bg-emerald-950/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              <span>Resolved: <strong>SEC-HSTS-001</strong> Strict-Transport-Security header configured</span>
            </div>
            <Badge variant="success" size="sm">Fixed</Badge>
          </div>

          <div className="p-3 rounded-lg border border-amber-900/60 bg-amber-950/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-300">
              <XCircle className="w-4 h-4" />
              <span>Remaining: <strong>SEC-CSP-001</strong> Content-Security-Policy still unconfigured</span>
            </div>
            <Badge variant="high" size="sm">Unresolved</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
