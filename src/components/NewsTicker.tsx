import React from 'react';

interface NewsTickerProps {
  headlines: string[];
  // 'fixed' pins to the bottom of the viewport (broadcast studio),
  // 'inline' renders as a normal block (website front page).
  variant?: 'fixed' | 'inline';
}

export const NewsTicker: React.FC<NewsTickerProps> = ({ headlines, variant = 'fixed' }) => {
  if (headlines.length === 0) return null;

  const positionClasses = variant === 'fixed'
    ? 'fixed bottom-0 left-0 right-0 z-50 border-t'
    : 'relative border-y';

  return (
    <div className={`${positionClasses} bg-red-700 h-10 flex items-center overflow-hidden border-red-600`}>
      <div className="bg-red-900 px-4 h-full flex items-center font-bold text-sm uppercase tracking-wider z-10 border-r border-red-600 text-white shrink-0">
        Breaking
      </div>
      <div className="flex whitespace-nowrap animate-ticker text-white">
        {headlines.map((headline, index) => (
          <span key={index} className="mx-8 text-sm font-medium uppercase tracking-wide">
            {headline} &bull;
          </span>
        ))}
        {/* Duplicate for seamless loop */}
        {headlines.map((headline, index) => (
          <span key={`dup-${index}`} className="mx-8 text-sm font-medium uppercase tracking-wide">
            {headline} &bull;
          </span>
        ))}
      </div>
    </div>
  );
};
