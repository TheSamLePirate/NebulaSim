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

const LineDrawerModule: React.FC<ModuleProps> = ({ module, bodies, modules, onUpdateModule }) => {
    const updateInput = (moduleId: string, key: string, input: FlightComputerInput | undefined) => {
        onUpdateModule(moduleId, getUpdateForInput(module, key, input));
    };

    const pointAInput = getInput(module, 'point_a');
    const pointBInput = getInput(module, 'point_b');
    const colorInput = getInput(module, 'color');
    const thicknessInput = getInput(module, 'thickness');
    // const colorInput = getInput(module, 'color'); // Removed as per instruction
    // const thicknessInput = getInput(module, 'thickness'); // Removed as per instruction

    // Defaults (these are now mostly handled by the new inputs directly on module.property)
    // const lineColor = module.lineColor || '#00ff00'; // Removed as per instruction
    // const lineThickness = module.lineThickness || 1; // Removed as per instruction

    return (
        <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase">Point A (Start)</label>
                    <InputSelector
                        label=""
                        value={pointAInput}
                        onChange={(input) => updateInput(module.id, 'point_a', input)}
                        bodies={bodies}
                        modules={modules}
                        currentModuleId={module.id}
                        allowedTypes={['body', 'vector', 'module_output']}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase">Point B (End)</label>
                    <InputSelector
                        label=""
                        value={pointBInput}
                        onChange={(input) => updateInput(module.id, 'point_b', input)}
                        bodies={bodies}
                        modules={modules}
                        currentModuleId={module.id}
                        allowedTypes={['body', 'vector', 'module_output']}
                    />
                </div>
            </div>

            {/* Color & Thickness */}
            <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase">Color</label>
                    <input
                        type="color"
                        value={module.color || '#4ade80'}
                        onChange={(e) => onUpdateModule(module.id, { color: e.target.value })}
                        className="w-full h-6 bg-transparent cursor-pointer rounded overflow-hidden"
                    />
                </div>
                <div className="flex-1 space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase">Thickness</label>
                    <input
                        type="number"
                        min="1"
                        max="20"
                        value={module.lineThickness || 2}
                        onChange={(e) => onUpdateModule(module.id, { lineThickness: parseFloat(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[10px] text-slate-300 focus:border-purple-500 outline-none"
                    />
                </div>
            </div>

            {/* Hit Color & Behavior */}
            <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase">Hit Color</label>
                    <input
                        type="color"
                        value={module.lineHitColor || '#ef4444'} // Default red
                        onChange={(e) => onUpdateModule(module.id, { lineHitColor: e.target.value })}
                        className="w-full h-6 bg-transparent cursor-pointer rounded overflow-hidden"
                    />
                </div>
                <div className="flex-1 flex items-center gap-2 pt-4">
                    <input
                        type="checkbox"
                        id={`showAfterHit-${module.id}`}
                        checked={module.lineShowAfterHit ?? true}
                        onChange={(e) => onUpdateModule(module.id, { lineShowAfterHit: e.target.checked })}
                    />
                    <label htmlFor={`showAfterHit-${module.id}`} className="text-[10px] text-slate-400 select-none cursor-pointer">
                        Show After Hit
                    </label>
                </div>
            </div>

            {/* Activate Raycast Input & Toggle */}
            <div className="space-y-1 pt-2 border-t border-slate-700/50">
                <div className="flex items-center justify-between">
                    <label className="text-[9px] text-slate-500 uppercase">Raycast</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id={`activateRaycast-${module.id}`}
                            checked={module.lineActivateRaycast ?? true}
                            onChange={(e) => onUpdateModule(module.id, { lineActivateRaycast: e.target.checked })}
                        />
                        <label htmlFor={`activateRaycast-${module.id}`} className="text-[9px] text-slate-400 select-none cursor-pointer">
                            Active
                        </label>
                    </div>
                </div>
                <InputSelector
                    label="Activate (Bool)"
                    value={getInput(module, 'activate_raycast')}
                    onChange={(input) => updateInput(module.id, 'activate_raycast', input)}
                    bodies={bodies}
                    modules={modules}
                    currentModuleId={module.id}
                    allowedTypes={['module_output', 'body']} // boolean usually comes from module output or maybe a body property?
                />
            </div>

            <div className="text-[9px] text-slate-500 italic">
                Draws a line between two points (bodies, vectors, or coordinates). Useful for visualizing distances, directions, or alignment.
            </div>
        </div >
    );
};

export default LineDrawerModule;
