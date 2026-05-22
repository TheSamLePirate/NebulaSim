import React from 'react';
import { Body, FlightComputerModule, FlightComputerInput, PhysicsConfig, RendezvousSolution, FlightComputerModuleType } from '../../../types';
import { resolveStringInput } from '../../../services/orbitalMath';
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

const BodyByModule: React.FC<ModuleProps> = ({ module, bodies, modules, physicsConfig, rendezvousSolutionMap, onUpdateModule }) => {
    const updateInput = (moduleId: string, key: string, input: FlightComputerInput | undefined) => {
        onUpdateModule(moduleId, getUpdateForInput(module, key, input));
    };

    const bodyByMode = module.bodyByMode || 'id';
    const bodyByInput = getInput(module, 'value');
    const bodyByDirectValue = module.bodyByValue || '';
    
    // Resolve the value either from input or direct entry
    let searchValue = '';
    if (bodyByInput) {
        const resolvedValue = resolveStringInput(bodyByInput, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap);
        searchValue = resolvedValue || '';
    } else {
        searchValue = bodyByDirectValue;
    }
    
    const foundBody = bodyByMode === 'id' 
        ? bodies.find(b => b.id === searchValue)
        : bodies.find(b => b.name.toLowerCase() === searchValue.toLowerCase());
    
    return (
        <div className="mt-2 space-y-2">
            <div className="space-y-1">
                <label className="text-xs text-slate-400">Mode</label>
                <select
                    value={bodyByMode}
                    onChange={(e) => onUpdateModule(module.id, { bodyByMode: e.target.value as 'id' | 'name' })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none"
                >
                    <option value="id">By ID</option>
                    <option value="name">By Name</option>
                </select>
            </div>
            
            <div className="space-y-1">
                <label className="text-xs text-slate-400">
                    {bodyByMode === 'id' ? 'Body ID' : 'Body Name'}
                </label>
                {bodyByInput ? (
                    <div className="flex gap-1">
                        <InputSelector label="" value={bodyByInput} onChange={(input) => updateInput(module.id, 'value', input)} bodies={bodies} modules={modules} currentModuleId={module.id} allowedTypes={['string', 'module_output']} />
                        <button onClick={() => updateInput(module.id, 'value', undefined)} className="px-2 bg-red-600/20 border border-red-500/50 rounded text-xs text-red-400 hover:bg-red-600/30">✕</button>
                    </div>
                ) : (
                    <div className="flex gap-1">
                        <input
                            type="text"
                            value={bodyByDirectValue}
                            onChange={(e) => onUpdateModule(module.id, { bodyByValue: e.target.value })}
                            placeholder={bodyByMode === 'id' ? 'Enter body ID...' : 'Enter body name...'}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none"
                        />
                        <button onClick={() => updateInput(module.id, 'value', { type: 'module_output', value: '' })} className="px-2 bg-purple-600/20 border border-purple-500/50 rounded text-xs text-purple-400 hover:bg-purple-600/30">🔗</button>
                    </div>
                )}
            </div>
            
            {foundBody ? (
                <div className="pt-2 border-t border-slate-700/50 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-green-400">✓</span>
                        <span className="text-slate-200">Found: <span className="font-bold">{foundBody.name}</span></span>
                    </div>
                </div>
            ) : searchValue ? (
                <div className="pt-2 border-t border-slate-700/50 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-red-400">✗</span>
                        <span className="text-slate-400">No body found</span>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default BodyByModule;
