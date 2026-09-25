import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Badge } from '../components/ui';
import { Compass, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

export function AnalyzePage() {
  const [searchParams] = useSearchParams();
  const initialUrl = searchParams.get('url') || '';
  const [url, setUrl] = useState(initialUrl);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleStartScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter a website URL');
      return;
    }
    if (!/^https?:\/\//i.test(url.trim())) {
      setError('URL must start with http:// or https://');
      return;
    }

    // SSRF client-side basic validation check
    try {
      const parsed = new URL(url.trim());
      if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) {
        setError('Scanning internal and localhost addresses is forbidden (SSRF Protection)');
        return;
      }
    } catch {
      setError('Invalid URL format');
      return;
    }

    setError('');
    setIsScanning(true);

    // Mock transition for Phase 1 UI foundation (will connect to backend job in Phase 3)
    setTimeout(() => {
      setIsScanning(false);
      navigate('/reports/scan-101');
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left space-y-8">
      <div>
        <Badge variant="queued" size="md" className="mb-2">
          New Analysis
        </Badge>
        <h1 className="text-3xl font-bold text-slate-100">Audit Website</h1>
        <p className="text-sm text-slate-400 mt-1">
          Enter any public URL to initiate a complete performance, SEO, accessibility, and security analysis.
        </p>
      </div>

      <Card className="border-slate-800 bg-slate-900/60 shadow-xl">
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
              leftIcon={<Compass className="w-4 h-4 text-indigo-400" />}
              helperText="Must be a publicly accessible domain"
            />

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-300 block mb-1">
                Included Analyzers in this run:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Performance: Navigation timing & payloads</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>SEO: Meta tags, headings, canonicals</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Accessibility: Form labels, alt text, ARIA</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Security: CSP, HSTS, Referrer-Policy headers</span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full sm:w-auto"
              isLoading={isScanning}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {isScanning ? 'Initiating Scan Job...' : 'Begin Comprehensive Scan'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          WebLens strictly prohibits crawling non-public network endpoints (RFC 1918) and respects server rate limits.
        </span>
      </div>
    </div>
  );
}
