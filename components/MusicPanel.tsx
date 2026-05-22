import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Plus, RotateCcw, Settings, Volume2, VolumeX, AlertTriangle } from 'lucide-react';
import { LiveMusicGenerationConfig } from '@google/genai';
import { useMusic, Prompt } from '../contexts/MusicContext';

// --- Sub-Components ---

const WeightSlider: React.FC<{
    value: number;
    color: string;
    onChange: (value: number) => void;
}> = ({ value, color, onChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        setIsDragging(true);
        updateValue(e.clientY);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (isDragging) {
            updateValue(e.clientY);
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    const updateValue = (clientY: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const relativeY = clientY - rect.top;
        const normalized = 1 - Math.max(0, Math.min(rect.height, relativeY)) / rect.height;
        onChange(normalized * 2);
    };

    return (
        <div
            className="flex flex-col items-center h-full w-full cursor-ns-resize py-1"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            <div ref={containerRef} className="relative w-2 bg-slate-800/50 rounded-full h-full">
                <div
                    className="absolute bottom-0 left-0 w-full rounded-full shadow-[0_0_5px_rgba(0,0,0,0.5)] transition-all duration-75"
                    style={{
                        height: `${(value / 2) * 100}%`,
                        backgroundColor: color,
                        opacity: value > 0.01 ? 1 : 0
                    }}
                />
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono select-none">
                {value.toFixed(2)}
            </div>
        </div>
    );
};

const PromptItem: React.FC<{
    prompt: Prompt;
    isFiltered: boolean;
    onUpdate: (id: string, updates: Partial<Prompt>) => void;
    onRemove: (id: string) => void;
}> = ({ prompt, isFiltered, onUpdate, onRemove }) => {
    return (
        <div className={`
            relative flex flex-col items-center w-32 h-64 bg-slate-800/80 backdrop-blur-sm rounded-lg border 
            transition-colors duration-300 shrink-0
            ${isFiltered ? 'border-red-500/50 bg-red-900/10' : 'border-slate-700 hover:border-slate-600'}
        `}>
            <button
                onClick={() => onRemove(prompt.promptId)}
                className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center rounded-full bg-slate-700/50 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors z-10"
            >
                <X size={12} />
            </button>

            <div className="flex-1 w-full px-4 py-2">
                <WeightSlider
                    value={prompt.weight}
                    color={prompt.color}
                    onChange={(w) => onUpdate(prompt.promptId, { weight: w })}
                />
            </div>

            <div className="w-full p-2 bg-slate-900/50 rounded-b-lg border-t border-slate-700/50">
                <div
                    contentEditable
                    suppressContentEditableWarning
                    className="w-full text-center text-xs text-slate-200 bg-transparent outline-none break-words min-h-[1.5em]"
                    onBlur={(e) => {
                        const text = e.currentTarget.textContent?.trim();
                        if (text && text !== prompt.text) {
                            onUpdate(prompt.promptId, { text });
                        } else if (!text) {
                            e.currentTarget.textContent = prompt.text;
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            e.currentTarget.blur();
                        }
                    }}
                >
                    {prompt.text}
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---

interface MusicPanelProps {
    apiKey: string;
    onClose: () => void;
}

const MusicPanel: React.FC<MusicPanelProps> = ({ apiKey, onClose }) => {
    const {
        playbackState,
        volume,
        prompts,
        config,
        filteredPrompts,
        toast,
        connectToSession,
        play,
        pause,
        stop,
        setVolume,
        addPrompt,
        removePrompt,
        updatePrompt,
        setConfig,
        clearToast
    } = useMusic();

    const [showSettings, setShowSettings] = useState(false);

    // Re-use logic for background gradient
    const getBackgroundGradient = () => {
        const activePrompts = Array.from(prompts.values());
        if (activePrompts.length === 0) return 'none';

        const stops = activePrompts.map((p, i) => {
            const alpha = Math.min(Math.max(p.weight / 0.5, 0), 1) * 0.6;
            const stop = p.weight / 2;
            const x = (i % 4) / 3 * 100;
            const y = Math.floor(i / 4) / 3 * 100;
            return `radial-gradient(circle at ${x}% ${y}%, ${p.color}${Math.round(alpha * 255).toString(16).padStart(2, '0')} 0px, ${p.color}00 ${stop * 100}%)`;
        });

        return stops.join(', ');
    };

    const handlePlayPause = async () => {
        if (playbackState === 'playing') {
            pause();
        } else {
            await connectToSession(apiKey);
            await play();
        }
    };

    // Toast Effect
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                clearToast();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast, clearToast]);

    return (
        <div className="absolute bottom-0 left-0 right-0 h-[350px] bg-slate-900/95 backdrop-blur-md border-t border-slate-700 z-40 flex flex-col transition-all duration-300">
            {/* Background Effects */}
            <div
                className="absolute inset-0 pointer-events-none opacity-30 transition-opacity duration-1000"
                style={{ backgroundImage: getBackgroundGradient() }}
            />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800/50 shrink-0">
                <div className="flex items-center gap-2 text-slate-200 font-bold">
                    <Volume2 size={18} className="text-purple-400" />
                    <span>AI Music Generator</span>
                    <span className="text-xs font-normal text-slate-500 ml-2 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Experimental</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        <Settings size={18} />
                    </button>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Prompts Scroll Area */}
                <div className="flex-1 overflow-x-auto custom-scrollbar p-4 flex items-end gap-4">
                    {Array.from(prompts.values()).map(p => (
                        <PromptItem
                            key={p.promptId}
                            prompt={p}
                            isFiltered={filteredPrompts.has(p.text)}
                            onUpdate={updatePrompt}
                            onRemove={removePrompt}
                        />
                    ))}

                    <button
                        onClick={addPrompt}
                        className="h-64 w-16 shrink-0 border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:border-slate-500 hover:bg-slate-800/50 transition-all"
                    >
                        <Plus size={24} />
                    </button>
                </div>

                {/* Settings Sidebar (Overlay) */}
                {showSettings && (
                    <div className="absolute right-0 top-0 bottom-0 w-64 bg-slate-900/95 border-l border-slate-700 p-4 overflow-y-auto z-20 shadow-xl backdrop-blur-xl">
                        <h3 className="text-sm font-bold text-slate-300 mb-4">Generation Settings</h3>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs mb-1 text-slate-400">
                                    <span>Temperature</span>
                                    <span>{config.temperature?.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range" min="0" max="2" step="0.1"
                                    value={config.temperature}
                                    onChange={(e) => setConfig(prev => ({ ...prev, temperature: Number(e.target.value) }))}
                                    className="w-full accent-purple-500 bg-slate-700 h-1 rounded-lg appearance-none"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs mb-1 text-slate-400">
                                    <span>Guidance</span>
                                    <span>{config.guidance?.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range" min="0" max="10" step="0.5"
                                    value={config.guidance}
                                    onChange={(e) => setConfig(prev => ({ ...prev, guidance: Number(e.target.value) }))}
                                    className="w-full accent-purple-500 bg-slate-700 h-1 rounded-lg appearance-none"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs mb-1 text-slate-400">
                                    <span>Top K</span>
                                    <span>{config.topK}</span>
                                </div>
                                <input
                                    type="range" min="1" max="100" step="1"
                                    value={config.topK}
                                    onChange={(e) => setConfig(prev => ({ ...prev, topK: Number(e.target.value) }))}
                                    className="w-full accent-purple-500 bg-slate-700 h-1 rounded-lg appearance-none"
                                />
                            </div>

                            <div className="pt-2 border-t border-slate-700 space-y-4">
                                {/* Seed */}
                                <div>
                                    <div className="flex justify-between text-xs mb-1 text-slate-400">
                                        <span>Seed</span>
                                    </div>
                                    <input
                                        type="number"
                                        placeholder="Auto"
                                        value={config.seed ?? ''}
                                        onChange={(e) => setConfig(prev => ({ ...prev, seed: e.target.value ? Number(e.target.value) : undefined }))}
                                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Transport Controls */}
            <div className="h-16 bg-slate-800/80 border-t border-slate-700 px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handlePlayPause}
                        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${playbackState === 'playing'
                                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                                : 'bg-purple-500 text-white hover:bg-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                            }`}
                        disabled={playbackState === 'loading'}
                    >
                        {playbackState === 'loading' ? (
                            <RotateCcw className="animate-spin" size={20} />
                        ) : playbackState === 'playing' ? (
                            <Pause size={20} fill="currentColor" />
                        ) : (
                            <Play size={20} fill="currentColor" className="ml-1" />
                        )}
                    </button>

                    <button
                        onClick={stop}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        title="Stop & Disconnect"
                    >
                        <div className="w-3 h-3 bg-current rounded-sm" />
                    </button>

                    {toast && (
                        <div className={`flex items-center gap-2 px-3 py-1 rounded text-xs animate-fade-in ${toast.type === 'error' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'
                            }`}>
                            <AlertTriangle size={12} />
                            {toast.msg}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 w-48">
                    <button onClick={() => setVolume(volume === 0 ? 0.8 : 0)}>
                        {volume === 0 ? <VolumeX size={18} className="text-slate-500" /> : <Volume2 size={18} className="text-slate-300" />}
                    </button>
                    <input
                        type="range" min="0" max="1" step="0.01"
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="flex-1 accent-purple-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            </div>
        </div>
    );
};

export default MusicPanel;
