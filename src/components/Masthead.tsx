import React, { useState } from 'react';
import { Menu, X, Radio, Settings, Search } from 'lucide-react';
import { CATEGORIES, LANGUAGES } from '../constants';

interface MastheadProps {
  activeSection: string; // 'home' | category id | 'live'
  language: string;
  onLanguageChange: (lang: string) => void;
  onNavigateHome: () => void;
  onNavigateCategory: (category: string) => void;
  onNavigateLive: () => void;
}

export const Masthead: React.FC<MastheadProps> = ({
  activeSection,
  language,
  onLanguageChange,
  onNavigateHome,
  onNavigateCategory,
  onNavigateLive,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="bg-white border-b border-zinc-200 sticky top-0 z-40 shadow-sm">
      {/* Utility strip */}
      <div className="bg-zinc-950 text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-8 flex items-center justify-between text-[11px] tracking-wide">
          <span className="hidden sm:block">{today}</span>
          <span className="sm:hidden">Aura News</span>
          <div className="flex items-center gap-4">
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-transparent text-zinc-300 text-[11px] focus:outline-none cursor-pointer"
              aria-label="Edition language"
            >
              {LANGUAGES.map(l => (
                <option key={l} value={l} className="bg-zinc-900">{l} Edition</option>
              ))}
            </select>
            <button
              onClick={() => window.aistudio?.openSelectKey()}
              className="hidden sm:flex items-center gap-1 hover:text-white transition-colors"
              title="Manage API Key"
            >
              <Settings size={11} />
              API Key
            </button>
          </div>
        </div>
      </div>

      {/* Brand masthead */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <button onClick={onNavigateHome} className="flex items-center gap-3 text-left group">
          <div className="w-11 h-11 bg-red-700 group-hover:bg-red-600 transition-colors flex items-center justify-center">
            <span className="text-white font-black text-2xl leading-none">A</span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black tracking-tighter text-zinc-950 leading-none">
              AURA <span className="text-red-700">NEWS</span>
            </div>
            <div className="text-[9px] uppercase tracking-[0.35em] text-zinc-500 mt-0.5">
              Network &middot; Global Coverage
            </div>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateLive}
            className={`flex items-center gap-2 px-4 py-2 rounded font-bold text-xs uppercase tracking-wider transition-all ${
              activeSection === 'live'
                ? 'bg-red-700 text-white'
                : 'bg-zinc-950 text-white hover:bg-red-700'
            }`}
          >
            <Radio size={14} className="animate-pulse" />
            Watch Live
          </button>
          <button
            className="lg:hidden p-2 text-zinc-700"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Section navigation */}
      <nav className={`border-t border-zinc-200 ${mobileOpen ? 'block' : 'hidden'} lg:block`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row lg:items-center">
          <button
            onClick={() => { onNavigateHome(); setMobileOpen(false); }}
            className={`px-3 py-3 text-[13px] font-bold uppercase tracking-wide border-b-[3px] text-left transition-colors ${
              activeSection === 'home'
                ? 'border-red-700 text-red-700'
                : 'border-transparent text-zinc-700 hover:text-red-700'
            }`}
          >
            Home
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => { onNavigateCategory(cat.id); setMobileOpen(false); }}
              className={`px-3 py-3 text-[13px] font-bold uppercase tracking-wide border-b-[3px] text-left transition-colors ${
                activeSection === cat.id
                  ? 'border-red-700 text-red-700'
                  : 'border-transparent text-zinc-700 hover:text-red-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
          <div className="hidden lg:flex flex-1 justify-end items-center text-zinc-400 pr-1">
            <Search size={15} />
          </div>
        </div>
      </nav>
    </div>
  );
};
