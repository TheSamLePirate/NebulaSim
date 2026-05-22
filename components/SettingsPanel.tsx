

import React, { useState } from 'react';
import { X, Sliders, Activity, Eye, Layers, RotateCcw, Download, Upload, Sparkles, CloudUpload, CloudDownload } from 'lucide-react';
import { VisualConfig, PhysicsConfig } from '../types';

interface SettingsPanelProps {
    visualConfig: VisualConfig;
    setVisualConfig: (config: VisualConfig) => void;
    physicsConfig: PhysicsConfig;
    setPhysicsConfig: (config: PhysicsConfig) => void;
    onClose: () => void;
    onReset: () => void;
    onExport: () => void;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    use3D: boolean;
    setUse3D: (use3D: boolean) => void;
    audioState: AudioContextState | 'uninitialized';
    onEnableAudio: () => void;
    showMusicPanel: boolean;
    setShowMusicPanel: (show: boolean) => void;
    showDebugPanel: boolean;
    setShowDebugPanel: (show: boolean) => void;
    showMinimap: boolean;
    setShowMinimap: (show: boolean) => void;
    showAsteroidDensity: boolean;
    setShowAsteroidDensity: (show: boolean) => void;
    showAsteroid: boolean;
    setShowAsteroid: (show: boolean) => void;
    onPuterSave: () => void;
    onPuterLoad: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    visualConfig,
    setVisualConfig,
    physicsConfig,
    setPhysicsConfig,
    onClose,
    onReset,
    onExport,
    onImport,
    use3D,
    setUse3D,
    audioState,
    onEnableAudio,
    showMusicPanel,
    setShowMusicPanel,
    showDebugPanel,
    setShowDebugPanel,
    showMinimap,
    setShowMinimap,
    showAsteroidDensity,
    setShowAsteroidDensity,
    showAsteroid,
    setShowAsteroid,
    onPuterSave,
    onPuterLoad
}) => {
    const [activeTab, setActiveTab] = useState<'visuals' | 'physics' | 'api'>('visuals');
    const [apiKey, setApiKey] = useState<string>(() => {
        return localStorage.getItem('gemini_api_key') || '';
    });
    const [apiKeyStatus, setApiKeyStatus] = useState<'saved' | 'unsaved' | ''>('');

    const handleSaveApiKey = () => {
        if (apiKey.trim()) {
            localStorage.setItem('gemini_api_key', apiKey.trim());
            setApiKeyStatus('saved');
            setTimeout(() => setApiKeyStatus(''), 2000);
        }
    };

    const handleClearApiKey = () => {
        localStorage.removeItem('gemini_api_key');
        setApiKey('');
        setApiKeyStatus('unsaved');
        setTimeout(() => setApiKeyStatus(''), 2000);
    };

    const updateVisual = (key: keyof VisualConfig, value: any) => {
        setVisualConfig({ ...visualConfig, [key]: value });
    };

    const updatePhysics = (key: keyof PhysicsConfig, value: any) => {
        setPhysicsConfig({ ...physicsConfig, [key]: value });
    };

    return (
        <div
            className="absolute inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
        >
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-none w-full max-w-[500px] mx-4 max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <div className="flex items-center gap-2 text-white font-bold text-lg">
                        <Sliders size={20} className="text-blue-400" />
                        Settings
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700">
                    <button
                        onClick={() => setActiveTab('visuals')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2
                            ${activeTab === 'visuals' ? 'bg-slate-800 text-blue-300 border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Eye size={16} /> Visual FX
                    </button>
                    <button
                        onClick={() => setActiveTab('physics')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2
                            ${activeTab === 'physics' ? 'bg-slate-800 text-blue-300 border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Activity size={16} /> Physics Engine
                    </button>
                    <button
                        onClick={() => setActiveTab('api')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2
                            ${activeTab === 'api' ? 'bg-slate-800 text-blue-300 border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Sparkles size={16} /> AI Assistant
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    {activeTab === 'visuals' && (
                        <>
                            {/* Toggles */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {[
                                    { label: 'Show Grid', key: 'showGrid' },
                                    { label: 'Show Trails', key: 'showTrails' },
                                    { label: 'Show Glow', key: 'showGlow' },
                                    { label: 'Grav. Waves', key: 'showWaves' },
                                    { label: 'Show Stars', key: 'showStars' },
                                    { label: 'Show Nebula', key: 'showNebula' },
                                    { label: 'Show CoM', key: 'showCenterOfMass' },
                                    { label: 'Show Eclipses', key: 'showEclipses' },
                                    { label: 'Show Mag. Fields', key: 'showMagneticFields' },
                                ].map((item) => (
                                    <label key={item.key} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg cursor-pointer hover:bg-slate-750 transition-colors">
                                        <span className="text-sm text-slate-300">{item.label}</span>
                                        <div className={`w-10 h-5 rounded-full relative transition-colors ${visualConfig[item.key as keyof VisualConfig] ? 'bg-blue-600' : 'bg-slate-600'}`}>
                                            <input
                                                type="checkbox"
                                                checked={visualConfig[item.key as keyof VisualConfig] as boolean}
                                                onChange={(e) => updateVisual(item.key as keyof VisualConfig, e.target.checked)}
                                                className="hidden"
                                            />
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${visualConfig[item.key as keyof VisualConfig] ? 'left-6' : 'left-1'}`} />
                                        </div>
                                    </label>
                                ))}

                                {/* Debug Panel Toggle */}
                                <label className="flex items-center justify-between bg-slate-800 p-3 rounded-lg cursor-pointer hover:bg-slate-750 transition-colors border border-slate-700">
                                    <span className="text-sm text-slate-300">Show Debug Panel</span>
                                    <div className={`w-10 h-5 rounded-full relative transition-colors ${showDebugPanel ? 'bg-blue-600' : 'bg-slate-600'}`}>
                                        <input
                                            type="checkbox"
                                            checked={showDebugPanel}
                                            onChange={(e) => setShowDebugPanel(e.target.checked)}
                                            className="hidden"
                                        />
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showDebugPanel ? 'left-6' : 'left-1'}`} />
                                    </div>
                                </label>

                                {/* Minimap Toggle */}
                                <label className="flex items-center justify-between bg-slate-800 p-3 rounded-lg cursor-pointer hover:bg-slate-750 transition-colors border border-slate-700">
                                    <span className="text-sm text-slate-300">Show Minimap</span>
                                    <div className={`w-10 h-5 rounded-full relative transition-colors ${showMinimap ? 'bg-blue-600' : 'bg-slate-600'}`}>
                                        <input
                                            type="checkbox"
                                            checked={showMinimap}
                                            onChange={(e) => setShowMinimap(e.target.checked)}
                                            className="hidden"
                                        />
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showMinimap ? 'left-6' : 'left-1'}`} />
                                    </div>
                                </label>

                                {/* Asteroid  Toggle */}
                                <label className="flex items-center justify-between bg-slate-800 p-3 rounded-lg cursor-pointer hover:bg-slate-750 transition-colors border border-cyan-500/30">
                                    <span className="text-sm text-cyan-300">Show Asteroids</span>
                                    <div className={`w-10 h-5 rounded-full relative transition-colors ${showAsteroid ? 'bg-cyan-600' : 'bg-slate-600'}`}>
                                        <input
                                            type="checkbox"
                                            checked={showAsteroid}
                                            onChange={(e) => setShowAsteroid(e.target.checked)}
                                            className="hidden"
                                        />
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showAsteroid ? 'left-6' : 'left-1'}`} />
                                    </div>
                                </label>

                                {/* Asteroid Density Toggle */}
                                <label className="flex items-center justify-between bg-slate-800 p-3 rounded-lg cursor-pointer hover:bg-slate-750 transition-colors border border-cyan-500/30">
                                    <span className="text-sm text-cyan-300">Asteroid Density</span>
                                    <div className={`w-10 h-5 rounded-full relative transition-colors ${showAsteroidDensity ? 'bg-cyan-600' : 'bg-slate-600'}`}>
                                        <input
                                            type="checkbox"
                                            checked={showAsteroidDensity}
                                            onChange={(e) => setShowAsteroidDensity(e.target.checked)}
                                            className="hidden"
                                        />
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showAsteroidDensity ? 'left-6' : 'left-1'}`} />
                                    </div>
                                </label>

                                <label className="flex items-center justify-between bg-slate-800 p-3 rounded-lg cursor-pointer hover:bg-slate-750 transition-colors col-span-2 border border-indigo-500/30">
                                    <span className="text-sm text-indigo-300 font-bold">Use 3D Canvas (Beta)</span>
                                    <div className={`w-10 h-5 rounded-full relative transition-colors ${use3D ? 'bg-indigo-600' : 'bg-slate-600'}`}>
                                        <input
                                            type="checkbox"
                                            checked={use3D}
                                            onChange={(e) => setUse3D(e.target.checked)}
                                            className="hidden"
                                        />
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${use3D ? 'left-6' : 'left-1'}`} />
                                    </div>
                                </label>
                            </div>

                            {/* Music Panel Toggle */}
                            <label className="flex items-center justify-between bg-slate-800 p-3 rounded-lg cursor-pointer hover:bg-slate-750 transition-colors mb-4 border border-purple-500/30">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={16} className="text-purple-400" />
                                    <span className="text-sm text-purple-300 font-bold">AI Music Generator</span>
                                </div>
                                <div className={`w-10 h-5 rounded-full relative transition-colors ${showMusicPanel ? 'bg-purple-600' : 'bg-slate-600'}`}>
                                    <input
                                        type="checkbox"
                                        checked={showMusicPanel}
                                        onChange={(e) => setShowMusicPanel(e.target.checked)}
                                        className="hidden"
                                    />
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showMusicPanel ? 'left-6' : 'left-1'}`} />
                                </div>
                            </label>

                            {/* Audio Status */}
                            <div className="bg-slate-800 p-3 rounded-lg mb-4 flex items-center justify-between border border-slate-700">
                                <div className="flex items-center gap-2">
                                    <Activity size={16} className={audioState === 'running' ? 'text-green-400' : 'text-orange-400'} />
                                    <span className="text-sm text-slate-300">Audio Status</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-mono px-2 py-1 rounded ${audioState === 'running' ? 'bg-green-500/20 text-green-300' :
                                        audioState === 'suspended' ? 'bg-orange-500/20 text-orange-300' :
                                            'bg-slate-700 text-slate-400'
                                        }`}>
                                        {audioState.toUpperCase()}
                                    </span>
                                    {audioState === 'suspended' && (
                                        <button
                                            onClick={onEnableAudio}
                                            className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded transition-colors"
                                        >
                                            Enable & Test
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <Layers size={12} /> Environment Config
                                </h3>

                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-400">Star Density</span>
                                        <span className="text-blue-300 font-mono">{visualConfig.starDensity}</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="2000" step="50"
                                        value={visualConfig.starDensity}
                                        onChange={(e) => updateVisual('starDensity', Number(e.target.value))}
                                        className="w-full accent-blue-500 bg-slate-700 h-1 rounded-lg appearance-none"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-400">Star Twinkle Speed</span>
                                        <span className="text-blue-300 font-mono">{visualConfig.starTwinkleSpeed.toFixed(1)}x</span>
                                    </div>
                                    <input
                                        type="range" min="0.1" max="5.0" step="0.1"
                                        value={visualConfig.starTwinkleSpeed}
                                        onChange={(e) => updateVisual('starTwinkleSpeed', Number(e.target.value))}
                                        className="w-full accent-blue-500 bg-slate-700 h-1 rounded-lg appearance-none"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-400">Nebula Clouds</span>
                                        <span className="text-blue-300 font-mono">{visualConfig.nebulaCloudCount}</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="50" step="1"
                                        value={visualConfig.nebulaCloudCount}
                                        onChange={(e) => updateVisual('nebulaCloudCount', Number(e.target.value))}
                                        className="w-full accent-blue-500 bg-slate-700 h-1 rounded-lg appearance-none"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-400">Nebula Opacity</span>
                                        <span className="text-blue-300 font-mono">{visualConfig.nebulaOpacity.toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="1.0" step="0.05"
                                        value={visualConfig.nebulaOpacity}
                                        onChange={(e) => updateVisual('nebulaOpacity', Number(e.target.value))}
                                        className="w-full accent-blue-500 bg-slate-700 h-1 rounded-lg appearance-none"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-400">Trail Length</span>
                                        <span className="text-blue-300 font-mono">{visualConfig.trailLength}</span>
                                    </div>
                                    <input
                                        type="range" min="10" max="5000" step="10"
                                        value={visualConfig.trailLength}
                                        onChange={(e) => updateVisual('trailLength', Number(e.target.value))}
                                        className="w-full accent-blue-500 bg-slate-700 h-1 rounded-lg appearance-none"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-400">Glow Intensity</span>
                                        <span className="text-blue-300 font-mono">{visualConfig.glowIntensity.toFixed(1)}</span>
                                    </div>
                                    <input
                                        type="range" min="0.1" max="3.0" step="0.1"
                                        value={visualConfig.glowIntensity}
                                        onChange={(e) => updateVisual('glowIntensity', Number(e.target.value))}
                                        className="w-full accent-blue-500 bg-slate-700 h-1 rounded-lg appearance-none"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-400">CoM Distance Threshold</span>
                                        <span className="text-blue-300 font-mono">{visualConfig.centerOfMassThreshold}</span>
                                    </div>
                                    <input
                                        type="range" min="500" max="10000" step="100"
                                        value={visualConfig.centerOfMassThreshold}
                                        onChange={(e) => updateVisual('centerOfMassThreshold', Number(e.target.value))}
                                        className="w-full accent-blue-500 bg-slate-700 h-1 rounded-lg appearance-none"
                                        title="Bodies further than this from origin will be excluded from Center of Mass tracking"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'physics' && (
                        <div className="space-y-6">
                            <div className="bg-orange-900/20 border border-orange-700/50 p-4 rounded-lg text-sm text-orange-200">
                                Warning: Changing physics constants can destabilize existing orbits or cause chaotic ejections.
                            </div>

                            <label className="flex items-center justify-between bg-slate-800 p-3 rounded-lg cursor-pointer">
                                <span className="text-sm text-slate-300">Enable Collisions</span>
                                <div className={`w-10 h-5 rounded-full relative transition-colors ${physicsConfig.collisions ? 'bg-green-600' : 'bg-slate-600'}`}>
                                    <input
                                        type="checkbox"
                                        checked={physicsConfig.collisions}
                                        onChange={(e) => updatePhysics('collisions', e.target.checked)}
                                        className="hidden"
                                    />
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${physicsConfig.collisions ? 'left-6' : 'left-1'}`} />
                                </div>
                            </label>

                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-400">Gravitational Constant (G)</span>
                                    <span className="text-blue-300 font-mono">{physicsConfig.gravitationalConstant.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range" min="0.1" max="5.0" step="0.05"
                                    value={physicsConfig.gravitationalConstant}
                                    onChange={(e) => updatePhysics('gravitationalConstant', Number(e.target.value))}
                                    className="w-full accent-blue-500 bg-slate-700 h-1 rounded-lg appearance-none"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-400">Time Step (Delta T)</span>
                                    <span className="text-blue-300 font-mono">{physicsConfig.timeStep.toFixed(3)}</span>
                                </div>
                                <input
                                    type="range" min="0.001" max="2.0" step="0.001"
                                    value={physicsConfig.timeStep}
                                    onChange={(e) => updatePhysics('timeStep', Number(e.target.value))}
                                    className="w-full accent-blue-500 bg-slate-700 h-1 rounded-lg appearance-none"
                                />
                                <div className="text-[10px] text-slate-500 mt-1">
                                    Lower = More precise, Slower. Higher = Faster, Less stable.
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-400">Time Reverse Duration</span>
                                    <span className="text-blue-300 font-mono">{physicsConfig.timeReverseDuration?.toFixed(1) || 4.0}s</span>
                                </div>
                                <input
                                    type="range" min="1.0" max="10.0" step="0.5"
                                    value={physicsConfig.timeReverseDuration || 4.0}
                                    onChange={(e) => updatePhysics('timeReverseDuration', Number(e.target.value))}
                                    className="w-full accent-blue-500 bg-slate-700 h-1 rounded-lg appearance-none"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'api' && (
                        <div className="space-y-6">
                            <div className="bg-purple-900/20 border border-purple-700/50 p-4 rounded-lg text-sm text-purple-200">
                                <Sparkles size={16} className="inline mr-2" />
                                Configure your Gemini API key to enable the AI assistant. Get your key from{' '}
                                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                    Google AI Studio
                                </a>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Gemini API Key
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder="Enter your Gemini API key..."
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
                                {apiKeyStatus === 'saved' && (
                                    <div className="mt-2 text-sm text-green-400 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-400 rounded-full" />
                                        API key saved successfully!
                                    </div>
                                )}
                                {apiKeyStatus === 'unsaved' && (
                                    <div className="mt-2 text-sm text-orange-400 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-orange-400 rounded-full" />
                                        API key cleared
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleSaveApiKey}
                                    disabled={!apiKey.trim()}
                                    className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Save API Key
                                </button>
                                <button
                                    onClick={handleClearApiKey}
                                    className="px-4 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Clear
                                </button>
                            </div>

                            <div className="text-xs text-slate-400 space-y-2">
                                <p>• Your API key is stored locally in your browser</p>
                                <p>• It will be used for all AI assistant interactions</p>
                                <p>• You can also set it via the .env.local file (API_KEY variable)</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer with Actions */}
                <div className="p-4 border-t border-slate-700 flex justify-between items-center bg-slate-800/30 gap-2">
                    <div className="flex gap-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors px-3 py-2 hover:bg-slate-700 rounded-lg border border-slate-700 cursor-pointer">
                            <Upload size={14} /> Import
                            <input type="file" accept=".json" onChange={onImport} className="hidden" />
                        </label>
                        <button
                            onClick={onExport}
                            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors px-3 py-2 hover:bg-slate-700 rounded-lg border border-slate-700"
                        >
                            <Download size={14} /> Export
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={onPuterLoad}
                            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors px-3 py-2 hover:bg-slate-700 rounded-lg border border-slate-700"
                        >
                            <CloudDownload size={14} /> Open from Puter
                        </button>
                        <button
                            onClick={onPuterSave}
                            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors px-3 py-2 hover:bg-slate-700 rounded-lg border border-slate-700"
                        >
                            <CloudUpload size={14} /> Save to Puter
                        </button>
                    </div>

                    <button
                        onClick={onReset}
                        className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors px-3 py-2 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/30"
                    >
                        <RotateCcw size={14} /> Reset Default
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;