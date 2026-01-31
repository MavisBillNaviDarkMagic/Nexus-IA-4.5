
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  GoogleGenAI, 
  Modality, 
  Type, 
  LiveServerMessage, 
  GenerateContentResponse,
  Chat as GenAIChat
} from '@google/genai';
import { 
  MessageSquare, 
  Image as ImageIcon, 
  Video, 
  Mic, 
  Settings, 
  Search, 
  MapPin, 
  Send, 
  RefreshCw, 
  Download,
  AlertCircle,
  Menu,
  ChevronRight,
  Sparkles,
  Zap,
  Globe,
  Terminal,
  Copy,
  Share2,
  Cpu
} from 'lucide-react';

/** --- Audio Processing Utilities --- **/

const encode = (bytes: Uint8Array) => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const decode = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/** --- Components --- **/

const SidebarItem = ({ icon: Icon, label, active, onClick, open }: { icon: any, label: string, active: boolean, onClick: () => void, open: boolean }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
      active 
      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-[0_0_20px_rgba(79,70,229,0.15)]' 
      : 'text-slate-400 hover:bg-white/5 hover:text-white'
    }`}
  >
    <Icon className={`w-5 h-5 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
    {open && <span className="font-medium text-sm whitespace-nowrap animate-in fade-in slide-in-from-left-2">{label}</span>}
  </button>
);

