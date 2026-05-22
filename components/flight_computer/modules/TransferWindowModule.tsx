import React from 'react';
import { Body, FlightComputerModule, FlightComputerInput, PhysicsConfig, RendezvousSolution, FlightComputerModuleType } from '../../../types';
import { calculateTransferInfo, resolveInput } from '../../../services/orbitalMath';
import { getInput } from '../utils';
import { Timer } from 'lucide-react';

interface ModuleProps {
    module: FlightComputerModule;
    bodies: Body[];
    modules: FlightComputerModule[];
    physicsConfig: PhysicsConfig;
    rendezvousSolutionMap: Record<string, RendezvousSolution>;
    onUpdateModule: (id: string, updates: Partial<FlightComputerModule>) => void;
    onAddModule: (type: FlightComputerModuleType, inputs?: Record<string, FlightComputerInput>) => void;
}

const TransferWindowModule: React.FC<ModuleProps> = ({ module, bodies, modules, physicsConfig, rendezvousSolutionMap }) => {
    const tPrimaryInput = getInput(module, 'primary');
    const tReferenceInput = getInput(module, 'reference');
    const tTargetInput = getInput(module, 'target');

    const resolveVectorInputValue = (input?: FlightComputerInput) =>
        resolveInput(input, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap);

    const tPrimary = resolveVectorInputValue(tPrimaryInput);
    const tReference = resolveVectorInputValue(tReferenceInput);
    const tTarget = resolveVectorInputValue(tTargetInput);

    if (!tPrimary || !tReference || !tTarget || !('mass' in tPrimary) || !('mass' in tReference) || !('mass' in tTarget)) {
            return <div className="text-xs text-slate-500 italic">Select Bodies for Transfer</div>;
    }

    const transferData = calculateTransferInfo(tPrimary as Body, tReference as Body, tTarget as Body, physicsConfig.gravitationalConstant);

    return (
        <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                <div className="text-[9px] text-slate-500 uppercase flex items-center gap-1"><Timer size={10} /> Phase Angle</div>
                {transferData.ready ? (
                    <div className="text-[9px] bg-green-500 text-black px-1 rounded font-bold animate-pulse">WINDOW OPEN</div>
                ) : (
                    <div className="text-[9px] text-slate-600">Wait...</div>
                )}
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
                        <div 
                        className={`absolute top-0 bottom-0 w-1/5 left-1/2 -translate-x-1/2 ${transferData.ready ? 'bg-green-500/20' : 'bg-slate-700'}`} 
                        />
                        <div 
                        className={`absolute top-0 bottom-0 w-1 ${transferData.ready ? 'bg-green-500' : 'bg-orange-500'}`}
                        style={{ left: `${Math.min(100, Math.max(0, 50 + (transferData.error)))}%` }}
                        />
                    </div>
                    <div className="text-[9px] font-mono w-8 text-right text-slate-400">
                        {transferData.error.toFixed(0)}°
                    </div>
                    <div className="text-[9px] font-mono w-8 text-right text-slate-400">
                        {transferData.waitTime.toFixed(0)}s
                    </div>
                    <div className="text-[9px] font-mono w-8 text-right text-slate-400">
                        {transferData.transferTime.toFixed(0)}s
                    </div>
                    <div className="text-[9px] font-mono w-8 text-right text-slate-400">
                        {transferData.arrivalTime.toFixed(0)}s
                    </div>
                </div>
        </div>
        );
};

export default TransferWindowModule;
