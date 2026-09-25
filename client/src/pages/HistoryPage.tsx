import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Skeleton,
} from '../components/ui';
import {
  History,
  GitCompare,
  ExternalLink,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  Play,
  Download,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Globe,
  Sliders,
  LogIn,
import { websiteApi, scanApi, type WebsiteRecord, type WebsiteHistoryData, type ScanRecord } from '../lib/api';
import { useAuth } from '../features/auth/AuthContext';

export function HistoryPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDomainParam = searchParams.get('websiteId');

  const [websites, setWebsites] = useState<WebsiteRecord[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>('');
  const [historyData, setHistoryData] = useState<WebsiteHistoryData | null>(null);

  const [loadingWebsites, setLoadingWebsites] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [updatingMonitoring, setUpdatingMonitoring] = useState(false);
  const [triggeringScan, setTriggeringScan] = useState(false);
  const [activeHoverPoint, setActiveHoverPoint] = useState<WebsiteHistoryData['timeSeries'][0] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load user websites
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setLoadingWebsites(false);
      return;
    }

    async function loadWebsites() {
      try {
        setLoadingWebsites(true);
        setError(null);
        const res = await websiteApi.list();

        if (res.success && res.data?.websites) {
          const list = res.data.websites;
          setWebsites(list);

          if (list.length > 0) {
            const matched = selectedDomainParam
              ? list.find((w) => w.id === selectedDomainParam)
              : null;
            const initialId = matched ? matched.id : list[0].id;
            setSelectedWebsiteId(initialId);
          }
        } else {
          setError(res.error?.message || 'Failed to load tracked websites.');
        }
      } catch (err: unknown) {
        const errorObj = err as Error;
        setError(errorObj.message || 'Failed to load tracked websites.');
      } finally {
        setLoadingWebsites(false);
      }
    }
    loadWebsites();
  }, [authLoading, isAuthenticated, selectedDomainParam]);

  // Load history whenever selected website changes
  useEffect(() => {
    if (!selectedWebsiteId || !isAuthenticated) return;

    async function loadHistory() {
      try {
        setLoadingHistory(true);
        setError(null);
        const res = await websiteApi.getHistory(selectedWebsiteId);
        if (res.success && res.data) {
          setHistoryData(res.data);
        } else {
          setError(res.error?.message || 'Failed to retrieve website audit history.');
        }
      } catch (err: unknown) {
        const errorObj = err as Error;
        setError(errorObj.message || 'Failed to retrieve website audit history.');
      } finally {
        setLoadingHistory(false);
      }
    }

    loadHistory();
  }, [selectedWebsiteId, isAuthenticated]);

  const handleSelectWebsite = (id: string) => {
    setSelectedWebsiteId(id);
    setSearchParams({ websiteId: id });
  };

  const handleToggleMonitoring = async () => {
    if (!historyData) return;
    try {
      setUpdatingMonitoring(true);
      const nextState = !historyData.website.monitoringEnabled;
      const res = await websiteApi.updateMonitoring(
        historyData.website.id,
        nextState,
        historyData.website.frequency
      );
      if (res.success && res.data?.website) {
        const updated = res.data.website;
        setHistoryData((prev) =>
          prev
            ? {
                ...prev,
                website: {
                  ...prev.website,
                  monitoringEnabled: updated.monitoringEnabled,
                  nextScheduledAt: updated.nextScheduledAt,
                },
              }
            : null
        );
        setWebsites((prev) =>
          prev.map((w) =>
            w.id === updated.id
              ? { ...w, monitoringEnabled: updated.monitoringEnabled, nextScheduledAt: updated.nextScheduledAt }
              : w
          )
        );
      } else {
        alert(res.error?.message || 'Failed to update schedule');
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      alert(`Failed to update schedule: ${errorObj.message}`);
    } finally {
      setUpdatingMonitoring(false);
    }
  };

  const handleChangeFrequency = async (freq: 'hourly' | 'daily' | 'weekly') => {
    if (!historyData) return;
    try {
      setUpdatingMonitoring(true);
      const res = await websiteApi.updateMonitoring(
        historyData.website.id,
        historyData.website.monitoringEnabled,
        freq
      );
      if (res.success && res.data?.website) {
        const updated = res.data.website;
        setHistoryData((prev) =>
          prev
            ? {
                ...prev,
                website: {
                  ...prev.website,
                  frequency: updated.frequency,
                  nextScheduledAt: updated.nextScheduledAt,
                },
              }
            : null
        );
        setWebsites((prev) =>
          prev.map((w) =>
            w.id === updated.id
              ? { ...w, frequency: updated.frequency, nextScheduledAt: updated.nextScheduledAt }
              : w
          )
        );
      } else {
        alert(res.error?.message || 'Failed to update frequency');
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      alert(`Failed to update frequency: ${errorObj.message}`);
    } finally {
      setUpdatingMonitoring(false);
    }
  };

  const handleTriggerManualScan = async () => {
    if (!selectedWebsiteId) return;
    try {
      setTriggeringScan(true);
      const res = await websiteApi.triggerScan(selectedWebsiteId);
      if (res.success && res.data?.scan) {
        navigate(`/reports/${res.data.scan.id}`);
      } else {
        alert(res.error?.message || 'Failed to launch scan');
        setTriggeringScan(false);
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      alert(`Failed to launch scan: ${errorObj.message}`);
      setTriggeringScan(false);
    }
  };

  // If user is not authenticated, show friendly login callout
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl w-16 h-16 mx-auto flex items-center justify-center text-indigo-400">
          <History className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Sign in to Access Audit History</h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Audit history and automated scheduled monitoring require an active WebLens account to persist and analyze historical metrics over time.
        </p>
        <div className="pt-2">
          <Link to="/login?redirect=/history">
            <Button variant="primary" size="md" className="gap-2">
              <LogIn className="w-4 h-4" />
              Sign In to Your Account
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const selectedWebsite = websites.find((w) => w.id === selectedWebsiteId);
  const timeSeries = historyData?.timeSeries || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                Audit History & Scheduled Monitoring
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Track regressions over time, review automated scans, and schedule recurring audits
              </p>
            </div>
          </div>
        </div>

        {selectedWebsite && (
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedWebsiteId) {
                  setLoadingHistory(true);
                  websiteApi.getHistory(selectedWebsiteId).then((res) => {
                    if (res.success && res.data) setHistoryData(res.data);
                    setLoadingHistory(false);
                  });
                }
              }}
              disabled={loadingHistory}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleTriggerManualScan}
              disabled={triggeringScan}
              className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
            >
              <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
              {triggeringScan ? 'Launching...' : 'Run Audit Now'}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Website Domain Picker */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Tracked Domain
        </label>
        {loadingWebsites ? (
          <div className="flex gap-2">
            <Skeleton className="h-10 w-44 rounded-lg" />
            <Skeleton className="h-10 w-44 rounded-lg" />
          </div>
        ) : websites.length === 0 ? (
          <Card className="p-6 text-center border-dashed border-slate-800">
            <Globe className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-300">No websites monitored yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Initiate a scan from the analyze page to register a domain for recurring scheduled audits and time-series analytics.
            </p>
            <Link to="/analyze" className="inline-block mt-4">
              <Button variant="primary" size="sm">
                Start First Scan
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {websites.map((site) => {
              const isSelected = site.id === selectedWebsiteId;
              return (
                <button
                  key={site.id}
                  onClick={() => handleSelectWebsite(site.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all border ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200 shadow-sm shadow-indigo-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Globe className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span>{site.hostname}</span>
                  {site.monitoringEnabled && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Monitoring Active" />
                  )}
                  {site.latestScan?.overallScore !== undefined && (
                    <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800/80 text-emerald-400">
                      {site.latestScan.overallScore}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedWebsite && (
        <>
          {/* Top Row: Scheduled Monitoring Controller & KPI Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Scheduled Monitoring Settings */}
            <Card className="lg:col-span-1 border-slate-800 bg-slate-900/40">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <CardTitle className="text-sm">Automated Audit Schedule</CardTitle>
                  </div>
                  <Badge
                    variant={historyData?.website.monitoringEnabled ? 'success' : 'neutral'}
                    size="sm"
                  >
                    {historyData?.website.monitoringEnabled ? 'Active' : 'Paused'}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Background cron runner executing autonomous health scans
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-1">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Recurring Monitoring</div>
                    <div className="text-[11px] text-slate-500">
                      {historyData?.website.monitoringEnabled
                        ? 'Scans run automatically on interval'
                        : 'Autonomous scheduling is inactive'}
                    </div>
                  </div>
                  <Button
                    variant={historyData?.website.monitoringEnabled ? 'destructive' : 'primary'}
                    size="sm"
                    onClick={handleToggleMonitoring}
                    disabled={updatingMonitoring || loadingHistory}
                    className="text-xs px-3"
                  >
                    {historyData?.website.monitoringEnabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-400">Audit Cadence</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['hourly', 'daily', 'weekly'] as const).map((freq) => {
                      const isCurrent = (historyData?.website.frequency || 'daily') === freq;
                      return (
                        <button
                          key={freq}
                          onClick={() => handleChangeFrequency(freq)}
                          disabled={updatingMonitoring || loadingHistory}
                          className={`py-1.5 text-xs font-medium capitalize rounded-lg border transition-all ${
                            isCurrent
                              ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          {freq}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1.5 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Next Scan:
                    </span>
                    <span className="font-mono text-slate-300">
                      {historyData?.website.nextScheduledAt
                        ? new Date(historyData.website.nextScheduledAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Not scheduled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Last Automated:
                    </span>
                    <span className="font-mono text-slate-300">
                      {historyData?.website.lastScheduledAt
                        ? new Date(historyData.website.lastScheduledAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Never'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI Metric Summary */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="bg-slate-900/40 border-slate-800 p-4 flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-400">Total Audits</span>
                <div className="text-2xl font-bold font-mono text-slate-100 mt-2">
                  {loadingHistory ? <Skeleton className="h-8 w-16" /> : historyData?.stats.totalScans || 0}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Layers className="w-3 h-3" /> Historical scans
                </span>
              </Card>

              <Card className="bg-slate-900/40 border-slate-800 p-4 flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-400">Completed</span>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
                  {loadingHistory ? <Skeleton className="h-8 w-16" /> : historyData?.stats.completedScans || 0}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Successful runs
                </span>
              </Card>

              <Card className="bg-slate-900/40 border-slate-800 p-4 flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-400">Average Score</span>
                <div className="text-2xl font-bold font-mono text-indigo-400 mt-2">
                  {loadingHistory ? <Skeleton className="h-8 w-16" /> : historyData?.stats.averageScore || 0}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-indigo-400" /> Composite mean
                </span>
              </Card>

              <Card className="bg-slate-900/40 border-slate-800 p-4 flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-400">Score Delta</span>
                <div className="mt-2">
                  {loadingHistory ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div
                      className={`text-2xl font-bold font-mono flex items-center gap-1 ${
                        (historyData?.stats.scoreDelta || 0) > 0
                          ? 'text-emerald-400'
                          : (historyData?.stats.scoreDelta || 0) < 0
                          ? 'text-rose-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {(historyData?.stats.scoreDelta || 0) > 0 ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (historyData?.stats.scoreDelta || 0) < 0 ? (
                        <TrendingDown className="w-5 h-5" />
                      ) : null}
                      <span>
                        {(historyData?.stats.scoreDelta || 0) > 0 ? '+' : ''}
                        {historyData?.stats.scoreDelta || 0}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 mt-1">First vs Latest</span>
              </Card>
            </div>
          </div>

          {/* Time Series Score Trendline Chart */}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  Score Trajectory Over Time
                </CardTitle>
                <CardDescription className="text-xs">
                  Chronological progression of the weighted composite score across all completed audits
                </CardDescription>
              </div>

              {activeHoverPoint && (
                <div className="flex items-center gap-3 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-indigo-500/30 text-xs">
                  <span className="text-slate-400 font-mono">
                    {new Date(activeHoverPoint.date).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="font-bold font-mono text-emerald-400">
                    Overall: {activeHoverPoint.overallScore}
                  </span>
                  <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-400 border-l border-slate-800 pl-2">
                    <span>P: {activeHoverPoint.categoryScores?.performance ?? '—'}</span>
                    <span>S: {activeHoverPoint.categoryScores?.seo ?? '—'}</span>
                    <span>A: {activeHoverPoint.categoryScores?.accessibility ?? '—'}</span>
                    <span>Sec: {activeHoverPoint.categoryScores?.security ?? '—'}</span>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <Skeleton className="h-56 w-full rounded-xl" />
              ) : timeSeries.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                  <Activity className="w-6 h-6 text-slate-600" />
                  <span>No completed audit history points recorded yet for this domain.</span>
                </div>
              ) : (
                <div className="pt-4">
                  {/* SVG Chart */}
                  <div className="relative w-full h-56">
                    <ScoreTrendSvg
                      points={timeSeries}
                      onHoverPoint={setActiveHoverPoint}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
                    <span>
                      Earliest: {timeSeries[0]?.date ? new Date(timeSeries[0].date).toLocaleDateString() : '—'}
                    </span>
                    <span>
                      Latest: {timeSeries[timeSeries.length - 1]?.date ? new Date(timeSeries[timeSeries.length - 1].date).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historical Audit Records Table */}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="text-base">Audit Records</CardTitle>
              <CardDescription className="text-xs">
                Detailed scan log for {selectedWebsite.hostname} with reports, comparison, and exports
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-y border-slate-800 bg-slate-900/60 text-xs text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-5">Target URL</th>
                      <th className="py-3 px-4">Date & Trigger</th>
                      <th className="py-3 px-4 text-center">Overall</th>
                      <th className="py-3 px-4 text-center hidden md:table-cell">Perf</th>
                      <th className="py-3 px-4 text-center hidden md:table-cell">SEO</th>
                      <th className="py-3 px-4 text-center hidden md:table-cell">A11y</th>
                      <th className="py-3 px-4 text-center hidden md:table-cell">Sec</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {loadingHistory ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                          <Skeleton className="h-6 w-3/4 mx-auto mb-2" />
                          <Skeleton className="h-6 w-1/2 mx-auto" />
                        </td>
                      </tr>
                    ) : (historyData?.scans || []).length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                          No scan records found for this domain.
                        </td>
                      </tr>
                    ) : (
                      historyData!.scans.map((scan: ScanRecord, idx: number) => {
                        const previousScan = historyData!.scans[idx + 1];
                        const displayUrl = scan.requestedUrl || scan.finalUrl || selectedWebsite.url;
                        return (
                          <tr key={scan.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-5 font-semibold text-slate-100">
                              <div className="flex items-center gap-2">
                                <span className="max-w-[220px] truncate" title={displayUrl}>
                                  {displayUrl}
                                </span>
                                <a
                                  href={displayUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-slate-500 hover:text-slate-300"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-400">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 text-slate-300">
                                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{new Date(scan.createdAt).toLocaleString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}</span>
                                </div>
                                <span className="text-[10px] text-slate-500 capitalize ml-5">
                                  {scan.trigger || 'manual'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold">
                              {scan.overallScore !== undefined ? (
                                <span
                                  className={`px-2 py-0.5 rounded text-xs ${
                                    scan.overallScore >= 90
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : scan.overallScore >= 70
                                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  }`}
                                >
                                  {scan.overallScore}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-xs">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-xs hidden md:table-cell text-slate-400">
                              {scan.categoryScores?.performance ?? '—'}
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-xs hidden md:table-cell text-slate-400">
                              {scan.categoryScores?.seo ?? '—'}
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-xs hidden md:table-cell text-slate-400">
                              {scan.categoryScores?.accessibility ?? '—'}
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-xs hidden md:table-cell text-slate-400">
                              {scan.categoryScores?.security ?? '—'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge
                                variant={
                                  scan.status === 'COMPLETED'
                                    ? 'success'
                                    : scan.status === 'FAILED'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                                size="sm"
                              >
                                {scan.status.toLowerCase()}
                              </Badge>
                            </td>
                            <td className="py-3 px-5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Link to={`/reports/${scan.id}`}>
                                  <Button variant="outline" size="sm" className="h-7 text-xs">
                                    Report
                                  </Button>
                                </Link>
                                {previousScan && (
                                  <Link
                                    to={`/compare?baseScanId=${previousScan.id}&targetScanId=${scan.id}`}
                                    title="Compare with prior run"
                                  >
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      <GitCompare className="w-3.5 h-3.5 text-slate-400" />
                                    </Button>
                                  </Link>
                                )}
                                <a
                                  href={scanApi.getExportJsonUrl(scan.id)}
                                  target="_blank"
                                  rel="noreferrer"
                                  download={`weblens-audit-${scan.id}.json`}
                                  title="Export JSON report"
                                >
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <Download className="w-3.5 h-3.5 text-slate-400" />
                                  </Button>
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/**
 * Responsive SVG Score Trendline Chart
 */
function ScoreTrendSvg({
  points,
  onHoverPoint,
}: {
  points: WebsiteHistoryData['timeSeries'];
  onHoverPoint: (point: WebsiteHistoryData['timeSeries'][0] | null) => void;
}) {
  if (points.length === 0) return null;

  // Viewbox coordinates
  const width = 800;
  const height = 200;
  const padX = 40;
  const padY = 30;

  // Coordinate mapping
  const minScore = 0;
  const maxScore = 100;

  const getX = (index: number) => {
    if (points.length === 1) return width / 2;
    return padX + (index / (points.length - 1)) * (width - padX * 2);
  };

  const getY = (score: number) => {
    const clamped = Math.max(minScore, Math.min(maxScore, score));
    return height - padY - ((clamped - minScore) / (maxScore - minScore)) * (height - padY * 2);
  };

  // Generate SVG path coordinates
  const pathD = points.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.overallScore);
    if (idx === 0) return `M ${x},${y}`;
    return `${acc} L ${x},${y}`;
  }, '');

  // Fill area under line
  const fillD =
    points.length > 1
      ? `${pathD} L ${getX(points.length - 1)},${height - padY} L ${getX(0)},${height - padY} Z`
      : '';

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full overflow-visible"
      preserveAspectRatio="none"
      onMouseLeave={() => onHoverPoint(null)}
    >
      <defs>
        <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Grid Lines */}
      {[25, 50, 75, 100].map((score) => {
        const y = getY(score);
        return (
          <g key={score}>
            <line
              x1={padX}
              y1={y}
              x2={width - padX}
              y2={y}
              stroke="#334155"
              strokeDasharray="4 4"
              strokeOpacity="0.4"
            />
            <text
              x={padX - 8}
              y={y + 3}
              fill="#64748b"
              fontSize="10"
              fontFamily="monospace"
              textAnchor="end"
            >
              {score}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      {fillD && <path d={fillD} fill="url(#scoreAreaGradient)" />}

      {/* Line path */}
      {points.length > 1 && (
        <path
          d={pathD}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Point markers */}
      {points.map((pt, idx) => {
        const cx = getX(idx);
        const cy = getY(pt.overallScore);
        return (
          <g
            key={pt.id}
            className="cursor-pointer group"
            onMouseEnter={() => onHoverPoint(pt)}
          >
            <circle
              cx={cx}
              cy={cy}
              r="8"
              fill="#6366f1"
              fillOpacity="0.2"
              className="transition-all group-hover:r-12"
            />
            <circle
              cx={cx}
              cy={cy}
              r="4.5"
              fill="#0f172a"
              stroke="#818cf8"
              strokeWidth="2"
              className="transition-all group-hover:stroke-white"
            />
          </g>
        );
      })}
    </svg>
  );
}
