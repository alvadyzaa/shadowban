import React, { useState, useEffect } from 'react';
import { Loader2, AtSign } from 'lucide-react';

interface HeroProps {
  onCheck: (username: string) => void;
  isLoading: boolean;
  visitorCount?: number | null;
}

export const Hero: React.FC<HeroProps> = ({ onCheck, isLoading, visitorCount }) => {
  const [username, setUsername] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: number;
    if (cooldown > 0) {
      timer = window.setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && cooldown === 0) {
      onCheck(username.trim());
      setCooldown(5);
    }
  };

  // Format the count label
  const countLabel = visitorCount && visitorCount > 0
    ? `${visitorCount.toLocaleString()} accounts checked`
    : 'Over 1,000 accounts checked';

  return (
    <div className="py-20 px-4 text-center">
      <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4 transition-colors">
        Is your account visible?
      </h2>
      <p className="text-lg text-slate-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto transition-colors">
        Check if your Twitter/X account is shadowbanned, ghost banned, or hidden from search suggestions.
      </p>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto relative group isolate z-[100]">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 dark:text-gray-500 z-20">
          <AtSign className="h-5 w-5 pointer-events-none" />
        </div>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
          placeholder="username"
          className="w-full pl-11 pr-32 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg dark:text-white dark:placeholder-gray-500 relative z-10"
          disabled={isLoading}
          autoComplete="off"
          spellCheck="false"
        />
        <button
          type="submit"
          disabled={isLoading || !username.trim() || cooldown > 0}
          className="absolute right-2 top-2 bottom-2 bg-slate-900 dark:bg-blue-600 text-white px-6 rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 z-[100] cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="animate-spin h-5 w-5" />
          ) : cooldown > 0 ? (
            <span className="text-sm">Wait {cooldown}s</span>
          ) : (
            'Check'
          )}
        </button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5">
          🔒 We do not store usernames or account data.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          {countLabel}
        </div>
      </div>
    </div>
  );
};
