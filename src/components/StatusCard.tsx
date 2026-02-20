import React, { useRef, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, HelpCircle, Download, Share2 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import type { CheckResult, TestType } from '../types';
import { TEST_DESCRIPTIONS } from '../types';

interface StatusCardProps {
  result: CheckResult;
}

const StatusRow: React.FC<{ type: TestType; passed: boolean }> = ({ type, passed }) => {
  const info = TEST_DESCRIPTIONS[type];
  
  return (
    <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl mb-3 last:mb-0">
      <div className="flex gap-3">
        <div className={`mt-1 ${passed ? 'text-green-500' : 'text-red-500'}`}>
          {passed ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
        </div>
        <div>
          <div className="flex items-center gap-2 group relative">
            <h4 className="font-semibold text-gray-900">{info.title}</h4>
            <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
            
            {/* Tooltip */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
               {info.description}
               {/* Small triangle arrow */}
               <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-gray-900"></div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">{info.description.substring(0, 60)}...</p>
        </div>
      </div>
      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
        passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}>
        {passed ? 'Healthy' : 'Banned'}
      </div>
    </div>
  );
};

export const StatusCard: React.FC<StatusCardProps> = ({ result }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    
    try {
      // Temporarily store the original inline style to restore it later
      const originalTransform = cardRef.current.style.transform;
      // Many capture libraries struggle with animations/transforms/margins on the target element. 
      cardRef.current.style.transform = 'none';

      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        filter: (node) => {
          // Exclude elements with the 'export-hide' class
          if (node.classList && node.classList.contains('export-hide')) {
            return false;
          }
          return true;
        },
        style: {
          margin: '0',
          transform: 'none'
        }
      });
      
      // Restore
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-8 text-center bg-gray-50 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">User Not Found</h3>
          <p className="text-gray-500">
            We couldn't find a Twitter/X account matching <span className="font-semibold">@{result.username}</span>.
            Please check the spelling and try again.
          </p>
        </div>
      </div>
    );
  }

  const allClear = Object.values(result.tests).every(v => v);

  return (
    <div ref={cardRef} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 transition-colors">
      <div className={`p-6 border-b border-gray-100 dark:border-gray-700 rounded-t-2xl ${allClear ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-red-50/50 dark:bg-red-900/10'}`}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm">
            {result.profileImageUrl ? (
              <img src={result.profileImageUrl} alt={result.username} className="w-full h-full object-cover" crossOrigin="anonymous" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl">
                {result.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{result.displayName || `@${result.username}`}</h3>
            <p className="text-gray-500 dark:text-gray-400">@{result.username}</p>
            {result.followersCount !== undefined && result.followingCount !== undefined && (
              <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-600 dark:text-gray-400">
                <span><strong className="text-gray-900 dark:text-white">{result.followingCount.toLocaleString()}</strong> Following</span>
                <span><strong className="text-gray-900 dark:text-white">{result.followersCount.toLocaleString()}</strong> Followers</span>
              </div>
            )}
          </div>
          <div className="ml-auto">
             {allClear ? (
               <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
                 <CheckCircle className="w-5 h-5" />
                 <span>No Bans Detected</span>
               </div>
             ) : (
               <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
                 <AlertTriangle className="w-5 h-5" />
                 <span>Bans Detected</span>
               </div>
             )}
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <StatusRow type="searchSuggestion" passed={result.tests.searchSuggestion} />
        <StatusRow type="searchBan" passed={result.tests.searchBan} />
        <StatusRow type="ghostBan" passed={result.tests.ghostBan} />
      </div>
      
      <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-t border-gray-100 dark:border-gray-800 rounded-b-2xl text-xs text-gray-400 dark:text-gray-500 flex justify-between items-center flex-wrap gap-4">
        <span>Last checked: {new Date(result.timestamp).toLocaleString()}</span>
        <div className="flex items-center gap-2 export-hide">
          <a
            href={`https://x.com/intent/tweet?text=${encodeURIComponent(`✅ ShadowCheck Results for @${result.username}\n\nSearch Suggestion: ${result.tests.searchSuggestion ? 'Healthy' : 'Banned'}\nSearch Ban: ${result.tests.searchBan ? 'Healthy' : 'Banned'}\nGhost Ban: ${result.tests.ghostBan ? 'Healthy' : 'Banned'}\n\nCheck yours here: https://shadowcheck.pages.dev/`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 font-medium"
          >
            <Share2 className="w-4 h-4" />
            Share
          </a>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-900 text-white dark:bg-gray-700 dark:hover:bg-gray-600 hover:bg-gray-800 transition-colors font-medium disabled:opacity-50"
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
