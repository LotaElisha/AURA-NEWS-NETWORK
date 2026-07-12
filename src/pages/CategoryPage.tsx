import React, { useEffect, useState } from 'react';
import { Clock, RefreshCcw } from 'lucide-react';
import { fetchLatestNews, NewsHeadline, isSystemAlert, storyImage } from '../services/geminiService';
import { categoryLabel } from '../constants';

interface CategoryPageProps {
  category: string;
  language: string;
  onOpenArticle: (story: NewsHeadline) => void;
}

export const CategoryPage: React.FC<CategoryPageProps> = ({ category, language, onOpenArticle }) => {
  const [stories, setStories] = useState<NewsHeadline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);

  const load = async () => {
    setIsLoading(true);
    const news = await fetchLatestNews(language, category);
    setStories(news.filter(h => !isSystemAlert(h)).map(h => ({ ...h, category: h.category || category })));
    setLastUpdated(new Date());
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, [category, language]);

  const lead = stories[0];
  const rest = stories.slice(1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-zinc-950">
        <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-950">
          <span className="text-red-700">/</span> {categoryLabel(category)}
        </h2>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-zinc-500 uppercase tracking-wider">
              <Clock size={12} />
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={load}
            disabled={isLoading}
            className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded text-zinc-700 transition-colors disabled:opacity-50"
            title="Refresh section"
          >
            <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-3">
              <div className="animate-pulse bg-zinc-200 aspect-video" />
              <div className="animate-pulse bg-zinc-200 h-5 w-4/5 rounded" />
              <div className="animate-pulse bg-zinc-200 h-3 w-3/5 rounded" />
            </div>
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="py-20 text-center text-zinc-500 text-sm">
          No stories available for this section right now. Try refreshing.
        </div>
      ) : (
        <>
          {lead && (
            <article
              onClick={() => onOpenArticle(lead)}
              className="cursor-pointer group grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 pb-10 border-b border-zinc-200"
            >
              <div className="relative aspect-video overflow-hidden bg-zinc-200">
                <img
                  src={storyImage(lead.title, 960, 540)}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-700">Top story</span>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-tight text-zinc-950 group-hover:text-red-800 transition-colors mt-2">
                  {lead.title}
                </h1>
                <p className="mt-3 text-zinc-600 leading-relaxed text-[15px]">{lead.summary}</p>
                <div className="mt-3 text-[11px] uppercase tracking-wider text-zinc-500">
                  {lead.source} &middot; Aura Newsroom
                </div>
              </div>
            </article>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {rest.map((story, i) => (
              <article
                key={i}
                onClick={() => onOpenArticle(story)}
                className="cursor-pointer group"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-zinc-200 mb-3">
                  <img
                    src={storyImage(story.title, 640, 400)}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <h3 className="font-serif text-base font-bold leading-snug text-zinc-950 group-hover:text-red-800 transition-colors">
                  {story.title}
                </h3>
                <p className="mt-1.5 text-[13px] text-zinc-600 leading-relaxed line-clamp-3">{story.summary}</p>
                <div className="mt-2 text-[10px] uppercase tracking-wider text-zinc-400">{story.source}</div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