const Loader = ({ label }: { label?: string }) => (
  <div className="flex flex-col items-center gap-4 py-8">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-indigo-500/10 rounded-full"></div>
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
    </div>
    {label && <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/80 animate-pulse">{label}</p>}
  </div>
);

/** --- Logic & Sections --- **/

const ChatSection = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string, sources?: any[] }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tool, setTool] = useState<'none' | 'search' | 'maps'>('none');
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<GenAIChat | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const config: any = {};
      
      if (tool === 'search') config.tools = [{ googleSearch: {} }];
      if (tool === 'maps') {
        config.tools = [{ googleMaps: {} }];
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
          config.toolConfig = { retrievalConfig: { latLng: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } } };
        } catch (e) {
          console.warn("Geolocation denied, using default.");
        }
      }

      if (!chatRef.current) {
        chatRef.current = ai.chats.create({
          model: 'gemini-3-pro-preview',
          config
        });
      }

      const response = await chatRef.current.sendMessage({ message: userMsg });
      const text = response.text || "";
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      setMessages(prev => [...prev, { role: 'ai', content: text, sources }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'ai', content: '⚠️ Error de sincronización con el núcleo Nexus. Reintentando...' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/20">
      <header className="p-4 border-b border-white/5 glass flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="hidden sm:block">
            <h2 className="font-bold text-sm tracking-tight text-white">Nexus Intelligence</h2>
            <p className="text-[9px] font-medium text-slate-500 uppercase tracking-widest">Gemini 3 Pro Engine</p>
          </div>
        </div>
        <div className="flex gap-2 bg-slate-900/50 p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => { setTool(tool === 'search' ? 'none' : 'search'); chatRef.current = null; }}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${tool === 'search' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Search className="w-3 h-3" /> Search
          </button>
          <button 
            onClick={() => { setTool(tool === 'maps' ? 'none' : 'maps'); chatRef.current = null; }}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${tool === 'maps' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <MapPin className="w-3 h-3" /> Maps
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-40 text-center space-y-6">
            <div className="p-6 bg-indigo-500/5 rounded-full border border-indigo-500/10 animate-pulse">
              <Sparkles className="w-16 h-16 text-indigo-400" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-black text-white">Nexus Terminal</p>
              <p className="text-sm max-w-xs mx-auto">Sistemas listos para procesamiento de lenguaje natural y búsqueda global.</p>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] rounded-2xl p-4 shadow-2xl relative group ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-900/80 border border-white/10 text-slate-200 rounded-tl-none'}`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
              {m.sources && m.sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-1 gap-2">
                  <p className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest">Referencias verificadas:</p>
                  <div className="flex flex-wrap gap-2">
                    {m.sources.map((s, si) => {
                      const url = s.web?.uri || s.maps?.uri;
                      if (!url) return null;
                      return (
                        <a key={si} href={url} target="_blank" className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1.5 rounded-lg flex items-center gap-2 transition-all border border-white/5">
                          <Globe className="w-3 h-3 text-indigo-400" /> 
                          <span className="truncate max-w-[120px]">{s.web?.title || s.maps?.title || 'Nexus Source'}</span>
                          <ChevronRight className="w-2 h-2 opacity-50" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => navigator.clipboard.writeText(m.content)}
                  className="p-1.5 bg-black/20 hover:bg-black/40 rounded-lg text-white/50 hover:text-white transition-colors"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl px-4 py-3 flex gap-1.5">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
      </div>

      <footer className="p-4 border-t border-white/5 glass">
        <div className="max-w-4xl mx-auto flex gap-3">
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Escribe un comando o consulta..."
              className="w-full bg-slate-900 border border-white/5 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm shadow-inner"
            />
          </div>
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 p-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] active:scale-95 group"
          >
            <Send className="w-5 h-5 text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </footer>
    </div>
  );
};

const ImageSection = () => {
  const [prompt, setPrompt] = useState('');
  const [ratio, setRatio] = useState('1:1');
  const [img, setImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setImg(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: ratio as any } }
      });

      const part = response.candidates[0].content.parts.find(p => p.inlineData);
      if (part?.inlineData) {
        setImg(`data:image/png;base64,${part.inlineData.data}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/20 overflow-y-auto custom-scrollbar">
      <header className="p-4 border-b border-white/5 glass sticky top-0 z-10 flex items-center gap-3">
        <div className="p-2 bg-fuchsia-500/10 rounded-lg">
          <ImageIcon className="w-5 h-5 text-fuchsia-400" />
        </div>
        <div>
          <h2 className="font-bold text-sm text-white">Nexus Studio</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Visual synthesis</p>
        </div>
      </header>

      <div className="p-8 max-w-4xl mx-auto w-full space-y-8 animate-in fade-in duration-700">
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 space-y-6">
          <textarea 
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Describe una obra maestra visual..."
            className="w-full h-32 bg-slate-950/50 border border-white/5 rounded-2xl p-5 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 transition-all resize-none text-sm placeholder:text-slate-600 shadow-inner"
          />
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex bg-slate-950/50 p-1.5 rounded-xl border border-white/5 gap-1">
              {['1:1', '16:9', '9:16', '4:3', '3:4'].map(r => (
                <button 
                  key={r}
                  onClick={() => setRatio(r)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${ratio === r ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-900/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button 
              onClick={generate}
              disabled={loading || !prompt.trim()}
              className="flex-1 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-[0_0_25px_rgba(192,38,211,0.2)]"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Sintetizar Imagen
            </button>
          </div>
        </div>

        <div className="relative aspect-square w-full rounded-[2.5rem] border border-white/5 bg-slate-900/30 flex items-center justify-center overflow-hidden shadow-2xl group transition-all duration-500">
          {img ? (
            <>
              <img src={img} alt="Nexus Synthesis" className="w-full h-full object-contain animate-in zoom-in duration-500" />
              <div className="absolute bottom-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                <button 
                  onClick={() => { const a = document.createElement('a'); a.href = img; a.download = 'nexus-art.png'; a.click(); }}
                  className="p-3 bg-black/60 hover:bg-fuchsia-600 rounded-2xl text-white transition-all backdrop-blur-md border border-white/10"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button className="p-3 bg-black/60 hover:bg-indigo-600 rounded-2xl text-white transition-all backdrop-blur-md border border-white/10">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center p-12 space-y-6">
              {loading ? <Loader label="Compilando capas" /> : (
                <div className="opacity-10 space-y-4">
                  <ImageIcon className="w-32 h-32 mx-auto" strokeWidth={1} />
                  <p className="text-lg font-light italic">Esperando descripción...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const VideoSection = () => {
  const [prompt, setPrompt] = useState('');
  const [video, setVideo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const generate = async () => {
    if (!await (window as any).aistudio.hasSelectedApiKey()) {
      await (window as any).aistudio.openSelectKey();
    }

    if (!prompt.trim() || loading) return;
    setLoading(true);
    setStatus('Iniciando secuencia...');
    setVideo(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let op = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
      });

      while (!op.done) {
        setStatus('Procesamiento temporal activo. Generando fotogramas...');
        await new Promise(r => setTimeout(r, 10000));
        op = await ai.operations.getVideosOperation({ operation: op });
      }

      const link = op.response?.generatedVideos?.[0]?.video?.uri;
      if (link) {
        const res = await fetch(`${link}&key=${process.env.API_KEY}`);
        const blob = await res.blob();
        setVideo(URL.createObjectURL(blob));
      }
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes("not found")) await (window as any).aistudio.openSelectKey();
      setStatus('Error en renderizado.');
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/20 overflow-y-auto custom-scrollbar">
      <header className="p-4 border-b border-white/5 glass sticky top-0 z-10 flex items-center gap-3">
        <div className="p-2 bg-amber-500/10 rounded-lg">
          <Video className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="font-bold text-sm text-white">Nexus Cinema</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Veo 3.1 Pro</p>
        </div>
      </header>

      <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 space-y-4 shadow-xl">
          <textarea 
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Define una toma cinematográfica de 5 segundos..."
            className="w-full h-24 bg-slate-950/50 border border-white/5 rounded-2xl p-5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all text-sm shadow-inner"
          />
          <button 
            onClick={generate}
            disabled={loading || !prompt.trim()}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-[0_0_25px_rgba(217,119,6,0.2)] active:scale-95"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Renderizar Producción
          </button>
        </div>

        <div className="aspect-video w-full rounded-[2.5rem] border border-white/5 bg-slate-900/30 flex items-center justify-center relative overflow-hidden shadow-2xl transition-all duration-700">
          {video ? (
            <video src={video} controls autoPlay loop className="w-full h-full object-cover animate-in fade-in zoom-in duration-1000" />
          ) : (
            <div className="text-center p-12">
              {loading ? (
                <div className="space-y-6">
                   <div className="w-20 h-20 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto"></div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 animate-pulse">{status}</p>
                </div>
              ) : (
                <div className="opacity-10 space-y-6">
                   <Video className="w-32 h-32 mx-auto" strokeWidth={1} />
                   <p className="text-xl font-light italic">Describe tu escena para comenzar el rodaje</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const LiveSection = () => {
  const [isActive, setIsActive] = useState(false);
  const [history, setHistory] = useState<{ role: string, text: string }[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  const start = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (ev) => {
              const inputData = ev.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const base64 = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64) {
              const ctx = audioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(base64), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (msg.serverContent?.inputTranscription) {
              setHistory(prev => [...prev.slice(-4), { role: 'HUMAN', text: msg.serverContent!.inputTranscription!.text }]);
            }
            if (msg.serverContent?.outputTranscription) {
              setHistory(prev => [...prev.slice(-4), { role: 'NEXUS', text: msg.serverContent!.outputTranscription!.text }]);
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => setIsActive(false),
          onerror: (e) => { console.error(e); setIsActive(false); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: 'Eres Nexus Live, un sistema de asistencia de voz ultra-preciso. Mantén las respuestas fluidas y profesionales.'
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (e) {
      console.error(e);
      alert("Error: Microphone access is required for Nexus Live.");
    }
  };

  const stop = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      setIsActive(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/20 items-center justify-center p-8 space-y-16 animate-in fade-in duration-1000">
      <div className="relative">
        <div className={`w-56 h-56 rounded-full flex items-center justify-center transition-all duration-1000 ${isActive ? 'bg-indigo-600/10 scale-110 shadow-[0_0_80px_rgba(79,70,229,0.2)] border border-indigo-500/20' : 'bg-slate-900 shadow-inner'}`}>
          <div className={`w-40 h-40 rounded-full border-2 flex items-center justify-center transition-all duration-700 ${isActive ? 'border-indigo-500 animate-pulse' : 'border-slate-800'}`}>
            <Mic className={`w-16 h-16 transition-all ${isActive ? 'text-indigo-400 scale-125' : 'text-slate-700'}`} strokeWidth={1} />
          </div>
        </div>
        {isActive && (
          <div className="absolute -inset-8 border border-indigo-500/10 rounded-full animate-ping pointer-events-none"></div>
        )}
      </div>

      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{isActive ? 'Canal Abierto' : 'Nexus Live'}</h2>
          <p className="text-slate-500 text-sm font-medium tracking-wide">Protocolo de voz nativo en tiempo real.</p>
        </div>

        <button 
          onClick={isActive ? stop : start}
          className={`px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 shadow-2xl ${isActive ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20 text-white' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20 text-white'}`}
        >
          {isActive ? 'Terminar Conexión' : 'Establecer Nexus Live'}
        </button>
      </div>

      <div className="w-full max-w-xl bg-slate-900/40 border border-white/5 rounded-3xl p-6 h-48 overflow-y-auto custom-scrollbar mono text-[10px] space-y-3 shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="w-3 h-3 text-indigo-400" />
          <span className="font-black text-slate-500 uppercase tracking-widest">Live Terminal</span>
        </div>
        {history.map((h, i) => (
          <div key={i} className="flex gap-4 animate-in slide-in-from-left-2">
            <span className={`font-black shrink-0 ${h.role === 'NEXUS' ? 'text-indigo-400' : 'text-slate-600'}`}>[{h.role}]</span>
            <span className="text-slate-300 leading-relaxed uppercase">{h.text}</span>
          </div>
        ))}
        {history.length === 0 && <p className="text-slate-600 italic tracking-widest text-center py-8">Inicia la conexión para ver el flujo de datos</p>}
      </div>
    </div>
  );
};

/** --- Main Architecture --- **/

const App = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'image' | 'video' | 'live'>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-950 border-r border-white/5 p-4 flex flex-col transition-all duration-700 ease-in-out z-50 shadow-2xl`}>
        <div className="flex items-center gap-3 mb-10 px-2 overflow-hidden">
          <div className="bg-indigo-600 p-2.5 rounded-xl shrink-0 shadow-[0_0_20px_rgba(79,70,229,0.4)]">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          {sidebarOpen && (
            <div className="animate-in slide-in-from-left-4 duration-700">
              <h1 className="text-lg font-black tracking-tighter text-white uppercase leading-none">Nexus AI</h1>
              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.3em] mt-1">v4.5 Master</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem icon={Cpu} label="Terminal" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} open={sidebarOpen} />
          <SidebarItem icon={ImageIcon} label="Studio" active={activeTab === 'image'} onClick={() => setActiveTab('image')} open={sidebarOpen} />
          <SidebarItem icon={Video} label="Cinema" active={activeTab === 'video'} onClick={() => setActiveTab('video')} open={sidebarOpen} />
          <SidebarItem icon={Mic} label="Live" active={activeTab === 'live'} onClick={() => setActiveTab('live')} open={sidebarOpen} />
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-3 rounded-xl hover:bg-white/5 text-slate-500 transition-colors shadow-sm"
          >
            <Menu className="w-5 h-5" />
          </button>
          {sidebarOpen && (
            <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5 animate-in fade-in zoom-in duration-500">
              <div className="flex items-center gap-3 mb-3">
                <Terminal className="w-3 h-3 text-indigo-400" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Global Status</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-slate-500 uppercase">Engine</span>
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    ACTIVE
                  </span>
                </div>
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-slate-500 uppercase">Latency</span>
                  <span className="text-emerald-400 font-bold tracking-wider">0.024s</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 h-full overflow-hidden bg-slate-950 relative flex flex-col">
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent pointer-events-none animate-pulse duration-[10s]"></div>
        
        {activeTab === 'chat' && <ChatSection />}
        {activeTab === 'image' && <ImageSection />}
        {activeTab === 'video' && <VideoSection />}
        {activeTab === 'live' && <LiveSection />}
      </main>
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
