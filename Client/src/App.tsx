import React, { useState } from 'react';
import SignalManager from './components/SignalManager';
import Report from './components/Report';
import type { ReconstructionResult, PendingRequest } from './components/Report';

function App() {
  const [results, setResults] = useState<ReconstructionResult[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  const handleSignalSent = (id: string, signalFile: string, gain: number) => {
    setPendingRequests(prev => [{ id, signalFile, gain }, ...prev]);
  };

  const handleResultReceived = (result: ReconstructionResult) => {
    setResults(prev => [result, ...prev].slice(0, 50));
    setTimeout(() => {
      setPendingRequests(prev => prev.filter(req => req.id !== result.id));
    }, 500);
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
          />
          <Report results={results} pending={pendingRequests} />
        </main>
      </div>
    </div>
  );
}

export default App;
