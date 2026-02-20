import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Hero } from './components/Hero';
import { StatusCard } from './components/StatusCard';
import { EducationalSection } from './components/EducationalSection';
import type { CheckResult } from './types';
import { checkShadowbanReal } from './services/twitterService';

function App() {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentChecks, setRecentChecks] = useState<string[]>([]);

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
    setIsLoading(true);
    setResult(null);
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
      
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex flex-col pt-16 sm:pt-24 justify-start items-center">
          <div className="w-full px-4">
             <Hero onCheck={handleCheck} isLoading={isLoading} />
             
             {/* Recent Checks UI */}
             {recentChecks.length > 0 && !isLoading && !result && (
               <div className="max-w-xl mx-auto mt-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <p className="text-sm text-gray-400 dark:text-gray-500 mb-3 font-medium">Recent checks</p>
                 <div className="flex flex-wrap items-center justify-center gap-2">
                   {recentChecks.map((name) => (
                     <button
                       key={name}
                       onClick={() => handleCheck(name)}
                       className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-medium shadow-sm"
                     >
                       @{name}
                     </button>
                   ))}
                 </div>
               </div>
             )}
          </div>
          
          <div className="container mx-auto px-4 pb-16 mt-12 w-full">
            {result && <StatusCard result={result} />}
          </div>

          <EducationalSection />
      </div>
    </Layout>
  );
}

export default App;
