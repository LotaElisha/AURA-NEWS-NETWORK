export interface NewsHeadline {
  title: string;
  summary: string;
  source: string;
  url: string;
  category?: string;
}

export interface FullArticle {
  subtitle: string;
  body: string[];
  keyFacts: string[];
}

export function isSystemAlert(h: NewsHeadline): boolean {
  return h.source === "System Alert" || h.title.includes("Demo Mode") || h.title.includes("ANGALIZO:");
}

// Deterministic editorial placeholder image for a story (no licensed photos available).
export function storyImage(title: string, width = 900, height = 560): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  }
  return `https://picsum.photos/seed/aura${hash}/${width}/${height}`;
}

export async function fetchTrendingNews(language: string = "English"): Promise<NewsHeadline[]> {
  try {
    const res = await fetch(`/api/trending?language=${encodeURIComponent(language)}`);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error fetching trending news:", error);
    return [];
  }
}

export async function generateFullArticle(story: NewsHeadline, language: string = "English"): Promise<FullArticle> {
  const res = await fetch("/api/article", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: story.title, summary: story.summary, source: story.source, language }),
  });
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}`);
  }
  return await res.json();
}

export interface NewsScript {
  intro: string;
  segments: {
    headline: string;
    content: string;
  }[];
  outro: string;
}

export async function fetchLatestNews(language: string = "English", category: string = "General"): Promise<NewsHeadline[]> {
  try {
    const res = await fetch(`/api/news?language=${encodeURIComponent(language)}&category=${encodeURIComponent(category)}`);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error fetching news:", error);
    return [];
  }
}

export async function generateNewsScript(headlines: NewsHeadline[], language: string = "English"): Promise<NewsScript> {
  const res = await fetch("/api/generate-script", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ headlines, language }),
  });
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}`);
  }
  return await res.json();
}

export async function generateSpeech(text: string, language: string = "English"): Promise<string> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}`);
  }
  const data = await res.json();
  if (!data.audio) {
    throw new Error("No audio returned from server");
  }
  return addWavHeader(data.audio, 24000);
}

function addWavHeader(base64Pcm: string, sampleRate: number): string {
  const pcmData = Uint8Array.from(atob(base64Pcm), c => c.charCodeAt(0));
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  // file length
  view.setUint32(4, 36 + pcmData.length, true);
  // RIFF type
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // format chunk identifier
  view.setUint32(12, 0x666d7420, false); // "fmt "
  // format chunk length
  view.setUint32(16, 16, true); 
  // sample format (raw)
  view.setUint16(20, 1, true); // PCM
  // channel count
  view.setUint16(22, 1, true); // Mono
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  view.setUint32(36, 0x64617461, false); // "data"
  // data chunk length
  view.setUint32(40, pcmData.length, true);

  const wavData = new Uint8Array(44 + pcmData.length);
  wavData.set(new Uint8Array(header), 0);
  wavData.set(pcmData, 44);

  // Convert back to base64
  let binary = '';
  const bytes = new Uint8Array(wavData);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
