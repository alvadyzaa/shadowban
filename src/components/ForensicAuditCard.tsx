import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, ShieldCheck, ShieldAlert, Loader2, CheckCircle, XCircle, AlertTriangle, Search, MessageCircle, Bell, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import type { AuditLogEntry, ForensicResult, ForensicThread } from '../types';

interface ForensicAuditCardProps {
  username: string;
  isRunning: boolean;
  logs: AuditLogEntry[];
  threads: ForensicThread[];
  result: ForensicResult | null;
  onStart: () => void;
}

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
      <motion.div 
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto mt-6"
      >
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-bold text-foreground text-lg">Visibility Deep Scan</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Scan visibilitas reply <span className="font-semibold text-foreground">@{username}</span> secara mendalam. Lebih akurat.
              </p>
            </div>
            <Button
              onClick={onStart}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              Run Deep Scan
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto mt-6"
    >
      <Card className="overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            {isRunning ? (
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin flex-shrink-0" />
            ) : result?.ghostBanVerified ? (
              <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0" />
            )}
            <div>
              <h3 className="font-bold text-foreground">
                {isRunning ? 'Deep Scan Running...' : 'Deep Scan Complete'}
              </h3>
              {result && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {result.totalVisible}/{result.totalChecked} visibility check passed
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {/* Verdict Banner */}
        {result && !isRunning && (
          <div className={`px-5 py-3 ${result.ghostBanVerified
            ? 'bg-emerald-500/10 border-b border-emerald-500/20'
            : 'bg-red-500/10 border-b border-red-500/20'
          }`}>
            <div className="flex items-center gap-2">
              {result.ghostBanVerified ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-emerald-500 font-semibold text-sm drop-shadow-sm">Ghost Ban Verified: AMAN</span>
                  <span className="text-emerald-600/80 dark:text-emerald-400/80 text-xs hidden sm:inline">— Reply terlihat di semua pengecekan</span>
                </>
              ) : result.totalChecked > 0 ? (
                <>
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-red-500 font-semibold text-sm drop-shadow-sm">Ghost Ban Terdeteksi</span>
                  <span className="text-red-600/80 dark:text-red-400/80 text-xs hidden sm:inline">— Beberapa reply tersembunyi</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="text-amber-500 font-semibold text-sm drop-shadow-sm">Data Tidak Mencukupi</span>
                  <span className="text-amber-600/80 dark:text-amber-400/80 text-xs hidden sm:inline">— Tidak bisa memverifikasi visibilitas reply</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Collapsible Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {/* Terminal-style Log */}
              <div className="px-4 sm:px-5 py-3">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2 w-full"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  DETAIL LAPORAN SCAN
                </button>
                
                <div
                  ref={logContainerRef}
                  className="bg-slate-950 rounded-xl p-4 max-h-80 overflow-y-auto font-mono text-xs leading-relaxed border border-border"
                >
                  {logs.map((log, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`${getLogColor(log.type)} py-0.5`}
                    >
                      <span className="text-slate-500">[{log.timestamp}]</span>{' '}
                      <span>{log.icon}</span>{' '}
                      <span>{log.message}</span>
                    </motion.div>
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
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Visibility Check Results
                  </h4>
                  <div className="space-y-2">
                    <AnimatePresence>
                      {threads.map((thread, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            thread.visible === true
                              ? 'bg-emerald-500/5 border-emerald-500/20'
                              : thread.visible === false
                              ? 'bg-red-500/5 border-red-500/20'
                              : 'bg-muted/30 border-border/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`flex-shrink-0 ${
                              thread.visible === true ? 'text-emerald-500' : thread.visible === false ? 'text-red-500' : 'text-muted-foreground'
                            }`}>
                              {thread.visible === true ? <CheckCircle className="w-5 h-5" /> : thread.visible === false ? <XCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-muted-foreground">
                                {getThreadIcon(thread.authorUsername)}
                              </span>
                              <span className="text-sm font-medium text-foreground">
                                {thread.authorUsername}
                              </span>
                            </div>
                            <Badge variant={thread.visible ? 'default' : thread.visible === false ? 'destructive' : 'secondary'} className={`text-[10px] px-1.5 py-0 uppercase ${thread.visible ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : ''}`}>
                              {thread.visible === true ? 'Visible' : thread.visible === false ? 'Hidden' : 'N/A'}
                            </Badge>
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
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};
