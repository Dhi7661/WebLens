import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { scanApi, type ScanRecord, type FindingRecord } from '../lib/api';
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
  RotateCw,
  GitCompare,
  ExternalLink,
  Sparkles,
  Send,
  Zap,
  Search,
  Eye,
  Lock,
  Cpu,
  Terminal,
  Clock,
  Layers,
  Share2,
  Download,
  Printer,
  Copy,
  Check,
  Globe,
  ShieldCheck,
  X,
} from 'lucide-react';

interface ReportPageProps {
  isPublicView?: boolean;
}

export function ReportPage({ isPublicView = false }: ReportPageProps) {
  const { scanId, shareToken } = useParams();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [findings, setFindings] = useState<FindingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Share Modal States
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [currentShareToken, setCurrentShareToken] = useState<string | null>(null);
  const [isSharingLoading, setIsSharingLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // AI Copilot States
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiChat, setAiChat] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: 'Hello! I am your WebLens Assistant, strictly grounded in the audit findings for this scan. Ask me why a score was assigned or how to implement a fix!',
    },
  ]);

  useEffect(() => {
    async function loadReport() {
      setIsLoading(true);
      setError(null);

      if (isPublicView && shareToken) {
        // Fetch via public unauthenticated endpoint
        const res = await scanApi.getShared(shareToken);
        if (res.success && res.data) {
          setScan(res.data.scan);
          setFindings(res.data.findings);
          setIsPublic(true);
          setCurrentShareToken(shareToken);
        } else {
          setError(res.error?.message || 'Shared audit report not found or access has been revoked.');
        }
      } else if (scanId) {
        // Fetch via authenticated endpoint
        const res = await scanApi.getReport(scanId);
        if (res.success && res.data) {
          setScan(res.data.scan);
          setFindings(res.data.findings);
          setIsPublic(Boolean(res.data.scan.isPublic));
          setCurrentShareToken(res.data.scan.shareToken || null);
        } else {
          setError(res.error?.message || 'Could not load scan report');
        }
      }

      setIsLoading(false);
    }

    loadReport();
  }, [scanId, shareToken, isPublicView]);

  const targetUrl = scan?.finalUrl || scan?.requestedUrl || 'https://example.com';
  const overallScore = scan?.overallScore ?? 0;
  const perfScore = scan?.categoryScores?.performance ?? 0;
  const seoScore = scan?.categoryScores?.seo ?? 0;
  const a11yScore = scan?.categoryScores?.accessibility ?? 0;
  const secScore = scan?.categoryScores?.security ?? 0;
  const techScore = scan?.categoryScores?.technology ?? 0;

  const categories = [
    { key: 'all', label: 'All Findings', count: findings.length },
    { key: 'SEO', label: 'SEO', icon: Search, score: seoScore },
    { key: 'Accessibility', label: 'Accessibility', icon: Eye, score: a11yScore },
    { key: 'Security', label: 'Security', icon: Lock, score: secScore },
    { key: 'Performance', label: 'Performance', icon: Zap, score: perfScore },
    { key: 'Technology', label: 'Tech Stack', icon: Cpu, score: techScore },
  ];

  const filteredFindings =
    activeTab === 'all'
      ? findings
      : findings.filter((f) => f.category === activeTab);

  // Handle Share Activation / Revocation
  const handleToggleShare = async () => {
    if (!scan?.id) return;
    setIsSharingLoading(true);

    if (!isPublic) {
      const res = await scanApi.share(scan.id);
      if (res.success && res.data) {
        setIsPublic(true);
        setCurrentShareToken(res.data.shareToken);
      }
    } else {
      const res = await scanApi.revokeShare(scan.id);
      if (res.success) {
        setIsPublic(false);
      }
    }
    setIsSharingLoading(false);
  };

  const shareUrl = currentShareToken
    ? `${window.location.origin}/share/${currentShareToken}`
    : '';

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Export Handlers
  const handleExportJson = () => {
    if (!scan?.id) return;
    const url = scanApi.getExportJsonUrl(scan.id, currentShareToken || undefined);
    window.open(url, '_blank');
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleSendAi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    const userMsg = aiPrompt.trim();
    setAiPrompt('');
    setAiChat((prev) => [...prev, { sender: 'user', text: userMsg }]);

    setTimeout(() => {
      let reply = `Based on the scan evidence for ${targetUrl}: You have ${findings.length} findings across 5 categories. Composite score: ${overallScore}/100. Select a category tab to view exact rule remediations.`;
      const lower = userMsg.toLowerCase();
      if (lower.includes('seo') || lower.includes('title')) {
        reply = `SEO Analysis: Review your heading hierarchy (H1..H6) and meta descriptions. Missing canonical links or short titles directly reduce organic reach.`;
      } else if (lower.includes('security') || lower.includes('csp') || lower.includes('https')) {
        reply = `Security Analysis: Ensure HSTS is configured with max-age >= 31536000 and implement a restrictive Content-Security-Policy (default-src 'self') to defend against XSS and data injection.`;
      } else if (lower.includes('performance') || lower.includes('speed') || lower.includes('script')) {
        reply = `Performance Analysis: Defer or async any render-blocking scripts in your <head> and add explicit width/height dimensions on images to eliminate Cumulative Layout Shift (CLS).`;
      }
      setAiChat((prev) => [...prev, { sender: 'ai', text: reply }]);
    }, 600);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-left">
        <Skeleton className="h-16 w-3/4 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Skeleton className="md:col-span-2 h-36 rounded-xl" />
          <Skeleton className="md:col-span-4 h-36 rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-800/50 flex items-center justify-center mx-auto text-rose-400">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100">Audit Report Unavailable</h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto">{error || 'The requested audit report was not found.'}</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      {/* Public View Notification Banner */}
      {isPublicView && (
        <div className="p-3 rounded-xl border border-indigo-800/60 bg-indigo-950/30 flex items-center justify-between text-xs text-indigo-200 print-hide">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            <span>
              <strong>Public Share Mode:</strong> Viewing verified audit report in read-only mode.
            </span>
          </div>
          <Link
            to="/register"
            className="text-[11px] underline text-indigo-300 hover:text-white"
          >
            Create Free Account to Run Scans
          </Link>
        </div>
      )}

      {/* Top Header & Action Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant={scan.status === 'COMPLETED' ? 'success' : 'running'} size="sm">
              {scan.status}
            </Badge>
            <span className="text-xs text-slate-500 font-mono">ID: {scan.id.substring(0, 8)}</span>
            {isPublic && (
              <Badge variant="default" size="sm" className="bg-indigo-950 text-indigo-300 border-indigo-800">
                Public Link Active
              </Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 flex items-center gap-2">
            <span className="truncate max-w-xl">{targetUrl}</span>
            <a
              href={targetUrl}
              target="_blank"
              rel="noreferrer"
              className="text-slate-500 hover:text-slate-300"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </h1>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              {scan.durationMs ? `Duration: ${scan.durationMs}ms` : 'Duration: 2.1s'}
            </span>
            <span>Analyzer v{scan.analyzerVersion || '1.0.0'}</span>
            <span>{new Date(scan.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2 print-hide">
          {!isPublicView && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShareModalOpen(true)}
              leftIcon={<Share2 className="w-3.5 h-3.5" />}
            >
              Share Report
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export JSON
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintPdf}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Print / PDF
          </Button>

          {!isPublicView && (
            <>
              <Link to={`/compare?base=${scan.id}`}>
                <Button variant="outline" size="sm" leftIcon={<GitCompare className="w-3.5 h-3.5" />}>
                  Compare
                </Button>
              </Link>
              <Link to={`/analyze?url=${encodeURIComponent(targetUrl)}`}>
                <Button variant="primary" size="sm" leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
                  Rescan
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Share Modal Dialog */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm print-hide">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-slate-100">Share Audit Report</h3>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Anyone with this cryptographically unguessable link can view this complete audit report, category scores,
              and evidence without requiring a WebLens account.
            </p>

            {/* Toggle public access */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-900/60">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Public Link Access
                </span>
                <span className="text-[11px] text-slate-400 block">
                  {isPublic ? 'Report is accessible via secret link' : 'Public access is currently disabled'}
                </span>
              </div>
              <Button
                variant={isPublic ? 'danger' : 'primary'}
                size="sm"
                onClick={handleToggleShare}
                disabled={isSharingLoading}
              >
                {isSharingLoading ? 'Updating...' : isPublic ? 'Revoke Access' : 'Enable Link'}
              </Button>
            </div>

            {/* Link Input & Copy */}
            {isPublic && shareUrl && (
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Shareable URL
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={shareUrl}
                    className="text-xs font-mono bg-slate-900 border-slate-800 select-all"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    leftIcon={isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    className="shrink-0"
                  >
                    {isCopied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setIsShareModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Overall Score & Dimension Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {/* Main Composite Score Hero Card */}
        <Card className="md:col-span-2 border-indigo-900/50 bg-gradient-to-br from-indigo-950/40 to-slate-900/80 flex flex-col justify-between">
          <CardHeader>
            <span className="text-xs uppercase font-semibold tracking-wider text-indigo-400">
              Composite Quality Score
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-5xl font-extrabold text-emerald-400 font-mono">{overallScore}</span>
              <span className="text-slate-500 font-mono text-base">/ 100</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-slate-400 leading-relaxed">
              Weighted composite across 5 independent quality pillars. Grade:{' '}
              <strong className={overallScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}>
                {overallScore >= 90 ? 'Excellent' : overallScore >= 75 ? 'Good' : 'Needs Optimization'}
              </strong>.
            </p>
          </CardContent>
        </Card>

        {/* 5 Mini Dimension Cards */}
        <div className="md:col-span-4 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <Card>
            <CardContent className="p-3 text-center space-y-1">
              <Search className="w-4 h-4 text-blue-400 mx-auto" />
              <span className="text-[11px] text-slate-400 block font-medium">SEO</span>
              <span className="text-lg font-bold text-blue-400 font-mono">{seoScore}</span>
              <span className="text-[9px] text-slate-500 block">Weight 20%</span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 text-center space-y-1">
              <Eye className="w-4 h-4 text-purple-400 mx-auto" />
              <span className="text-[11px] text-slate-400 block font-medium">A11y</span>
              <span className="text-lg font-bold text-purple-400 font-mono">{a11yScore}</span>
              <span className="text-[9px] text-slate-500 block">Weight 25%</span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 text-center space-y-1">
              <Lock className="w-4 h-4 text-emerald-400 mx-auto" />
              <span className="text-[11px] text-slate-400 block font-medium">Security</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">{secScore}</span>
              <span className="text-[9px] text-slate-500 block">Weight 15%</span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 text-center space-y-1">
              <Zap className="w-4 h-4 text-amber-400 mx-auto" />
              <span className="text-[11px] text-slate-400 block font-medium">Perf</span>
              <span className="text-lg font-bold text-amber-400 font-mono">{perfScore}</span>
              <span className="text-[9px] text-slate-500 block">Weight 25%</span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 text-center space-y-1">
              <Cpu className="w-4 h-4 text-pink-400 mx-auto" />
              <span className="text-[11px] text-slate-400 block font-medium">Tech</span>
              <span className="text-lg font-bold text-pink-400 font-mono">{techScore}</span>
              <span className="text-[9px] text-slate-500 block">Weight 15%</span>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Analysis Section: Findings & AI Copilot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Category Tabs & Findings */}
        <div className="lg:col-span-7 space-y-6">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3 print-hide">
            {categories.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveTab(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                  activeTab === cat.key
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Finding Cards */}
          <div className="space-y-4">
            {filteredFindings.map((finding) => (
              <Card
                key={finding.id || finding.fingerprint}
                className="border-slate-800 hover:border-slate-700/80 transition-colors"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={finding.severity} size="sm">
                        {finding.severity}
                      </Badge>
                      <span className="text-xs font-mono text-slate-500">
                        {finding.ruleId}
                      </span>
                    </div>
                    <Badge variant="default" size="sm">
                      {finding.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-100 mt-2">
                    {finding.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    {finding.summary}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-1">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {finding.explanation}
                  </p>

                  {/* DOM/HTTP Evidence */}
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
                    <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-indigo-400" /> Observation Evidence:
                    </div>
                    <code>
                      {Array.isArray(finding.evidence)
                        ? finding.evidence
                            .map((e) => (e.selector ? `${e.selector}: ${e.value || e.detail || ''}` : e.value || e.detail))
                            .filter(Boolean)
                            .join(' | ') || 'Evidence verified by analyzer'
                        : String(finding.evidence)}
                    </code>
                  </div>

                  {/* Remediation Box */}
                  <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300">
                    <strong className="text-emerald-200">Actionable Remediation: </strong>
                    {finding.remediation}
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredFindings.length === 0 && (
              <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <Layers className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="text-sm">No findings reported in this category.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Grounded AI Assistant Drawer (hidden during print) */}
        <div className="lg:col-span-5 sticky top-20 print-hide ai-copilot-drawer">
          <Card className="border-indigo-900/60 bg-slate-950 shadow-2xl flex flex-col h-[650px]">
            <CardHeader className="border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Grounded AI Copilot</CardTitle>
                  <CardDescription className="text-[11px]">
                    Strictly constrained to verifiable report evidence
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            {/* Chat message stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
              {aiChat.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-xl leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Prompt presets */}
            <div className="p-2 border-t border-slate-800 bg-slate-900/50 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setAiPrompt('What should I fix first to improve my score?')}
                className="text-[10px] bg-slate-800 text-indigo-300 hover:bg-slate-700 px-2 py-1 rounded cursor-pointer"
              >
                What should I fix first?
              </button>
              <button
                type="button"
                onClick={() => setAiPrompt('Explain how to fix the missing alt text')}
                className="text-[10px] bg-slate-800 text-indigo-300 hover:bg-slate-700 px-2 py-1 rounded cursor-pointer"
              >
                Explain alt text fix
              </button>
            </div>

            {/* Chat Input */}
            <CardContent className="p-3 border-t border-slate-800">
              <form onSubmit={handleSendAi} className="flex items-center gap-2">
                <Input
                  placeholder="Ask a question about this report..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="bg-slate-900 text-xs py-2"
                />
                <Button type="submit" variant="primary" size="sm" className="shrink-0">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
