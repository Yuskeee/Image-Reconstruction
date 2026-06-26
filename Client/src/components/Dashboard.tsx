import React, { useState } from 'react';
import { BarChart2, ChevronDown } from 'lucide-react';

export interface RunStats {
  count: number;
  timesMs: number[];
  cgneSharpnesses: number[];
  cgnrSharpnesses: number[];
}

interface DashboardProps {
  swift: RunStats;
  python: RunStats;
}

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

const p95 = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(0.95 * sorted.length)];
};

const computeMetrics = (stats: RunStats) => {
  const { count, timesMs, cgneSharpnesses, cgnrSharpnesses } = stats;
  if (count === 0) return null;
  const totalMs = sum(timesMs);
  const totalSec = totalMs / 1000;
  const allSharpnesses = [...cgneSharpnesses, ...cgnrSharpnesses];
  return {
    count,
    totalSec:     totalSec.toFixed(3),
    ips:          (count / totalSec).toFixed(2),
    avgMs:        (totalMs / count).toFixed(2),
    p95Ms:        p95(timesMs).toFixed(2),
    avgSharpness: allSharpnesses.length > 0 ? (sum(allSharpnesses) / allSharpnesses.length).toFixed(2) : '—',
  };
};

const Dashboard: React.FC<DashboardProps> = ({ swift, python }) => {
  const [expanded, setExpanded] = useState(false);

  const swiftM  = computeMetrics(swift);
  const pythonM = computeMetrics(python);

  if (!swiftM && !pythonM) return null;

  const rows = [
    { label: 'Total Images',    swift: swiftM?.count        ?? '—', python: pythonM?.count        ?? '—' },
    { label: 'Total Time (s)',  swift: swiftM?.totalSec     ?? '—', python: pythonM?.totalSec     ?? '—' },
    { label: 'IPS',             swift: swiftM?.ips          ?? '—', python: pythonM?.ips          ?? '—' },
    { label: 'Avg Time (ms)',   swift: swiftM?.avgMs        ?? '—', python: pythonM?.avgMs        ?? '—' },
    { label: 'P95 (ms)',        swift: swiftM?.p95Ms        ?? '—', python: pythonM?.p95Ms        ?? '—' },
    { label: 'Avg Sharpness',   swift: swiftM?.avgSharpness ?? '—', python: pythonM?.avgSharpness ?? '—' },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center justify-between p-6 hover:bg-zinc-800/40 transition-colors"
      >
        <h2 className="text-lg font-medium text-zinc-100 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-zinc-500" />
          Run Dashboard
        </h2>
        <ChevronDown
          className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="px-6 pb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-800">
                <th className="text-left pb-3 font-medium">Metric</th>
                <th className="text-right pb-3 font-medium">Swift</th>
                <th className="text-right pb-3 font-medium">Python</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {rows.map(row => (
                <tr key={row.label}>
                  <td className="py-2.5 text-zinc-400">{row.label}</td>
                  <td className="py-2.5 text-right font-mono text-zinc-300">{String(row.swift)}</td>
                  <td className="py-2.5 text-right font-mono text-zinc-300">{String(row.python)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
