import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Badge } from '../components/ui';
import { useAuth } from '../features/auth/AuthContext';
import { scanApi, type ScanRecord } from '../lib/api';
import {
  Compass,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Loader2,
  Terminal,
} from 'lucide-react';

export function AnalyzePage() {
  const [searchParams] = useSearchParams();
  const initialUrl = searchParams.get('url') || '';
  const [url, setUrl] = useState(initialUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeScan, setActiveScan] = useState<ScanRecord | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);


  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Cleanup polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const startPolling = (scanId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      const res = await scanApi.getStatus(scanId);
      if (res.success && res.data?.scan) {
        const currentScan = res.data.scan;
        setActiveScan(currentScan);

        if (currentScan.status === 'COMPLETED') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setTimeout(() => {
            navigate(`/reports/${currentScan.id}`);
          }, 1200);
        } else if (currentScan.status === 'FAILED') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setError(currentScan.errorMessage || 'Scan processing failed. Please retry.');
        }
      }
    }, 1000);
  };

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter a website URL');
      return;
    }

    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/analyze?url=${encodeURIComponent(url.trim())}`)}`);
      return;
    }

    setError('');
    setIsSubmitting(true);

    const res = await scanApi.create(url.trim());
    setIsSubmitting(false);

    if (res.success && res.data?.scan) {
      setActiveScan(res.data.scan);
      startPolling(res.data.scan.id);
    } else {
      setError(res.error?.message || 'Could not initiate scan job.');
    }
  };

  const handleRetry = async () => {
    if (!activeScan) return;
    setError('');
    const res = await scanApi.retry(activeScan.id);
    if (res.success && res.data?.scan) {
      setActiveScan(res.data.scan);
      startPolling(res.data.scan.id);
    } else {
      setError(res.error?.message || 'Failed to retry scan.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left space-y-8">
      <div>
        <Badge variant="queued" size="md" className="mb-2">
          New Analysis
        </Badge>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Audit Website</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Enter any public URL to initiate a complete performance, SEO, accessibility, and security analysis.
        </p>
      </div>

      {!isAuthenticated && (
        <div className="p-4 rounded-xl border border-indigo-900/60 bg-indigo-950/20 text-indigo-300 text-xs flex items-center justify-between">
          <span>You need to be signed in to create and track website scans.</span>
          <Link to={`/login?redirect=${encodeURIComponent('/analyze')}`}>
            <Button variant="primary" size="sm">
              Sign In to Scan
            </Button>
          </Link>
        </div>
      )}

      {/* URL Input Card */}
      {!activeScan && (
        <Card className="border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl">
          <CardHeader>
            <CardTitle>Target Specification</CardTitle>
            <CardDescription>
              Specify the full public HTTP or HTTPS address to analyze.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStartScan} className="space-y-4">
              <Input
                label="Website URL"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError('');
                }}
                error={error}
                leftIcon={<Compass className="w-4 h-4 text-indigo-500" />}
                helperText="Must be a publicly accessible domain (SSRF protection will verify DNS)"
              />

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-300 block mb-1">
                  Included Analyzers in this run:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Performance: Navigation timing & payloads</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>SEO: Meta tags, headings, canonicals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Accessibility: Form labels, alt text, ARIA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Security: CSP, HSTS, Referrer-Policy headers</span>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
                isLoading={isSubmitting}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Begin Comprehensive Scan
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Active Scan Progress Card */}
      {activeScan && (
        <Card className="border-indigo-900/60 bg-slate-900/90 shadow-2xl p-6 space-y-6 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant={
                    activeScan.status === 'COMPLETED'
                      ? 'success'
                      : activeScan.status === 'RUNNING'
                      ? 'running'
                      : activeScan.status === 'QUEUED'
                      ? 'queued'
                      : 'critical'
                  }
                  size="sm"
                >
                  {activeScan.status}
                </Badge>
                <span className="text-xs text-slate-400 font-mono">Job ID: {activeScan.id}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-100">{activeScan.finalUrl}</h3>
            </div>

            {activeScan.status === 'FAILED' && (
              <Button variant="danger" size="sm" onClick={handleRetry} leftIcon={<RotateCw className="w-4 h-4" />}>
                Retry Scan
              </Button>
            )}
          </div>

          {/* Stepper Progress */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200">1. SSRF & Public DNS Verification Completed</span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200">2. Scan Job Enqueued in Background Worker</span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              {activeScan.status === 'RUNNING' || activeScan.status === 'COMPLETED' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
              )}
              <span className={activeScan.status === 'RUNNING' ? 'text-cyan-300 font-medium' : 'text-slate-300'}>
                3. Running Controlled Headless Browser & Collecting PageContext...
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              {activeScan.status === 'COMPLETED' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
              )}
              <span className={activeScan.status === 'COMPLETED' ? 'text-emerald-300 font-semibold' : 'text-slate-500'}>
                4. Scoring & Persisting Findings
              </span>
            </div>
          </div>

          {/* Terminal Observation Feed */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>SCAN RUNNER LOG</span>
            </div>
            <p className="text-slate-400">
              [worker] Target validated: {activeScan.finalUrl}
            </p>
            {activeScan.status === 'RUNNING' && (
              <p className="text-cyan-400 animate-pulse">
                [worker] Headless browser active. Running analyzer modules...
              </p>
            )}
            {activeScan.status === 'COMPLETED' && (
              <p className="text-emerald-400 font-semibold">
                [worker] Analysis finalized in {activeScan.durationMs}ms. Redirecting to report...
              </p>
            )}
            {activeScan.status === 'FAILED' && (
              <p className="text-rose-400 font-semibold">
                [worker] Error: {activeScan.errorMessage || 'Scan execution failed.'}
              </p>
            )}
          </div>

          {activeScan.status === 'COMPLETED' && (
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => navigate(`/reports/${activeScan.id}`)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              View Full Report ({activeScan.overallScore}/100)
            </Button>
          )}

          {activeScan.status !== 'COMPLETED' && (
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                Live status polling (1s interval)...
              </span>
              <button
                type="button"
                onClick={() => setActiveScan(null)}
                className="text-slate-500 hover:text-slate-300 underline cursor-pointer"
              >
                Cancel / New Target
              </button>
            </div>
          )}
        </Card>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/20 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <strong className="block text-rose-200 mb-0.5">Scan Denied or Failed</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          WebLens strictly prohibits crawling non-public network endpoints (RFC 1918) and respects server rate limits.
        </span>
      </div>
    </div>
  );
}
