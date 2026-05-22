import React from 'react';
import { Body, FlightComputerModule, FlightComputerInput, PhysicsConfig, RendezvousSolution, FlightComputerModuleType } from '../../../types';
import { getInput, getUpdateForInput } from '../utils';
import InputSelector from '../InputSelector';
import { Activity, Volume2 } from 'lucide-react';

import { useMusic } from '../../../contexts/MusicContext';

interface ModuleProps {
    module: FlightComputerModule;
    bodies: Body[];
    modules: FlightComputerModule[];
    physicsConfig: PhysicsConfig;
    rendezvousSolutionMap: Record<string, RendezvousSolution>;
    onUpdateModule: (id: string, updates: Partial<FlightComputerModule>) => void;
    onAddModule: (type: FlightComputerModuleType, inputs?: Record<string, FlightComputerInput>) => void;
}

const MusicControllerModule: React.FC<ModuleProps> = ({ module, bodies, modules, physicsConfig, rendezvousSolutionMap, onUpdateModule }) => {
    const { play, pause } = useMusic();

    const updateInput = (moduleId: string, key: string, input: FlightComputerInput | undefined) => {
        onUpdateModule(moduleId, getUpdateForInput(module, key, input));
    };

    return (
        <div className="mt-2 space-y-4">

            {/* Playback Controls */}
            <div className="space-y-2 border-b border-slate-800 pb-2">
                <div className="flex gap-2 mb-2">
                    <button
                        onClick={() => play()}
                        className="flex-1 bg-green-900/40 hover:bg-green-800/60 text-green-400 text-[10px] uppercase font-bold py-1 px-2 rounded border border-green-800/50 transition-colors"
                    >
                        Manual Play
                    </button>
                    <button
                        onClick={() => pause()}
                        className="flex-1 bg-red-900/40 hover:bg-red-800/60 text-red-400 text-[10px] uppercase font-bold py-1 px-2 rounded border border-red-800/50 transition-colors"
                    >
                        Manual Pause
                    </button>
                </div>
                <InputSelector
                    label="Play Trigger (Bool)"
                    value={getInput(module, 'play')}
                    onChange={(input) => updateInput(module.id, 'play', input)}
                    bodies={bodies}
                    modules={modules}
                    currentModuleId={module.id}
                    allowedTypes={['boolean', 'module_output']}
                />
                <InputSelector
                    label="Pause Trigger (Bool)"
                    value={getInput(module, 'pause')}
                    onChange={(input) => updateInput(module.id, 'pause', input)}
                    bodies={bodies}
                    modules={modules}
                    currentModuleId={module.id}
                    allowedTypes={['boolean', 'module_output']}
                />
                <InputSelector
                    label="Volume Target (Scalar 0-1)"
                    value={getInput(module, 'volume')}
                    onChange={(input) => updateInput(module.id, 'volume', input)}
                    bodies={bodies}
                    modules={modules}
                    currentModuleId={module.id}
                    allowedTypes={['scalar', 'module_output']}
                />

                {/* Reverb Mix */}
                <div className="space-y-1 pt-1 border-t border-slate-800/50">
                    <InputSelector
                        label="Reverb Mix (Scalar 0-1)"
                        value={getInput(module, 'reverb_mix')}
                        onChange={(input) => updateInput(module.id, 'reverb_mix', input)}
                        bodies={bodies}
                        modules={modules}
                        currentModuleId={module.id}
                        allowedTypes={['scalar', 'module_output']}
                    />
                    <div className="flex bg-slate-900 border border-slate-700 rounded overflow-hidden">
                        <div className="px-2 py-1 bg-slate-800 text-[9px] text-slate-500 uppercase flex items-center">Manual Reverb</div>
                        <input
                            type="number"
                            step="0.05"
                            min="0"
                            max="1"
                            value={(module as any).musicReverbMix ?? 0.35}
                            onChange={(e) => onUpdateModule(module.id, { musicReverbMix: parseFloat(e.target.value) })}
                            className="flex-1 bg-transparent border-none px-2 py-1 text-xs text-slate-200 outline-none"
                        />
                    </div>
                </div>

                {/* Lowpass Filter */}
                <div className="space-y-1">
                    <InputSelector
                        label="Lowpass Cutoff (Scalar 0-20000)"
                        value={getInput(module, 'lowpass_cutoff')}
                        onChange={(input) => updateInput(module.id, 'lowpass_cutoff', input)}
                        bodies={bodies}
                        modules={modules}
                        currentModuleId={module.id}
                        allowedTypes={['scalar', 'module_output']}
                    />
                    <div className="flex bg-slate-900 border border-slate-700 rounded overflow-hidden">
                        <div className="px-2 py-1 bg-slate-800 text-[9px] text-slate-500 uppercase flex items-center">Manual LP (Hz)</div>
                        <input
                            type="number"
                            step="100"
                            min="20"
                            max="20000"
                            value={(module as any).musicLowpassCutoff ?? 16000}
                            onChange={(e) => onUpdateModule(module.id, { musicLowpassCutoff: parseFloat(e.target.value) })}
                            className="flex-1 bg-transparent border-none px-2 py-1 text-xs text-slate-200 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Prompt Channels */}
            {[0, 1, 2, 3].map(i => (
                <div key={i} className="space-y-2 border-b border-slate-800 pb-2">
                    <div className="text-[10px] text-purple-400 font-bold uppercase">Prompt Channel {i + 1}</div>

                    {/* Text Input */}
                    <div className="space-y-1">
                        <InputSelector
                            label="Text (Dynamic)"
                            value={getInput(module, `prompt_text_${i}`)}
                            onChange={(input) => updateInput(module.id, `prompt_text_${i}`, input)}
                            bodies={bodies}
                            modules={modules}
                            currentModuleId={module.id}
                            allowedTypes={['string', 'module_output']}
                        />
                        <div className="flex bg-slate-900 border border-slate-700 rounded overflow-hidden">
                            <div className="px-2 py-1 bg-slate-800 text-[9px] text-slate-500 uppercase flex items-center">Manual</div>
                            <input
                                type="text"
                                value={(module as any)[`musicPromptText${i}`] || ''}
                                onChange={(e) => onUpdateModule(module.id, { [`musicPromptText${i}`]: e.target.value })}
                                className="flex-1 bg-transparent border-none px-2 py-1 text-xs text-slate-200 outline-none"
                                placeholder={`Prompt ${i + 1} text...`}
                            />
                        </div>
                    </div>

                    {/* Weight Input */}
                    <div className="space-y-1">
                        <InputSelector
                            label="Weight (Dynamic)"
                            value={getInput(module, `prompt_weight_${i}`)}
                            onChange={(input) => updateInput(module.id, `prompt_weight_${i}`, input)}
                            bodies={bodies}
                            modules={modules}
                            currentModuleId={module.id}
                            allowedTypes={['scalar', 'module_output']}
                        />
                        <div className="flex bg-slate-900 border border-slate-700 rounded overflow-hidden">
                            <div className="px-2 py-1 bg-slate-800 text-[9px] text-slate-500 uppercase flex items-center">Manual</div>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="1"
                                value={(module as any)[`musicPromptWeight${i}`] ?? 0}
                                onChange={(e) => onUpdateModule(module.id, { [`musicPromptWeight${i}`]: parseFloat(e.target.value) })}
                                className="flex-1 bg-transparent border-none px-2 py-1 text-xs text-slate-200 outline-none"
                            />
                        </div>
                    </div>
                </div>
            ))}

            {/* Feedback Display */}
            <div className="p-2 bg-slate-950/50 rounded border border-slate-800 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                    <Activity className={`w-3 h-3 ${module.musicPlaying ? 'text-green-400 animate-pulse' : 'text-slate-600'}`} />
                    <span className="text-[10px] text-slate-400">
                        {module.musicPlaying ? 'PLAYING' : 'STOPPED'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Volume2 className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] text-slate-400">
                        Vol: {(module.musicVolume ?? 0).toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default MusicControllerModule;
