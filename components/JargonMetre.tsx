import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Gauge } from './Gauge';
import { ConnectionStatus } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";

// Audio configuration constants
const INPUT_SAMPLE_RATE = 16000;
const API_KEY = process.env.API_KEY || '';

// --- TYPES FOR COMIC BUBBLES ---
interface WordBubble {
    id: string;
    text: string;
    rotation: number;
    style: 'yellow' | 'white' | 'red';
    xOffset: number;
    yOffset: number; // Stored Y position to prevent jumping
    createdAt: number;
    exiting?: boolean;
}

// Define the Tool (Function) the model will call to update the UI
const updateJargonStatsTool: FunctionDeclaration = {
    name: 'updateJargonStats',
    description: 'Updates the jargon score dashboard based on the analysis of the user\'s speech.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            score: {
                type: Type.NUMBER,
                description: 'Jargon score from 0.0 (simple/clear) to 1.0 (complex/corporate nonsense).',
            },
            reasoning: {
                type: Type.STRING,
                description: 'Short reasoning for the score in French.',
            },
            jargonWords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of specific jargon words detected in the last sentence.',
            },
        },
        required: ['score', 'reasoning', 'jargonWords'],
    },
};

// --- Audio Helper Functions ---
function base64EncodeAudio(float32Array: Float32Array): string {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    let binary = '';
    const len = int16Array.byteLength;
    const bytes = new Uint8Array(int16Array.buffer);
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

const JargonMetre: React.FC = () => {
    const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
    const [gaugeLevel, setGaugeLevel] = useState<number>(0);
    const [bubbles, setBubbles] = useState<WordBubble[]>([]);

    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sessionRef = useRef<any>(null);

    // --- GAUGE DECAY LOGIC ---
    useEffect(() => {
        const decayInterval = setInterval(() => {
            setGaugeLevel(prev => {
                // Slow decay (cooldown)
                const decayRate = 0.003;
                return Math.max(0, prev - decayRate);
            });
        }, 50);
        return () => clearInterval(decayInterval);
    }, []);

    // --- BUBBLE CLEANUP LOGIC ---
    useEffect(() => {
        const cleanupInterval = setInterval(() => {
            const now = Date.now();
            setBubbles(prev => {
                // Mark old bubbles as exiting first (for animation), then remove
                return prev.filter(b => now - b.createdAt < 11000).map(b => {
                    if (now - b.createdAt > 10000) return { ...b, exiting: true };
                    return b;
                });
            });
        }, 1000);
        return () => clearInterval(cleanupInterval);
    }, []);

    const stopSession = useCallback(() => {
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        sessionRef.current = null;
        setStatus(ConnectionStatus.DISCONNECTED);
    }, []);

    const startSession = useCallback(async () => {
        if (!API_KEY) {
            alert("API Key missing");
            return;
        }

        try {
            setStatus(ConnectionStatus.CONNECTING);

            //make sure the user has granted permission
            const permission = await navigator.mediaDevices.getUserMedia({
                audio: true
            });
            permission.getTracks().forEach(track => track.stop());



            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: INPUT_SAMPLE_RATE,
                    channelCount: 1,
                    echoCancellation: true,
                    autoGainControl: true,
                    noiseSuppression: true
                }
            });
            mediaStreamRef.current = stream;

            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
            audioContextRef.current = audioContext;

            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            source.connect(processor);
            processor.connect(audioContext.destination);

            const ai = new GoogleGenAI({ apiKey: API_KEY });

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: `
            Tu es le 'COMPLIC-O-METRE'. 
            Analyse le discours de l'utilisateur qui s'adresse à des ENFANTS de 10 ans.
            C'est un spectacle ou vulgarisation scientifique , jargon scientifique et charabia seront à distinguer, ça fait partie du spectacle.
            Si la phrase est trop complexe, appelle 'updateJargonStats' avec un score en fonction de la complexitée.
            Si la phrase est simple, appelle 'updateJargonStats' avec un score en fonction
            L'utilisateur piège les enfants avec du jargon complexe.

            RÈGLES :
            1. Reste silencieux.
            2. Appelle 'updateJargonStats' à chaque phrase.
            3. mot compliqué : (ex: "trigonométrie","Tangentielle","Vecteur","Chorizo","hypoténuse", "structurel", "paradigme", "implémentation").
            4. Si la phrase est simple, score < 0.2.
          `,
                    tools: [{ functionDeclarations: [updateJargonStatsTool] }],
                },
                callbacks: {
                    onopen: () => {
                        console.log("Connected");
                        setStatus(ConnectionStatus.CONNECTED);
                    },
                    onmessage: (message: LiveServerMessage) => {
                        if (message.toolCall) {
                            for (const fc of message.toolCall.functionCalls) {
                                if (fc.name === 'updateJargonStats') {
                                    const args = fc.args as any;
                                    const newScore = args.score ?? 0;
                                    const newWords = (args.jargonWords ?? []) as string[];

                                    // --- 1. GAUGE JUMP LOGIC ---
                                    setGaugeLevel(prev => {
                                        // If new score is HIGHER, JUMP instantly.
                                        // If lower, ignore it and let the decay interval handle the cooldown.
                                        if (newScore > prev) return newScore;
                                        return prev;
                                    });

                                    // --- 2. BUBBLE LOGIC ---
                                    if (newWords.length > 0) {
                                        const newBubbles = newWords.map((word: string) => ({
                                            id: Math.random().toString(36).substr(2, 9),
                                            text: word,
                                            rotation: Math.random() * 20 - 10, // Random tilt
                                            style: Math.random() > 0.6 ? 'red' : Math.random() > 0.3 ? 'yellow' : 'white',
                                            xOffset: Math.random() * 60 - 30, // Random placement X
                                            yOffset: Math.random() * 30, // Stored Y position to prevent jumping
                                            createdAt: Date.now()
                                        }));

                                        setBubbles(prev => [...prev, ...newBubbles as WordBubble[]]);
                                    }

                                    sessionPromise.then(session => {
                                        session.sendToolResponse({
                                            functionResponses: {
                                                id: fc.id,
                                                name: fc.name,
                                                response: { result: "OK" }
                                            }
                                        });
                                    });
                                }
                            }
                        }
                    },
                    onclose: () => {
                        setStatus((prev) => prev === ConnectionStatus.CONNECTED ? ConnectionStatus.DISCONNECTED : prev);
                    },
                    onerror: (err) => {
                        console.error(err);
                        setStatus(ConnectionStatus.ERROR);
                        stopSession();
                    }
                }
            });

            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const base64Audio = base64EncodeAudio(inputData);
                sessionPromise.then(session => {
                    sessionRef.current = session;
                    session.sendRealtimeInput({
                        media: {
                            mimeType: 'audio/pcm;rate=16000',
                            data: base64Audio
                        }
                    });
                });
            };

        } catch (error) {
            setStatus(ConnectionStatus.ERROR);
            stopSession();
        }
    }, [stopSession]);


    return (
        <div className="min-h-screen bg-slate-900/10 text-slate-100 flex flex-col items-center p-4 overflow-hidden font-sans pointer-events-none">

            {/* --- MAIN STAGE --- */}
            {status === ConnectionStatus.CONNECTED && (
                <main className="fixed bottom-0 z-[60] w-full h-full max-w-4xl flex flex-col items-center relative">

                    {/* THE GAUGE */}
                    <div className="mb-16 scale-110 md:scale-125 transition-transform duration-500">
                        <Gauge score={gaugeLevel} />
                    </div>

                    {/* --- COMIC BUBBLE AREA --- */}
                    <div className="w-full h-64 relative flex justify-center perspective-1000">
                        {bubbles.map((bubble) => (
                            <div
                                key={bubble.id}
                                className={`absolute comic-bubble ${bubble.exiting ? 'exiting' : ''} cursor-pointer hover:z-50`}
                                style={{
                                    ['--rot' as string]: `${bubble.rotation}deg`,
                                    left: `calc(50% + ${bubble.xOffset}%)`,
                                    bottom: `${bubble.yOffset}%` // Uses stored Y position
                                } as React.CSSProperties}
                            >
                                {/* Comic Bubble Shape with Floating Animation */}
                                <div
                                    className={`
                    relative px-6 py-4 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)]
                    animate-float
                    ${bubble.style === 'red' ? 'bg-[#ff0000] text-white' :
                                            bubble.style === 'yellow' ? 'bg-[#fbbf24] text-black' : 'bg-white text-black'}
                    `}
                                    style={{ animationDelay: `${-(bubble.createdAt % 4000)}ms` }} // Desynchronize animations
                                >
                                    {/* Little triangle tail */}
                                    <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 w-0 h-0 
                        border-l-[10px] border-l-transparent
                        border-r-[10px] border-r-transparent
                        border-t-[16px] border-t-black
                        `}>
                                    </div>

                                    {/* Emojis based on style */}
                                    {bubble.style === 'red' && <div className="absolute -top-4 -right-4 text-3xl">🤬</div>}
                                    {bubble.style === 'yellow' && <div className="absolute -top-4 -left-4 text-3xl">??</div>}

                                    <span className="font-comic text-2xl md:text-3xl uppercase whitespace-nowrap">
                                        {bubble.text}!?
                                    </span>
                                </div>
                            </div>
                        ))}

                        {bubbles.length === 0 && status === ConnectionStatus.CONNECTED && (
                            <div className="text-slate-600 font-comic text-2xl opacity-50 animate-pulse mt-10">
                                EN ATTENTE DE JARGON...
                            </div>
                        )}
                    </div>
                </main>
            )}

            {/* --- CONTROLS --- */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
                {status === ConnectionStatus.CONNECTED || status === ConnectionStatus.CONNECTING ? (
                    <button
                        onClick={stopSession}
                        className="group relative px-8 py-4 bg-red-600 border-4 border-black text-white font-comic text-2xl tracking-widest hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] active:translate-y-1 active:shadow-none transition-all shadow-[4px_4px_0px_#000]"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            <span className="animate-pulse">🛑</span> STOP
                        </span>
                    </button>
                ) : (
                    <button
                        onClick={startSession}
                        className="group relative px-8 py-4 bg-green-500 border-4 border-black text-black font-comic text-2xl tracking-widest hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] active:translate-y-1 active:shadow-none transition-all shadow-[4px_4px_0px_#000]"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            🎙️ GO!
                        </span>
                    </button>
                )}
            </div>

        </div>
    );
};

export default JargonMetre;