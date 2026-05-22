import React from 'react';
import { Body, FlightComputerModule, FlightComputerInput, PhysicsConfig, RendezvousSolution, FlightComputerModuleType } from '../../../types';
import { resolveBooleanInput, resolveScalarInput } from '../../../services/orbitalMath';
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

const ThrustBurstModule: React.FC<ModuleProps> = ({ module, bodies, modules, physicsConfig, rendezvousSolutionMap, onUpdateModule }) => {
    const updateInput = (moduleId: string, key: string, input: FlightComputerInput | undefined) => {
        onUpdateModule(moduleId, getUpdateForInput(module, key, input));
    };

    const burstTriggerInput = getInput(module, 'trigger');
    const burstProgradeInput = getInput(module, 'prograde');
    const burstRadialInput = getInput(module, 'radial');
    const burstDurationInput = getInput(module, 'duration');
    
    const burstTrigger = resolveBooleanInput(burstTriggerInput, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap);
    const burstPrograde = resolveScalarInput(burstProgradeInput, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap) ?? module.thrustBurstDeltaVPrograde ?? 0;
    const burstRadial = resolveScalarInput(burstRadialInput, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap) ?? module.thrustBurstDeltaVRadial ?? 0;
    const burstDuration = resolveScalarInput(burstDurationInput, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap) ?? module.thrustBurstDuration ?? 0;
    
    const progradeSource = burstProgradeInput ? 'input' : undefined;
    const radialSource = burstRadialInput ? 'input' : undefined;
    const durationSource = burstDurationInput ? 'input' : undefined;
    
    const burstReady = !module.thrustBurstActive;
    
    return (
        <div className="mt-2 space-y-2">
            <div className="space-y-1">
                <label className="text-[9px] text-slate-500 uppercase">Mode</label>
                <select
                    value={module.thrustBurstMode || 'impulse'}
                    onChange={(e) => onUpdateModule(module.id, { thrustBurstMode: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none"
                >
                    <option value="impulse">Instant Impulse (ΔV)</option>
                    <option value="force">Sustained Force (Duration)</option>
                </select>
            </div>

            <div className="space-y-1">
                <InputSelector 
                    label="Trigger Input" 
                    value={burstTriggerInput} 
                    onChange={(input) => updateInput(module.id, 'trigger', input)} 
                    bodies={bodies} 
                    modules={modules} 
                    currentModuleId={module.id} 
                    allowedTypes={['boolean', 'module_output']} 
                />
            </div>

            <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-900/40 rounded p-2 border border-slate-800">
                    <div className="text-[9px] text-slate-500 uppercase flex justify-between items-center">
                        <span>ΔV Prograde</span>
                        {progradeSource && <span className="text-[8px] text-purple-300">SRC</span>}
                    </div>
                    <input
                        type="number"
                        step="0.1"
                        value={burstPrograde}
                        disabled={!!progradeSource}
                        onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            onUpdateModule(module.id, { thrustBurstDeltaVPrograde: isNaN(value) ? 0 : value });
                        }}
                        className={`w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none ${progradeSource ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                    <div className="text-[9px] text-slate-500 mt-1">m/s</div>
                </div>
                <div className="bg-slate-900/40 rounded p-2 border border-slate-800">
                    <div className="text-[9px] text-slate-500 uppercase flex justify-between items-center">
                        <span>ΔV Radial</span>
                        {radialSource && <span className="text-[8px] text-purple-300">SRC</span>}
                    </div>
                    <input
                        type="number"
                        step="0.1"
                        value={burstRadial}
                        disabled={!!radialSource}
                        onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            onUpdateModule(module.id, { thrustBurstDeltaVRadial: isNaN(value) ? 0 : value });
                        }}
                        className={`w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none ${radialSource ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                    <div className="text-[9px] text-slate-500 mt-1">m/s</div>
                </div>
                <div className="bg-slate-900/40 rounded p-2 border border-slate-800">
                    <div className="text-[9px] text-slate-500 uppercase flex justify-between items-center">
                        <span>Duration</span>
                        {durationSource && <span className="text-[8px] text-purple-300">SRC</span>}
                    </div>
                    <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={burstDuration}
                        disabled={!!durationSource}
                        onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            onUpdateModule(module.id, { thrustBurstDuration: isNaN(value) ? 0 : value });
                        }}
                        className={`w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none ${durationSource ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                    <div className="text-[9px] text-slate-500 mt-1">seconds</div>
                </div>
            </div>

            <div className={`p-2 rounded border flex flex-col gap-1 ${burstReady ? 'bg-emerald-900/20 border-emerald-500/40' : 'bg-amber-900/20 border-amber-500/40'}`}>
                <div className="flex justify-between items-center text-[10px] uppercase">
                    <span className="text-slate-400">Status</span>
                    <span className={`font-bold ${burstReady ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {burstReady ? 'READY' : 'BURSTING'}
                    </span>
                </div>
                <div className="flex justify-between items-center text-[10px] uppercase">
                    <span className="text-slate-400">Done Output</span>
                    <span className={`font-mono ${burstReady ? 'text-green-200' : 'text-amber-200'}`}>
                        {burstReady ? 'TRUE' : 'FALSE'}
                    </span>
                </div>
            </div>
            <div className="text-[9px] text-slate-500 italic">
                Burst begins when the trigger input rises to TRUE. Force mode applies sustained thrust over the set duration; impulse mode applies ΔV immediately.
            </div>
        </div>
    );
};

export default ThrustBurstModule;
