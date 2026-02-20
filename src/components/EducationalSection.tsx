import React from 'react';
import { Search, MessageCircle, UserX } from 'lucide-react';

export const EducationalSection: React.FC = () => {
  return (
    <section className="py-16 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 transition-colors">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Understanding Twitter Bans</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">What do these results actually mean for your account?</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Search Suggestion Ban</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Your account doesn't appear in the search bar's auto-complete dropdown. Often the first sign of a penalty.
            </p>
          </div>

          <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400">
              <UserX className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Search Ban</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Your tweets are completely hidden from search results, even when searching for exact phrases. A severe visibility penalty.
            </p>
          </div>

          <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-4 text-orange-600 dark:text-orange-400">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Ghost Ban</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Also known as Reply Deboosting. Your replies are hidden behind a "Show more" button or made invisible to others.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
