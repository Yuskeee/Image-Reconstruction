import React from 'react';
import { Zap, Eye, Activity } from 'lucide-react';
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

const KPICards: React.FC<KPICardsProps> = ({ swift, python }) => {
  // só exibe quando ambos os servidores têm dados
  if (swift.count === 0 || python.count === 0) return null;

  // --- IPS ---
  const swiftIPS  = swift.count  / (sum(swift.timesMs)  / 1000);
  const pythonIPS = python.count / (sum(python.timesMs) / 1000);
  const ipsWinner    = swiftIPS >= pythonIPS ? 'Swift' : 'Python';
  const ipsWinnerVal = Math.max(swiftIPS, pythonIPS);
  const ipsLoserVal  = Math.min(swiftIPS, pythonIPS);
  const ipsPct       = ((ipsWinnerVal / ipsLoserVal - 1) * 100).toFixed(0);

  // --- Nitidez Média por Algoritmo (combina Swift + Python) ---
  const cgneSharpnesses = [...swift.cgneSharpnesses, ...python.cgneSharpnesses];
  const cgnrSharpnesses = [...swift.cgnrSharpnesses, ...python.cgnrSharpnesses];
  const cgneSharp = cgneSharpnesses.length > 0 ? sum(cgneSharpnesses) / cgneSharpnesses.length : 0;
  const cgnrSharp = cgnrSharpnesses.length > 0 ? sum(cgnrSharpnesses) / cgnrSharpnesses.length : 0;
  const sharpWinner    = cgneSharp >= cgnrSharp ? 'CGNE' : 'CGNR';
  const sharpWinnerVal = Math.max(cgneSharp, cgnrSharp);
  const sharpLoserVal  = Math.min(cgneSharp, cgnrSharp);
  const sharpPct       = sharpLoserVal > 0 ? ((sharpWinnerVal / sharpLoserVal - 1) * 100).toFixed(0) : '—';

  // --- P95 ---
  const swiftP95  = p95(swift.timesMs);
  const pythonP95 = p95(python.timesMs);
  const p95Winner = swiftP95 <= pythonP95 ? 'Swift' : 'Python'; // menor P95 = mais estável

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

      {/* Card 1 — Vencedor em Vazão / IPS */}
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Throughput</span>
          <Zap className="w-4 h-4 text-zinc-600" />
        </div>
        <div className="flex items-end gap-4">
          <div>
            <span className="text-[10px] text-zinc-500 block mb-1">Swift</span>
            <p className={`text-xl font-mono font-semibold ${ipsWinner === 'Swift' ? 'text-zinc-100' : 'text-zinc-600'}`}>
              {swiftIPS.toFixed(1)}
              <span className="text-xs font-normal text-zinc-600 ml-0.5">img/s</span>
            </p>
          </div>
          <span className="text-zinc-700 text-sm mb-1">vs</span>
          <div>
            <span className="text-[10px] text-zinc-500 block mb-1">Python</span>
            <p className={`text-xl font-mono font-semibold ${ipsWinner === 'Python' ? 'text-zinc-100' : 'text-zinc-600'}`}>
              {pythonIPS.toFixed(1)}
              <span className="text-xs font-normal text-zinc-600 ml-0.5">img/s</span>
            </p>
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          {ipsWinner} is +{ipsPct}% faster
        </p>
      </div>

      {/* Card 2 — Vencedor em Nitidez Média */}
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Avg Sharpness</span>
          <Eye className="w-4 h-4 text-zinc-600" />
        </div>
        <div className="flex items-end gap-4">
          <div>
            <span className="text-[10px] text-zinc-500 block mb-1">CGNE</span>
            <p className={`text-xl font-mono font-semibold ${sharpWinner === 'CGNE' ? 'text-zinc-100' : 'text-zinc-600'}`}>
              {cgneSharp.toFixed(2)}
            </p>
          </div>
          <span className="text-zinc-700 text-sm mb-1">vs</span>
          <div>
            <span className="text-[10px] text-zinc-500 block mb-1">CGNR</span>
            <p className={`text-xl font-mono font-semibold ${sharpWinner === 'CGNR' ? 'text-zinc-100' : 'text-zinc-600'}`}>
              {cgnrSharp.toFixed(2)}
            </p>
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          {sharpWinner} produces +{sharpPct}% sharper images
        </p>
      </div>

      {/* Card 3 — Estabilidade P95 */}
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Stability P95</span>
          <Activity className="w-4 h-4 text-zinc-600" />
        </div>
        <div className="flex items-end gap-4">
          <div>
            <span className="text-[10px] text-zinc-500 block mb-1">Swift</span>
            <p className={`text-xl font-mono font-semibold ${p95Winner === 'Swift' ? 'text-zinc-100' : 'text-zinc-600'}`}>
              {swiftP95.toFixed(1)}
              <span className="text-xs font-normal text-zinc-600 ml-0.5">ms</span>
            </p>
          </div>
          <span className="text-zinc-700 text-sm mb-1">vs</span>
          <div>
            <span className="text-[10px] text-zinc-500 block mb-1">Python</span>
            <p className={`text-xl font-mono font-semibold ${p95Winner === 'Python' ? 'text-zinc-100' : 'text-zinc-600'}`}>
              {pythonP95.toFixed(1)}
              <span className="text-xs font-normal text-zinc-600 ml-0.5">ms</span>
            </p>
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          95% of images reconstructed in under {Math.min(swiftP95, pythonP95).toFixed(1)} ms
        </p>
      </div>

    </div>
  );
};

export default KPICards;
