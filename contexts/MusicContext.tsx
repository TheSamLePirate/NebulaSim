import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { GoogleGenAI, LiveMusicGenerationConfig, LiveMusicSession, LiveMusicServerMessage } from '@google/genai';
import { decode, decodeAudioData } from '../utils/audioUtils';

// --- Types ---
export interface Prompt {
    promptId: string;
    color: string;
    text: string;
    weight: number;
}

export type PlaybackState = 'stopped' | 'playing' | 'loading' | 'paused';

interface MusicContextType {
    isConnected: boolean;
    playbackState: PlaybackState;
    volume: number;
    reverbMix: number;
    lowpassCutoff: number;
    prompts: Map<String, Prompt>;
    config: LiveMusicGenerationConfig;
    filteredPrompts: Set<string>;
    toast: { msg: string, type: 'error' | 'info' } | null;

    // Actions
    connectToSession: (apiKey: string) => Promise<void>;
    play: () => Promise<void>;
    pause: () => void;
    stop: () => void;
    setVolume: (v: number) => void;
    setReverbMix: (v: number) => void;
    setLowpassCutoff: (v: number) => void;
    addPrompt: () => void;
    removePrompt: (id: string) => void;
    updatePrompt: (id: string, updates: Partial<Prompt>) => void;
    setConfig: React.Dispatch<React.SetStateAction<LiveMusicGenerationConfig>>;
    clearToast: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

// --- Constants ---
const PROMPT_TEXT_PRESETS = [
    'Loud Motor Noise', 'Reverb', 'Lo-Fi', 'Etheral',
    'Deep Cello', 'Piano', 'Hans Zimmer', 'Clean warm Electric Guitars', 'Interstellar travel'
];

const COLORS = [
    '#9900ff', '#5200ff', '#ff25f6', '#2af6de',
    '#ffdd28', '#3dffab', '#d8ff3e', '#d9b2ff',
];

function getUnusedRandomColor(usedColors: string[]): string {
    const availableColors = COLORS.filter((c) => !usedColors.includes(c));
    if (availableColors.length === 0) {
        return COLORS[Math.floor(Math.random() * COLORS.length)];
    }
    return availableColors[Math.floor(Math.random() * availableColors.length)];
}

function throttle(func: (...args: any[]) => void, delay: number) {
    let lastCall = 0;
    return (...args: any[]) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
            func(...args);
            lastCall = now;
        }
    };
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function createImpulseResponse(
    ctx: AudioContext,
    duration = 2.5,
    decay = 2.5,
    dampFrequency = 6000
) {
    const rate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(rate * duration));
    const impulse = ctx.createBuffer(2, length, rate);
    const damp = clamp(dampFrequency, 50, rate / 2);
    const dampCoefficient = Math.exp(-1 / (rate / damp));

    for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
        const channelData = impulse.getChannelData(channel);
        let previous = 0;
        for (let i = 0; i < length; i++) {
            const noise = Math.random() * 2 - 1;
            previous = noise + dampCoefficient * previous;
            const envelope = Math.pow(1 - i / length, decay);
            channelData[i] = previous * envelope;
        }
    }

    return impulse;
}

