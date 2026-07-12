import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Play, Square, RefreshCcw, Globe, Settings, Layout, Mic, MicOff, Share2, Copy, Check } from 'lucide-react';
import { fetchLatestNews, generateNewsScript, generateSpeech, NewsHeadline, NewsScript, isSystemAlert } from '../services/geminiService';
import { NewsTicker } from '../components/NewsTicker';
import { AnchorFeed } from '../components/AnchorFeed';
import { Sidebar } from '../components/Sidebar';

interface StudioPageProps {
  language: string;
}

export const StudioPage: React.FC<StudioPageProps> = ({ language }) => {
  const [headlines, setHeadlines] = useState<NewsHeadline[]>([]);
  const [script, setScript] = useState<NewsScript | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(-1);
  const [currentVirtualSegment, setCurrentVirtualSegment] = useState<{ headline: string; content: string } | undefined>(undefined);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState("Initializing...");
  const [category, setCategory] = useState("General");
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [nextUpdateIn, setNextUpdateIn] = useState(300);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);

  // Gemini Live API State
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isConnectingLive, setIsConnectingLive] = useState(false);
  const [isMarcusSpeaking, setIsMarcusSpeaking] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  // Share overlay state for active story
  const [showActiveShareMenu, setShowActiveShareMenu] = useState(false);
  const [copiedActive, setCopiedActive] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Gemini Live Refs
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const speakTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadNews();
  }, [language, category]);

  // Tear down mic/audio/websocket when leaving the studio
  useEffect(() => {
    return () => {
      disconnectLiveStream();
      if (audioRef.current) audioRef.current.pause();
      window.speechSynthesis?.cancel();
    };
  }, []);

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
    let audioUrl = "";
    try {
      const audioData = await generateSpeech(text, language);
      const audioBlob = await fetch(`data:audio/wav;base64,${audioData}`).then(r => r.blob());
      audioUrl = URL.createObjectURL(audioBlob);
    } catch (ttsError) {
      console.warn("Gemini TTS API failed, falling back to browser SpeechSynthesis:", ttsError);
      return new Promise<void>((resolve) => {
        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(text);

        // Map language strings to appropriate voice locales if possible
        if (language === "Swahili") utterance.lang = "sw-TZ";
        else if (language === "French") utterance.lang = "fr-FR";
        else if (language === "Spanish") utterance.lang = "es-ES";
        else if (language === "German") utterance.lang = "de-DE";
        else if (language === "Japanese") utterance.lang = "ja-JP";
        else utterance.lang = "en-US";

        // Sophisticated, slower, clear corporate tone
        utterance.rate = 0.95;
        utterance.pitch = 0.95;

        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };
        window.speechSynthesis.speak(utterance);
      });
    }

    return new Promise<void>((resolve) => {
      if (audioRef.current && audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.onplay = () => setIsSpeaking(true);
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audioRef.current.play().catch((err) => {
          console.error("Audio playback failed, trying Web Speech Synthesis instead", err);
          setIsSpeaking(false);
          resolve();
        });
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

  // --- Gemini Live Connection ---
  const connectLiveStream = async () => {
    if (isLiveConnected || isConnectingLive) return;
    setIsConnectingLive(true);
    setLiveError(null);
    setStatus("Connecting to Gemini Live...");

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log("Live WebSocket connected");
        try {
          // Initialize Audio Contexts
          const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          inputAudioCtxRef.current = inputCtx;
          outputAudioCtxRef.current = outputCtx;
          nextStartTimeRef.current = 0;

          // Request user microphone
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = stream;

          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          source.connect(processor);
          processor.connect(inputCtx.destination);

          processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
              const channelData = e.inputBuffer.getChannelData(0);
              const base64 = pcmToBase64(channelData);
              ws.send(JSON.stringify({ audio: base64 }));
            }
          };

          setIsLiveConnected(true);
          setIsConnectingLive(false);
          setStatus("Live Co-Anchor Marcus connected. Talk into your mic!");
        } catch (err: any) {
          console.error("Microphone access error:", err);
          setLiveError("Microphone access denied: " + err.message);
          disconnectLiveStream();
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.audio) {
            playLiveAudioChunk(msg.audio);
          }
          if (msg.interrupted) {
            nextStartTimeRef.current = 0;
            setIsMarcusSpeaking(false);
          }
          if (msg.error) {
            console.error("Live API Session Error:", msg.error);
            setLiveError(msg.error);
          }
        } catch (err) {
          console.error("Error processing Live message:", err);
        }
      };

      ws.onclose = () => {
        console.log("Live WebSocket closed");
        disconnectLiveStream();
      };

      ws.onerror = (err) => {
        console.error("Live WebSocket error:", err);
        disconnectLiveStream();
      };

    } catch (err: any) {
      console.error("Live connection failed:", err);
      setLiveError(err.message || "Connection failed");
      disconnectLiveStream();
    }
  };

  const disconnectLiveStream = () => {
    setIsLiveConnected(false);
    setIsConnectingLive(false);
    setIsMarcusSpeaking(false);

    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }

    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }

    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current);
    }

    setStatus("Live Co-Anchor disconnected.");
  };

  const pcmToBase64 = (float32Array: Float32Array): string => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const playLiveAudioChunk = (base64Pcm: string) => {
    const outputCtx = outputAudioCtxRef.current;
    if (!outputCtx) return;

    try {
      const binary = atob(base64Pcm);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16Array = new Int16Array(bytes.buffer);

      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = outputCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const sourceNode = outputCtx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(outputCtx.destination);

      const currentTime = outputCtx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime + 0.05;
      }
      sourceNode.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;

      setIsMarcusSpeaking(true);
      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current);
      }
      speakTimeoutRef.current = setTimeout(() => {
        setIsMarcusSpeaking(false);
      }, 1000);
    } catch (err) {
      console.error("Error playing back Live audio chunk:", err);
    }
  };

  // Share active segment helpers
  const handleCopyActive = () => {
    if (!currentVirtualSegment) return;
    const shareText = `Aura News Update: ${currentVirtualSegment.headline} - ${currentVirtualSegment.content}`;
    navigator.clipboard.writeText(shareText);
    setCopiedActive(true);
    setTimeout(() => setCopiedActive(false), 2000);
  };

  const handleSocialShareActive = (platform: string) => {
    if (!currentVirtualSegment) return;
    const title = currentVirtualSegment.headline;
    const text = currentVirtualSegment.content;
    let url = window.location.href;
    let shareUrl = '';

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title + " - " + text.substring(0, 100) + "...")}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(title + " - " + text.substring(0, 100) + "... " + url)}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
    setShowActiveShareMenu(false);
  };

  return (
    <div className="flex bg-zinc-950 text-zinc-100 min-h-[calc(100vh-8rem)]">
      <audio ref={audioRef} className="hidden" />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col relative">
        {headlines.some(isSystemAlert) && (
          <div className="bg-amber-950/40 border-b border-amber-900/40 px-8 py-2.5 flex items-center justify-between text-xs text-amber-200 backdrop-blur-md z-10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span><strong>Demo Mode Active:</strong> Shared Gemini API Quota exceeded. Please configure your personal Gemini API Key to restore live Google News searches.</span>
            </div>
            <button
              onClick={() => window.aistudio?.openSelectKey()}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-2.5 py-1 rounded font-bold transition-all text-[10px] uppercase tracking-wider"
            >
              Configure API Key
            </button>
          </div>
        )}

        {/* Broadcast View */}
        <div className="flex-1 p-8 flex flex-col gap-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto w-full space-y-8">
            <div className="relative">
              <AnchorFeed
                isBroadcasting={isBroadcasting}
                currentSegment={currentVirtualSegment}
                isSpeaking={isSpeaking}
                isLiveMode={isLiveMode}
                isMarcusSpeaking={isMarcusSpeaking}
                isMarcusLiveConnected={isLiveConnected}
              />

              {/* Share Active Segment Floating Widget */}
              {isBroadcasting && currentVirtualSegment && (
                <div className="absolute bottom-16 right-16 z-20 flex gap-2">
                  <button
                    onClick={handleCopyActive}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-semibold transition-all backdrop-blur-md"
                    title="Copy Segment to Clipboard"
                  >
                    {copiedActive ? (
                      <>
                        <Check size={14} className="text-emerald-500" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy Story</span>
                      </>
                    )}
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setShowActiveShareMenu(!showActiveShareMenu)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-semibold transition-all backdrop-blur-md text-blue-400"
                    >
                      <Share2 size={14} />
                      <span>Share</span>
                    </button>

                    {showActiveShareMenu && (
                      <div className="absolute right-0 bottom-full mb-2 w-44 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl py-1 z-30">
                        <button
                          onClick={() => handleSocialShareActive('twitter')}
                          className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
                        >
                          Post to X (Twitter)
                        </button>
                        <button
                          onClick={() => handleSocialShareActive('facebook')}
                          className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
                        >
                          Share on Facebook
                        </button>
                        <button
                          onClick={() => handleSocialShareActive('linkedin')}
                          className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
                        >
                          Share on LinkedIn
                        </button>
                        <button
                          onClick={() => handleSocialShareActive('whatsapp')}
                          className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
                        >
                          Send via WhatsApp
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Controls & Status Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Card 1: Broadcast Control */}
              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 flex flex-col justify-between h-56">
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
                          Next sync: {nextUpdateIn}s
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {!isBroadcasting ? (
                      <button
                        onClick={startBroadcast}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-5 py-2.5 rounded-lg font-bold transition-all transform active:scale-95 text-white text-sm"
                      >
                        <Play size={16} fill="currentColor" />
                        Start Broadcast
                      </button>
                    ) : (
                      <button
                        onClick={stopBroadcast}
                        className="flex items-center gap-2 bg-zinc-100 text-zinc-950 hover:bg-white px-5 py-2.5 rounded-lg font-bold transition-all transform active:scale-95 text-sm"
                      >
                        <Square size={16} fill="currentColor" />
                        Stop Broadcast
                      </button>
                    )}
                    <button
                      onClick={loadNews}
                      disabled={isBroadcasting || isLoading}
                      className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50 text-white"
                      title="Reload Headlines"
                    >
                      <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800/50">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                    <span>Status</span>
                    <span className="text-zinc-300 truncate max-w-[150px]">{status}</span>
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

              {/* Card 2: Co-Anchor voice link (Gemini Live API) */}
              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 flex flex-col justify-between h-56">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Live Co-Anchor Stream</h3>
                    {isLiveConnected && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                    Establish a low-latency real-time voice channel to field correspondent Marcus. Chat with him using your microphone.
                  </p>

                  <div className="flex items-center gap-3">
                    {!isLiveConnected ? (
                      <button
                        onClick={connectLiveStream}
                        disabled={isConnectingLive}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-5 py-2.5 rounded-lg font-bold transition-all transform active:scale-95 text-white text-sm"
                      >
                        {isConnectingLive ? (
                          <>
                            <RefreshCcw size={16} className="animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Mic size={16} />
                            Connect Voice Link
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={disconnectLiveStream}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-5 py-2.5 rounded-lg font-bold transition-all transform active:scale-95 text-white text-sm"
                      >
                        <MicOff size={16} />
                        Disconnect Link
                      </button>
                    )}
                  </div>
                </div>

                {liveError && (
                  <div className="text-[10px] text-red-400 font-mono truncate mt-2">
                    Err: {liveError}
                  </div>
                )}
              </div>

              {/* Card 3: Network Stats */}
              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 h-56 flex flex-col justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Network Stats</h3>
                <div className="space-y-3.5">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-zinc-500 uppercase">Active Streams</span>
                    <span className="text-lg font-display font-bold">1.2M</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-zinc-500 uppercase">Voice Latency</span>
                    <span className="text-lg font-display font-bold text-emerald-500">{isLiveConnected ? "35ms" : "---"}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-zinc-500 uppercase">Broadcast Feed</span>
                    <span className="text-lg font-display font-bold">99.9%</span>
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
        <NewsTicker headlines={headlines.map(h => h.title)} variant="inline" />
      </main>

      {/* Sidebar */}
      <div className="hidden xl:flex">
        <Sidebar headlines={headlines} isLoading={isLoading} lastUpdated={lastUpdated} />
      </div>
    </div>
  );
};
