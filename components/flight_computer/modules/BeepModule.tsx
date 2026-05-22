import React from 'react';
import { Body, FlightComputerModule, FlightComputerInput, PhysicsConfig, RendezvousSolution, FlightComputerModuleType } from '../../../types';
import { resolveBooleanInput } from '../../../services/orbitalMath';
import { getInput, getUpdateForInput } from '../utils';
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

const BeepModule: React.FC<ModuleProps> = ({ module, bodies, modules, physicsConfig, rendezvousSolutionMap, onUpdateModule }) => {
    const updateInput = (moduleId: string, key: string, input: FlightComputerInput | undefined) => {
        onUpdateModule(moduleId, getUpdateForInput(module, key, input));
    };

    const beepInput = getInput(module, 'trigger');
    const beepTriggered = resolveBooleanInput(beepInput, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap);

    return (
        <div className="mt-2 space-y-2">
            <div className="space-y-1">
                <InputSelector
                    label="Trigger (Bool)"
                    value={getInput(module, 'trigger')}
                    onChange={(input) => updateInput(module.id, 'trigger', input)}
                    bodies={bodies}
                    modules={modules}
                    currentModuleId={module.id}
                    allowedTypes={['boolean', 'module_output']}
                />
            </div>
            <div className="space-y-1">
                <label className="text-[9px] text-slate-500 uppercase">Trigger Mode</label>
                <select
                    value={module.beepTriggerMode || 'rising'}
                    onChange={(e) => onUpdateModule(module.id, { beepTriggerMode: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none"
                >
                    <option value="rising">Rising Edge (False -&gt; True)</option>
                    <option value="falling">Falling Edge (True -&gt; False)</option>
                    <option value="continuous">Continuous (While True)</option>
                </select>
            </div>

            <div className="space-y-1">
                <label className="text-[9px] text-slate-500 uppercase">Sound Type</label>
                <select
                    value={module.beepSoundType || 'beep'}
                    onChange={(e) => onUpdateModule(module.id, { beepSoundType: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none"
                >
                    <option value="beep">Simple Beep</option>
                    <option value="speak">Text-to-Speech</option>
                </select>
            </div>

            {module.beepSoundType === 'speak' && (
                <div className="space-y-1">
                    <InputSelector
                        label="Text Input (String)"
                        value={getInput(module, 'text')}
                        onChange={(input) => updateInput(module.id, 'text', input)}
                        bodies={bodies}
                        modules={modules}
                        currentModuleId={module.id}
                        allowedTypes={['string', 'module_output']}
                    />
                    <label className="text-[9px] text-slate-500 uppercase">Fallback Text</label>
                    <input
                        type="text"
                        value={module.beepSpeakText || ''}
                        onChange={(e) => onUpdateModule(module.id, { beepSpeakText: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none"
                        placeholder="e.g. Warning, fuel low"
                    />
                </div>
            )}

            {module.beepSoundType !== 'speak' && (
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase">Pitch (Hz)</label>
                        <input
                            type="number"
                            value={module.beepPitch || 800}
                            onChange={(e) => onUpdateModule(module.id, { beepPitch: parseInt(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none"
                        />
                    </div>
                    {module.beepTriggerMode === 'continuous' && (
                        <div className="space-y-1">
                            <label className="text-[9px] text-slate-500 uppercase">Rate (Hz)</label>
                            <input
                                type="number"
                                value={module.beepRate || 2}
                                onChange={(e) => onUpdateModule(module.id, { beepRate: parseFloat(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none"
                            />
                        </div>
                    )}
                </div>
            )}

            <div className={`p-2 rounded border flex items-center justify-between ${beepTriggered ? 'bg-purple-900/20 border-purple-500/40' : 'bg-slate-800/30 border-slate-700/30'}`}>
                <span className="text-[10px] text-slate-400 uppercase">Input Signal</span>
                <span className={`text-xs font-bold ${beepTriggered ? 'text-purple-400' : 'text-slate-500'}`}>
                    {beepTriggered ? 'HIGH' : 'LOW'}
                </span>
            </div>
        </div>
    );
};

export default BeepModule;