export const MusicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // State
    const [prompts, setPrompts] = useState<Map<string, Prompt>>(() => {
        // Initial prompts logic
        const map = new Map<string, Prompt>();
        const numDefault = 4;
        const shuffled = [...PROMPT_TEXT_PRESETS].sort(() => Math.random() - 0.5);
        const usedColors: string[] = [];

        for (let i = 0; i < numDefault; i++) {
            const color = getUnusedRandomColor(usedColors);
            usedColors.push(color);
            map.set(`prompt-${i}`, {
                promptId: `prompt-${i}`,
                text: shuffled[i],
                weight: i < 2 ? 1 : 0, // Activate first 2
                color
            });
        }
        return map;
    });

    const [config, setConfig] = useState<LiveMusicGenerationConfig>({
        temperature: 0.5,
        topK: 40,
        guidance: 6.0,
        seed: 312,
        bpm: 90,
        density: undefined,
        brightness: undefined,
        scale: 'C_MAJOR_A_MINOR' as any,
        muteBass: false,
        muteDrums: false,
        onlyBassAndDrums: false,
    });

    const [playbackState, _setPlaybackState] = useState<PlaybackState>('stopped');
    const playbackStateRef = useRef<PlaybackState>('stopped');

    const setPlaybackState = (state: PlaybackState) => {
        _setPlaybackState(state);
        playbackStateRef.current = state;
    };

    const [filteredPrompts, setFilteredPrompts] = useState<Set<string>>(new Set());
    const [toast, setToast] = useState<{ msg: string, type: 'error' | 'info' } | null>(null);
    const [volume, setVolume] = useState(0.8);
    const [reverbMix, setReverbMix] = useState(0.35);
    const [reverbDecay, setReverbDecay] = useState(2.5);
    const [reverbPreDelay, setReverbPreDelay] = useState(0.08);
    const [reverbDamp, setReverbDamp] = useState(6000);
    const [lowpassCutoff, setLowpassCutoff] = useState(16000);

    const [isConnected, setIsConnected] = useState(false);
    const [apiKey, setApiKey] = useState<string>('');

    // Refs for audio engine
    const sessionRef = useRef<LiveMusicSession | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const outputNodeRef = useRef<GainNode | null>(null);
    const volumeRef = useRef(0.8);
    const reverbMixRef = useRef(0.35);
    const reverbDecayRef = useRef(2.5);
    const reverbPreDelayRef = useRef(0.08);
    const reverbDampRef = useRef(6000);
    const lowpassCutoffRef = useRef(16000);
    const reverbNodeRef = useRef<ConvolverNode | null>(null);
    const reverbGainRef = useRef<GainNode | null>(null);
    const dryGainRef = useRef<GainNode | null>(null);
    const filterNodeRef = useRef<BiquadFilterNode | null>(null);
    const reverbPreDelayNodeRef = useRef<DelayNode | null>(null);
    const reverbTailFilterRef = useRef<BiquadFilterNode | null>(null);
    const reverbImpulseRef = useRef<AudioBuffer | null>(null);
    const reverbImpulseTimeoutRef = useRef<number | null>(null);
    const bufferTime = 2; // seconds

    const setupAudioGraph = (ctx: AudioContext) => {
        const impulse = createImpulseResponse(ctx, reverbDecayRef.current, reverbDecayRef.current * 1.2, reverbDampRef.current);
        reverbImpulseRef.current = impulse;

        const outputGain = ctx.createGain();
        outputGain.gain.setValueAtTime(volumeRef.current, ctx.currentTime);

        const dryGain = ctx.createGain();
        dryGain.gain.setValueAtTime(1 - reverbMixRef.current, ctx.currentTime);

        const reverbGain = ctx.createGain();
        reverbGain.gain.setValueAtTime(reverbMixRef.current, ctx.currentTime);

        const filterNode = ctx.createBiquadFilter();
        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(lowpassCutoffRef.current, ctx.currentTime);
        filterNode.Q.setValueAtTime(10, ctx.currentTime);

        const reverbSend = ctx.createGain();
        reverbSend.gain.setValueAtTime(1, ctx.currentTime);

        const preDelay = ctx.createDelay(1);
        preDelay.delayTime.setValueAtTime(reverbPreDelayRef.current, ctx.currentTime);

        const reverbNode = ctx.createConvolver();
        reverbNode.buffer = impulse;

        const tailFilter = ctx.createBiquadFilter();
        tailFilter.type = 'lowpass';
        tailFilter.frequency.setValueAtTime(reverbDampRef.current, ctx.currentTime);
        tailFilter.Q.setValueAtTime(0.7, ctx.currentTime);

        filterNode.connect(dryGain);
        filterNode.connect(reverbSend);
        reverbSend.connect(preDelay);
        preDelay.connect(reverbNode);
        reverbNode.connect(tailFilter);
        tailFilter.connect(reverbGain);
        dryGain.connect(outputGain);
        reverbGain.connect(outputGain);
        outputGain.connect(ctx.destination);

        outputNodeRef.current = outputGain;
        dryGainRef.current = dryGain;
        reverbGainRef.current = reverbGain;
        filterNodeRef.current = filterNode;
        reverbNodeRef.current = reverbNode;
        reverbPreDelayNodeRef.current = preDelay;
        reverbTailFilterRef.current = tailFilter;
    };

    const getAudioContext = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000 });
            setupAudioGraph(audioContextRef.current);
        } else if (!outputNodeRef.current && audioContextRef.current) {
            setupAudioGraph(audioContextRef.current);
        }
        return audioContextRef.current;
    };

    const stopAudio = useCallback(() => {
        sessionRef.current?.stop();
        setPlaybackState('stopped');
        nextStartTimeRef.current = 0;
    }, []);

    const updateSessionPrompts = useCallback(throttle(async () => {
        if (!sessionRef.current) {
            return;
        }

        const promptsToSend = Array.from(prompts.values())
            .filter(p => !filteredPrompts.has(p.text) && p.weight !== 0)
            .map(p => ({ text: p.text, weight: p.weight }));


        try {
            await sessionRef.current.setWeightedPrompts({ weightedPrompts: promptsToSend });
        } catch (e: any) {
            console.error("Failed to update prompts:", e);
        }
    }, 200), [prompts, filteredPrompts]);

    const connectToSession = async (key: string) => {
        if (!key) {
            setToast({ msg: "API Key missing.", type: 'error' });
            return;
        }
        setApiKey(key);

        try {
            const client = new GoogleGenAI({ apiKey: key, apiVersion: 'v1alpha' });
            const session = await client.live.music.connect({
                model: 'lyria-realtime-exp',
                callbacks: {
                    onmessage: async (e: LiveMusicServerMessage) => {
                        if (e.filteredPrompt) {
                            setFilteredPrompts(prev => new Set([...prev, e.filteredPrompt!.text]));
                            setToast({ msg: `Prompt filtered: ${e.filteredPrompt.filteredReason}`, type: 'info' });
                        }

                        if (e.serverContent?.audioChunks) {
                            if (playbackStateRef.current === 'paused' || playbackStateRef.current === 'stopped') return;

                            try {
                                const ctx = getAudioContext();
                                if (ctx.state === 'suspended') {
                                    await ctx.resume();
                                }

                                const decodedData = decode(e.serverContent.audioChunks[0].data);

                                if (decodedData.length % 2 !== 0) {
                                    return;
                                }

                                const audioBuffer = await decodeAudioData(
                                    decodedData,
                                    ctx,
                                    48000,
                                    2
                                );

                                const source = ctx.createBufferSource();
                                source.buffer = audioBuffer;
                                const targetNode = filterNodeRef.current ?? outputNodeRef.current;
                                source.connect(targetNode!);

                                if (nextStartTimeRef.current === 0) {
                                    nextStartTimeRef.current = ctx.currentTime + bufferTime;
                                    setTimeout(() => {
                                        setPlaybackState('playing');
                                    }, bufferTime * 1000);
                                }

                                if (nextStartTimeRef.current < ctx.currentTime) {
                                    // Underrun
                                    setPlaybackState('loading');
                                    nextStartTimeRef.current = 0; // Reset buffer
                                    return;
                                }

                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += audioBuffer.duration;
                            } catch (error) {
                                console.error("Error processing audio chunk:", error);
                            }
                        }
                    },
                    onerror: (e: any) => {
                        console.error("Session error:", e);
                        setToast({ msg: "Connection error. Please restart.", type: 'error' });
                        stopAudio();
                        setIsConnected(false);
                    },
                    onclose: () => {
                        console.log("Session closed");
                        setPlaybackState('stopped');
                        setIsConnected(false);
                    }
                }
            });
            sessionRef.current = session;
            setIsConnected(true);
            await updateSessionPrompts();
        } catch (err: any) {
            console.error("Connection failed:", err);
            setToast({ msg: `Connection failed: ${err.message}`, type: 'error' });
            setPlaybackState('stopped');
            setIsConnected(false);
        }
    };

    const play = async () => {
        const ctx = getAudioContext();
        if (playbackState === 'paused' || playbackState === 'stopped') {
            if (!sessionRef.current) {
                // Cannot play without session. Wait for user to connect via Panel or implicit connection?
                // For safety, we expect connectToSession to be called first if manual, 
                // but if we have API key stored, we could try?
                // For now, assume session MUST be established.
                if (apiKey) {
                    await connectToSession(apiKey);
                } else {
                    return; // Fail silently or toast
                }
            }

            if (ctx.state === 'suspended') await ctx.resume();

            sessionRef.current?.play();
            setPlaybackState('loading');

            // Fade in
            outputNodeRef.current?.gain.setValueAtTime(0, ctx.currentTime);
            outputNodeRef.current?.gain.linearRampToValueAtTime(volumeRef.current, ctx.currentTime + 0.1);
        }
    };

    const pause = () => {
        const ctx = getAudioContext();
        if (playbackState === 'playing') {
            sessionRef.current?.pause();
            setPlaybackState('paused');
            // Fade out
            const currentVolume = volumeRef.current;
            outputNodeRef.current?.gain.setValueAtTime(currentVolume, ctx.currentTime);
            outputNodeRef.current?.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
            nextStartTimeRef.current = 0;
        }
    };

    const handleVolumeChange = (value: number) => {
        const clamped = clamp(value, 0, 1);
        setVolume(clamped);
        volumeRef.current = clamped;

        if (outputNodeRef.current && audioContextRef.current) {
            const ctx = audioContextRef.current;
            outputNodeRef.current.gain.cancelScheduledValues(ctx.currentTime);
            outputNodeRef.current.gain.setValueAtTime(clamped, ctx.currentTime);
        }
    };

    const handleReverbMixChange = (value: number) => {
        const clamped = clamp(value, 0, 1);
        setReverbMix(clamped);
        reverbMixRef.current = clamped;

        if (audioContextRef.current) {
            const ctx = audioContextRef.current;
            if (dryGainRef.current) {
                dryGainRef.current.gain.setValueAtTime(1 - clamped, ctx.currentTime);
            }
            if (reverbGainRef.current) {
                reverbGainRef.current.gain.setValueAtTime(clamped, ctx.currentTime);
            }
        }
    };

    const handleLowpassCutoffChange = (value: number) => {
        const clamped = clamp(value, 20, 20000);
        setLowpassCutoff(clamped);
        lowpassCutoffRef.current = clamped;

        if (filterNodeRef.current && audioContextRef.current) {
            const ctx = audioContextRef.current;
            filterNodeRef.current.frequency.setValueAtTime(clamped, ctx.currentTime);
        }
    };

    // Prompt Management
    const addPrompt = () => {
        const id = `prompt-${Date.now()}`;
        const usedColors = Array.from(prompts.values()).map(p => p.color);
        setPrompts(prev => {
            const next = new Map(prev);
            next.set(id, {
                promptId: id,
                text: 'New Prompt',
                weight: 0,
                color: getUnusedRandomColor(usedColors)
            });
            return next;
        });
    };

    const removePrompt = (id: string) => {
        setPrompts(prev => {
            const next = new Map(prev);
            next.delete(id);
            return next;
        });
    };

    const updatePrompt = (id: string, updates: Partial<Prompt>) => {
        setPrompts(prev => {
            const next = new Map(prev);
            const p = next.get(id);
            if (p) {
                next.set(id, { ...p, ...updates });
            }
            return next;
        });
    };

    const clearToast = () => setToast(null);

    // Effects
    useEffect(() => {
        updateSessionPrompts();
    }, [prompts, updateSessionPrompts]);

    useEffect(() => {
        if (sessionRef.current) {
            sessionRef.current.setMusicGenerationConfig({ musicGenerationConfig: config });
        }
    }, [config]);

    // Cleanup
    useEffect(() => {
        const resumeAudio = () => {
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume().catch(console.error);
            }
        };
        window.addEventListener('click', resumeAudio);
        window.addEventListener('keydown', resumeAudio);
        return () => {
            window.removeEventListener('click', resumeAudio);
            window.removeEventListener('keydown', resumeAudio);
            if (reverbImpulseTimeoutRef.current !== null) {
                window.clearTimeout(reverbImpulseTimeoutRef.current);
            }
        };
    }, []);

    const value = {
        isConnected,
        playbackState,
        volume,
        reverbMix,
        lowpassCutoff,
        prompts,
        config,
        filteredPrompts,
        toast,
        connectToSession,
        play,
        pause,
        stop: stopAudio,
        setVolume: handleVolumeChange,
        setReverbMix: handleReverbMixChange,
        setLowpassCutoff: handleLowpassCutoffChange,
        addPrompt,
        removePrompt,
        updatePrompt,
        setConfig,
        clearToast
    };

    return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
};

export const useMusic = () => {
    const context = useContext(MusicContext);
    if (!context) {
        throw new Error("useMusic must be used within a MusicProvider");
    }
    return context;
};
