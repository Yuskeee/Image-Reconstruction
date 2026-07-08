import { useState } from 'react';
import SignalManager from './components/SignalManager';
import Report from './components/Report';
import Dashboard from './components/Dashboard';
import KPICards from './components/KPICards';
import type { RunStats } from './components/Dashboard';
import { generateDataURL } from './services/imageUtils';
import type { ReconstructionResult, PendingRequest } from './components/Report';
import { LayoutDashboard, ChevronDown } from 'lucide-react';

const emptyStats = (): RunStats => ({ count: 0, timesMs: [] });

function App() {
  const [results, setResults] = useState<ReconstructionResult[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [dashboardExpanded, setDashboardExpanded] = useState(false);
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
    const imageUrl = result.image ? generateDataURL(result.image) : undefined;
    const enrichedResult = { ...result, imageUrl };
    delete enrichedResult.image;

    setResults(prev => [enrichedResult, ...prev].slice(0, 100));
    setTimeout(() => {
      setPendingRequests(prev => prev.filter(req => req.id !== result.id));
    }, 500);

    const timeMs = new Date(result.endTime).getTime() - new Date(result.startTime).getTime();
    const setStat = result.server === 'Swift' ? setSwiftStats : setPythonStats;
    setStat(prev => ({
      count: prev.count + 1,
      timesMs: [...prev.timesMs, timeMs],
    }));
  };

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
          <Dashboard
            swift={swiftStats}
            python={pythonStats}
            completed={swiftStats.count + pythonStats.count}
            expected={totalExpected}
          />
          {(swiftStats.count > 0 || pythonStats.count > 0) && (
            <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl overflow-hidden">
              <button
                onClick={() => setDashboardExpanded(prev => !prev)}
                className="w-full flex items-center gap-4 p-6 hover:bg-zinc-800/40 transition-colors"
              >
                <h2 className="text-lg font-medium text-zinc-100 flex items-center gap-2 shrink-0">
                  <LayoutDashboard className="w-5 h-5 text-zinc-500" />
                  Dashboard
                </h2>
                <ChevronDown
                  className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ml-auto shrink-0 ${dashboardExpanded ? 'rotate-180' : ''}`}
                />
              </button>
              {dashboardExpanded && (
                <div className="px-6 pb-6">
                  <KPICards swift={swiftStats} python={pythonStats} />
                </div>
              )}
            </div>
          )}
          <Report results={results} pending={pendingRequests} />
        </main>
      </div>
    </div>
  );
}

export default App;
