import { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { Hero } from './components/Hero';
import { StatusCard } from './components/StatusCard';
import { ForensicAuditCard } from './components/ForensicAuditCard';
import { EducationalSection } from './components/EducationalSection';
import type { CheckResult, AuditLogEntry, ForensicResult, ForensicThread } from './types';
import { checkShadowbanReal, runForensicAudit } from './services/twitterService';

function App() {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentChecks, setRecentChecks] = useState<string[]>([]);
  const [cooldown, setCooldown] = useState(0);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  // Forensic audit state
  const [forensicLogs, setForensicLogs] = useState<AuditLogEntry[]>([]);
  const [forensicThreads, setForensicThreads] = useState<ForensicThread[]>([]);
  const [forensicResult, setForensicResult] = useState<ForensicResult | null>(null);
  const [isForensicRunning, setIsForensicRunning] = useState(false);

  useEffect(() => {
    let timer: number;
    if (cooldown > 0) {
      timer = window.setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    const saved = localStorage.getItem('recentShadowChecks');
    if (saved) {
      try {
        setRecentChecks(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const handleCheck = async (username: string) => {
    if (isLoading || cooldown > 0) return;
    
    setIsLoading(true);
    setResult(null);
    // Reset forensic state
    setForensicLogs([]);
    setForensicThreads([]);
    setForensicResult(null);
    setIsForensicRunning(false);

    try {
      const data = await checkShadowbanReal(username);
      setResult(data);
      
      // Update recent checks if the user actually exists
      if (data.exists) {
         setRecentChecks(prev => {
           const filtered = prev.filter(item => item.toLowerCase() !== data.username.toLowerCase());
           const newRecent = [data.username, ...filtered].slice(0, 5); // Keep top 5
           localStorage.setItem('recentShadowChecks', JSON.stringify(newRecent));
           return newRecent;
         });
      }
      
      setCooldown(5); // App-level cooldown
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForensicAudit = useCallback(async () => {
    if (!result?.username || isForensicRunning) return;
    
    setIsForensicRunning(true);
    setForensicLogs([]);
    setForensicThreads([]);
    setForensicResult(null);

    try {
      const forensic = await runForensicAudit(
        result.username,
        (entry) => setForensicLogs(prev => [...prev, entry]),
        (thread) => setForensicThreads(prev => [...prev, thread]),
      );
      setForensicResult(forensic);
    } catch (error) {
      console.error('Forensic audit failed:', error);
    } finally {
      setIsForensicRunning(false);
    }
  }, [result?.username, isForensicRunning]);

  return (
    <Layout onVisitorCountLoaded={(count) => setVisitorCount(count)}>
      <div className="min-h-screen relative z-30 flex flex-col pt-16 sm:pt-24 justify-start items-center">
          <div className="w-full px-4 relative z-40">
             <Hero onCheck={handleCheck} isLoading={isLoading} visitorCount={visitorCount} />
             
             {/* Recent Checks UI */}
             {recentChecks.length > 0 && !isLoading && !result && (
               <div className="max-w-xl mx-auto mt-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-20">
                 <p className="text-sm text-gray-400 dark:text-gray-500 mb-3 font-medium">Recent checks</p>
                 <div className="flex flex-wrap items-center justify-center gap-2">
                   {recentChecks.map((name) => (
                     <button
                       key={name}
                       onClick={() => handleCheck(name)}
                       disabled={isLoading || cooldown > 0}
                       className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       @{name} {cooldown > 0 && `(${cooldown}s)`}
                     </button>
                   ))}
                 </div>
               </div>
             )}
          </div>
          
          <div className="container mx-auto px-4 pb-16 mt-12 w-full">
            {result && <StatusCard result={result} forensicResult={forensicResult} />}
            
            {/* Forensic Audit Section — only show after basic check completes with existing account */}
            {result && result.exists && (
              <ForensicAuditCard
                username={result.username}
                isRunning={isForensicRunning}
                logs={forensicLogs}
                threads={forensicThreads}
                result={forensicResult}
                onStart={handleForensicAudit}
              />
            )}
          </div>

          <EducationalSection />
      </div>
    </Layout>
  );
}

export default App;
