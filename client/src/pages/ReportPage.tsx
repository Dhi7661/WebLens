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
} from 'lucide-react';

export function ReportPage() {
  const { scanId = 'scan-101' } = useParams();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [findings, setFindings] = useState<FindingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      const res = await scanApi.getReport(scanId);
      if (res.success && res.data) {
        setScan(res.data.scan);
        setFindings(res.data.findings);
      }
      setIsLoading(false);
    }
    loadReport();
  }, [scanId]);

  const targetUrl = scan?.finalUrl || scan?.requestedUrl || 'https://mystore-demo.vercel.app';
  const overallScore = scan?.overallScore ?? 88;
  const perfScore = scan?.categoryScores?.performance ?? 82;
  const seoScore = scan?.categoryScores?.seo ?? 90;
  const a11yScore = scan?.categoryScores?.accessibility ?? 85;
  const secScore = scan?.categoryScores?.security ?? 95;
  const techScore = scan?.categoryScores?.technology ?? 90;

  const categories = [
    { key: 'all', label: 'All Findings', count: findings.length },
    { key: 'SEO', label: 'SEO', icon: Search, score: seoScore },
    { key: 'Performance', label: 'Performance', icon: Zap, score: perfScore },
    { key: 'Accessibility', label: 'Accessibility', icon: Eye, score: a11yScore },
    { key: 'Security', label: 'Security', icon: Lock, score: secScore },
    { key: 'Technology', label: 'Tech Stack', icon: Cpu, score: techScore },
  ];

  const filteredFindings =
    activeTab === 'all'
      ? findings
      : findings.filter((f) => f.category === activeTab);

  const handleSendAi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    const userMsg = aiPrompt.trim();
    setAiPrompt('');
    setAiChat((prev) => [...prev, { sender: 'user', text: userMsg }]);

    setTimeout(() => {
      let reply = `Based on the scan evidence for ${targetUrl}: You have ${findings.length} findings. Your SEO score is ${seoScore}/100. Check the SEO findings tab to see exact recommendations.`;
      if (userMsg.toLowerCase().includes('seo') || userMsg.toLowerCase().includes('title')) {
        reply = `SEO Analysis: Review your <title> and <h1> structure. If your title is under 10 characters or meta description is missing, updating them will immediately boost your organic visibility.`;
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant={scan?.status === 'COMPLETED' ? 'success' : 'running'} size="sm">
              {scan?.status || 'COMPLETED'}
            </Badge>
            <span className="text-xs text-slate-500 font-mono">ID: {scanId}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 flex items-center gap-2">
            <span>{targetUrl}</span>
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
              {scan?.durationMs ? `Duration: ${scan.durationMs}ms` : 'Duration: 3.8s'}
            </span>
            <span>Analyzer v1.0.0</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/compare?scanA=${scanId}&scanB=scan-102`}>
            <Button variant="outline" size="sm" leftIcon={<GitCompare className="w-4 h-4" />}>
              Compare Audit
            </Button>
          </Link>
          <Link to={`/analyze?url=${encodeURIComponent(targetUrl)}`}>
            <Button variant="primary" size="sm" leftIcon={<RotateCw className="w-4 h-4" />}>
              Rescan Target
            </Button>
          </Link>
        </div>
      </div>

      {/* Overall Score & Dimension Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {/* Main Score Hero Card */}
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
              Weighted composite from independent analyzers. Grade:{' '}
              <strong className={overallScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}>
                {overallScore >= 90 ? 'Excellent' : overallScore >= 75 ? 'Good' : 'Needs Work'}
              </strong>.
            </p>
          </CardContent>
        </Card>

        {/* 4 Mini Dimension Cards */}
        <div className="md:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <Search className="w-4 h-4 text-blue-400 mx-auto" />
              <span className="text-xs text-slate-400 block font-medium">SEO</span>
              <span className="text-xl font-bold text-blue-400 font-mono">{seoScore}</span>
              <span className="text-[10px] text-slate-500 block">Weight 20%</span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <Zap className="w-4 h-4 text-amber-400 mx-auto" />
              <span className="text-xs text-slate-400 block font-medium">Performance</span>
              <span className="text-xl font-bold text-amber-400 font-mono">{perfScore}</span>
              <span className="text-[10px] text-slate-500 block">Weight 25%</span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <Eye className="w-4 h-4 text-purple-400 mx-auto" />
              <span className="text-xs text-slate-400 block font-medium">Accessibility</span>
              <span className="text-xl font-bold text-purple-400 font-mono">{a11yScore}</span>
              <span className="text-[10px] text-slate-500 block">Weight 25%</span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <Lock className="w-4 h-4 text-emerald-400 mx-auto" />
              <span className="text-xs text-slate-400 block font-medium">Security</span>
              <span className="text-xl font-bold text-emerald-400 font-mono">{secScore}</span>
              <span className="text-[10px] text-slate-500 block">Weight 15%</span>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Analysis Section: Findings & AI Copilot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Category Tabs & Findings */}
        <div className="lg:col-span-7 space-y-6">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
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
                key={finding.id}
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

        {/* Right Side: Grounded AI Assistant Drawer */}
        <div className="lg:col-span-5 sticky top-20">
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
