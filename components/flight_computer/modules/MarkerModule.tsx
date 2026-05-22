import React from 'react';
import { Body, FlightComputerModule, FlightComputerInput, PhysicsConfig, RendezvousSolution, FlightComputerModuleType, MarkerShape } from '../../../types';
import { getInput, getUpdateForInput, MARKER_SHAPE_OPTIONS } from '../utils';
import InputSelector from '../InputSelector';

interface ModuleProps {
    module: FlightComputerModule;
    bodies: Body[];
    modules: FlightComputerModule[];
    physicsConfig: PhysicsConfig;
    rendezvousSolutionMap: Record<string, RendezvousSolution>;
    onUpdateModule: (id: string, updates: Partial<FlightComputerModule>) => void;
    onAddModule: (type: FlightComputerModuleType, inputs?: Record<string, FlightComputerInput>) => void;
}

const MarkerModule: React.FC<ModuleProps> = ({ module, bodies, modules, onUpdateModule }) => {
    const updateInput = (moduleId: string, key: string, input: FlightComputerInput | undefined) => {
        onUpdateModule(moduleId, getUpdateForInput(module, key, input));
    };

    const markerTitleInput = getInput(module, 'marker_title');
    const markerDescriptionInput = getInput(module, 'marker_description');
    const markerColorInput = getInput(module, 'marker_color');
    const markerVisibleInput = getInput(module, 'marker_visible');
    const markerPulseInput = getInput(module, 'marker_pulse');

    const markerTitle = module.markerTitle ?? module.name ?? 'Marker';
    const markerDescription = module.markerDescription ?? '';
    const markerColorValue = module.markerColor || module.color || '#a855f7';

    return (
        <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase">Title</label>
                    {markerTitleInput ? (
                        <div className="flex gap-1">
                            <InputSelector 
                                label=""
                                value={markerTitleInput}
                                onChange={(input) => updateInput(module.id, 'marker_title', input)}
                                bodies={bodies}
                                modules={modules}
                                currentModuleId={module.id}
                                allowedTypes={['string', 'module_output']}
                            />
                            <button onClick={() => updateInput(module.id, 'marker_title', undefined)} className="px-2 bg-red-600/20 border border-red-500/50 rounded text-xs text-red-400 hover:bg-red-600/30">✕</button>
                        </div>
                    ) : (
                        <div className="flex gap-1">
                            <input
                                type="text"
                                value={markerTitle}
                                onChange={(e) => onUpdateModule(module.id, { markerTitle: e.target.value })}
                                className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none"
                            />
                            <button onClick={() => updateInput(module.id, 'marker_title', { type: 'module_output', value: '' })} className="px-2 bg-purple-600/20 border border-purple-500/50 rounded text-xs text-purple-400 hover:bg-purple-600/30">🔗</button>
                        </div>
                    )}
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase">Shape</label>
                    <select
                        value={module.markerShape || 'ring'}
                        onChange={(e) => onUpdateModule(module.id, { markerShape: e.target.value as MarkerShape })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none"
                    >
                        {MARKER_SHAPE_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[9px] text-slate-500 uppercase">Description</label>
                {markerDescriptionInput ? (
                    <div className="flex gap-1">
                        <InputSelector 
                            label=""
                            value={markerDescriptionInput}
                            onChange={(input) => updateInput(module.id, 'marker_description', input)}
                            bodies={bodies}
                            modules={modules}
                            currentModuleId={module.id}
                            allowedTypes={['string', 'module_output']}
                        />
                        <button onClick={() => updateInput(module.id, 'marker_description', undefined)} className="px-2 bg-red-600/20 border border-red-500/50 rounded text-xs text-red-400 hover:bg-red-600/30">✕</button>
                    </div>
                ) : (
                    <div className="flex gap-1">
                        <textarea
                            value={markerDescription}
                            onChange={(e) => onUpdateModule(module.id, { markerDescription: e.target.value })}
                            rows={2}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none resize-y"
                        />
                        <button onClick={() => updateInput(module.id, 'marker_description', { type: 'module_output', value: '' })} className="px-2 bg-purple-600/20 border border-purple-500/50 rounded text-xs text-purple-400 hover:bg-purple-600/30">🔗</button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase">Marker Color</label>
                    {markerColorInput ? (
                        <div className="flex gap-1">
                            <InputSelector 
                                label=""
                                value={markerColorInput}
                                onChange={(input) => updateInput(module.id, 'marker_color', input)}
                                bodies={bodies}
                                modules={modules}
                                currentModuleId={module.id}
                                allowedTypes={['string', 'module_output']}
                            />
                            <button onClick={() => updateInput(module.id, 'marker_color', undefined)} className="px-2 bg-red-600/20 border border-red-500/50 rounded text-xs text-red-400 hover:bg-red-600/30">✕</button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={markerColorValue}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    onUpdateModule(module.id, { markerColor: value, color: value });
                                }}
                                className="w-10 h-8 rounded border border-slate-700/50 bg-slate-900/50"
                            />
                            <button onClick={() => updateInput(module.id, 'marker_color', { type: 'module_output', value: '' })} className="px-2 bg-purple-600/20 border border-purple-500/50 rounded text-xs text-purple-400 hover:bg-purple-600/30">🔗</button>
                        </div>
                    )}
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase">Pulse Control</label>
                    <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Pulse</span>
                        <button
                            onClick={() => onUpdateModule(module.id, { markerPulse: !(module.markerPulse ?? false) })}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${module.markerPulse ? 'bg-purple-600/30 text-purple-200' : 'bg-slate-800 text-slate-400'}`}
                        >
                            {module.markerPulse ? 'ON' : 'OFF'}
                        </button>
                    </div>
                    <InputSelector 
                        label=""
                        value={markerPulseInput}
                        onChange={(input) => updateInput(module.id, 'marker_pulse', input)}
                        bodies={bodies}
                        modules={modules}
                        currentModuleId={module.id}
                        allowedTypes={['boolean']}
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[9px] text-slate-500 uppercase">Visibility</label>
                <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Active</span>
                    <button
                        onClick={() => onUpdateModule(module.id, { markerVisible: !(module.markerVisible ?? true) })}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${(module.markerVisible ?? true) ? 'bg-green-600/30 text-green-200' : 'bg-slate-800 text-slate-400'}`}
                    >
                        {(module.markerVisible ?? true) ? 'ON' : 'OFF'}
                    </button>
                </div>
                <InputSelector 
                    label=""
                    value={markerVisibleInput}
                    onChange={(input) => updateInput(module.id, 'marker_visible', input)}
                    bodies={bodies}
                    modules={modules}
                    currentModuleId={module.id}
                    allowedTypes={['boolean']}
                />
            </div>

            <div className="text-[9px] text-slate-500 italic">
                Send any body, ship, or vector into the marker input to visualize custom points. Titles, descriptions, colors, visibility, and pulsing can all be automated via module outputs.
            </div>
        </div>
    );
};

export default MarkerModule;
