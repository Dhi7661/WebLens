import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Input } from '../components/ui';
import { History, Search, GitCompare, ExternalLink, Clock } from 'lucide-react';

export function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const historyItems = [
    {
      id: 'scan-101',
      url: 'https://mystore-demo.vercel.app',
      date: 'Sep 25, 2026, 2:40 PM',
      score: 88,
      status: 'completed' as const,
      issues: 2,
    },
    {
      id: 'scan-102',
      url: 'https://dev-portfolio.io',
      date: 'Sep 25, 2026, 12:15 PM',
      score: 94,
      status: 'completed' as const,
      issues: 0,
    },
    {
      id: 'scan-103',
      url: 'https://client-agency-portal.com',
      date: 'Sep 24, 2026, 6:30 PM',
      score: 68,
      status: 'completed' as const,
      issues: 5,
    },
  ];

  const filtered = historyItems.filter((item) =>
    item.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <h1 className="text-2xl font-bold text-slate-100">Scan History</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Access past audits, evaluate improvements, and compare versions
          </p>
        </div>
      </div>

      <div className="max-w-md">
        <Input
          placeholder="Filter by domain..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Search className="w-4 h-4 text-slate-400" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit Records</CardTitle>
          <CardDescription>Persisted scan reports across all monitored domains</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-y border-slate-800 bg-slate-900/60 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-5">Target URL</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-5 font-semibold text-slate-100">
                      <div className="flex items-center gap-2">
                        <span>{item.url}</span>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-500 hover:text-slate-300"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.date}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                      {item.score}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="success" size="sm">
                        {item.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/reports/${item.id}`}>
                          <Button variant="outline" size="sm">
                            View Report
                          </Button>
                        </Link>
                        <Link to={`/compare?scanA=scan-101&scanB=${item.id}`}>
                          <Button variant="ghost" size="sm" title="Compare">
                            <GitCompare className="w-4 h-4 text-slate-400" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
