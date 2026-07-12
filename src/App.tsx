/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, RefreshCcw, Globe, Settings, Layout } from 'lucide-react';
import { fetchLatestNews, generateNewsScript, generateSpeech, NewsHeadline, NewsScript } from './services/geminiService';
import { NewsTicker } from './components/NewsTicker';
import { AnchorFeed } from './components/AnchorFeed';
import { Sidebar } from './components/Sidebar';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const [headlines, setHeadlines] = useState<NewsHeadline[]>([]);
  const [script, setScript] = useState<NewsScript | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(-1);
  const [currentVirtualSegment, setCurrentVirtualSegment] = useState<{ headline: string; content: string } | undefined>(undefined);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState("Initializing...");
  const [language, setLanguage] = useState("English");
  const [category, setCategory] = useState("General");
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [nextUpdateIn, setNextUpdateIn] = useState(300);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadNews();
  }, [language, category]);

  // Live Mode Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLiveMode && !isBroadcasting) {
      timer = setInterval(() => {
        setNextUpdateIn((prev) => {
          if (prev <= 1) {
            loadNews().then(() => startBroadcast());
            return 300;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setNextUpdateIn(300);
    }
    return () => clearInterval(timer);
  }, [isLiveMode, isBroadcasting]);

  const loadNews = async () => {
    setIsLoading(true);
    setStatus(`Fetching latest ${category} news in ${language}...`);
    const news = await fetchLatestNews(language, category);
    setHeadlines(news);
    setLastUpdated(new Date());
    setIsLoading(false);
    setStatus("Ready to broadcast");
  };

  const startBroadcast = async () => {
    try {
      setIsBroadcasting(true);
      setStatus(`Generating broadcast script in ${language}...`);
      const newsScript = await generateNewsScript(headlines, language);
      setScript(newsScript);

      // Start with intro
      setCurrentVirtualSegment({ headline: language === "Swahili" ? "Utangulizi wa Matangazo" : "Broadcast Introduction", content: newsScript.intro });
      await playSegment(newsScript.intro, -1);

      // Play each segment
      for (let i = 0; i < newsScript.segments.length; i++) {
        setCurrentSegmentIndex(i);
        setCurrentVirtualSegment(newsScript.segments[i]);
        await playSegment(newsScript.segments[i].content, i);
      }

      // Outro
      setCurrentSegmentIndex(-1);
      setCurrentVirtualSegment({ headline: language === "Swahili" ? "Taarifa ya Kufunga" : "Closing Statement", content: newsScript.outro });
      await playSegment(newsScript.outro, -1);

      stopBroadcast();
    } catch (error: any) {
      console.error("Broadcast error:", error);
      if (error?.message?.includes("429") || error?.status === "RESOURCE_EXHAUSTED") {
        setStatus("API Quota Exhausted. Please select your own API key.");
        if (window.aistudio) {
          await window.aistudio.openSelectKey();
        }
      } else {
        setStatus("Broadcast error occurred.");
      }
      stopBroadcast();
    }
  };

  const playSegment = async (text: string, index: number) => {
    setStatus(`Broadcasting: ${index === -1 ? 'Intro/Outro' : `Story ${index + 1}`}`);
    const audioData = await generateSpeech(text, language);
    const audioBlob = await fetch(`data:audio/wav;base64,${audioData}`).then(r => r.blob());
    const audioUrl = URL.createObjectURL(audioBlob);

    return new Promise<void>((resolve) => {
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onplay = () => setIsSpeaking(true);
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audioRef.current.play();
      } else {
        resolve();
      }
    });
  };

  const stopBroadcast = () => {
    setIsBroadcasting(false);
    setCurrentSegmentIndex(-1);
    setCurrentVirtualSegment(undefined);
    setIsSpeaking(false);
    setStatus("Broadcast ended");
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <audio ref={audioRef} className="hidden" />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-8 bg-zinc-950/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-lg">A</div>
            <h1 className="text-lg font-display font-bold tracking-tight">Aura News Network</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Language</span>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={isBroadcasting}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] uppercase tracking-widest rounded px-2 py-1 focus:outline-none focus:border-blue-600 disabled:opacity-50"
              >
                <option value="English">English</option>
                <option value="Swahili">Swahili</option>
                <option value="French">French</option>
                <option value="Spanish">Spanish</option>
                <option value="German">German</option>
                <option value="Japanese">Japanese</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              System Online
            </div>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex gap-4">
              <button 
                onClick={() => window.aistudio?.openSelectKey()}
                className="text-[10px] text-zinc-500 hover:text-blue-400 uppercase tracking-widest transition-colors flex items-center gap-1"
                title="Manage API Key"
              >
                <Settings size={14} />
                API Key
              </button>
              <Globe size={18} className="text-zinc-500 hover:text-zinc-100 cursor-pointer transition-colors" />
            </div>
          </div>
        </header>

        {/* Broadcast View */}
        <div className="flex-1 p-8 flex flex-col gap-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto w-full space-y-8">
            <AnchorFeed 
              isBroadcasting={isBroadcasting}
              currentSegment={currentVirtualSegment}
              isSpeaking={isSpeaking}
              isLiveMode={isLiveMode}
            />

            {/* Controls & Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Broadcast Control</h3>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Live Mode</span>
                        <button 
                          onClick={() => setIsLiveMode(!isLiveMode)}
                          className={`w-8 h-4 rounded-full transition-colors relative ${isLiveMode ? 'bg-blue-600' : 'bg-zinc-800'}`}
                        >
                          <motion.div 
                            animate={{ x: isLiveMode ? 16 : 2 }}
                            className="absolute top-0.5 w-3 h-3 bg-white rounded-full"
                          />
                        </button>
                      </div>
                      {isLiveMode && !isBroadcasting && (
                        <div className="text-[10px] font-mono text-blue-400">
                          Next update in {Math.floor(nextUpdateIn / 60)}:{(nextUpdateIn % 60).toString().padStart(2, '0')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {!isBroadcasting ? (
                      <button 
                        onClick={startBroadcast}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-3 rounded-lg font-bold transition-all transform active:scale-95 text-white"
                      >
                        <Play size={18} fill="currentColor" />
                        Start Broadcast
                      </button>
                    ) : (
                      <button 
                        onClick={stopBroadcast}
                        className="flex items-center gap-2 bg-zinc-100 text-zinc-950 hover:bg-white px-6 py-3 rounded-lg font-bold transition-all transform active:scale-95"
                      >
                        <Square size={18} fill="currentColor" />
                        Stop Broadcast
                      </button>
                    )}
                    <button 
                      onClick={loadNews}
                      disabled={isBroadcasting || isLoading}
                      className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50 text-white"
                    >
                      <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-zinc-800/50">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                    <span>Status</span>
                    <span className="text-zinc-300">{status}</span>
                  </div>
                  <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: isBroadcasting ? '100%' : '0%' }}
                      transition={{ duration: 120, ease: "linear" }}
                      className="h-full bg-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Network Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-zinc-500 uppercase">Viewers</span>
                    <span className="text-xl font-display font-bold">1.2M</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-zinc-500 uppercase">Latency</span>
                    <span className="text-xl font-display font-bold text-emerald-500">24ms</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-zinc-500 uppercase">Uptime</span>
                    <span className="text-xl font-display font-bold">99.9%</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Channel Selection Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Channel Guide</h3>
                <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Select a channel to switch coverage</div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { id: 'General', label: 'Global News', color: 'bg-zinc-800', icon: <Globe size={16} /> },
                  { id: 'AI News', label: 'AI & Future', color: 'bg-blue-900', icon: <RefreshCcw size={16} /> },
                  { id: 'Sports', label: 'Sports Arena', color: 'bg-emerald-900', icon: <Play size={16} /> },
                  { id: 'Politics', label: 'Capitol Hill', color: 'bg-red-900', icon: <Settings size={16} /> },
                  { id: 'Technology', label: 'Tech Pulse', color: 'bg-indigo-900', icon: <Layout size={16} /> },
                  { id: 'Business', label: 'Market Watch', color: 'bg-amber-900', icon: <Globe size={16} /> },
                  { id: 'Entertainment', label: 'Showbiz', color: 'bg-purple-900', icon: <Play size={16} /> },
                  { id: 'Science', label: 'Discovery', color: 'bg-cyan-900', icon: <RefreshCcw size={16} /> },
                  { id: 'Health', label: 'Wellness', color: 'bg-rose-900', icon: <Settings size={16} /> },
                ].map((channel) => (
                  <motion.button
                    key={channel.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => !isBroadcasting && setCategory(channel.id)}
                    disabled={isBroadcasting}
                    className={`relative h-24 rounded-xl border p-4 text-left transition-all ${
                      category === channel.id 
                        ? 'border-blue-500 bg-blue-600/20 ring-1 ring-blue-500' 
                        : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                    } disabled:opacity-50`}
                  >
                    <div className={`mb-2 w-fit rounded-lg p-2 ${channel.color}`}>
                      {channel.icon}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-wider">{channel.label}</div>
                    {category === channel.id && (
                      <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Ticker */}
        <NewsTicker headlines={headlines.map(h => h.title)} />
      </main>

      {/* Sidebar */}
      <Sidebar headlines={headlines} isLoading={isLoading} lastUpdated={lastUpdated} />
    </div>
  );
}
