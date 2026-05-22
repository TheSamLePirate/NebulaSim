import React from 'react';
import { Body, FlightComputerModule, FlightComputerInput, PhysicsConfig, RendezvousSolution, FlightComputerModuleType } from '../../../types';
import { getInput, formatRendezvousTime } from '../utils';
import { Navigation } from 'lucide-react';

interface ModuleProps {
    module: FlightComputerModule;
    bodies: Body[];
    modules: FlightComputerModule[];
    physicsConfig: PhysicsConfig;
    rendezvousPoints?: RendezvousSolution[];
    onUpdateModule: (id: string, updates: Partial<FlightComputerModule>) => void;
    onAddModule: (type: FlightComputerModuleType, inputs?: Record<string, FlightComputerInput>) => void;
}

const RendezvousTrackerModule: React.FC<ModuleProps> = ({ module, bodies, modules, rendezvousPoints, onUpdateModule }) => {
    const rocketInput = getInput(module, 'primary');
    const targetInput = getInput(module, 'target');
    const rendezvousData = rendezvousPoints?.find(rdv => rdv.moduleId === module.id);
    
    if (!rocketInput || !targetInput) {
        return <div className="text-xs text-slate-500 italic">Select Rocket & Target</div>;
    }
    
    return (
        <div className="mt-2 space-y-2">
            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Tracker Name</label>
                    <input 
                        type="text"
                        value={module.name || 'Rendezvous'}
                        onChange={(e) => onUpdateModule(module.id, { name: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-200 focus:border-purple-500 outline-none"
                        placeholder="e.g., Apollo 11"
                    />
                </div>
                <div className="w-20">
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Color</label>
                    <input 
                        type="color"
                        value={module.color}
                        onChange={(e) => onUpdateModule(module.id, { color: e.target.value })}
                        className="w-full h-7 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                    />
                </div>
            </div>
            <div>
                <label className="text-[9px] text-slate-500 uppercase block mb-1">Max Distance (units)</label>
                <input 
                    type="number"
                    value={module.maxDistance || 10}
                    onChange={(e) => onUpdateModule(module.id, { maxDistance: parseFloat(e.target.value) })}
                    step="1"
                    min="1"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none"
                />
            </div>
            
            {/* Rendezvous Info Display */}
            {rendezvousData ? (
                <div className="bg-green-900/20 border border-green-500/30 rounded p-2 space-y-1">
                    <div className="text-[9px] text-green-400 uppercase font-bold flex items-center gap-1">
                        <Navigation size={10} /> Rendezvous Found!
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="bg-slate-800/50 p-1.5 rounded">
                            <div className="text-[9px] text-slate-500 uppercase">Time</div>
                            <div className="text-[10px] text-cyan-300 font-mono">{formatRendezvousTime(rendezvousData.timeToRendezvous)}</div>
                        </div>
                        <div className="bg-slate-800/50 p-1.5 rounded">
                            <div className="text-[9px] text-slate-500 uppercase">Seconds</div>
                            <div className="text-[10px] text-white font-mono">{rendezvousData.timeToRendezvous.toFixed(1)}s</div>
                        </div>
                        <div className="bg-slate-800/50 p-1.5 rounded">
                            <div className="text-[9px] text-slate-500 uppercase">Distance</div>
                            <div className="text-[10px] text-emerald-300 font-mono">{rendezvousData.distance.toFixed(2)} u</div>
                        </div>
                        <div className="bg-slate-800/50 p-1.5 rounded">
                            <div className="text-[9px] text-slate-500 uppercase">Total ΔV</div>
                            <div className="text-[10px] text-yellow-300 font-mono">{rendezvousData.totalDeltaV.toFixed(1)} m/s</div>
                        </div>
                        <div className="bg-slate-800/50 p-1.5 rounded">
                            <div className="text-[9px] text-slate-500 uppercase">ΔV Prograde</div>
                            <div className="text-[10px] text-blue-300 font-mono">{rendezvousData.deltaVPrograde.toFixed(1)} m/s</div>
                        </div>
                        <div className="bg-slate-800/50 p-1.5 rounded">
                            <div className="text-[9px] text-slate-500 uppercase">ΔV Radial</div>
                            <div className="text-[10px] text-orange-300 font-mono">{rendezvousData.deltaVRadial.toFixed(1)} m/s</div>
                        </div>
                        <div className="col-span-2 bg-slate-800/50 p-1.5 rounded">
                            <div className="text-[9px] text-slate-500 uppercase">Position</div>
                            <div className="text-[10px] text-purple-300 font-mono text-[8px]">
                                ({rendezvousData.point.x.toFixed(0)}, {rendezvousData.point.y.toFixed(0)})
                            </div>
                        </div>
                    </div>
                    <div className="text-[9px] text-slate-400 italic mt-1">✓ Marker visible on canvas</div>
                </div>
            ) : (
                <div className="bg-slate-800/30 border border-slate-700/30 rounded p-2">
                    <div className="text-[9px] text-slate-400 uppercase font-bold mb-1">Tracking...</div>
                    <div className="text-[10px] text-slate-400">
                        <div>Rocket: <span className="text-white font-mono">{rocketInput.label || 'Unknown'}</span></div>
                        <div>Target: <span className="text-white font-mono">{targetInput.label || 'Unknown'}</span></div>
                        <div className="text-[9px] text-orange-400 italic mt-1">No rendezvous within prediction window</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RendezvousTrackerModule;
