import React from 'react';
import { Body, FlightComputerModule, FlightComputerInput, PhysicsConfig, RendezvousSolution, FlightComputerModuleType } from '../../../types';
import { resolveInput } from '../../../services/orbitalMath';
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

const BodyInfoModule: React.FC<ModuleProps> = ({ module, bodies, modules, physicsConfig, rendezvousSolutionMap, onUpdateModule }) => {
    const updateInput = (moduleId: string, key: string, input: FlightComputerInput | undefined) => {
        onUpdateModule(moduleId, getUpdateForInput(module, key, input));
    };

    const bodyInfoInput = getInput(module, 'target');
    const targetBody = bodyInfoInput ? resolveInput(bodyInfoInput, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap) : null;
    const bodyData = targetBody && 'mass' in targetBody ? targetBody as Body : null;
    
    return (
        <div className="mt-2 space-y-2">
            <div className="space-y-1">
                <InputSelector label="Target Body/Ship" value={bodyInfoInput} onChange={(input) => updateInput(module.id, 'target', input)} bodies={bodies} modules={modules} currentModuleId={module.id} allowedTypes={['body', 'module_output']} />
            </div>
            
            {bodyData ? (
                <div className="pt-2 border-t border-slate-700/50 space-y-1 text-xs">
                    <div className="grid grid-cols-2 gap-1">
                        <span className="text-slate-400">Name:</span>
                        <span className="text-slate-200 font-mono">{bodyData.name}</span>
                        
                        <span className="text-slate-400">Mass:</span>
                        <span className="text-slate-200 font-mono">{bodyData.mass.toFixed(2)}</span>
                        
                        <span className="text-slate-400">Radius:</span>
                        <span className="text-slate-200 font-mono">{bodyData.radius.toFixed(2)}</span>
                        
                        <span className="text-slate-400">Pos X:</span>
                        <span className="text-slate-200 font-mono">{bodyData.position.x.toFixed(2)}</span>
                        
                        <span className="text-slate-400">Pos Y:</span>
                        <span className="text-slate-200 font-mono">{bodyData.position.y.toFixed(2)}</span>
                        
                        <span className="text-slate-400">Vel X:</span>
                        <span className="text-slate-200 font-mono">{bodyData.velocity.x.toFixed(2)}</span>
                        
                        <span className="text-slate-400">Vel Y:</span>
                        <span className="text-slate-200 font-mono">{bodyData.velocity.y.toFixed(2)}</span>
                        
                        {bodyData.isRocket && (
                            <>
                                {bodyData.angle !== undefined && (
                                    <>
                                        <span className="text-slate-400">Angle:</span>
                                        <span className="text-slate-200 font-mono">{(bodyData.angle * 180 / Math.PI).toFixed(1)}°</span>
                                    </>
                                )}
                                
                                {bodyData.thrust && (
                                    <>
                                        <span className="text-slate-400">Thrust X:</span>
                                        <span className="text-slate-200 font-mono">{bodyData.thrust.x.toFixed(3)}</span>
                                        
                                        <span className="text-slate-400">Thrust Y:</span>
                                        <span className="text-slate-200 font-mono">{bodyData.thrust.y.toFixed(3)}</span>
                                    </>
                                )}
                                
                                {bodyData.fuel !== undefined && (
                                    <>
                                        <span className="text-slate-400">Fuel:</span>
                                        <span className="text-slate-200 font-mono">{bodyData.fuel.toFixed(1)} / {bodyData.maxFuel?.toFixed(1) || 'N/A'}</span>
                                    </>
                                )}
                                
                                {bodyData.dryMass !== undefined && (
                                    <>
                                        <span className="text-slate-400">Dry Mass:</span>
                                        <span className="text-slate-200 font-mono">{bodyData.dryMass.toFixed(2)}</span>
                                    </>
                                )}
                                
                                {bodyData.landedOnBodyId && (
                                    <>
                                        <span className="text-slate-400">Landed On:</span>
                                        <span className="text-slate-200 font-mono">{bodies.find(b => b.id === bodyData.landedOnBodyId)?.name || 'Unknown'}</span>
                                    </>
                                )}
                                
                                {bodyData.sasMode && (
                                    <>
                                        <span className="text-slate-400">SAS Mode:</span>
                                        <span className="text-slate-200 font-mono">{bodyData.sasMode}</span>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-xs text-slate-500 italic">No body selected</div>
            )}
        </div>
    );
};

export default BodyInfoModule;
