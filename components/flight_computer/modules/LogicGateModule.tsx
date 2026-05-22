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

const LogicGateModule: React.FC<ModuleProps> = ({ module, bodies, modules, physicsConfig, rendezvousSolutionMap, onUpdateModule }) => {
    const updateInput = (moduleId: string, key: string, input: FlightComputerInput | undefined) => {
        onUpdateModule(moduleId, getUpdateForInput(module, key, input));
    };

    const inputA = getInput(module, 'inputA');
    const inputB = getInput(module, 'inputB');
    const valA = resolveBooleanInput(inputA, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap);
    const valB = resolveBooleanInput(inputB, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap);
    
    let result = false;
    const op = module.logicOperator || 'AND';
    if (op === 'AND') result = (valA ?? false) && (valB ?? false);
    if (op === 'OR') result = (valA ?? false) || (valB ?? false);
    if (op === 'XOR') result = (valA ?? false) !== (valB ?? false);
    if (op === 'NAND') result = !((valA ?? false) && (valB ?? false));
    if (op === 'NOR') result = !((valA ?? false) || (valB ?? false));
    if (op === 'NOT') result = !(valA ?? false);
    
    return (
        <div className="mt-2 space-y-2">
            <div className="space-y-1">
                <label className="text-[9px] text-slate-500 uppercase">Input A</label>
                <div className="flex gap-1">
                    <InputSelector 
                        label="" 
                        value={inputA} 
                        onChange={(input) => updateInput(module.id, 'inputA', input)} 
                        bodies={bodies} 
                        modules={modules} 
                        currentModuleId={module.id} 
                        allowedTypes={['boolean', 'module_output']} 
                    />
                    <div className={`w-6 flex items-center justify-center rounded border ${valA ? 'bg-green-900/30 border-green-500/30 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                        <span className="text-[10px] font-mono">{valA ? '1' : '0'}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                <select
                    value={op}
                    onChange={(e) => onUpdateModule(module.id, { logicOperator: e.target.value as any })}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none font-bold text-center"
                >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                    <option value="XOR">XOR</option>
                    <option value="NAND">NAND</option>
                    <option value="NOR">NOR</option>
                    <option value="NOT">NOT (A only)</option>
                </select>
            </div>
            
            {op !== 'NOT' && (
                <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase">Input B</label>
                    <div className="flex gap-1">
                        <InputSelector 
                            label="" 
                            value={inputB} 
                            onChange={(input) => updateInput(module.id, 'inputB', input)} 
                            bodies={bodies} 
                            modules={modules} 
                            currentModuleId={module.id} 
                            allowedTypes={['boolean', 'module_output']} 
                        />
                        <div className={`w-6 flex items-center justify-center rounded border ${valB ? 'bg-green-900/30 border-green-500/30 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                            <span className="text-[10px] font-mono">{valB ? '1' : '0'}</span>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="pt-2 border-t border-slate-700/50 flex justify-between items-center">
                <span className="text-[10px] text-slate-400 uppercase">Output</span>
                <span className={`text-sm font-mono font-bold ${result ? 'text-green-400' : 'text-slate-500'}`}>
                    {result ? 'TRUE' : 'FALSE'}
                </span>
            </div>
        </div>
    );
};

export default LogicGateModule;
