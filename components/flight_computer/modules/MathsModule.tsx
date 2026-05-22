import React from 'react';
import { Body, FlightComputerModule, FlightComputerInput, PhysicsConfig, RendezvousSolution, FlightComputerModuleType } from '../../../types';
import { resolveScalarInput } from '../../../services/orbitalMath';
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

const MathsModule: React.FC<ModuleProps> = ({ module, bodies, modules, physicsConfig, rendezvousSolutionMap, onUpdateModule }) => {
    const updateInput = (moduleId: string, key: string, input: FlightComputerInput | undefined) => {
        onUpdateModule(moduleId, getUpdateForInput(module, key, input));
    };

    const mathResult = resolveScalarInput({ type: 'module_output', value: `${module.id}:result` }, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap);
    const displayResult = typeof mathResult === 'number' ? mathResult : 0;
    const mathInputA = getInput(module, 'valueA');
    const mathInputB = getInput(module, 'valueB');
    
    return (
        <div className="mt-2 space-y-2">
            <div className="space-y-1">
                <label className="text-xs text-slate-400">Value A</label>
                {mathInputA ? (
                    <div className="flex gap-1">
                        <InputSelector label="" value={mathInputA} onChange={(input) => updateInput(module.id, 'valueA', input)} bodies={bodies} modules={modules} currentModuleId={module.id} allowedTypes={['scalar', 'module_output']} />
                        <button onClick={() => updateInput(module.id, 'valueA', undefined)} className="px-2 bg-red-600/20 border border-red-500/50 rounded text-xs text-red-400 hover:bg-red-600/30">✕</button>
                    </div>
                ) : (
                    <div className="flex gap-1">
                        <input
                            type="number"
                            value={module.mathValueA ?? 0}
                            onChange={(e) => onUpdateModule(module.id, { mathValueA: parseFloat(e.target.value) || 0 })}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none"
                        />
                        <button onClick={() => updateInput(module.id, 'valueA', { type: 'module_output', value: '' })} className="px-2 bg-purple-600/20 border border-purple-500/50 rounded text-xs text-purple-400 hover:bg-purple-600/30">🔗</button>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2">
                <select
                    value={module.mathOperator || 'add'}
                    onChange={(e) => onUpdateModule(module.id, { mathOperator: e.target.value as any })}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none"
                >
                    <option value="add">Add (+)</option>
                    <option value="subtract">Subtract (-)</option>
                    <option value="multiply">Multiply (*)</option>
                    <option value="divide">Divide (/)</option>
                </select>
            </div>
            <div className="space-y-1">
                <label className="text-xs text-slate-400">Value B</label>
                {mathInputB ? (
                    <div className="flex gap-1">
                        <InputSelector label="" value={mathInputB} onChange={(input) => updateInput(module.id, 'valueB', input)} bodies={bodies} modules={modules} currentModuleId={module.id} allowedTypes={['scalar', 'module_output']} />
                        <button onClick={() => updateInput(module.id, 'valueB', undefined)} className="px-2 bg-red-600/20 border border-red-500/50 rounded text-xs text-red-400 hover:bg-red-600/30">✕</button>
                    </div>
                ) : (
                    <div className="flex gap-1">
                        <input
                            type="number"
                            value={module.mathValueB ?? 0}
                            onChange={(e) => onUpdateModule(module.id, { mathValueB: parseFloat(e.target.value) || 0 })}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none"
                        />
                        <button onClick={() => updateInput(module.id, 'valueB', { type: 'module_output', value: '' })} className="px-2 bg-purple-600/20 border border-purple-500/50 rounded text-xs text-purple-400 hover:bg-purple-600/30">🔗</button>
                    </div>
                )}
            </div>
            <div className="pt-1 border-t border-slate-700/50 flex justify-between items-center">
                <span className="text-xs text-slate-400">Result:</span>
                <span className="text-sm font-mono font-bold text-purple-400">{displayResult.toFixed(2)}</span>
            </div>
        </div>
    );
};

export default MathsModule;
