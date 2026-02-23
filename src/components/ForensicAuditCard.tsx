import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, ShieldCheck, ShieldAlert, Loader2, CheckCircle, XCircle, AlertTriangle, Search, MessageCircle, Bell, Eye } from 'lucide-react';
import type { AuditLogEntry, ForensicResult, ForensicThread } from '../types';

interface ForensicAuditCardProps {
  username: string;
  isRunning: boolean;
  logs: AuditLogEntry[];
  threads: ForensicThread[];
  result: ForensicResult | null;
  onStart: () => void;
}

// Map thread names to SVG icons
const getThreadIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('search')) return <Search className="w-4 h-4" />;
  if (lower.includes('reply')) return <MessageCircle className="w-4 h-4" />;
  if (lower.includes('notification')) return <Bell className="w-4 h-4" />;
  if (lower.includes('tweet') || lower.includes('visibility')) return <Eye className="w-4 h-4" />;
  return <CheckCircle className="w-4 h-4" />;
};

export const ForensicAuditCard: React.FC<ForensicAuditCardProps> = ({
  username,
  isRunning,
  logs,
  threads,
  result,
  onStart,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: AuditLogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-emerald-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-amber-400';
      default: return 'text-slate-300';
    }
  };

  if (!isRunning && logs.length === 0 && !result) {
    return (
      <div className="max-w-2xl mx-auto mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Visibility Deep Scan</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Scan visibilitas reply <span className="font-semibold text-gray-700 dark:text-gray-300">@{username}</span> secara mendalam. Lebih akurat dari pengecekan dasar.
              </p>
            </div>
            <button
              onClick={onStart}
              className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
            >
              <ShieldCheck className="w-4 h-4" />
              Run Deep Scan
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isRunning ? (
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin flex-shrink-0" />
            ) : result?.ghostBanVerified ? (
              <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0" />
            )}
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">
                {isRunning ? 'Deep Scan Running...' : 'Deep Scan Complete'}
              </h3>
              {result && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {result.totalVisible}/{result.totalChecked} visibility check passed
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Verdict Banner */}
        {result && !isRunning && (
          <div className={`px-5 py-3 ${result.ghostBanVerified
            ? 'bg-emerald-50 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-900/20'
            : 'bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/20'
          }`}>
            <div className="flex items-center gap-2">
              {result.ghostBanVerified ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">Ghost Ban Verified: AMAN</span>
                  <span className="text-emerald-500 dark:text-emerald-500 text-xs">— Reply terlihat di semua pengecekan</span>
                </>
              ) : result.totalChecked > 0 ? (
                <>
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <span className="text-red-600 dark:text-red-400 font-semibold text-sm">Ghost Ban Terdeteksi</span>
                  <span className="text-red-500 dark:text-red-500 text-xs">— Beberapa reply tersembunyi</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span className="text-amber-600 dark:text-amber-400 font-semibold text-sm">Data Tidak Mencukupi</span>
                  <span className="text-amber-500 dark:text-amber-500 text-xs">— Tidak bisa memverifikasi visibilitas reply</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Collapsible Content */}
        {isExpanded && (
          <div className="animate-in fade-in duration-200">
            {/* Terminal-style Log */}
            <div className="px-4 sm:px-5 py-3">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 w-full"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                DETAIL LAPORAN SCAN
              </button>
              
              <div
                ref={logContainerRef}
                className="bg-slate-900 rounded-xl p-4 max-h-80 overflow-y-auto font-mono text-xs leading-relaxed scrollbar-thin"
              >
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className={`${getLogColor(log.type)} py-0.5 animate-in fade-in slide-in-from-left-2 duration-300`}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <span className="text-slate-500">[{log.timestamp}]</span>{' '}
                    <span>{log.icon}</span>{' '}
                    <span>{log.message}</span>
                  </div>
                ))}
                {isRunning && (
                  <div className="text-slate-500 py-0.5 animate-pulse">
                    <span className="inline-block w-2 h-3.5 bg-slate-400 animate-pulse ml-1" />
                  </div>
                )}
              </div>
            </div>

            {/* Thread Results */}
            {threads.length > 0 && (
              <div className="px-4 sm:px-5 pb-4">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Visibility Check Results
                </h4>
                <div className="space-y-2">
                  {threads.map((thread, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        thread.visible === true
                          ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30'
                          : thread.visible === false
                          ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'
                          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50'
                      } animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex-shrink-0 ${
                          thread.visible === true ? 'text-emerald-500' : thread.visible === false ? 'text-red-500' : 'text-gray-400'
                        }`}>
                          {thread.visible === true ? <CheckCircle className="w-5 h-5" /> : thread.visible === false ? <XCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-gray-400 dark:text-gray-500">
                            {getThreadIcon(thread.authorUsername)}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {thread.authorUsername}
                          </span>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          thread.visible === true 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                            : thread.visible === false 
                            ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {thread.visible === true ? 'Visible' : thread.visible === false ? 'Hidden' : 'N/A'}
                        </span>
                      </div>
                      {thread.threadUrl && (
                        <a
                          href={thread.threadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 flex-shrink-0 ml-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
