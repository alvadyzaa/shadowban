import React, { useState } from 'react';
import { Info, AlertTriangle, ExternalLink, X, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);

  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans text-gray-900 dark:text-gray-100 relative transition-colors duration-200">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 py-4 shadow-sm z-10 transition-colors duration-200">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-blue-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"/></svg>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">ShadowCheck</h1>
          </div>
          <nav className="flex items-center gap-4 sm:gap-6 text-sm">
            <button onClick={() => setIsAboutOpen(true)} className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
              <Info className="w-4 h-4" /> About
            </button>
            <button onClick={() => setIsDisclaimerOpen(true)} className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
              <AlertTriangle className="w-4 h-4" /> Disclaimer
            </button>
            <a href="https://x.com/miegrains" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium px-3 py-1.5 rounded-full">
              <ExternalLink className="w-4 h-4" /> x.com/miegrains
            </a>
            
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>
            
            <button 
              onClick={toggleTheme} 
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex items-center justify-center"
              aria-label="Toggle Dark Mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 py-6 mt-12 transition-colors duration-200">
        <div className="container mx-auto px-4 text-center text-gray-400 dark:text-gray-500 text-sm">
          <p>
            © {new Date().getFullYear()} ShadowCheck by <a href="https://x.com/miegrains" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline decoration-dotted underline-offset-2">Keith</a>. Not affiliated with X Corp.
          </p>
        </div>
      </footer>

      {/* About Modal */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white"><Info className="w-5 h-5 text-blue-600 dark:text-blue-400"/> About This Tool</h2>
              <button onClick={() => setIsAboutOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 text-gray-600 dark:text-gray-300 space-y-4 text-sm leading-relaxed">
              <p>
                <strong>ShadowBan Check</strong> is a free tool designed to help Twitter/X users identify if their account has been restricted without their knowledge.
              </p>
              <p>
                It checks for standard search visibility, search suggestion bans, and ghost bans (reply deboosting) by analyzing your profile metadata through external APIs.
              </p>
              <p>
                Created with a clean, minimalist design for the best user experience.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer Modal */}
      {isDisclaimerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white"><AlertTriangle className="w-5 h-5 text-amber-500"/> Disclaimer</h2>
              <button onClick={() => setIsDisclaimerOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 text-gray-600 dark:text-gray-300 space-y-4 text-sm leading-relaxed">
              <p>
                This tool is <strong className="text-gray-900 dark:text-white">not officially affiliated, associated, authorized, endorsed by, or in any way officially connected with X Corp (Twitter).</strong>
              </p>
              <p>
                The results provided are estimations based on observable logic and external API tests. They reflect the current state at the time of the check, but X's algorithms change frequently.
              </p>
              <p>
                We do not collect or store your data. This is an open-source demonstration tool.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
