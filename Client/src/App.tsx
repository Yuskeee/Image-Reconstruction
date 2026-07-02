import React, { useState } from 'react';
import SignalManager from './components/SignalManager';
import Report from './components/Report';
import Dashboard from './components/Dashboard';
import KPICards from './components/KPICards';
import type { RunStats } from './components/Dashboard';
import { laplacianVariance } from './services/metrics';
import { generateDataURL } from './services/imageUtils';
import type { ReconstructionResult, PendingRequest } from './components/Report';

const emptyStats = (): RunStats => ({ count: 0, timesMs: [], cgneSharpnesses: [], cgnrSharpnesses: [] });

function App() {
  const [results, setResults] = useState<ReconstructionResult[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [swiftStats, setSwiftStats] = useState<RunStats>(emptyStats());
  const [pythonStats, setPythonStats] = useState<RunStats>(emptyStats());
  const [totalExpected, setTotalExpected] = useState(0);

  const handleSignalSent = (id: string, signalFile: string, gain: string) => {
    setPendingRequests(prev => [{ id, signalFile, gain }, ...prev]);
  };

  const handleRunStart = (totalImages: number) => {
    setTotalExpected(totalImages);
  };

  const handleResultReceived = (result: ReconstructionResult) => {
    // calcula sharpness no cliente a partir da imagem reconstruída
    const sharpness = result.image ? laplacianVariance(result.image) : 0;
    const imageUrl = result.image ? generateDataURL(result.image) : undefined;
    
    // Removemos a imagem raw da memória do estado principal do React!
    const enrichedResult = { ...result, sharpness, imageUrl };
    delete enrichedResult.image;

    setResults(prev => [enrichedResult, ...prev].slice(0, 100));
    setTimeout(() => {
      setPendingRequests(prev => prev.filter(req => req.id !== result.id));
    }, 500);

    // calcula a duração da reconstrução e acumula nas stats do servidor correspondente
    const timeMs = new Date(result.endTime).getTime() - new Date(result.startTime).getTime();
    const setStat = result.server === 'Swift' ? setSwiftStats : setPythonStats;
    setStat(prev => ({
      count: prev.count + 1,
      timesMs: [...prev.timesMs, timeMs],
      cgneSharpnesses: result.algorithm === 'CGNE'
        ? [...prev.cgneSharpnesses, sharpness]
        : prev.cgneSharpnesses,
      cgnrSharpnesses: result.algorithm === 'CGNR'
        ? [...prev.cgnrSharpnesses, sharpness]
        : prev.cgnrSharpnesses,
    }));
  };

  // reseta as stats quando uma nova execução começa
  const handleRunningChange = (running: boolean) => {
    if (running) {
      setSwiftStats(emptyStats());
      setPythonStats(emptyStats());
      setTotalExpected(0);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800">
      <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-12">
        {/* Header */}
        <header className="pb-8 border-b border-zinc-800/60">
          <h1
            className="text-3xl font-semibold tracking-tight text-zinc-100"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif' }}
          >
            Image Reconstruction
          </h1>
        </header>

        <main className="space-y-10">
          <SignalManager
            onSignalSent={handleSignalSent}
            onResultReceived={handleResultReceived}
            onRunningChange={handleRunningChange}
            onRunStart={handleRunStart}
          />
          <KPICards swift={swiftStats} python={pythonStats} />
          <Dashboard
            swift={swiftStats}
            python={pythonStats}
            completed={swiftStats.count + pythonStats.count}
            expected={totalExpected}
          />
          <Report results={results} pending={pendingRequests} />
        </main>
      </div>
    </div>
  );
}

export default App;
