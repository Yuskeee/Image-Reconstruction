import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Settings2, ChevronDown } from 'lucide-react';
import { requestReconstruction } from '../services/api';
import type { ReconstructionResult } from './Report';

interface SignalManagerProps {
  onSignalSent: (id: string, signalFile: string, gain: string) => void;
  onResultReceived: (result: ReconstructionResult) => void;
  onRunningChange?: (running: boolean) => void;
  onRunStart?: (totalImages: number) => void;
}

const SignalManager: React.FC<SignalManagerProps> = ({ onSignalSent, onResultReceived, onRunningChange, onRunStart }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [signalFiles, setSignalFiles] = useState('A-60x60-1.csv, G-1.csv, G-2.csv, A-30x30-1.csv, g-30x30-1.csv, g-30x30-2.csv');
  const [signalCount, setSignalCount] = useState(50);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(isRunning);
  const signalCountRef = useRef(0);
  const continueRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  const files = signalFiles.split(',').map(s => s.trim()).filter(Boolean);

  // Cache para os arquivos não precisarem ser lidos do disco toda hora
  const signalCache = useRef<Record<string, number[]>>({});

  const loadSignalFromFile = async (filename: string): Promise<number[]> => {
    if (signalCache.current[filename]) {
      return signalCache.current[filename];
    }
    const response = await fetch(`/${filename}`);
    if (!response.ok) {
      throw new Error(`Falha ao carregar o arquivo ${filename}`);
    }
    const text = await response.text();
    // Separa por quebras de linha, remove linhas vazias e converte para float
    const signal = text.split(/\r?\n/).filter(line => line.trim() !== '').map(Number);
    signalCache.current[filename] = signal;
    return signal;
  };

  const sendSignalToBackend = async (
    item: { file: string; gain: number; interval: number },
    server: 'Python' | 'Swift',
    count: number
  ) => {
    try {
      const baseSignal = await loadSignalFromFile(item.file);
      
      const signal = baseSignal.map((val, index) => {
        const l = index + 1; // 1-indexed formula
        const gamma = 100 + (1 / 20) * l * Math.sqrt(l);
        return val * item.gain * gamma;
      });
      
      const uniqueId = Math.random().toString(36).substring(2, 9);
      const gainStr = item.gain.toFixed(2);

      onSignalSent(uniqueId, item.file, gainStr);

      const url = server === 'Python' ? "ws://127.0.0.1:8000/reconstruct" : "ws://127.0.0.1:8080/reconstruct";

      const [resCGNE, resCGNR] = await Promise.allSettled([
        requestReconstruction({ algorithm: 'CGNE', signal }, url),
        requestReconstruction({ algorithm: 'CGNR', signal }, url)
      ]);
      
      const extraInfo = { id: uniqueId, signalFile: item.file, gain: gainStr, server };

      if (resCGNE.status === 'fulfilled') {
        onResultReceived({ ...resCGNE.value, ...extraInfo });
      } else {
        console.error(`[SignalManager] Erro no CGNE (${server}):`, resCGNE.reason);
      }

      if (resCGNR.status === 'fulfilled') {
        onResultReceived({ ...resCGNR.value, ...extraInfo });
      } else {
        console.error(`[SignalManager] Erro no CGNR (${server}):`, resCGNR.reason);
      }

      console.log(`[SignalManager] Transações concluídas (${server}) usando ${item.file}. ID: ${uniqueId} (${count}/50)`);
    } catch (error) {
      console.error('[SignalManager] Erro inesperado ao enviar sinais:', error);
    }
  };

  const runSequence = async () => {
    if (files.length === 0) return;

    setIsRunning(true);
    isRunningRef.current = true;
    onRunStart?.(signalCount * 4); // notifica o total de imagens esperadas antes de começar

    // 1. Pré-gerar a sequência de sinais para garantir tempos e ganhos idênticos
    const sequence: { file: string; gain: number; interval: number }[] = [];
    for (let i = 0; i < signalCount; i++) {
      sequence.push({
        file: files[Math.floor(Math.random() * files.length)],
        gain: Math.random() * 10,
        interval: Math.random() * 400 + 100
      });
    }

    // 2. Fase Python
    for (let i = 0; i < signalCount; i++) {
      if (!isRunningRef.current) return;
      const item = sequence[i];
      await new Promise(r => {
        timeoutRef.current = setTimeout(r, item.interval);
      });
      if (!isRunningRef.current) return;
      await sendSignalToBackend(item, 'Python', i + 1);
    }

    // Entrar em hold
    if (!isRunningRef.current) return;
    setIsHolding(true);
    await new Promise<void>(resolve => {
      continueRef.current = resolve;
    });
    setIsHolding(false);
    if (!isRunningRef.current) return;

    // 3. Fase Swift
    for (let i = 0; i < signalCount; i++) {
      if (!isRunningRef.current) return;
      const item = sequence[i];
      await new Promise(r => {
        timeoutRef.current = setTimeout(r, item.interval);
      });
      if (!isRunningRef.current) return;
      await sendSignalToBackend(item, 'Swift', i + 1);
    }

    setIsRunning(false);
    isRunningRef.current = false;
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl overflow-hidden">
      {/* Header / toggle */}
      <div
        className="flex items-center justify-between gap-4 p-6 cursor-pointer hover:bg-zinc-800/40 transition-colors"
        onClick={() => setExpanded(prev => !prev)}
      >
        <h2 className="text-lg font-medium text-zinc-100 flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-zinc-500" />
          Settings
        </h2>
        <div className="flex items-center gap-3">
          {/* Botões de controle de fluxo — clique não propaga para o toggle */}
          {isHolding ? (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (continueRef.current) {
                    continueRef.current();
                  }
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-colors bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
              >
                <Play className="w-4 h-4" />
                Continuar para Swift
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRunning(false);
                  isRunningRef.current = false;
                  if (continueRef.current) {
                    continueRef.current();
                  }
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-colors bg-red-500/10 text-red-500 hover:bg-red-500/20"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isRunning) {
                  runSequence();
                } else {
                  setIsRunning(false);
                  isRunningRef.current = false;
                  if (continueRef.current) {
                    continueRef.current();
                  }
                }
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                isRunning
                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                  : 'bg-zinc-100 text-zinc-900 hover:bg-white'
              }`}
            >
              {isRunning ? (
                <>
                  <Square className="w-4 h-4" />
                  Stop Sequence
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Sequence
                </>
              )}
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-zinc-500 transition-transform duration-200 shrink-0 ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Conteúdo colapsável */}
      {expanded && (
        <div className="px-6 pb-6 space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Signal CSV Files</label>
            <input
              type="text"
              value={signalFiles}
              onChange={(e) => setSignalFiles(e.target.value)}
              disabled={isRunning}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-600 disabled:opacity-50"
              placeholder="A-60x60-1.csv, G-1.csv..."
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Number of Signals</label>
            <input
              type="number"
              min={1}
              value={signalCount}
              onChange={(e) => setSignalCount(Math.max(1, parseInt(e.target.value) || 1))}
              disabled={isRunning}
              className="w-32 bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-600 disabled:opacity-50"
            />
            <span className="text-xs text-zinc-500 ml-2">{signalCount * 4} images expected</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignalManager;
