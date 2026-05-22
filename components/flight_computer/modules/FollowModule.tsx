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
    isFollowing?: boolean;
}

const FollowModule: React.FC<ModuleProps> = ({ module, bodies, modules, onUpdateModule, isFollowing }) => {
    const updateInput = (moduleId: string, key: string, input: FlightComputerInput | undefined) => {
        onUpdateModule(moduleId, getUpdateForInput(module, key, input));
    };

    const targetInput = getInput(module, 'target');

    return (
        <div className="mt-2 space-y-2">
            <div className="space-y-1">
                <InputSelector 
                    label="Target Body/Ship" 
                    value={targetInput} 
                    onChange={(input) => updateInput(module.id, 'target', input)} 
                    bodies={bodies} 
                    modules={modules} 
                    currentModuleId={module.id} 
                    allowedTypes={['body', 'module_output']} 
                />
            </div>

            <div className={`p-2 rounded border ${isFollowing ? 'bg-green-900/20 border-green-500/40' : 'bg-slate-800/30 border-slate-700/30'}`}>
                <div className="flex justify-between items-center text-[10px] uppercase">
                    <span className="text-slate-400">Camera Status</span>
                    <span className={`font-bold ${isFollowing ? 'text-green-400' : 'text-slate-500'}`}>
                        {isFollowing ? 'FOLLOWING' : 'IDLE'}
                    </span>
                </div>
            </div>

            <div className="text-[9px] text-slate-500 italic">
                When this module is active, the camera will follow the selected body/ship.
            </div>
        </div>
    );
};

export default FollowModule;
