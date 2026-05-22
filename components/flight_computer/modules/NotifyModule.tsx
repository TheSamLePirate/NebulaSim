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

const NotifyModule: React.FC<ModuleProps> = ({ module, bodies, modules, physicsConfig, rendezvousSolutionMap, onUpdateModule }) => {
    const updateInput = (moduleId: string, key: string, input: FlightComputerInput | undefined) => {
        onUpdateModule(moduleId, getUpdateForInput(module, key, input));
    };

    const notifyInput = getInput(module, 'primary');
    const notifyTriggered = resolveBooleanInput(notifyInput, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap);

    const nInput = getInput(module, 'inputA'); // Source
    const currentValue = resolveScalarInput(nInput, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap);

    const operator = module.comparisonOperator || '>';
    const threshold = module.comparisonValue || 0;

    let triggered = false;
    if (currentValue !== null) {
        switch (operator) {
            case '>': triggered = currentValue > threshold; break;
            case '<': triggered = currentValue < threshold; break;
            case '=': triggered = Math.abs(currentValue - threshold) < 0.1; break; // Epsilon for float equality
            case '>=': triggered = currentValue >= threshold; break;
            case '<=': triggered = currentValue <= threshold; break;
        }
    }

    const result = triggered;


    return (
        <div className="mt-2 space-y-2">
            <div className="flex gap-2 items-center">
                <InputSelector
                    label=""
                    value={nInput}
                    onChange={(input) => updateInput(module.id, 'inputA', input)}
                    bodies={bodies}
                    modules={modules}
                    currentModuleId={module.id}
                    allowedTypes={['scalar', 'module_output']}
                />
                <select
                    value={operator}
                    onChange={(e) => onUpdateModule(module.id, { comparisonOperator: e.target.value as any })}
                    className="bg-slate-900 border border-slate-700 rounded px-1 py-1 text-xs text-slate-300 outline-none w-12"
                >
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value="=">=</option>
                    <option value=">=">&ge;</option>
                    <option value="<=">&le;</option>
                </select>
                <input
                    type="number"
                    value={threshold}
                    onChange={(e) => onUpdateModule(module.id, { comparisonValue: parseFloat(e.target.value) })}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 outline-none flex-1"
                    placeholder="Value"
                />
            </div>

            <div className={`p-2 rounded border ${triggered ? 'bg-red-900/50 border-red-500 animate-pulse' : 'bg-slate-800/50 border-slate-700'}`}>
                <div className="flex justify-between items-center">
                    <span className="text-[9px] text-slate-500 uppercase">Current</span>
                    <span className={`text-xs font-mono ${triggered ? 'text-red-300 font-bold' : 'text-slate-300'}`}>
                        {currentValue !== null ? currentValue.toFixed(2) : '---'}
                    </span>
                </div>
                {triggered && (
                    <div className="text-[10px] text-red-400 font-bold text-center mt-1 uppercase tracking-wider">
                        ALERT TRIGGERED
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotifyModule;
