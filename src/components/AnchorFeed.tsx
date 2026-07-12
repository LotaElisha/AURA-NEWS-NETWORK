import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio } from 'lucide-react';

interface AnchorFeedProps {
  isBroadcasting: boolean;
  currentSegment?: { headline: string; content: string };
  isSpeaking: boolean;
  isLiveMode?: boolean;
}

export const AnchorFeed: React.FC<AnchorFeedProps> = ({ isBroadcasting, currentSegment, isSpeaking, isLiveMode }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative aspect-video bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 shadow-2xl">
      {/* Background/Studio View */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center opacity-20" />
      
      {/* Overlay Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/50" />

      {/* Dual Anchor Split View */}
      <div className="absolute inset-0 flex">
        {/* AI Anchor (Left) */}
        <div className="flex-1 relative border-r border-zinc-800/50 overflow-hidden">
          <motion.div 
            animate={isSpeaking ? { scale: [1, 1.01, 1], filter: ['brightness(1)', 'brightness(1.1)', 'brightness(1)'] } : {}}
            transition={{ repeat: Infinity, duration: 3 }}
            className="absolute inset-0"
          >
            <img 
              src="https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?auto=format&fit=crop&q=80&w=800" 
              alt="AI Anchor"
              className="w-full h-full object-cover object-top grayscale-[5%] contrast-[1.05]"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          
          {/* Speaking Indicator for Anchor */}
          {isSpeaking && (
            <div className="absolute bottom-4 left-4 flex gap-1">
              {[1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  animate={{ height: [4, 12, 4] }}
                  transition={{ repeat: Infinity, duration: 0.4, delay: i * 0.1 }}
                  className="w-1 bg-blue-500 rounded-full"
                />
              ))}
            </div>
          )}
          
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent" />
          <div className="absolute bottom-4 left-4 text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-zinc-950/50 px-2 py-1 rounded">
            Aura • AI Anchor
          </div>
        </div>

        {/* Guest/Co-Anchor (Right) */}
        <div className="flex-1 relative overflow-hidden">
          <motion.div 
            animate={{ scale: [1, 1.005, 1] }}
            transition={{ repeat: Infinity, duration: 5 }}
            className="absolute inset-0"
          >
            <img 
              src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800" 
              alt="Co-Anchor"
              className="w-full h-full object-cover object-top grayscale-[10%]"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent" />
          <div className="absolute bottom-4 left-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-950/50 px-2 py-1 rounded">
            Marcus • Field Correspondent
          </div>
        </div>
      </div>

      {/* UI Overlays */}
      <div className="absolute top-6 left-6 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-sm font-bold text-xs uppercase tracking-widest">
            <Radio size={14} className="animate-pulse" />
            Live
          </div>
          {isLiveMode && (
            <div className="bg-blue-600 px-3 py-1 rounded-sm font-bold text-[10px] uppercase tracking-widest animate-pulse">
              Auto-Sync
            </div>
          )}
        </div>
        <div className="bg-zinc-900/80 backdrop-blur-md px-3 py-1 rounded-sm text-[10px] font-mono uppercase tracking-widest border border-zinc-700 w-fit">
          Aura News Network • Global
        </div>
      </div>

      <div className="absolute top-6 right-6">
        <div className="text-right">
          <div className="text-xl font-display font-bold tracking-tighter">
            {time.toLocaleTimeString([], { hour12: false })}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
            {time.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Lower Thirds */}
      <AnimatePresence mode="wait">
        {isBroadcasting && currentSegment && (
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            className="absolute bottom-12 left-0 right-0 px-12"
          >
            <div className="bg-zinc-950/90 backdrop-blur-xl border-l-8 border-blue-600 p-6 shadow-2xl max-w-2xl">
              <h2 className="text-blue-400 text-xs font-bold uppercase tracking-[0.2em] mb-2">Breaking Update</h2>
              <h1 className="text-2xl font-display font-bold leading-tight tracking-tight">
                {currentSegment.headline}
              </h1>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio Visualizer (Bottom) */}
      {isSpeaking && (
        <div className="absolute bottom-0 left-0 right-0 h-1 flex items-end justify-center gap-px">
          {Array.from({ length: 100 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{ height: [`${Math.random() * 20}%`, `${Math.random() * 100}%`, `${Math.random() * 20}%`] }}
              transition={{ repeat: Infinity, duration: 0.2 }}
              className="flex-1 bg-blue-500/30"
            />
          ))}
        </div>
      )}
    </div>
  );
};
