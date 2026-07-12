import React, { useState } from 'react';
import { NewsHeadline } from '../services/geminiService';
import { ExternalLink, Clock, Share2, Copy, Check } from 'lucide-react';

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
              <SidebarItem key={index} item={item} />
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

interface SidebarItemProps {
  item: NewsHeadline;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ item }) => {
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const shareText = `Aura News: ${item.title} - Read more at ${item.url}`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleShareMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowShareMenu(!showShareMenu);
  };

  const shareToSocial = (platform: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const title = item.title;
    const url = item.url;
    let shareUrl = '';

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(title + " - " + url)}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
    setShowShareMenu(false);
  };

  return (
    <div className="relative group p-6 hover:bg-zinc-900/40 transition-colors">
      <a 
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-2 flex items-center justify-between">
          <span>{item.source}</span>
          <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <h4 className="text-sm font-medium leading-snug group-hover:text-blue-400 transition-colors pr-8">
          {item.title}
        </h4>
        <p className="text-xs text-zinc-500 mt-2 line-clamp-2 leading-relaxed">
          {item.summary}
        </p>
      </a>

      {/* Share Actions Panel */}
      <div className="absolute top-6 right-6 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
        </button>
        <div className="relative">
          <button
            onClick={toggleShareMenu}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Share story"
          >
            <Share2 size={12} />
          </button>
          
          {showShareMenu && (
            <div className="absolute right-0 mt-1 w-36 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl py-1 z-20">
              <button
                onClick={(e) => shareToSocial('twitter', e)}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              >
                Share on X (Twitter)
              </button>
              <button
                onClick={(e) => shareToSocial('facebook', e)}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              >
                Share on Facebook
              </button>
              <button
                onClick={(e) => shareToSocial('linkedin', e)}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              >
                Share on LinkedIn
              </button>
              <button
                onClick={(e) => shareToSocial('whatsapp', e)}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              >
                Share on WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
