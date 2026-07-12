import React, { useState } from 'react';
import { Radio, Mail, MapPin, Twitter, Facebook, Linkedin, Youtube, Check } from 'lucide-react';
import { CATEGORIES } from '../constants';

interface FooterProps {
  onNavigateCategory: (category: string) => void;
  onNavigateLive: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateCategory, onNavigateLive }) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <footer className="bg-zinc-950 text-zinc-400 mt-16">
      {/* Newsletter band */}
      <div className="border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row md:items-center gap-6 md:gap-12">
          <div className="flex-1">
            <h3 className="text-white text-xl font-black tracking-tight">The Aura Briefing</h3>
            <p className="text-sm mt-1">The world's most trending stories, delivered to your inbox every morning.</p>
          </div>
          <form onSubmit={handleSubscribe} className="flex gap-2 w-full md:w-auto">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="flex-1 md:w-72 bg-zinc-900 border border-zinc-800 rounded px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-700"
            />
            <button
              type="submit"
              className="bg-red-700 hover:bg-red-600 text-white font-bold text-sm px-5 py-2.5 rounded transition-colors flex items-center gap-2"
            >
              {subscribed ? (<><Check size={15} /> Subscribed</>) : 'Subscribe'}
            </button>
          </form>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 bg-red-700 flex items-center justify-center">
              <span className="text-white font-black text-xl leading-none">A</span>
            </div>
            <div className="text-white font-black tracking-tighter text-lg leading-none">
              AURA <span className="text-red-600">NEWS</span> NETWORK
            </div>
          </div>
          <p className="text-sm leading-relaxed">
            Aura News Network is a next-generation news organization delivering the world's most
            trending stories in real time — researched, written, and broadcast with the help of
            advanced AI, in six languages, 24 hours a day.
          </p>
          <div className="flex gap-3 mt-5">
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-900 rounded hover:bg-red-700 hover:text-white transition-colors" aria-label="X (Twitter)"><Twitter size={15} /></a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-900 rounded hover:bg-red-700 hover:text-white transition-colors" aria-label="Facebook"><Facebook size={15} /></a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-900 rounded hover:bg-red-700 hover:text-white transition-colors" aria-label="LinkedIn"><Linkedin size={15} /></a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-900 rounded hover:bg-red-700 hover:text-white transition-colors" aria-label="YouTube"><Youtube size={15} /></a>
          </div>
        </div>

        <div>
          <h4 className="text-white text-xs font-bold uppercase tracking-[0.2em] mb-4">Sections</h4>
          <ul className="space-y-2.5 text-sm">
            {CATEGORIES.map(cat => (
              <li key={cat.id}>
                <button onClick={() => onNavigateCategory(cat.id)} className="hover:text-white transition-colors">
                  {cat.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-white text-xs font-bold uppercase tracking-[0.2em] mb-4">Watch &amp; Listen</h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <button onClick={onNavigateLive} className="flex items-center gap-2 hover:text-white transition-colors">
                <Radio size={13} className="text-red-600" />
                Aura Live TV — 24/7 AI Broadcast
              </button>
            </li>
            <li><span className="text-zinc-500">The Aura Briefing (Podcast) — coming soon</span></li>
            <li><span className="text-zinc-500">Aura Radio — coming soon</span></li>
          </ul>
          <h4 className="text-white text-xs font-bold uppercase tracking-[0.2em] mt-8 mb-4">Company</h4>
          <ul className="space-y-2.5 text-sm">
            <li><span className="hover:text-white transition-colors cursor-pointer">About Aura News Network</span></li>
            <li><span className="hover:text-white transition-colors cursor-pointer">Editorial Standards</span></li>
            <li><span className="hover:text-white transition-colors cursor-pointer">Careers</span></li>
            <li><span className="hover:text-white transition-colors cursor-pointer">Advertise with us</span></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white text-xs font-bold uppercase tracking-[0.2em] mb-4">Contact the Newsroom</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <Mail size={14} className="mt-0.5 text-zinc-600" />
              <span>newsroom@auranews.network</span>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin size={14} className="mt-0.5 text-zinc-600" />
              <span>Aura Broadcast Centre<br />Nairobi &middot; London &middot; New York</span>
            </li>
          </ul>
          <div className="mt-6 p-4 bg-zinc-900/60 border border-zinc-800 rounded text-[11px] leading-relaxed">
            <strong className="text-zinc-300">AI Transparency:</strong> Aura News stories are
            researched via live web search and drafted by AI, then presented for your review.
            Always verify critical facts with the cited original sources.
          </div>
        </div>
      </div>

      {/* Legal strip */}
      <div className="border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-600">
          <span>&copy; {new Date().getFullYear()} Aura News Network. All rights reserved.</span>
          <div className="flex gap-5">
            <span className="hover:text-zinc-300 cursor-pointer transition-colors">Terms of Use</span>
            <span className="hover:text-zinc-300 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-zinc-300 cursor-pointer transition-colors">Cookie Settings</span>
            <span className="hover:text-zinc-300 cursor-pointer transition-colors">AI Disclosure</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
