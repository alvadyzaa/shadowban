import React, { useState, useEffect } from 'react';
import { Info, AlertTriangle, X, Moon, Sun, Heart, Wrench, ExternalLink } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
  onVisitorCountLoaded?: (count: number) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onVisitorCountLoaded }) => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const [isTipsOpen, setIsTipsOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    // Only increment counter ONCE per browser session to avoid inflating numbers.
    // Subsequent loads in the same session just reuse the cached value.
    const cached = sessionStorage.getItem('shadowcheck_visitor_count');
    if (cached) {
      const count = parseInt(cached, 10);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisitorCount(count);
      onVisitorCountLoaded?.(count);
      return;
    }

    const fetchUrl = import.meta.env?.DEV 
      ? 'https://api.counterapi.dev/v1/shadowcheck/hits/up'
      : '/api/visitor';

    // Helper to apply fallback from localStorage if API fails
    const applyFallback = () => {
      const longTermCache = localStorage.getItem('shadowcheck_visitor_fallback');
      if (longTermCache) {
        const count = parseInt(longTermCache, 10);
        setVisitorCount(count);
        onVisitorCountLoaded?.(count);
      } else {
        setVisitorCount(0);
      }
    };

    fetch(fetchUrl)
      .then(res => {
        if (!res.ok) throw new Error('API failed');
        return res.json();
      })
      .then(data => {
        if (data && data.count && data.count > 0) {
          setVisitorCount(data.count);
          onVisitorCountLoaded?.(data.count);
          sessionStorage.setItem('shadowcheck_visitor_count', String(data.count));
          localStorage.setItem('shadowcheck_visitor_fallback', String(data.count)); // Save robust fallback
        } else {
          applyFallback();
        }
      })
      .catch((err) => {
        console.warn('Visitor counter blocked by client or network', err);
        applyFallback();
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans relative transition-colors duration-200 selection:bg-primary/20 overflow-x-hidden w-full">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 sm:py-4 transition-colors duration-200">
        <div className="container mx-auto px-3 sm:px-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 fill-current text-primary" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"/></svg>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">ShadowCheck</h1>
          </div>
          <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-wrap justify-end">
            <Button variant="ghost" size="sm" onClick={() => setIsAboutOpen(true)} className="px-2 sm:px-3 text-muted-foreground hover:text-foreground">
              <Info className="w-4 h-4 mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">About</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsTipsOpen(true)} className="px-2 sm:px-3 text-muted-foreground hover:text-foreground">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-1 sm:mr-1.5"><path d="M9 21h6"></path><path d="M12 21v-4"></path><path d="M12 17c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6c0 1.954.939 3.69 2.398 4.81"></path></svg> <span className="hidden sm:inline">Tips</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsDisclaimerOpen(true)} className="px-2 sm:px-3 text-amber-600/80 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30">
              <AlertTriangle className="w-4 h-4 mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">Disclaimer</span>
            </Button>
            <a href="https://x.com/miegrains" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="px-2 sm:px-3 text-muted-foreground hover:text-foreground">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current mr-1 sm:mr-1.5" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                <span className="hidden sm:inline">Keith</span>
              </Button>
            </a>
            <Button variant="ghost" size="sm" onClick={() => setIsSupportOpen(true)} className="px-2 sm:px-3 text-red-500/80 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
              <Heart className="w-4 h-4 mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">Support</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsToolsOpen(true)} className="px-2 sm:px-3 text-muted-foreground hover:text-foreground">
              <Wrench className="w-4 h-4 mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">Tools</span>
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={toggleTheme} 
              aria-label="Toggle Dark Mode"
              className="ml-1 h-8 w-8 rounded-full border-border bg-transparent"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        {children}
      </main>

      <footer className="border-t border-border py-8 mt-16 transition-colors duration-200">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>
            © {new Date().getFullYear()} ShadowCheck by <a href="https://x.com/miegrains" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors font-medium">Keith</a>.
            <span className="mx-2 opacity-50">•</span> 
            Visitor: {visitorCount !== null ? visitorCount.toLocaleString() : '...'}
          </p>
        </div>
      </footer>

      {/* Modals using Framer Motion and Shadcn Card look */}
      <AnimatePresence>
        {isAboutOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground rounded-2xl shadow-lg w-full max-w-md overflow-hidden border border-border"
            >
              <div className="flex justify-between items-center p-4 border-b border-border">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary"/> About This Tool
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setIsAboutOpen(false)} className="h-8 w-8 rounded-full">
                  <X className="w-4 h-4"/>
                </Button>
              </div>
              <div className="p-6 text-muted-foreground space-y-4 text-sm leading-relaxed">
                <p>
                  <strong className="text-foreground">ShadowBan Check</strong> is a free tool designed to help Twitter/X users identify if their account has been restricted without their knowledge.
                </p>
                <p>
                  It checks for standard search visibility, search suggestion bans, and ghost bans (reply deboosting) by analyzing your profile metadata through external APIs.
                </p>
                <div className="pt-4 border-t border-border mt-4 text-xs">
                  This tool is not officially affiliated, associated, authorized, endorsed by, or in any way officially connected with X Corp (Twitter).
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDisclaimerOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground rounded-2xl shadow-lg w-full max-w-md overflow-hidden border border-border"
            >
              <div className="flex justify-between items-center p-4 border-b border-border">
                <h2 className="text-lg font-semibold flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500"/> Disclaimer</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsDisclaimerOpen(false)} className="h-8 w-8 rounded-full"><X className="w-4 h-4"/></Button>
              </div>
              <div className="p-6 text-muted-foreground space-y-4 text-sm leading-relaxed">
                <p>This tool is <strong className="text-foreground">not officially affiliated, associated, authorized, endorsed by, or in any way officially connected with X Corp (Twitter).</strong></p>
                <p>The results provided are estimations based on observable logic and external API tests. They reflect the current state at the time of the check, but X's algorithms change frequently.</p>
                <p>We do not collect or store your data. This is an open-source demonstration tool.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTipsOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground rounded-2xl shadow-lg w-full max-w-lg overflow-hidden border border-border max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center p-4 border-b border-border bg-muted/30">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-primary"><path d="M9 21h6"></path><path d="M12 21v-4"></path><path d="M12 17c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6c0 1.954.939 3.69 2.398 4.81"></path></svg> 
                  Shadowban Tips & FAQ
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setIsTipsOpen(false)} className="h-8 w-8 rounded-full"><X className="w-4 h-4"/></Button>
              </div>
              <div className="p-6 text-muted-foreground space-y-6 text-sm leading-relaxed overflow-y-auto">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">How long does it last?</h3>
                  <p>A typical shadowban lasts between <strong>48 to 72 hours</strong>, assuming no further violations occur.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Common causes</h3>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Spamming exactly identical tweets or replies.</li>
                    <li>Mass-following or unfollowing quickly.</li>
                    <li>Using excessive, unrelated hashtags.</li>
                  </ul>
                </div>
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <h3 className="font-semibold text-foreground mb-2">Cara terhindar dari shadowban</h3>
                  <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                    <li><strong>Berhenti aktivitas 24 jam</strong>: Kurangi posting, reply, dan RT selama 24-48 jam.</li>
                    <li><strong>Hindari copas</strong>: Jangan membalas banyak tweet dengan teks sama berulang-ulang.</li>
                    <li><strong>Lengkapi profil</strong>: Verifikasi no HP/Email dan gunakan setup profil real.</li>
                  </ol>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSupportOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground rounded-2xl shadow-lg w-full max-w-sm overflow-hidden border border-border"
            >
              <div className="flex justify-between items-center p-4 border-b border-border">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" /> Traktir Kopi ☕
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setIsSupportOpen(false)} className="h-8 w-8 rounded-full"><X className="w-4 h-4"/></Button>
              </div>
              <div className="p-6 text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Suka pakai ShadowCheck? Traktir saya kopi biar tetap semangat! 🙏
                </p>
                <div className="bg-muted/50 rounded-xl p-4 border border-border">
                  <img 
                    src="https://i.postimg.cc/MGrDPbcc/Whats-App-Image-2026-02-04-at-15-37-29.jpg" 
                    alt="Scan QR untuk donasi" 
                    className="w-full max-w-[240px] mx-auto rounded-lg" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isToolsOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground rounded-2xl shadow-lg w-full max-w-md overflow-hidden border border-border"
            >
              <div className="flex justify-between items-center p-4 border-b border-border">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-primary" /> Other Tools
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setIsToolsOpen(false)} className="h-8 w-8 rounded-full"><X className="w-4 h-4"/></Button>
              </div>
              <div className="p-5 space-y-3">
                <a
                  href="https://worthx.pages.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl border border-emerald-500/20 hover:border-emerald-500/30 transition-all group"
                >
                  <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm">WorthX</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">X Account Valuation & Price Check</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                </a>

                <a
                  href="https://aestheticgen.pages.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-purple-500/5 hover:bg-purple-500/10 rounded-xl border border-purple-500/20 hover:border-purple-500/30 transition-all group"
                >
                  <div className="w-10 h-10 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm">AestheticGen</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Generate aesthetic usernames</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-purple-500 transition-colors" />
                </a>

                <a
                  href="https://x-hunter.pages.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-blue-500/5 hover:bg-blue-500/10 rounded-xl border border-blue-500/20 hover:border-blue-500/30 transition-all group"
                >
                  <div className="w-10 h-10 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm">X-Hunter</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Brainstorming ideas & content strategy</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

