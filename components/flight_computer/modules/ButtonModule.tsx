import React from 'react';
import { Body, FlightComputerModule, FlightComputerInput, PhysicsConfig, RendezvousSolution, FlightComputerModuleType } from '../../../types';
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

const ButtonModule: React.FC<ModuleProps> = ({ module, bodies, modules, onUpdateModule }) => {
    const updateInput = (moduleId: string, key: string, input: FlightComputerInput | undefined) => {
        onUpdateModule(moduleId, getUpdateForInput(module, key, input));
    };

    const buttonState = module.buttonState ?? false;
    
    return (
        <div className="mt-2">
            <div className="flex gap-2 mb-2">
                <button
                    onClick={() => onUpdateModule(module.id, { buttonState: true })}
                    className={`flex-1 py-2 text-xs font-bold rounded border transition-all ${buttonState ? 'bg-green-600 border-green-400 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'}`}
                >
                    TRUE
                </button>
                <button
                    onClick={() => onUpdateModule(module.id, { buttonState: false })}
                    className={`flex-1 py-2 text-xs font-bold rounded border transition-all ${!buttonState ? 'bg-red-600 border-red-400 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'}`}
                >
                    FALSE
                </button>
            </div>
            <div className="space-y-1">
                <InputSelector 
                    label="Reset (Set False)" 
                    value={getInput(module, 'reset')} 
                    onChange={(input) => updateInput(module.id, 'reset', input)} 
                    bodies={bodies} 
                    modules={modules} 
                    currentModuleId={module.id} 
                    allowedTypes={['boolean']} 
                />
            </div>
        </div>
    );
};

export default ButtonModule;
