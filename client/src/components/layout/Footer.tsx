import { ScanSearch, ShieldCheck, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950/90 text-slate-400 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-left">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
                <ScanSearch className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold text-slate-100">WebLens</span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Website intelligence and quality analysis platform. Turning technical observations
              into prioritized findings with actionable developer remediations.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Safe scanner policy: Non-intrusive public header and configuration audits only.</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Analyzers
            </h5>
            <ul className="space-y-1.5 text-xs">
              <li className="hover:text-slate-200 cursor-pointer">Performance & Timing</li>
              <li className="hover:text-slate-200 cursor-pointer">SEO & Structured Data</li>
              <li className="hover:text-slate-200 cursor-pointer">WCAG Accessibility</li>
              <li className="hover:text-slate-200 cursor-pointer">Security Headers (CSP, HSTS)</li>
              <li className="hover:text-slate-200 cursor-pointer">Technology Detector</li>
            </ul>
          </div>

          {/* Standards & Links */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Platform
            </h5>
            <ul className="space-y-1.5 text-xs">
              <li>
                <a
                  href="https://github.com/Dhi7661/WebLens"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-slate-200 transition-colors"
                >
                  GitHub Source
                </a>
              </li>
              <li className="hover:text-slate-200 cursor-pointer">Architecture Docs</li>
              <li className="hover:text-slate-200 cursor-pointer">SSRF Protection Policy</li>
              <li className="hover:text-slate-200 cursor-pointer">Scoring Methodology</li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© {new Date().getFullYear()} WebLens. Built for engineering excellence.</p>
          <p className="flex items-center gap-1">
            Built with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> React, Node.js & TypeScript
          </p>
        </div>
      </div>
    </footer>
  );
}
