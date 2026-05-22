import React from 'react';
import { Body, FlightComputerModule, FlightComputerInput, PhysicsConfig, RendezvousSolution } from '../../../types';
import { calculateRelativeSpeed, resolveInput } from '../../../services/orbitalMath';
import { getInput } from '../utils';

interface ModuleProps {
    module: FlightComputerModule;
    bodies: Body[];
    modules: FlightComputerModule[];
    physicsConfig: PhysicsConfig;
    rendezvousSolutionMap: Record<string, RendezvousSolution>;
}

const TrackVelocityModule: React.FC<ModuleProps> = ({ module, bodies, modules, physicsConfig, rendezvousSolutionMap }) => {
    const vPrimaryInput = getInput(module, 'primary');
    const vTargetInput = getInput(module, 'target');

    const resolveVectorInputValue = (input?: FlightComputerInput) =>
        resolveInput(input, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap);
    
    const vPrimary = resolveVectorInputValue(vPrimaryInput);
    const vTarget = resolveVectorInputValue(vTargetInput);
    
    if (!vPrimary || !vTarget) return <div className="text-xs text-slate-500 italic">Select Objects</div>;
    
    const speed = calculateRelativeSpeed(vPrimary, vTarget);
    
    return (
        <div className="mt-2">
            <div className="bg-slate-800/50 p-1.5 rounded flex justify-between items-center">
                <div className="text-[9px] text-slate-500 uppercase">Rel. Speed</div>
                <div className="text-xs text-yellow-300 font-mono">{speed.toFixed(1)} m/s</div>
            </div>
        </div>
    );
};

export default TrackVelocityModule;
