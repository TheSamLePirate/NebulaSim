import React from 'react';
import { Body, FlightComputerModule, FlightComputerInput, PhysicsConfig, RendezvousSolution, FlightComputerModuleType } from '../../../types';
import { calculateOrbitInfo, resolveInput } from '../../../services/orbitalMath';
import { getInput, formatTime } from '../utils';
import { Navigation } from 'lucide-react';

interface ModuleProps {
    module: FlightComputerModule;
    bodies: Body[];
    modules: FlightComputerModule[];
    physicsConfig: PhysicsConfig;
    rendezvousSolutionMap: Record<string, RendezvousSolution>;
    onUpdateModule: (id: string, updates: Partial<FlightComputerModule>) => void;
    onAddModule: (type: FlightComputerModuleType, inputs?: Record<string, FlightComputerInput>) => void;
}

const OrbitInfoModule: React.FC<ModuleProps> = ({ module, bodies, modules, physicsConfig, rendezvousSolutionMap, onAddModule }) => {
    const primaryInput = getInput(module, 'primary');
    const referenceInput = getInput(module, 'reference');

    const resolveVectorInputValue = (input?: FlightComputerInput) =>
        resolveInput(input, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap);

    const primary = resolveVectorInputValue(primaryInput);
    const reference = resolveVectorInputValue(referenceInput);

    // For orbit info, reference MUST be a body (need mass)
    if (!primary || !reference || !('mass' in reference)) return <div className="text-xs text-slate-500 italic">Invalid Selection</div>;

    const orbitData = calculateOrbitInfo(primary, reference as Body, physicsConfig.gravitationalConstant);
    if (!orbitData) return <div className="text-xs text-slate-500 italic">Calculation Failed</div>;

    return (
        <div className="space-y-2 mt-2">
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800/50 p-1.5 rounded">
                    <div className="text-[9px] text-slate-500 uppercase">Altitude</div>
                    <div className="text-xs text-cyan-300 font-mono">{orbitData.altitude.toFixed(1)} u</div>
                </div>
                <div className="bg-slate-800/50 p-1.5 rounded">
                    <div className="text-[9px] text-slate-500 uppercase">Period</div>
                    <div className="text-xs text-white font-mono">{orbitData.isBound ? formatTime(orbitData.period) : 'N/A'}</div>
                </div>
                {orbitData.isBound && (
                    <>
                        <div className="bg-slate-800/50 p-1.5 rounded group relative">
                            <div className="text-[9px] text-slate-500 uppercase flex justify-between">
                                Apoapsis
                                <button
                                    onClick={() => onAddModule('rendezvous_tracker', {
                                        primary: { type: 'body', value: bodies.find(b => b.isRocket)?.id || '' },
                                        target: { type: 'module_output', value: `${module.id}:pa_point`, label: `${module.name || 'Orbit'} Pa` }
                                    })}
                                    className="opacity-0 group-hover:opacity-100 text-purple-400 hover:text-purple-300 transition-opacity"
                                    title="Track Rendezvous to Apoapsis"
                                >
                                    <Navigation size={10} />
                                </button>
                            </div>
                            <div className="text-xs text-orange-300 font-mono">{orbitData.apoapsis.toFixed(1)} u</div>
                        </div>
                        <div className="bg-slate-800/50 p-1.5 rounded group relative">
                            <div className="text-[9px] text-slate-500 uppercase flex justify-between">
                                Periapsis
                                <button
                                    onClick={() => onAddModule('rendezvous_tracker', {
                                        primary: { type: 'body', value: bodies.find(b => b.isRocket)?.id || '' },
                                        target: { type: 'module_output', value: `${module.id}:pe_point`, label: `${module.name || 'Orbit'} Pe` }
                                    })}
                                    className="opacity-0 group-hover:opacity-100 text-purple-400 hover:text-purple-300 transition-opacity"
                                    title="Track Rendezvous to Periapsis"
                                >
                                    <Navigation size={10} />
                                </button>
                            </div>
                            <div className="text-xs text-blue-300 font-mono">{orbitData.periapsis.toFixed(1)} u</div>
                        </div>
                        <div className="bg-slate-800/50 p-1.5 rounded group relative">
                            <div className="text-[9px] text-slate-500 uppercase flex justify-between">
                                Eccentricity
                            </div>
                            <div className="text-xs text-blue-300 font-mono">{orbitData.eccentricity.toFixed(2)}</div>
                        </div>
                    </>
                )}
                {!orbitData.isBound && (
                    <div className="col-span-2 text-[10px] text-slate-400 italic text-center">Unbound Trajectory</div>
                )}
            </div>
        </div>
    );
};

export default OrbitInfoModule;
