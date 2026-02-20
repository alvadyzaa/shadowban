import React, { useRef, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, HelpCircle, Download, Share2 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import type { CheckResult, TestType } from '../types';
import { TEST_DESCRIPTIONS } from '../types';

interface StatusCardProps {
  result: CheckResult;
}

const methodLabels: Record<TestType, string> = {
  searchSuggestion: "Checked via autocomplete index",
  searchBan: "Checked via public search visibility",
  ghostBan: "Checked via reply ranking test"
};

const StatusRow: React.FC<{ type: TestType; passed: boolean }> = ({ type, passed }) => {
  const info = TEST_DESCRIPTIONS[type];
  
  return (
    <div className="flex flex-row items-start justify-between p-4 bg-gray-50 dark:bg-gray-800/80 rounded-xl mb-3 last:mb-0 border border-transparent dark:border-gray-700/50">
      <div className="flex gap-3">
        <div className={`mt-0.5 ${passed ? 'text-green-500' : 'text-red-500'}`}>
          {passed ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 group relative">
            <h4 className="font-semibold text-gray-900 dark:text-white leading-tight">{info.title}</h4>
            <HelpCircle className="w-4 h-4 text-gray-400 cursor-help flex-shrink-0" />
            
            {/* Tooltip */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
               {info.description}
               <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-gray-900"></div>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{methodLabels[type]}</p>
        </div>
      </div>
      <div className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-3 ${
        passed ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
      }`}>
        {passed ? 'Healthy' : 'Banned'}
      </div>
    </div>
  );
};

export const StatusCard: React.FC<StatusCardProps> = ({ result }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleExport = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    
    try {
      const originalTransform = cardRef.current.style.transform;
      cardRef.current.style.transform = 'none';

      // Delay slightly to ensure images are fully rendered
      await new Promise(r => setTimeout(r, 100));

      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        filter: (node) => {
          if (node.classList && node.classList.contains('export-hide')) {
            return false;
          }
          return true;
        },
        style: {
          margin: '0',
          transform: 'none',
          boxShadow: 'none'
        }
      });
      
      cardRef.current.style.transform = originalTransform;
      
      const link = document.createElement('a');
      link.download = `ShadowCheck-${result.username}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!result.exists) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Account not found or protected.</h3>
          <p className="text-gray-500 dark:text-gray-400">
            We couldn't analyze the Twitter/X account matching <span className="font-semibold text-gray-900 dark:text-white">@{result.username}</span>.
            Check the spelling or try a public account.
          </p>
        </div>
      </div>
    );
  }

  const allClear = Object.values(result.tests).every(v => v);

  return (
    <div ref={cardRef} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 transition-colors flex flex-col relative overflow-hidden">
      <div className={`p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 rounded-t-2xl ${allClear ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-red-50/50 dark:bg-red-900/10'}`}>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          
          <div className="flex items-center gap-4 w-full md:w-auto flex-1 min-w-0">
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm relative">
              {result.profileImageUrl && !imageError ? (
                <img 
                  crossOrigin="anonymous" 
                  src={result.profileImageUrl} 
                  alt={result.username} 
                  className="w-full h-full object-cover" 
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl uppercase">
                  {result.username.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">{result.displayName || `@${result.username}`}</h3>
                {result.isVerified && (
                  <svg viewBox="0 0 24 24" aria-label="Verified account" role="img" className="w-5 h-5 text-blue-500 flex-shrink-0 fill-current overflow-visible">
                    <g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.792-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.728 2.75 1.83 3.447-.03.18-.047.362-.047.553 0 2.208 1.708 4 3.914 4 .46 0 .906-.084 1.32-.244C9.073 21.6 10.428 22.5 12 22.5c1.573 0 2.928-.9 3.55-2.268.415.16.86.244 1.32.244 2.206 0 3.914-1.792 3.914-4 0-.19-.016-.372-.046-.552 1.102-.698 1.83-1.988 1.83-3.448zm-11.072 4.09l-3.23-3.23 1.06-1.06 2.17 2.17 5.17-5.17 1.06 1.06-6.23 6.23z"></path></g>
                  </svg>
                )}
              </div>
              <p className="text-gray-500 dark:text-gray-400 truncate">@{result.username}</p>
              {result.followersCount !== undefined && result.followingCount !== undefined && (
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
                  <span><strong className="text-gray-900 dark:text-white">{result.followingCount.toLocaleString()}</strong> Following</span>
                  <span><strong className="text-gray-900 dark:text-white">{result.followersCount.toLocaleString()}</strong> Followers</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Main Status Badge */}
          <div className="md:ml-auto flex-shrink-0 mt-2 md:mt-0">
             {allClear ? (
               <div className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 px-4 py-3 md:py-2 rounded-xl md:rounded-lg font-semibold flex items-center justify-center md:justify-start gap-2 shadow-sm md:shadow-none transition-colors">
                 <CheckCircle className="w-5 h-5 flex-shrink-0" />
                 <span>No Bans Detected</span>
               </div>
             ) : (
               <div className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 px-4 py-3 md:py-2 rounded-xl md:rounded-lg font-semibold flex items-center justify-center md:justify-start gap-2 shadow-sm md:shadow-none transition-colors">
                 <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                 <span>Bans Detected</span>
               </div>
             )}
          </div>

        </div>

        {/* Analysis Summary */}
        <div className="mt-5 p-4 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-1.5 text-sm uppercase tracking-wider">Analysis Summary</h4>
          {allClear ? (
             <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
               Your account is fully visible in search & replies. No visibility penalties detected at this time.
             </p>
          ) : (
             <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
               Your replies may be limited in visibility. This can affect engagement from non-followers.
             </p>
          )}
        </div>
      </div>
      
      <div className="p-4 sm:p-6 flex-1">
        <StatusRow type="searchSuggestion" passed={result.tests.searchSuggestion} />
        <StatusRow type="searchBan" passed={result.tests.searchBan} />
        <StatusRow type="ghostBan" passed={result.tests.ghostBan} />

        {/* Risk Factors Section */}
        <div className="mt-5 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/20 px-4 py-2.5 flex items-center gap-2">
            <h4 className="font-semibold text-amber-800 dark:text-amber-500 text-sm">⚠️ Risk Factors Detected</h4>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4">
            {allClear ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No abnormal activity detected in the past 24h.
              </p>
            ) : (
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-disc pl-4 marker:text-gray-400">
                <li>High reply frequency in short intervals</li>
                <li>Recent mass following activity</li>
                <li>Repetitive tweet patterns</li>
              </ul>
            )}
          </div>
        </div>
      </div>
      
      {/* Actions and Footer (Action buttons are placed last on mobile for very bottom positioning) */}
      <div className="bg-gray-50 dark:bg-gray-900/50 p-4 sm:px-6 sm:py-4 border-t border-gray-100 dark:border-gray-800 rounded-b-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 mt-auto">
        <span className="text-xs text-gray-400 dark:text-gray-500 text-center md:text-left">
          Last checked: {new Date(result.timestamp).toLocaleString()}
        </span>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 export-hide w-full md:w-auto">
          <a
            href={`https://x.com/intent/tweet?text=${encodeURIComponent(`✅ ShadowCheck Results for @${result.username}\n\nSearch Suggestion: ${result.tests.searchSuggestion ? 'Healthy' : 'Banned'}\nSearch Ban: ${result.tests.searchBan ? 'Healthy' : 'Banned'}\nGhost Ban: ${result.tests.ghostBan ? 'Healthy' : 'Banned'}\n\nCheck yours here: https://shadowcheck.pages.dev/`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 md:px-3 md:py-1.5 rounded-xl md:rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 font-medium"
          >
            <Share2 className="w-4 h-4" />
            Share
          </a>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 md:px-3 md:py-1.5 rounded-xl md:rounded-lg bg-gray-900 text-white dark:bg-gray-700 dark:hover:bg-gray-600 hover:bg-gray-800 transition-colors font-medium disabled:opacity-50"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-white dark:border-gray-300 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isExporting ? 'Saving...' : 'Save Image'}
          </button>
        </div>
      </div>
    </div>
  );
};

