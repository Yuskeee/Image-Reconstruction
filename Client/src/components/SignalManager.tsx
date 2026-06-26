import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Settings2 } from 'lucide-react';
import { requestReconstruction } from '../services/api';
import type { ReconstructionResult } from './Report';

interface SignalManagerProps {
  onSignalSent: (id: string, signalFile: string, gain: string) => void;
  onResultReceived: (result: ReconstructionResult) => void;
  onRunningChange?: (running: boolean) => void;
}

const SignalManager: React.FC<SignalManagerProps> = ({ onSignalSent, onResultReceived, onRunningChange }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [signalFiles, setSignalFiles] = useState('A-60x60-1.csv, G-1.csv, G-2.csv, A-30x30-1.csv, g-30x30-1.csv, g-30x30-2.csv');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(isRunning);

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

  const triggerSignal = async () => {
    if (!isRunningRef.current || files.length === 0) return;

    try {
      // Sorteia o arquivo de sinal
      const randomFile = files[Math.floor(Math.random() * files.length)];
      const randomGain = Math.random() * 10; // Gain entre 0 e 10
      
      const baseSignal = await loadSignalFromFile(randomFile);
      
      // Aplica a fórmula do ganho vetorial multiplicada pelo ganho aleatório base
      const signal = baseSignal.map((val, index) => {
        const l = index + 1; // 1-indexed formula
        const gamma = 100 + (1 / 20) * l * Math.sqrt(l);
        return val * randomGain * gamma;
      });
      
      const uniqueId = Math.random().toString(36).substring(2, 9);
      const gainStr = randomGain.toFixed(2);

      onSignalSent(uniqueId, randomFile, gainStr);

      // Dispara para ambos algoritmos simultaneamente
      const [swiftCGNE, swiftCGNR] = await Promise.allSettled([
        requestReconstruction({
          algorithm: 'CGNE',
          signal,
        }),
        requestReconstruction({
          algorithm: 'CGNR',
          signal,
        })
      ]);

      const [pythonCGNE, pythonCGNR] = await Promise.allSettled([
        requestReconstruction({
          algorithm: 'CGNE',
          signal},
          "ws://127.0.0.1:8000/reconstruct"
        ),
        requestReconstruction({
          algorithm: 'CGNR',
          signal},
          "ws://127.0.0.1:8000/reconstruct"
        )
      ]);
      
      const extraInfo = { id: uniqueId, signalFile: randomFile, gain: gainStr };

      if (swiftCGNE.status === 'fulfilled') {
        onResultReceived({ ...swiftCGNE.value, ...extraInfo, server: 'Swift' });
      } else {
        console.error('[SignalManager] Erro no CGNE:', swiftCGNE.reason);
      }

      if (swiftCGNR.status === 'fulfilled') {
        onResultReceived({ ...swiftCGNR.value, ...extraInfo, server: 'Swift' });
      } else {
        console.error('[SignalManager] Erro no CGNR:', swiftCGNR.reason);
      }

      if (pythonCGNE.status === 'fulfilled') {
        onResultReceived({ ...pythonCGNE.value, ...extraInfo, server: 'Python' });
      } else {
        console.error('[SignalManager] Erro no CGNE:', pythonCGNE.reason);
      }

      if (pythonCGNR.status === 'fulfilled') {
        onResultReceived({ ...pythonCGNR.value, ...extraInfo, server: 'Python' });
      } else {
        console.error('[SignalManager] Erro no CGNR:', pythonCGNR.reason);
      }

      console.log(`[SignalManager] Transações concluídas usando ${randomFile}. ID: ${uniqueId}`);
    } catch (error) {
      console.error('[SignalManager] Erro inesperado ao enviar sinais:', error);
    }

    if (!isRunningRef.current) return;

    // Agenda o próximo envio com tempo aleatório entre 1s e 5s
    const nextInterval = Math.random() * 4000 + 1000;
    timeoutRef.current = setTimeout(triggerSignal, nextInterval);
  };

  useEffect(() => {
    if (isRunning) {
      triggerSignal();
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isRunning]);

  return (
    <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-6 flex flex-col md:flex-row gap-6 items-center justify-between">
      <div className="flex-1 w-full space-y-4">
        <h2 className="text-lg font-medium text-zinc-100 flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-zinc-500" />
          Settings
        </h2>
        
        <div className="grid grid-cols-1 gap-4">
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
        </div>
      </div>

      <div className="shrink-0 mt-4 md:mt-0">
        <button
          onClick={() => {
            const next = !isRunning;
            setIsRunning(next);
            onRunningChange?.(next);
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
      </div>
    </div>
  );
};

export default SignalManager;
