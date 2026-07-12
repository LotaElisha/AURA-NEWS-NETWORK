import React from 'react';
import { TrendingUp, Clock, ArrowRight, Radio } from 'lucide-react';
import { NewsHeadline, isSystemAlert, storyImage } from '../services/geminiService';
import { categoryLabel } from '../constants';

interface HomePageProps {
  trending: NewsHeadline[];
  isLoading: boolean;
  lastUpdated?: Date;
  onOpenArticle: (story: NewsHeadline) => void;
  onOpenCategory: (category: string) => void;
  onNavigateLive: () => void;
}

const SkeletonBlock = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-zinc-200 rounded ${className}`} />
);

export const HomePage: React.FC<HomePageProps> = ({
  trending, isLoading, lastUpdated, onOpenArticle, onOpenCategory, onNavigateLive,
}) => {
  const stories = trending.filter(h => !isSystemAlert(h));
  const lead = stories[0];
  const secondary = stories.slice(1, 5);
  const trendingList = stories.slice(0, 8);
  const more = stories.slice(5);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <SkeletonBlock className="aspect-video w-full" />
          <SkeletonBlock className="h-8 w-3/4" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-2/3" />
        </div>
        <div className="space-y-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="space-y-2">
              <SkeletonBlock className="h-5 w-full" />
              <SkeletonBlock className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Section heading */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-zinc-950">
        <h2 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-zinc-950">
          <TrendingUp size={20} className="text-red-700" />
          Trending Worldwide
        </h2>
        {lastUpdated && (
          <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 uppercase tracking-wider">
            <Clock size={12} />
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
        {/* Lead + secondary stories */}
        <div className="lg:col-span-2">
          {lead && (
            <article
              onClick={() => onOpenArticle(lead)}
              className="cursor-pointer group mb-8"
            >
              <div className="relative aspect-video overflow-hidden bg-zinc-200 mb-4">
                <img
                  src={storyImage(lead.title, 1200, 675)}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <span className="absolute top-4 left-4 bg-red-700 text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1">
                  {categoryLabel(lead.category)}
                </span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight text-zinc-950 group-hover:text-red-800 transition-colors">
                {lead.title}
              </h1>
              <p className="mt-3 text-zinc-600 leading-relaxed text-[15px]">{lead.summary}</p>
              <div className="mt-3 text-[11px] uppercase tracking-wider text-zinc-500">
                {lead.source} &middot; Aura Newsroom
              </div>
            </article>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-zinc-200 pt-8">
            {secondary.map((story, i) => (
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
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenCategory(story.category || 'General'); }}
                  className="text-[10px] font-bold uppercase tracking-widest text-red-700 hover:underline"
                >
                  {categoryLabel(story.category)}
                </button>
                <h3 className="font-serif text-lg font-bold leading-snug text-zinc-950 group-hover:text-red-800 transition-colors mt-1">
                  {story.title}
                </h3>
                <p className="mt-1.5 text-sm text-zinc-600 leading-relaxed line-clamp-2">{story.summary}</p>
                <div className="mt-2 text-[10px] uppercase tracking-wider text-zinc-400">{story.source}</div>
              </article>
            ))}
          </div>
        </div>

        {/* Right rail: numbered trending + Live TV promo */}
        <aside>
          <div className="border border-zinc-200 bg-zinc-50">
            <div className="px-5 py-3 border-b border-zinc-200 bg-white">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-950">
                Most Read Right Now
              </h3>
            </div>
            <ol className="divide-y divide-zinc-200">
              {trendingList.map((story, i) => (
                <li key={i}>
                  <button
                    onClick={() => onOpenArticle(story)}
                    className="flex gap-4 px-5 py-4 text-left w-full hover:bg-white transition-colors group"
                  >
                    <span className="font-serif text-2xl font-bold text-red-700/70 leading-none w-7 shrink-0">
                      {i + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold leading-snug text-zinc-900 group-hover:text-red-800 transition-colors">
                        {story.title}
                      </span>
                      <span className="block mt-1 text-[10px] uppercase tracking-wider text-zinc-400">
                        {categoryLabel(story.category)} &middot; {story.source}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>

          {/* Live TV promo card */}
          <button
            onClick={onNavigateLive}
            className="mt-6 w-full text-left bg-zinc-950 text-white p-6 group hover:bg-zinc-900 transition-colors"
          >
            <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase tracking-[0.25em] mb-3">
              <Radio size={13} className="animate-pulse" />
              Live now
            </div>
            <h3 className="font-serif text-xl font-bold leading-snug">
              Aura Live TV — the world's news, anchored by AI, around the clock.
            </h3>
            <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
              Watch our AI anchor deliver the latest headlines and talk live with field
              correspondent Marcus using your microphone.
            </p>
            <span className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold uppercase tracking-wider text-white group-hover:gap-2.5 transition-all">
              Watch the broadcast <ArrowRight size={14} />
            </span>
          </button>
        </aside>
      </div>

      {/* More coverage */}
      {more.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-zinc-950">
            <h2 className="text-lg font-black uppercase tracking-tight text-zinc-950">More Top Stories</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {more.map((story, i) => (
              <article
                key={i}
                onClick={() => onOpenArticle(story)}
                className="cursor-pointer group border-t-2 border-zinc-200 hover:border-red-700 pt-4 transition-colors"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-700">
                  {categoryLabel(story.category)}
                </span>
                <h3 className="font-serif text-base font-bold leading-snug text-zinc-950 group-hover:text-red-800 transition-colors mt-1">
                  {story.title}
                </h3>
                <p className="mt-1.5 text-[13px] text-zinc-600 leading-relaxed line-clamp-3">{story.summary}</p>
                <div className="mt-2 text-[10px] uppercase tracking-wider text-zinc-400">{story.source}</div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
