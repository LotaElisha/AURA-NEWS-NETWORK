import React from 'react';
import { NewsHeadline } from '../services/geminiService';
import { ExternalLink, Clock } from 'lucide-react';

interface SidebarProps {
  headlines: NewsHeadline[];
  isLoading: boolean;
  lastUpdated?: Date;
}

export const Sidebar: React.FC<SidebarProps> = ({ headlines, isLoading, lastUpdated }) => {
  return (
    <div className="w-80 flex flex-col border-l border-zinc-800 bg-zinc-950/50">
      <div className="p-6 border-b border-zinc-800">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
          <Clock size={14} />
          Latest Headlines
        </h3>
        {lastUpdated && (
          <div className="text-[9px] text-zinc-600 uppercase tracking-widest mt-1">
            Updated {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-zinc-900">
            {headlines.map((item, index) => (
              <a 
                key={index}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-6 hover:bg-zinc-900 transition-colors group"
              >
                <div className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-2 flex items-center justify-between">
                  {item.source}
                  <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h4 className="text-sm font-medium leading-snug group-hover:text-blue-400 transition-colors">
                  {item.title}
                </h4>
              </a>
            ))}
          </div>
        )}
      </div>
      <div className="p-6 bg-zinc-900/50 border-t border-zinc-800">
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest text-center">
          Powered by Gemini AI
        </div>
      </div>
    </div>
  );
};
