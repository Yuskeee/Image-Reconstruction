import React from 'react';
import ImageDisplay from './ImageDisplay';
import { Clock, Activity, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export interface ReconstructionResult {
  id: string; // Identifier for the request pair
  algorithm: string;
  startTime: string;
  endTime: string;
  imageSize: number;
  iterations: number;
  image: number[];
  finalError: number;
  sharpness?: number;
  message: string;
  signalFile?: string;
  server: 'Swift' | 'Python';
}

export interface PendingRequest {
  id: string;
  signalFile: string;
}

interface ReportProps {
  results: ReconstructionResult[];
  pending: PendingRequest[];
}

const Report: React.FC<ReportProps> = ({ results, pending = [] }) => {
  if (results.length === 0 && pending.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-800/50 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
        <Activity className="w-12 h-12 text-slate-500 mb-4 animate-pulse" />
        <h3 className="text-xl font-medium text-slate-300">Nenhum dado recebido</h3>
        <p className="text-slate-500 mt-2">Inicie a sequência de sinais para visualizar os relatórios.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-zinc-100 flex items-center gap-2">
        <Activity className="w-5 h-5 text-zinc-500" />
        Activity Feed
      </h2>
      
      {pending.length > 0 && (
        <div className="flex flex-col gap-3 mb-6">
          {pending.map((req) => (
            <div key={req.id} className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-300">Processing Request</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  ID: <span className="font-mono text-zinc-400">{req.id}</span> | 
                  File: <span className="font-mono text-zinc-400">{req.signalFile}</span> | 
                  Gain: <span className="font-mono text-zinc-400">{req.gain}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {results.map((res, index) => {
          // Extrair a fração exata de segundos para não arredondar microssegundos
          const parseExactTime = (isoString: string) => {
            const match = isoString.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?Z/);
            if (!match) return new Date(isoString).getTime();
            const baseTime = new Date(match[1] + "Z").getTime();
            const fractionStr = match[2] || "0";
            const fractionMs = parseFloat("0." + fractionStr) * 1000;
            return baseTime + fractionMs;
          };

          const startMs = parseExactTime(res.startTime);
          const endMs = parseExactTime(res.endTime);
          const timeMs = endMs - startMs;

          return (
            <div key={index} className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 flex flex-col sm:flex-row gap-5 items-start hover:border-zinc-700 transition-colors">
              <div className="shrink-0 flex flex-col items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Output</span>
                <ImageDisplay data={res.image} />
              </div>
              
              <div className="flex-1 w-full space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-zinc-200 mb-1 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs border border-zinc-700/50">
                        {res.algorithm}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs border border-zinc-700/50">
                        {res.server}
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono">
                      ID: {res.id} 
                      {res.signalFile && ` | File: ${res.signalFile}`}
                      <br/>
                      {res.gain && `Gain: ${res.gain}`}
                    </p>
                  </div>
                  {res.message === 'Success' ? (
                    <CheckCircle className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5 block">Iterations</span>
                    <span className="font-mono text-sm text-zinc-300">{res.iterations}</span>
                  </div>
                  
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5 block">Time (ms)</span>
                    <span className="font-mono text-sm text-zinc-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-600" />
                      {timeMs.toFixed(3)}
                    </span>
                  </div>
                  
                  <div className="col-span-2 pt-1 border-t border-zinc-800/60 mt-1 flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">Final Error</span>
                    <span className="font-mono text-xs text-zinc-400">{res.finalError.toExponential(4)}</span>
                  </div>

                  {res.sharpness !== undefined && (
                    <div className="col-span-2 flex justify-between items-center">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500">Sharpness</span>
                      <span className="font-mono text-xs text-zinc-400">{res.sharpness.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Report;
