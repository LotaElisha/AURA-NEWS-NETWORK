import React from 'react';
import { motion } from 'motion/react';

interface NewsTickerProps {
  headlines: string[];
}

export const NewsTicker: React.FC<NewsTickerProps> = ({ headlines }) => {
  if (headlines.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-red-700 h-10 flex items-center overflow-hidden border-t border-red-600 z-50">
      <div className="bg-red-900 px-4 h-full flex items-center font-bold text-sm uppercase tracking-wider z-10 border-r border-red-600">
        Breaking
      </div>
      <div className="flex whitespace-nowrap animate-ticker">
        {headlines.map((headline, index) => (
          <span key={index} className="mx-8 text-sm font-medium uppercase tracking-wide">
            {headline} • 
          </span>
        ))}
        {/* Duplicate for seamless loop */}
        {headlines.map((headline, index) => (
          <span key={`dup-${index}`} className="mx-8 text-sm font-medium uppercase tracking-wide">
            {headline} • 
          </span>
        ))}
      </div>
    </div>
  );
};
