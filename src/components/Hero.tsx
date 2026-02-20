import React, { useState } from 'react';
import { Loader2, AtSign } from 'lucide-react';

interface HeroProps {
  onCheck: (username: string) => void;
  isLoading: boolean;
}

export const Hero: React.FC<HeroProps> = ({ onCheck, isLoading }) => {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onCheck(username.trim());
    }
  };

  return (
    <div className="py-20 px-4 text-center">
      <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4 transition-colors">
        Is your account visible?
      </h2>
      <p className="text-lg text-slate-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto transition-colors">
        Check if your Twitter/X account is shadowbanned, ghost banned, or hidden from search suggestions.
      </p>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
          <AtSign className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
          placeholder="username"
          className="w-full pl-11 pr-32 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg dark:text-white dark:placeholder-gray-500"
          disabled={isLoading}
          autoComplete="off"
          spellCheck="false"
        />
        <button
          type="submit"
          disabled={isLoading || !username.trim()}
          className="absolute right-2 top-2 bottom-2 bg-slate-900 dark:bg-blue-600 text-white px-6 rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Check'}
        </button>
      </form>
    </div>
  );
};
