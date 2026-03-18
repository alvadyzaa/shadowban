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
  deepScanRemaining: number;
  deepScanDailyLimit: number;
  dailyLimitReached: boolean;
  onStart: () => void;
}

type DeepScanFilter = 'all' | 'hidden' | 'visible' | 'posts' | 'reposts' | 'quotes' | 'replies';

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
  deepScanRemaining,
  deepScanDailyLimit,
  dailyLimitReached,
  onStart,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeFilter, setActiveFilter] = useState<DeepScanFilter>('all');
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

  const totalHidden = threads.filter((thread) => thread.visible === false).length;
  const totalVisible = threads.filter((thread) => thread.visible === true).length;
  const typeCounts = threads.reduce(
    (acc, thread) => {
      const type = (thread.postType || 'POST').toUpperCase();
      if (type === 'REPOST') acc.reposts += 1;
      else if (type === 'QUOTE') acc.quotes += 1;
      else if (type === 'REPLY') acc.replies += 1;
      else acc.posts += 1;
      return acc;
    },
    { posts: 0, reposts: 0, quotes: 0, replies: 0 },
  );
  const filterOptions: Array<{ id: DeepScanFilter; label: string; count: number }> = [
    { id: 'all', label: 'All', count: threads.length },
    { id: 'hidden', label: 'Hidden', count: totalHidden },
    { id: 'visible', label: 'Visible', count: totalVisible },
    { id: 'posts', label: 'Posts', count: typeCounts.posts },
    { id: 'reposts', label: 'Reposts', count: typeCounts.reposts },
    { id: 'quotes', label: 'Quotes', count: typeCounts.quotes },
    { id: 'replies', label: 'Replies', count: typeCounts.replies },
  ];
  const selectedFilter = filterOptions.some((option) => option.id === activeFilter && option.count > 0) ? activeFilter : 'all';
  const filteredThreads = threads.filter((thread) => {
    switch (selectedFilter) {
      case 'hidden':
        return thread.visible === false;
      case 'visible':
        return thread.visible === true;
      case 'posts':
        return (thread.postType || '').toUpperCase() === 'POST';
      case 'reposts':
        return (thread.postType || '').toUpperCase() === 'REPOST';
      case 'quotes':
        return (thread.postType || '').toUpperCase() === 'QUOTE';
      case 'replies':
        return (thread.postType || '').toUpperCase() === 'REPLY';
      default:
        return true;
    }
  });
  const scanSourceLabel =
    result?.scanSource === 'fia-s'
      ? 'Reference engine'
      : result?.scanSource?.startsWith('shadow-api')
      ? 'Deep scan engine'
      : 'Deep scan';
  const hasHiddenIssues = totalHidden > 0;

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
                Basic check sudah selesai. Jalankan deep scan untuk cek reply, search visibility, dan post terbaru dari <span className="font-semibold text-foreground">@{username}</span> lebih detail.
              </p>
            </div>
            <Button
              onClick={onStart}
              disabled={dailyLimitReached}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              {dailyLimitReached ? 'Daily limit reached' : 'Run Deep Scan'}
            </Button>
          </div>
          <div className={`mt-3 rounded-xl px-4 py-3 text-xs ${dailyLimitReached ? 'border border-amber-500/25 bg-amber-500/8 text-amber-300' : 'border border-border/60 bg-background/40 text-muted-foreground'}`}>
            {dailyLimitReached
              ? `Batas deep scan harian untuk browser ini sudah habis. Coba lagi besok.`
              : `Sisa deep scan hari ini: ${deepScanRemaining}/${deepScanDailyLimit} untuk browser ini.`}
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
                  <div className="mb-3 rounded-2xl border border-border/60 bg-muted/20 p-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Deep Scan Results
                        </h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {scanSourceLabel} memindai {threads.length} item terbaru untuk akun <span className="font-medium text-foreground">@{username}</span>.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="bg-background/70 text-foreground">
                          {totalVisible}/{threads.length} visible
                        </Badge>
                        <Badge variant="secondary" className="bg-background/70 text-foreground">
                          {totalHidden} hidden
                        </Badge>
                        <Badge variant="secondary" className="bg-background/70 text-foreground">
                          {typeCounts.posts} posts
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {hasHiddenIssues && (
                    <div className="mb-3 rounded-2xl border border-red-500/25 bg-red-500/8 px-4 py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-red-400">
                            {totalHidden} hidden item{totalHidden > 1 ? 's' : ''} detected
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-red-200/80">
                            Fokus ke filter <span className="font-semibold text-red-300">Hidden</span> untuk review item yang paling butuh perhatian dulu.
                          </p>
                        </div>
                        {selectedFilter !== 'hidden' && (
                          <button
                            type="button"
                            onClick={() => setActiveFilter('hidden')}
                            className="inline-flex items-center justify-center rounded-full border border-red-400/30 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/20"
                          >
                            Review hidden issues
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mb-3 flex flex-wrap gap-2">
                    {filterOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setActiveFilter(option.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          selectedFilter === option.id
                            ? option.id === 'hidden' && hasHiddenIssues
                              ? 'border-red-500/40 bg-red-500/12 text-red-400'
                              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
                            : 'border-border/60 bg-muted/20 text-muted-foreground hover:border-border hover:text-foreground'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {option.id === 'hidden' && hasHiddenIssues && selectedFilter !== 'hidden' && (
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400"></span>
                            </span>
                          )}
                          {option.label}
                        </span>{' '}
                        <span className="ml-1 opacity-80">{option.count}</span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <AnimatePresence>
                      {filteredThreads.map((thread, i) => (
                        <motion.div
                          key={`${thread.tweetId}-${activeFilter}-${i}`}
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
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div className={`flex-shrink-0 ${
                              thread.visible === true ? 'text-emerald-500' : thread.visible === false ? 'text-red-500' : 'text-muted-foreground'
                            }`}>
                              {thread.visible === true ? <CheckCircle className="w-5 h-5" /> : thread.visible === false ? <XCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                            </div>
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="text-muted-foreground">
                                {getThreadIcon(thread.authorUsername)}
                              </span>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">
                                  {thread.authorUsername}
                                </div>
                                {thread.tweetPreview && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {thread.tweetPreview}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="ml-3 flex flex-shrink-0 items-center justify-end gap-2">
                            <Badge variant={thread.visible ? 'default' : thread.visible === false ? 'destructive' : 'secondary'} className={`min-w-[68px] justify-center text-[10px] px-1.5 py-0 uppercase ${thread.visible ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : ''}`}>
                              {thread.visible === true ? 'Visible' : thread.visible === false ? 'Hidden' : 'N/A'}
                            </Badge>
                            {thread.threadUrl && (
                              <a
                                href={thread.threadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {filteredThreads.length === 0 && (
                      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                        Tidak ada item yang cocok dengan filter <span className="font-medium text-foreground">{selectedFilter}</span>.
                      </div>
                    )}
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
