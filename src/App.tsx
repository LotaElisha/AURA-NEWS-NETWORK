/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { fetchTrendingNews, NewsHeadline, isSystemAlert } from './services/geminiService';
import { Masthead } from './components/Masthead';
import { Footer } from './components/Footer';
import { NewsTicker } from './components/NewsTicker';
import { HomePage } from './pages/HomePage';
import { CategoryPage } from './pages/CategoryPage';
import { ArticleReader } from './pages/ArticleReader';
import { StudioPage } from './pages/StudioPage';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

type View =
  | { name: 'home' }
  | { name: 'category'; category: string }
  | { name: 'article'; story: NewsHeadline }
  | { name: 'live' };

export default function App() {
  const [view, setView] = useState<View>({ name: 'home' });
  const [language, setLanguage] = useState('English');
  const [trending, setTrending] = useState<NewsHeadline[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingTrending(true);
    fetchTrendingNews(language).then(news => {
      if (cancelled) return;
      setTrending(news);
      setLastUpdated(new Date());
      setIsLoadingTrending(false);
    });
    return () => { cancelled = true; };
  }, [language]);

  const openArticle = (story: NewsHeadline) => {
    setView({ name: 'article', story });
    window.scrollTo({ top: 0 });
  };

  const openCategory = (category: string) => {
    setView({ name: 'category', category });
    window.scrollTo({ top: 0 });
  };

  const goHome = () => {
    setView({ name: 'home' });
    window.scrollTo({ top: 0 });
  };

  const goLive = () => {
    setView({ name: 'live' });
    window.scrollTo({ top: 0 });
  };

  const activeSection =
    view.name === 'home' ? 'home'
    : view.name === 'category' ? view.category
    : view.name === 'live' ? 'live'
    : (view.story.category || '');

  const visibleTrending = trending.filter(h => !isSystemAlert(h));
  const demoMode = trending.some(isSystemAlert);

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col">
      <Masthead
        activeSection={activeSection}
        language={language}
        onLanguageChange={setLanguage}
        onNavigateHome={goHome}
        onNavigateCategory={openCategory}
        onNavigateLive={goLive}
      />

      {/* Breaking ticker under the masthead on editorial pages */}
      {view.name !== 'live' && visibleTrending.length > 0 && (
        <NewsTicker headlines={visibleTrending.slice(0, 8).map(h => h.title)} variant="inline" />
      )}

      {demoMode && view.name !== 'live' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2 text-center text-xs text-amber-800">
          <strong>Demo Mode:</strong> live news search is temporarily unavailable (API quota).
          Stories shown are samples —{' '}
          <button onClick={() => window.aistudio?.openSelectKey()} className="underline font-bold">
            configure your Gemini API key
          </button>{' '}
          to restore real-time coverage.
        </div>
      )}

      <div className="flex-1">
        {view.name === 'home' && (
          <HomePage
            trending={trending}
            isLoading={isLoadingTrending}
            lastUpdated={lastUpdated}
            onOpenArticle={openArticle}
            onOpenCategory={openCategory}
            onNavigateLive={goLive}
          />
        )}

        {view.name === 'category' && (
          <CategoryPage
            category={view.category}
            language={language}
            onOpenArticle={openArticle}
          />
        )}

        {view.name === 'article' && (
          <ArticleReader
            story={view.story}
            language={language}
            onBack={goHome}
            related={visibleTrending.filter(h => h.title !== view.story.title)}
            onOpenArticle={openArticle}
          />
        )}

        {view.name === 'live' && <StudioPage language={language} />}
      </div>

      <Footer onNavigateCategory={openCategory} onNavigateLive={goLive} />
    </div>
  );
}
