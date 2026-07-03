import React from 'react';
import { Eye, Activity } from 'lucide-react';
import type { RunStats } from './Dashboard';

interface KPICardsProps {
  swift: RunStats;
  python: RunStats;
}

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

const p95 = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(0.95 * sorted.length)];
};

const W = 280;
const H = 60;

const toSparkline = (values: number[], maxLen: number, yMin: number, yMax: number): string => {
  if (values.length < 2) return '';
  return values
    .map((v, i) => {
      const x = (i / (maxLen - 1)) * W;
      const y = H - ((v - yMin) / (yMax - yMin || 1)) * H;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
};

const KPICards: React.FC<KPICardsProps> = ({ swift, python }) => {
  const pythonHasData = python.count > 0;
  const swiftHasData  = swift.count  > 0;
  const bothHaveData  = pythonHasData && swiftHasData;

  if (!pythonHasData) return null;

  // --- IPS ---
  const pythonIPS    = python.count / (sum(python.timesMs) / 1000);
  const swiftIPS     = swiftHasData ? swift.count / (sum(swift.timesMs) / 1000) : 0;
  const maxIPS       = Math.max(pythonIPS, swiftIPS, 0.001) * 1.15;
  const pythonBarPct = (pythonIPS / maxIPS) * 100;
  const swiftBarPct  = (swiftIPS  / maxIPS) * 100;

  let ipsWinnerText = '';
  if (swiftHasData && swiftIPS > 0) {
    const winner    = pythonIPS >= swiftIPS ? 'Python' : 'Swift';
    const winnerVal = Math.max(pythonIPS, swiftIPS);
    const loserVal  = Math.min(pythonIPS, swiftIPS);
    const pct       = ((winnerVal / loserVal - 1) * 100).toFixed(0);
    ipsWinnerText   = `${winner} is +${pct}% faster`;
  }

  // --- Sparkline tempo por servidor ---
  const allTimes  = [...python.timesMs, ...swift.timesMs];
  const tMin      = allTimes.length > 0 ? Math.min(...allTimes) : 0;
  const tMax      = allTimes.length > 0 ? Math.max(...allTimes) : 1;
  const tMaxLen   = Math.max(python.timesMs.length, swift.timesMs.length, 2);
  const pythonTimeLine = toSparkline(python.timesMs, tMaxLen, tMin, tMax);
  const swiftTimeLine  = toSparkline(swift.timesMs,  tMaxLen, tMin, tMax);

  let timeWinnerText = '';
  if (swiftHasData && python.timesMs.length > 0 && swift.timesMs.length > 0) {
    const pythonAvgMs = sum(python.timesMs) / python.timesMs.length;
    const swiftAvgMs  = sum(swift.timesMs)  / swift.timesMs.length;
    const faster      = swiftAvgMs <= pythonAvgMs ? 'Swift' : 'Python';
    const fasterVal   = Math.min(swiftAvgMs, pythonAvgMs);
    const slowerVal   = Math.max(swiftAvgMs, pythonAvgMs);
    const pct         = ((slowerVal / fasterVal - 1) * 100).toFixed(0);
    timeWinnerText    = `${faster} is +${pct}% faster per image`;
  }

  // --- Nitidez (cards textuais) ---
  const cgneSharpnesses = [...swift.cgneSharpnesses, ...python.cgneSharpnesses];
  const cgnrSharpnesses = [...swift.cgnrSharpnesses, ...python.cgnrSharpnesses];
  const cgneSharp    = cgneSharpnesses.length > 0 ? sum(cgneSharpnesses) / cgneSharpnesses.length : 0;
  const cgnrSharp    = cgnrSharpnesses.length > 0 ? sum(cgnrSharpnesses) / cgnrSharpnesses.length : 0;
  const sharpWinner  = cgneSharp >= cgnrSharp ? 'CGNE' : 'CGNR';
  const sharpWinnerVal = Math.max(cgneSharp, cgnrSharp);
  const sharpLoserVal  = Math.min(cgneSharp, cgnrSharp);
  const sharpPct       = sharpLoserVal > 0 ? ((sharpWinnerVal / sharpLoserVal - 1) * 100).toFixed(0) : '—';

  // --- P95 ---
  const swiftP95  = p95(swift.timesMs);
  const pythonP95 = p95(python.timesMs);
  const p95Winner = swiftP95 <= pythonP95 ? 'Swift' : 'Python';

  const gridLine = (t: number) => (
    <line
      key={t}
      x1={0} y1={H * (1 - t)}
      x2={W} y2={H * (1 - t)}
      stroke="#3f3f46"
      strokeWidth="0.5"
      strokeDasharray="4 4"
    />
  );

  return (
    <div className="space-y-4">

      {/* Linha 1: dois gráficos empilhados, largura total */}
      <div className="flex flex-col gap-4">

        {/* Card Time / Image — sparkline (topo) */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 flex flex-col gap-3 min-h-[200px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Time / Image</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                <span className="inline-block w-4 h-0.5 bg-violet-400 rounded" />
                Python
              </span>
              <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                <span className="inline-block w-4 h-0.5 bg-sky-400 rounded" />
                Swift
              </span>
            </div>
          </div>

          <div className="flex-1 flex items-center">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '120px' }} preserveAspectRatio="none">
              {[0.25, 0.5, 0.75].map(gridLine)}
              {pythonTimeLine && (
                <polyline points={pythonTimeLine} fill="none" stroke="#a78bfa" strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round" />
              )}
              {swiftTimeLine && (
                <polyline points={swiftTimeLine}  fill="none" stroke="#38bdf8" strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round" />
              )}
            </svg>
          </div>

          {/* Tempo médio por servidor */}
          <div className="flex gap-6 pt-1">
            <div className="flex items-baseline gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-violet-400 shrink-0" />
              <span className="text-[10px] text-zinc-500">Python avg</span>
              <span className="text-xs font-mono text-zinc-300">
                {python.timesMs.length > 0 ? (sum(python.timesMs) / python.timesMs.length).toFixed(1) : '--'}
                <span className="text-zinc-600 ml-0.5">ms</span>
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-sky-400 shrink-0" />
              <span className="text-[10px] text-zinc-500">Swift avg</span>
              <span className="text-xs font-mono text-zinc-300">
                {swift.timesMs.length > 0 ? (sum(swift.timesMs) / swift.timesMs.length).toFixed(1) : '--'}
                <span className="text-zinc-600 ml-0.5">ms</span>
              </span>
            </div>
          </div>
        </div>

        {/* Card Throughput — barras */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 flex flex-col gap-4 min-h-[200px]">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Throughput</span>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-400 w-11 text-right shrink-0">Python</span>
              <div className="flex-1 h-5 flex items-center">
                <div
                  className="h-full bg-violet-500 rounded-[3px] transition-all duration-500 ease-out"
                  style={{ width: `${pythonBarPct}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-zinc-300 w-[70px] shrink-0">
                {pythonIPS.toFixed(1)}{' '}
                <span className="text-zinc-600 text-[10px]">img/s</span>
              </span>
            </div>

            {swiftHasData && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 w-11 text-right shrink-0">Swift</span>
                <div className="flex-1 h-5 flex items-center">
                  <div
                    className="h-full bg-sky-400 rounded-[3px] transition-all duration-500 ease-out"
                    style={{ width: `${swiftBarPct}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono text-zinc-300 w-[70px] shrink-0">
                  {swiftIPS.toFixed(1)}{' '}
                  <span className="text-zinc-600 text-[10px]">img/s</span>
                </span>
              </div>
            )}
          </div>

          {ipsWinnerText && (
            <p className="text-xs text-zinc-500 mt-auto">{ipsWinnerText}</p>
          )}
        </div>

      </div>

      {/* Linha 2: dois cards textuais */}
      {pythonHasData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Card Avg Sharpness */}
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 space-y-3 min-h-[160px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Avg Sharpness</span>
              <Eye className="w-4 h-4 text-zinc-600" />
            </div>
            <div className="flex items-end gap-6">
              <div>
                <span className="text-[10px] text-zinc-500 block mb-1">CGNE</span>
                <p className={`text-2xl font-mono font-semibold ${cgneSharpnesses.length > 0 && sharpWinner === 'CGNE' ? 'text-zinc-100' : 'text-zinc-600'}`}>
                  {cgneSharpnesses.length > 0 ? cgneSharp.toFixed(2) : '--'}
                </p>
              </div>
              <span className="text-zinc-700 text-sm mb-1">vs</span>
              <div>
                <span className="text-[10px] text-zinc-500 block mb-1">CGNR</span>
                <p className={`text-2xl font-mono font-semibold ${cgnrSharpnesses.length > 0 && sharpWinner === 'CGNR' ? 'text-zinc-100' : 'text-zinc-600'}`}>
                  {cgnrSharpnesses.length > 0 ? cgnrSharp.toFixed(2) : '--'}
                </p>
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              {cgneSharpnesses.length > 0 && cgnrSharpnesses.length > 0
                ? `${sharpWinner} produces +${sharpPct}% sharper images`
                : 'Waiting for both algorithms…'}
            </p>
          </div>

          {/* Card Stability P95 */}
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 space-y-3 min-h-[160px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Stability P95</span>
              <Activity className="w-4 h-4 text-zinc-600" />
            </div>
            <div className="flex items-end gap-6">
              <div>
                <span className="text-[10px] text-zinc-500 block mb-1">Swift</span>
                <p className={`text-2xl font-mono font-semibold ${swiftHasData && p95Winner === 'Swift' ? 'text-zinc-100' : 'text-zinc-600'}`}>
                  {swiftHasData ? <>{swiftP95.toFixed(1)}<span className="text-xs font-normal text-zinc-600 ml-0.5">ms</span></> : '--'}
                </p>
              </div>
              <span className="text-zinc-700 text-sm mb-1">vs</span>
              <div>
                <span className="text-[10px] text-zinc-500 block mb-1">Python</span>
                <p className={`text-2xl font-mono font-semibold ${pythonHasData && p95Winner === 'Python' ? 'text-zinc-100' : 'text-zinc-600'}`}>
                  {pythonHasData ? <>{pythonP95.toFixed(1)}<span className="text-xs font-normal text-zinc-600 ml-0.5">ms</span></> : '--'}
                </p>
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              {bothHaveData
                ? `95% of images reconstructed in under ${Math.min(swiftP95, pythonP95).toFixed(1)} ms`
                : 'Waiting for Swift…'}
            </p>
          </div>

        </div>
      )}

    </div>
  );
};

export default KPICards;
