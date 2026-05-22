import React from 'react';
import { Body, FlightComputerModule, FlightComputerInput, PhysicsConfig, RendezvousSolution } from '../../../types';
import { calculateDistance, resolveInput } from '../../../services/orbitalMath';
import { getInput } from '../utils';

interface ModuleProps {
    module: FlightComputerModule;
    bodies: Body[];
    modules: FlightComputerModule[];
    physicsConfig: PhysicsConfig;
    rendezvousSolutionMap: Record<string, RendezvousSolution>;
}

const TrackDistanceModule: React.FC<ModuleProps> = ({ module, bodies, modules, physicsConfig, rendezvousSolutionMap }) => {
    const dPrimaryInput = getInput(module, 'primary');
    const dTargetInput = getInput(module, 'target');

    const resolveVectorInputValue = (input?: FlightComputerInput) =>
        resolveInput(input, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap);
    
    const dPrimary = resolveVectorInputValue(dPrimaryInput);
    const dTarget = resolveVectorInputValue(dTargetInput);
    
    if (!dPrimary || !dTarget) return <div className="text-xs text-slate-500 italic">Select Objects</div>;
    
    const distance = calculateDistance(dPrimary, dTarget);
    
    return (
        <div className="mt-2">
            <div className="bg-slate-800/50 p-1.5 rounded flex justify-between items-center">
                <div className="text-[9px] text-slate-500 uppercase">Distance</div>
                <div className="text-xs text-emerald-300 font-mono">{distance.toFixed(1)} u</div>
            </div>
        </div>
    );
};

export default TrackDistanceModule;
