import React, { useEffect, useState } from 'react';
import { ArrowLeft, Share2, Copy, Check, ExternalLink, Volume2, Square } from 'lucide-react';
import { NewsHeadline, FullArticle, generateFullArticle, generateSpeech, storyImage } from '../services/geminiService';
import { categoryLabel } from '../constants';

interface ArticleReaderProps {
  story: NewsHeadline;
  language: string;
  onBack: () => void;
  related: NewsHeadline[];
  onOpenArticle: (story: NewsHeadline) => void;
}

export const ArticleReader: React.FC<ArticleReaderProps> = ({ story, language, onBack, related, onOpenArticle }) => {
  const [article, setArticle] = useState<FullArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const publishedAt = new Date();

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setArticle(null);
    generateFullArticle(story, language)
      .then(a => { if (!cancelled) setArticle(a); })
      .catch(err => {
        console.error("Article generation failed:", err);
        if (!cancelled) setArticle({ subtitle: story.summary, body: [story.summary], keyFacts: [] });
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [story, language]);

  // Stop any narration when leaving the article
  useEffect(() => {
    return () => {
      if (audioEl) { audioEl.pause(); }
      window.speechSynthesis?.cancel();
    };
  }, [audioEl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${story.title} — via Aura News Network. Source: ${story.url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const title = story.title;
    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(title + " " + url)}`;
        break;
    }
    if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const stopReading = () => {
    if (audioEl) { audioEl.pause(); setAudioEl(null); }
    window.speechSynthesis?.cancel();
    setIsReading(false);
  };

  const listenToArticle = async () => {
    if (isReading) { stopReading(); return; }
    if (!article) return;
    setIsReading(true);
    const text = [story.title, ...article.body.slice(0, 4)].join(' ');
    try {
      const audioData = await generateSpeech(text, language);
      const blob = await fetch(`data:audio/wav;base64,${audioData}`).then(r => r.blob());
      const el = new Audio(URL.createObjectURL(blob));
      el.onended = () => setIsReading(false);
      setAudioEl(el);
      await el.play();
    } catch {
      // Fall back to the browser's built-in narration
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsReading(false);
      utterance.onerror = () => setIsReading(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-red-700 transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to headlines
      </button>

      <span className="inline-block bg-red-700 text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 mb-4">
        {categoryLabel(story.category)}
      </span>

      <h1 className="font-serif text-3xl sm:text-[42px] font-bold leading-tight text-zinc-950">
        {story.title}
      </h1>

      {article?.subtitle && !isLoading && (
        <p className="mt-4 text-lg text-zinc-600 leading-relaxed font-light">{article.subtitle}</p>
      )}

      {/* Byline row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-6 py-4 border-y border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-zinc-950 flex items-center justify-center text-white font-black text-sm">A</div>
          <div>
            <div className="text-sm font-bold text-zinc-900">Aura Newsroom <span className="font-normal text-zinc-400">(AI-assisted)</span></div>
            <div className="text-[11px] text-zinc-500 uppercase tracking-wider">
              {publishedAt.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} &middot; via {story.source}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={listenToArticle}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
              isReading ? 'bg-red-700 text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
            }`}
            title="Listen to this article"
          >
            {isReading ? <Square size={13} /> : <Volume2 size={13} />}
            {isReading ? 'Stop' : 'Listen'}
          </button>
          <button
            onClick={handleCopy}
            className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded text-zinc-700 transition-colors"
            title="Copy link text"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
          </button>
          <button
            onClick={() => handleShare('twitter')}
            className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded text-zinc-700 transition-colors"
            title="Share on X"
          >
            <Share2 size={14} />
          </button>
        </div>
      </div>

      {/* Hero image */}
      <div className="relative aspect-video overflow-hidden bg-zinc-200 mt-8">
        <img
          src={storyImage(story.title, 1280, 720)}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>
      <div className="text-[11px] text-zinc-400 mt-2">Illustrative image &middot; Aura News Network</div>

      {/* Body */}
      {isLoading ? (
        <div className="mt-8 space-y-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="animate-pulse bg-zinc-200 h-4 rounded" style={{ width: `${100 - (i % 3) * 12}%` }} />
          ))}
          <div className="text-xs text-zinc-400 uppercase tracking-widest pt-4">Aura Newsroom is writing this report…</div>
        </div>
      ) : (
        <>
          {article && article.keyFacts.length > 0 && (
            <div className="mt-8 border-l-4 border-red-700 bg-zinc-50 p-5">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-950 mb-3">What to know</h3>
              <ul className="space-y-2">
                {article.keyFacts.map((fact, i) => (
                  <li key={i} className="flex gap-2 text-sm text-zinc-700 leading-relaxed">
                    <span className="text-red-700 font-bold shrink-0">&bull;</span>
                    {fact}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 space-y-6">
            {article?.body.map((para, i) => (
              <p key={i} className={`text-zinc-800 leading-[1.85] ${i === 0 ? 'text-lg first-letter:font-serif first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:leading-[0.85]' : 'text-[17px]'}`}>
                {para}
              </p>
            ))}
          </div>

          <a
            href={story.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-8 text-sm font-bold text-red-700 hover:underline"
          >
            Read the original report at {story.source}
            <ExternalLink size={13} />
          </a>

          <div className="mt-8 p-4 bg-zinc-50 border border-zinc-200 text-[12px] text-zinc-500 leading-relaxed">
            This report was researched via live web search and drafted with AI by the Aura Newsroom,
            based on coverage from {story.source}. Verify critical facts with the original source above.
          </div>
        </>
      )}

      {/* Related stories */}
      {related.length > 0 && (
        <div className="mt-14">
          <div className="mb-6 pb-3 border-b-2 border-zinc-950">
            <h2 className="text-base font-black uppercase tracking-tight text-zinc-950">More from Aura News</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {related.slice(0, 3).map((rel, i) => (
              <article key={i} onClick={() => onOpenArticle(rel)} className="cursor-pointer group">
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-700">
                  {categoryLabel(rel.category)}
                </span>
                <h3 className="font-serif text-base font-bold leading-snug text-zinc-950 group-hover:text-red-800 transition-colors mt-1">
                  {rel.title}
                </h3>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
