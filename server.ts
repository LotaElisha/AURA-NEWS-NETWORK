import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/api/live" });

  // Lazily get GoogleGenAI client
  let aiInstance: GoogleGenAI | null = null;
  function getAi() {
    if (!aiInstance) {
      const apiKey = process.env.GEMINI_API_KEY;
      aiInstance = new GoogleGenAI({
        apiKey: apiKey || "",
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiInstance;
  }

  // --- Simple in-memory response cache (protects Gemini quota, speeds up page loads) ---
  const responseCache = new Map<string, { data: any; expires: number }>();
  function getCached(key: string): any | null {
    const entry = responseCache.get(key);
    if (entry && entry.expires > Date.now()) return entry.data;
    responseCache.delete(key);
    return null;
  }
  function setCached(key: string, data: any, ttlMs = 5 * 60 * 1000) {
    responseCache.set(key, { data, expires: Date.now() + ttlMs });
  }

  // --- Offline Fallbacks & Retries ---
  async function callGeminiWithRetry(fn: () => Promise<any>, retries = 2, delay = 1000): Promise<any> {
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        const isQuota = error?.message?.includes("429") || 
                        error?.status === "RESOURCE_EXHAUSTED" || 
                        JSON.stringify(error)?.includes("RESOURCE_EXHAUSTED") ||
                        JSON.stringify(error)?.includes("429");
        if (isQuota && i < retries) {
          console.warn(`Gemini 429 Quota met, retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 1.5;
          continue;
        }
        throw error;
      }
    }
  }

  function getOfflineFallbackNews(category: string, language: string): any[] {
    const isSwahili = language === "Swahili";
    const isFrench = language === "French";
    const isSpanish = language === "Spanish";
    const isGerman = language === "German";
    const isJapanese = language === "Japanese";

    const localNews: Record<string, Array<{title: string, summary: string, source: string, url: string}>> = {
      General: [
        {
          title: isSwahili ? "Aura News Network Yazindua Matangazo ya Moja kwa Moja" : "Aura News Network Launches Next-Gen Broadcast",
          summary: isSwahili ? "Aura News Network imezindua jukwaa jipya la matangazo ya habari likiongozwa na akili mnemba." : "Aura News Network officially rolls out its fully interactive, real-time AI-driven broadcast platform featuring low-latency co-anchor links.",
          source: "Aura Broadcast Lab",
          url: "https://news.google.com"
        },
        {
          title: isSwahili ? "Mkutano wa Kimataifa wa Teknolojia 2026 Watangaza Viwango Mpya vya AI" : "Global Tech Summit 2026 Announces AI Ethics Standards",
          summary: isSwahili ? "Viongozi wa ulimwengu wamekubaliana kuhusu miongozo mipya ya usalama wa mifano ya AI." : "World leaders and top tech executives have finalized a historic agreement on open-source model guidelines and safety benchmarks.",
          source: "Global Chronicle",
          url: "https://news.google.com"
        }
      ],
      "AI News": [
        {
          title: "Gemini 3.5 Redefines Real-Time Interactive Conversations",
          summary: "The latest update brings instantaneous voice response and deep reasoning capability to everyday client-side and server-side applications.",
          source: "AI Frontiers",
          url: "https://news.google.com"
        }
      ],
      "Technology": [
        {
          title: "Quantum Computing Hardware achieves 1000 Stable Qubits milestone",
          summary: "Researchers have demonstrated error correction at scale, bringing practical commercial quantum computing five years closer.",
          source: "TechPulse",
          url: "https://news.google.com"
        }
      ]
    };

    const selected = localNews[category] || localNews["General"];
    
    // Add warning news item as first story so user is aware
    const warningHeadline = {
      title: isSwahili ? "ANGALIZO: Hali ya Maonyesho Imewezeshwa (API Quota Limit)" : 
             isFrench ? "AVIS: Mode Démo Activé (Limite de quota API)" :
             isSpanish ? "AVISO: Modo de Demostración Activo (Límite de Cuota API)" :
             isGerman ? "HINWEIS: Demo-Modus Aktiv (API-Limit erreicht)" :
             isJapanese ? "注意：デモモードが有効です（APIクォータ制限）" :
             "NOTICE: Demo Mode Active (API Quota Reached)",
      summary: isSwahili ? "Kikomo cha matumizi ya API kimefikiwa. Tafadhali ongeza ufunguo wako wa Gemini API kwenye kona ya juu kulia ili kuwezesha utafutaji wa Google News." :
               isFrench ? "Le quota d'API partagé est épuisé. Veuillez configurer votre clé d'API Gemini personnelle dans le coin supérieur droit pour activer la recherche en temps réel." :
               isSpanish ? "Se ha alcanzado el límite de cuota compartido. Por favor configure su clave de API de Gemini en la esquina superior derecha para activar las búsquedas." :
               isGerman ? "Das gemeinsame API-Kontingent wurde erreicht. Bitte konfigurieren Sie Ihren eigenen Gemini-API-Schlüssel oben rechts für Echtzeitsuchen." :
               isJapanese ? "共有APIクォータの上限に達しました。リアルタイムの検索を有効にするには、右上から個人のGemini APIキーを設定してください。" :
               "The shared Gemini API quota has been reached. Please configure your personal Gemini API key in the top right to restore live real-time Google News search.",
      source: "System Alert",
      url: "https://ai.google.dev"
    };

    return [warningHeadline, ...selected];
  }

  function getOfflineFallbackScript(headlines: any[], language: string) {
    const isSwahili = language === "Swahili";
    const isFrench = language === "French";
    const isSpanish = language === "Spanish";
    const isGerman = language === "German";
    const isJapanese = language === "Japanese";

    let intro = "Welcome back to Aura News Network. I am your anchor, Aura, bringing you the latest updates from around the globe.";
    if (isSwahili) intro = "Karibu tena kwenye Aura News Network. Mimi ni mtangazaji wako, Aura, nikikuletea habari za hivi punde kutoka ulimwenguni kote.";
    else if (isFrench) intro = "Bienvenue sur Aura News Network. Je suis votre présentatrice, Aura, pour vous présenter les dernières nouvelles du monde.";
    else if (isSpanish) intro = "Bienvenidos a Aura News Network. Soy su presentadora, Aura, con las últimas noticias del mundo.";
    else if (isGerman) intro = "Willkommen bei Aura News Network. Ich bin Ihre Nachrichtensprecherin Aura und präsentiere Ihnen die neuesten Meldungen aus aller Welt.";
    else if (isJapanese) intro = "オーラ・ニュース・ネットワークへようこそ。キャスターのオーラが、世界中の最新ニュースをお伝えします。";

    const segments = headlines.map((h, i) => {
      return {
        headline: h.title,
        content: `${h.summary} Reporting from ${h.source || "our news center"}.`
      };
    });

    let outro = "That concludes our broadcast for this hour. Thank you for tuning in to Aura News Network. Stay safe, and goodbye.";
    if (isSwahili) outro = "Hayo ndiyo tuliyokuandalia kwa saa hii. Asante kwa kuchagua Aura News Network. Uwe na wakati mwema, na kwaheri.";
    else if (isFrench) outro = "C'est la fin de notre journal pour cette heure. Merci de votre fidélité à Aura News Network. Prenez soin de vous, et au revoir.";
    else if (isSpanish) outro = "Esto concluye nuestra emisión de esta hora. Gracias por sintonizar Aura News Network. Cuídense y hasta pronto.";
    else if (isGerman) outro = "Das war unsere Sendung für diese Stunde. Vielen Dank, dass Sie Aura News Network eingeschaltet haben. Bleiben Sie gesund, und auf Wiedersehen.";
    else if (isJapanese) outro = "今学期の放送は以上となります。オーラ・ニュース・ネットワークをご視聴いただきありがとうございました。それでは、良い一日を。";

    return { intro, segments, outro };
  }

  // --- API Routes ---

  // Top trending stories worldwide, across all categories — powers the website front page.
  app.get("/api/trending", async (req, res) => {
    const { language = "English" } = req.query;
    const cacheKey = `trending:${language}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const currentTime = new Date().toISOString();

    const fetchWithSearch = async () => {
      const ai = getAi();
      return await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Current Time: ${currentTime}.
        Please search Google News to find the 10 most trending, most talked-about breaking news stories in the world RIGHT NOW, across all topics (world affairs, politics, business, technology, AI, science, health, sports, entertainment).
        Focus on real, current events reported in the last 1-12 hours, ordered from most to least trending.
        Provide the response in ${language}.
        Provide a JSON array of objects with 'title', 'summary' (2-3 sentences), 'source', 'url', and 'category' (one of: General, Politics, Business, Technology, AI News, Science, Health, Sports, Entertainment).`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
        },
      });
    };

    const fetchWithoutSearch = async () => {
      const ai = getAi();
      return await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Current Time: ${currentTime}.
        Since live search is unavailable, generate 10 highly realistic and plausible trending world news stories for right now, across varied topics.
        Provide the response in ${language}.
        Provide a JSON array of objects with 'title', 'summary' (2-3 sentences), 'source', 'url', and 'category' (one of: General, Politics, Business, Technology, AI News, Science, Health, Sports, Entertainment). Make source names look like reputable outlets.`,
        config: {
          responseMimeType: "application/json",
        },
      });
    };

    try {
      let response;
      try {
        response = await callGeminiWithRetry(fetchWithSearch, 2, 1000);
      } catch (searchError: any) {
        console.warn("Trending search fetch failed, falling back to generation without search...", searchError);
        response = await callGeminiWithRetry(fetchWithoutSearch, 2, 1000);
      }

      const text = response.text;
      if (!text) {
        return res.json(getOfflineFallbackNews("General", language as string));
      }
      const data = JSON.parse(text);
      setCached(cacheKey, data);
      res.json(data);
    } catch (error: any) {
      console.error("All trending fetch attempts failed. Returning offline fallbacks.", error);
      res.json(getOfflineFallbackNews("General", language as string));
    }
  });

  // Expand a headline into a full publish-ready article for the reader page.
  app.post("/api/article", async (req, res) => {
    const { title, summary, source, language = "English" } = req.body;
    if (!title) return res.status(400).json({ error: "Missing title" });

    const cacheKey = `article:${language}:${title}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const generate = async () => {
      const ai = getAi();
      return await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `You are a senior staff writer at Aura News Network, a professional global news organization.
        Write a complete, publish-ready news article in ${language} based on this story:
        Title: ${title}
        Summary: ${summary || "N/A"}
        Original source: ${source || "wire services"}

        Respond with a JSON object with this exact structure:
        - 'subtitle': a one-sentence standfirst/deck below the headline.
        - 'body': an array of 6-9 paragraphs (strings). Professional, factual news style: lede paragraph first, then context, details, reactions, and outlook. No markdown, plain text paragraphs.
        - 'keyFacts': an array of 3-5 short bullet-point facts.
        Maintain strict journalistic tone. Do not invent direct quotes attributed to real named individuals; use paraphrase or attribute to the outlet/officials generally.`,
        config: {
          responseMimeType: "application/json",
        },
      });
    };

    try {
      const response = await callGeminiWithRetry(generate, 2, 1000);
      const text = response.text;
      if (!text) throw new Error("No article generated");
      const data = JSON.parse(text);
      setCached(cacheKey, data, 15 * 60 * 1000);
      res.json(data);
    } catch (error: any) {
      console.error("Error generating article, using fallback:", error);
      res.json({
        subtitle: summary || "",
        body: [
          summary || title,
          `This story is developing. Aura News Network is monitoring updates from ${source || "international wire services"} and will expand this report as more information becomes available.`,
        ],
        keyFacts: [],
      });
    }
  });

  app.get("/api/news", async (req, res) => {
    const { language = "English", category = "General" } = req.query;
    const cacheKey = `news:${language}:${category}`;
    const cachedNews = getCached(cacheKey);
    if (cachedNews) return res.json(cachedNews);
    const currentTime = new Date().toISOString();

    const fetchWithSearch = async () => {
      const ai = getAi();
      return await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Current Time: ${currentTime}. 
        Please search Google News (news.google.com) to find the top 5 most recent and trending breaking news stories right now in the category of "${category}".
        Focus on real-time current events from Google News reported in the last 1-12 hours.
        Provide the response in ${language}.
        Provide a JSON array of objects with 'title', 'summary', 'source', and 'url'.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
        },
      });
    };

    const fetchWithoutSearch = async () => {
      const ai = getAi();
      return await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Current Time: ${currentTime}. 
        Since Google News live search is currently unavailable, generate 5 highly realistic and plausible breaking news stories right now in the category of "${category}".
        Provide the response in ${language}.
        Provide a JSON array of objects with 'title', 'summary', 'source', and 'url'. Make the source names look like reputable news outlets, and make the 'url' point to realistic placeholders.`,
        config: {
          responseMimeType: "application/json",
        },
      });
    };

    try {
      let response;
      try {
        response = await callGeminiWithRetry(fetchWithSearch, 2, 1000);
      } catch (searchError: any) {
        console.warn("Google Search news fetch failed, falling back to standard generation without search...", searchError);
        response = await callGeminiWithRetry(fetchWithoutSearch, 2, 1000);
      }

      const text = response.text;
      if (!text) {
        return res.json(getOfflineFallbackNews(category as string, language as string));
      }
      const data = JSON.parse(text);
      setCached(cacheKey, data);
      res.json(data);
    } catch (error: any) {
      console.error("All Gemini news fetch attempts failed. Returning offline fallbacks.", error);
      res.json(getOfflineFallbackNews(category as string, language as string));
    }
  });

  app.post("/api/generate-script", async (req, res) => {
    const { headlines, language = "English" } = req.body;

    const generate = async () => {
      const ai = getAi();
      return await ai.models.generateContent({
        model: "gemini-3.5-flash",
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
    };

    try {
      const response = await callGeminiWithRetry(generate, 2, 1000);
      const text = response.text;
      if (!text) throw new Error("No script generated");
      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("Error generating script, using fallback script generator:", error);
      res.json(getOfflineFallbackScript(headlines, language));
    }
  });

  app.post("/api/tts", async (req, res) => {
    const { text, language = "English" } = req.body;

    const ttsCall = async () => {
      const ai = getAi();
      return await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
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
    };

    try {
      const response = await callGeminiWithRetry(ttsCall, 1, 800);
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio generated");
      res.json({ audio: base64Audio });
    } catch (error: any) {
      console.error("Error generating speech, returning 500 so frontend falls back to Web Speech Synthesis:", error);
      res.status(500).json({ error: error.message || "Failed to generate speech" });
    }
  });

  // --- WebSocket Live API Session Bridge ---
  wss.on("connection", async (clientWs) => {
    console.log("Client connected to Live API socket");
    let session: any = null;

    try {
      const ai = getAi();
      session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are Marcus, a highly professional, polite, and articulate co-anchor/field correspondent of Aura News Network. You are conversing in real-time with our viewers and co-anchors. Be extremely polite, well-mannered, professional, and knowledgeable. Keep your responses crisp and relatively short as this is a real-time voice broadcast.",
        },
        callbacks: {
          onmessage: (message) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onclose: () => {
            console.log("Gemini Live session closed");
            clientWs.close();
          },
          onerror: (err) => {
            console.error("Gemini Live error:", err);
            clientWs.send(JSON.stringify({ error: err.message || "Live session error" }));
          }
        },
      });

      clientWs.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch (err) {
          console.error("Error handling message from client:", err);
        }
      });

      clientWs.on("close", () => {
        console.log("Client disconnected from Live API socket");
        if (session) {
          session.close();
        }
      });
    } catch (err: any) {
      console.error("Error establishing Gemini Live connection:", err);
      clientWs.send(JSON.stringify({ error: "Failed to connect to Gemini Live: " + err.message }));
      clientWs.close();
    }
  });

  // --- Vite Dev Server Middleware or Static Production Serving ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
