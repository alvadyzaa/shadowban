import React, { useState, useEffect } from 'react';
import { Loader2, AtSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Input } from './ui/input';

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

  const countLabel = visitorCount && visitorCount > 0
    ? `${visitorCount.toLocaleString()} accounts checked`
    : 'Over 1,000 accounts checked';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="py-12 sm:py-20 px-4 text-center max-w-3xl mx-auto"
    >
      <motion.h2 
        variants={itemVariants}
        className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight mb-4 transition-colors"
      >
        Is your account visible?
      </motion.h2>
      <motion.p 
        variants={itemVariants}
        className="text-base sm:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto transition-colors px-2"
      >
        Check if your Twitter/X account is shadowbanned, ghost banned, or hidden from search suggestions.
      </motion.p>

      <motion.form 
        variants={itemVariants}
        onSubmit={handleSubmit} 
        className="max-w-md mx-auto relative group isolate z-[100] px-2 sm:px-0"
      >
        <div className="absolute inset-y-0 left-2 sm:left-0 pl-4 flex items-center pointer-events-none text-muted-foreground z-20">
          <AtSign className="h-5 w-5 pointer-events-none" />
        </div>
        <Input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
          placeholder="username"
          className="w-full pl-11 pr-28 sm:pr-32 py-6 rounded-2xl shadow-sm text-base sm:text-lg border-2 border-border focus-visible:ring-primary focus-visible:border-primary transition-all relative z-10 bg-background"
          disabled={isLoading}
          autoComplete="off"
          spellCheck="false"
        />
        <Button
          type="submit"
          size="sm"
          disabled={isLoading || !username.trim() || cooldown > 0}
          className="absolute right-3 sm:right-2 top-2 bottom-2 h-auto px-4 sm:px-6 rounded-xl font-medium z-[100] text-sm sm:text-base cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="animate-spin h-5 w-5" />
          ) : cooldown > 0 ? (
            <span>Wait {cooldown}s</span>
          ) : (
            'Check'
          )}
        </Button>
      </motion.form>

      <motion.div variants={itemVariants} className="mt-8 flex flex-col items-center gap-3">
        <p className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-1.5 px-4 text-center">
          🔒 We do not store usernames or account data.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          {countLabel}
        </div>
      </motion.div>
    </motion.div>
  );
};

