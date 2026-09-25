import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Skeleton } from '../components/ui';
import { scanApi, type ScanRecord, type CompareResult, type FindingRecord } from '../lib/api';
import {
  GitCompare,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  ExternalLink,
  Code2,
} from 'lucide-react';

export function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const baseParam = searchParams.get('base') || searchParams.get('scanA');
  const targetParam = searchParams.get('target') || searchParams.get('scanB');

  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [selectedBase, setSelectedBase] = useState<string>(baseParam || '');
  const [selectedTarget, setSelectedTarget] = useState<string>(targetParam || '');
  const [compareData, setCompareData] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [comparing, setComparing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'regressions' | 'resolved' | 'persistent'>('regressions');
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch available completed scans
  useEffect(() => {
    async function loadScans() {
      setLoading(true);
      setError(null);
      const res = await scanApi.list();
      if (res.success && res.data?.scans) {
        const completed = res.data.scans.filter((s) => s.status === 'COMPLETED');
        setScans(completed);

        // Auto-select the two most recent scans if not provided in URL
        if (completed.length >= 2) {
          const initialTarget = targetParam && completed.some((s) => s.id === targetParam)
            ? targetParam
            : completed[0].id;
          const initialBase = baseParam && completed.some((s) => s.id === baseParam)
            ? baseParam
            : completed[1].id;

          setSelectedBase(initialBase);
          setSelectedTarget(initialTarget);
        } else if (completed.length === 1) {
          setSelectedTarget(completed[0].id);
        }
      } else {
        setError(res.error?.message || 'Could not load scan history');
      }
      setLoading(false);
    }

    loadScans();
  }, [baseParam, targetParam]);

  // 2. Fetch comparison data whenever selected scans change
  useEffect(() => {
    async function fetchComparison() {
      if (!selectedBase || !selectedTarget || selectedBase === selectedTarget) {
        setCompareData(null);
        return;
      }

      setComparing(true);
      setError(null);
      const res = await scanApi.compare(selectedBase, selectedTarget);
      if (res.success && res.data) {
        setCompareData(res.data);
        // Sync URL query params
        setSearchParams({ base: selectedBase, target: selectedTarget });
        // Set active tab to regressions if any exist, else resolved
        if (res.data.counts.regressions > 0) {
          setActiveTab('regressions');
        } else if (res.data.counts.resolved > 0) {
          setActiveTab('resolved');
        } else {
          setActiveTab('persistent');
        }
      } else {
        setError(res.error?.message || 'Failed to compare selected scans');
      }
      setComparing(false);
    }

    fetchComparison();
  }, [selectedBase, selectedTarget, setSearchParams]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (scans.length < 2) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center mx-auto text-indigo-400">
          <GitCompare className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100">At Least Two Scans Required for Comparison</h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          The regression comparison engine compares changes between an earlier baseline audit and a newer target audit.
          Run at least two scans to measure score deltas and track resolved issues.
        </p>
        <Link
          to="/analyze"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors"
        >
          Run a New Scan <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const overallDelta = compareData?.deltas.overall ?? 0;
  const isPositive = overallDelta > 0;
  const isNegative = overallDelta < 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      {/* Header & Scan Selector Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <GitCompare className="w-6 h-6 text-indigo-400" />
            <h1 className="text-2xl font-bold text-slate-100">Scan Comparison & Regressions</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Compare two audits side-by-side using SHA-256 fingerprint diffing to detect new regressions and verify resolved issues.
          </p>
        </div>

        {/* Scan Pickers */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <div className="w-full sm:w-auto">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Baseline Scan (Earlier)
            </label>
            <select
              value={selectedBase}
              onChange={(e) => setSelectedBase(e.target.value)}
              className="w-full sm:w-60 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {scans.map((s) => (
                <option key={s.id} value={s.id} disabled={s.id === selectedTarget}>
                  {new Date(s.createdAt).toLocaleDateString()} — {s.requestedUrl} ({s.overallScore}/100)
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 text-slate-500 hidden sm:block">
            <ArrowRight className="w-4 h-4" />
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Comparison Target (Newer)
            </label>
            <select
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              className="w-full sm:w-60 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {scans.map((s) => (
                <option key={s.id} value={s.id} disabled={s.id === selectedBase}>
                  {new Date(s.createdAt).toLocaleDateString()} — {s.requestedUrl} ({s.overallScore}/100)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-rose-900/60 bg-rose-950/20 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {comparing && (
        <div className="space-y-4">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {!comparing && compareData && (
        <>
          {/* 3-Column Scoreboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Baseline Scan Card */}
            <Card className="border-slate-800 bg-slate-900/40">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="default" size="sm">Baseline</Badge>
                  <span className="text-[11px] text-slate-500 font-mono">ID: {compareData.baseScan.id.substring(0, 8)}</span>
                </div>
                <CardTitle className="text-sm truncate text-slate-200 mt-2">
                  {compareData.baseScan.requestedUrl}
                </CardTitle>
                <CardDescription className="text-xs">
                  {new Date(compareData.baseScan.createdAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-amber-400 font-mono">
                    {compareData.baseScan.overallScore}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ 100 overall</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-3 border-t border-slate-800 font-mono">
                  <div>Perf: <span className="text-slate-200">{compareData.baseScan.categoryScores.performance}</span></div>
                  <div>SEO: <span className="text-slate-200">{compareData.baseScan.categoryScores.seo}</span></div>
                  <div>A11y: <span className="text-slate-200">{compareData.baseScan.categoryScores.accessibility}</span></div>
                  <div>Sec: <span className="text-slate-200">{compareData.baseScan.categoryScores.security}</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Delta Callout Box */}
            <div
              className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center space-y-3 transition-colors ${
                isPositive
                  ? 'border-emerald-800/60 bg-emerald-950/20'
                  : isNegative
                  ? 'border-rose-800/60 bg-rose-950/20'
                  : 'border-slate-800 bg-slate-900/30'
              }`}
            >
              <div
                className={`flex items-center gap-1.5 text-3xl font-extrabold font-mono ${
                  isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-slate-300'
                }`}
              >
                {isPositive ? (
                  <ArrowUpRight className="w-8 h-8" />
                ) : isNegative ? (
                  <ArrowDownRight className="w-8 h-8" />
                ) : (
                  <Minus className="w-8 h-8" />
                )}
                <span>
                  {overallDelta > 0 ? `+${overallDelta}` : overallDelta} pts
                </span>
              </div>

              <div className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                {isPositive
                  ? 'Composite Health Improvement'
                  : isNegative
                  ? 'Quality Regression Detected'
                  : 'Overall Score Maintained'}
              </div>

              {/* Counts Pills */}
              <div className="flex items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                  <CheckCircle2 className="w-3 h-3" /> {compareData.counts.resolved} Fixed
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-400 border border-rose-800/50">
                  <Flame className="w-3 h-3" /> {compareData.counts.regressions} New
                </span>
              </div>
            </div>

            {/* Target Scan Card */}
            <Card className="border-indigo-900/60 bg-indigo-950/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="success" size="sm">Target</Badge>
                  <span className="text-[11px] text-slate-500 font-mono">ID: {compareData.targetScan.id.substring(0, 8)}</span>
                </div>
                <CardTitle className="text-sm truncate text-slate-200 mt-2">
                  {compareData.targetScan.requestedUrl}
                </CardTitle>
                <CardDescription className="text-xs">
                  {new Date(compareData.targetScan.createdAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-emerald-400 font-mono">
                    {compareData.targetScan.overallScore}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ 100 overall</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-3 border-t border-slate-800 font-mono">
                  <div>Perf: <span className="text-slate-200">{compareData.targetScan.categoryScores.performance}</span></div>
                  <div>SEO: <span className="text-slate-200">{compareData.targetScan.categoryScores.seo}</span></div>
                  <div>A11y: <span className="text-slate-200">{compareData.targetScan.categoryScores.accessibility}</span></div>
                  <div>Sec: <span className="text-slate-200">{compareData.targetScan.categoryScores.security}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Deltas Breakdown Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(['performance', 'seo', 'accessibility', 'security', 'technology'] as const).map((cat) => {
              const delta = compareData.deltas.categories[cat];
              const baseVal = compareData.baseScan.categoryScores[cat];
              const targetVal = compareData.targetScan.categoryScores[cat];
              const catPositive = delta > 0;
              const catNegative = delta < 0;

              return (
                <div
                  key={cat}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-900/30 flex flex-col justify-between"
                >
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {cat === 'accessibility' ? 'A11y' : cat}
                  </span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-sm font-bold text-slate-200 font-mono">
                      {baseVal} → {targetVal}
                    </span>
                    <span
                      className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                        catPositive
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                          : catNegative
                          ? 'bg-rose-950 text-rose-400 border border-rose-800/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Findings Diff Breakdown */}
          <Card>
            <CardHeader className="border-b border-slate-800 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Delta Findings Breakdown</CardTitle>
                  <CardDescription className="text-xs">
                    Fingerprinted rule comparisons between baseline and target
                  </CardDescription>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setActiveTab('regressions')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                      activeTab === 'regressions'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800/50 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    New Regressions ({compareData.counts.regressions})
                  </button>
                  <button
                    onClick={() => setActiveTab('resolved')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                      activeTab === 'resolved'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Resolved Issues ({compareData.counts.resolved})
                  </button>
                  <button
                    onClick={() => setActiveTab('persistent')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                      activeTab === 'persistent'
                        ? 'bg-slate-800 text-amber-300 border border-slate-700 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Persistent Debt ({compareData.counts.persistent})
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {activeTab === 'regressions' && (
                <FindingsList
                  findings={compareData.regressions}
                  type="regression"
                  emptyMessage="No new regressions detected! All baseline checks remain clean."
                />
              )}

              {activeTab === 'resolved' && (
                <FindingsList
                  findings={compareData.resolved}
                  type="resolved"
                  emptyMessage="No issues were resolved between these two scans."
                />
              )}

              {activeTab === 'persistent' && (
                <FindingsList
                  findings={compareData.persistent}
                  type="persistent"
                  emptyMessage="Zero persistent debt. No recurring issues detected across both scans."
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

interface FindingsListProps {
  findings: FindingRecord[];
  type: 'regression' | 'resolved' | 'persistent';
  emptyMessage: string;
}

function FindingsList({ findings, type, emptyMessage }: FindingsListProps) {
  if (findings.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500 text-xs">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {findings.map((f) => {
        const borderClass =
          type === 'regression'
            ? 'border-rose-900/60 bg-rose-950/15'
            : type === 'resolved'
            ? 'border-emerald-900/60 bg-emerald-950/15'
            : 'border-slate-800 bg-slate-900/20';

        return (
          <div
            key={f.id || f.fingerprint}
            className={`p-4 rounded-xl border ${borderClass} space-y-2 text-left transition-all`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {type === 'regression' && (
                  <Badge variant="critical" size="sm">Regression</Badge>
                )}
                {type === 'resolved' && (
                  <Badge variant="success" size="sm">Fixed</Badge>
                )}
                {type === 'persistent' && (
                  <Badge variant="warning" size="sm">Persistent</Badge>
                )}

                <Badge variant="default" size="sm">{f.category}</Badge>
                <span className="text-xs font-semibold text-slate-200">
                  {f.title}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Rule: {f.ruleId}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              {f.summary}
            </p>

            {f.evidence && f.evidence.length > 0 && f.evidence[0].value && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800/80 w-fit">
                <Code2 className="w-3 h-3 text-slate-500" />
                <span className="text-slate-500">Evidence:</span>
                <span className="text-slate-300 truncate max-w-sm sm:max-w-md">
                  {f.evidence[0].value}
                </span>
              </div>
            )}

            {f.docsUrl && (
              <div className="pt-1">
                <a
                  href={f.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Remediation Guide <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
