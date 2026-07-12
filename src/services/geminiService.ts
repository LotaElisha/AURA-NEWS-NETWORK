import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let delay = 1000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error?.message?.includes("429") || error?.status === "RESOURCE_EXHAUSTED";
      if (isRateLimit && i < maxRetries - 1) {
        console.warn(`Rate limit hit, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

export interface NewsHeadline {
  title: string;
  summary: string;
  source: string;
  url: string;
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
  const currentTime = new Date().toISOString();
  return withRetry(async () => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Current Time: ${currentTime}. 
        What are the top 5 most recent breaking news stories in the world right now in the category of ${category}? 
        Focus on events that happened in the last 1-12 hours.
        Provide the response in ${language}.
        Provide a JSON array of objects with 'title', 'summary', 'source', and 'url'.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
        },
      });

      const text = response.text;
      if (!text) return [];
      return JSON.parse(text);
    } catch (error) {
      console.error("Error fetching news:", error);
      throw error;
    }
  });
}

export async function generateNewsScript(headlines: NewsHeadline[], language: string = "English"): Promise<NewsScript> {
  return withRetry(async () => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Create a highly professional and well-mannered news anchor script in ${language} for these stories: ${JSON.stringify(headlines)}. 
        
        The persona is a sophisticated, corporate African news anchor. The tone should be authoritative yet warm, reflecting a high level of professionalism and decorum.
        
        The script MUST be a JSON object with the following structure:
        - 'intro': A dignified and welcoming opening greeting in ${language}.
        - 'segments': An array where each item has 'headline' (the title) and 'content' (the full report text in ${language}).
        - 'outro': A polite and professional closing sign-off in ${language}.
        
        Scripting Guidelines:
        1. Corporate Tone: Maintain a high standard of journalistic integrity and professional language.
        2. Well-Mannered: Use polite transitions and respectful addresses.
        3. Varied Tone: Match the tone to the story (e.g., urgent for breaking news, professional for business).
        4. Dynamic Pacing: Use varied sentence lengths for impact.
        5. Audience Connection: Use direct, respectful addresses to keep the viewer engaged.`,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text;
      if (!text) throw new Error("No script generated");
      return JSON.parse(text);
    } catch (error) {
      console.error("Error generating script:", error);
      throw error;
    }
  });
}

export async function generateSpeech(text: string, language: string = "English"): Promise<string> {
  return withRetry(async () => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Deliver this news script in ${language} with the voice of a sophisticated, well-mannered, and corporate African news anchor. 
        The delivery should be authoritative, clear, and highly professional. 
        Avoid a monotone delivery. Use natural pauses, vary your pitch and speed to emphasize key points, and convey a sense of calm and confidence. 
        The goal is a dignified and captivating broadcast performance.
        
        Script: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio generated");
      
      // The Gemini TTS model returns raw PCM data (16-bit, mono, 24kHz).
      // We need to add a WAV header to make it playable by the browser's <audio> tag.
      return addWavHeader(base64Audio, 24000);
    } catch (error) {
      console.error("Error generating speech:", error);
      throw error;
    }
  });
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
