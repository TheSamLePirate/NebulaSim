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

const CircleDrawerModule: React.FC<ModuleProps> = ({ module, bodies, modules, onUpdateModule }) => {
    const updateInput = (moduleId: string, key: string, input: FlightComputerInput | undefined) => {
        onUpdateModule(moduleId, getUpdateForInput(module, key, input));
    };

    const availableOutputs = [
        { key: 'foundObject', label: 'Found Object (Bool)' },
        { key: 'objectId', label: 'Object ID (String)' },
        { key: 'closestPoint', label: 'Closest Point (Vector)' },
    ];

    return (
        <div className="space-y-3 mt-2">

            {/* Activation */}
            <div className="space-y-1 pt-2 border-t border-slate-700/50">
                <div className="flex items-center justify-between">
                    <label className="text-[9px] text-slate-500 uppercase">Status</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id={`activateCircle-${module.id}`}
                            checked={module.circleActivate ?? true}
                            onChange={(e) => onUpdateModule(module.id, { circleActivate: e.target.checked })}
                        />
                        <label htmlFor={`activateCircle-${module.id}`} className="text-[9px] text-slate-400 select-none cursor-pointer">
                            Active
                        </label>
                    </div>
                </div>
                <InputSelector
                    label="Activate (Bool)"
                    value={getInput(module, 'activate')}
                    onChange={(input) => updateInput(module.id, 'activate', input)}
                    bodies={bodies}
                    modules={modules}
                    currentModuleId={module.id}
                    allowedTypes={['module_output', 'body']}
                />
            </div>

            {/* Position */}
            <div className="space-y-1">
                <InputSelector
                    label="Center Position (Vector/Body)"
                    value={getInput(module, 'position')}
                    onChange={(input) => updateInput(module.id, 'position', input)}
                    bodies={bodies}
                    modules={modules}
                    currentModuleId={module.id}
                    allowedTypes={['body', 'vector', 'module_output']}
                />
            </div>

            {/* Radius & Color */}
            <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase">Radius</label>
                    <InputSelector
                        label=""
                        value={getInput(module, 'radius')}
                        onChange={(input) => updateInput(module.id, 'radius', input)}
                        bodies={bodies}
                        modules={modules}
                        currentModuleId={module.id}
                        allowedTypes={['module_output']}
                    />
                    <input
                        type="number"
                        min="1"
                        value={module.circleRadius || 100}
                        onChange={(e) => onUpdateModule(module.id, { circleRadius: parseFloat(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[10px] text-slate-300 focus:border-purple-500 outline-none mt-1"
                        placeholder="Default Radius"
                    />
                </div>
                <div className="flex-1 space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase">Color</label>
                    <InputSelector
                        label=""
                        value={getInput(module, 'color')}
                        onChange={(input) => updateInput(module.id, 'color', input)}
                        bodies={bodies}
                        modules={modules}
                        currentModuleId={module.id}
                        allowedTypes={['module_output']}
                    />
                    <input
                        type="color"
                        value={module.circleColor || '#4ade80'}
                        onChange={(e) => onUpdateModule(module.id, { circleColor: e.target.value })}
                        className="w-full h-6 bg-transparent cursor-pointer rounded overflow-hidden mt-1"
                    />
                </div>
            </div>

            {/* Distance Sensing */}
            <div className="space-y-1 pt-2 border-t border-slate-700/50">
                <div className="flex items-center justify-between">
                    <label className="text-[9px] text-slate-500 uppercase">Distance Sensing</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id={`distSens-${module.id}`}
                            checked={module.circleDistanceSensing ?? false}
                            onChange={(e) => onUpdateModule(module.id, { circleDistanceSensing: e.target.checked })}
                        />
                        <label htmlFor={`distSens-${module.id}`} className="text-[9px] text-slate-400 select-none cursor-pointer">
                            Enable
                        </label>
                    </div>
                </div>
                <InputSelector
                    label="Enable (Bool)"
                    value={getInput(module, 'distance_sensing')}
                    onChange={(input) => updateInput(module.id, 'distance_sensing', input)}
                    bodies={bodies}
                    modules={modules}
                    currentModuleId={module.id}
                    allowedTypes={['module_output']}
                />

                <div className="pt-2">
                    <label className="text-[9px] text-slate-500 uppercase">Detected Color</label>
                    <InputSelector
                        label=""
                        value={getInput(module, 'detected_color')}
                        onChange={(input) => updateInput(module.id, 'detected_color', input)}
                        bodies={bodies}
                        modules={modules}
                        currentModuleId={module.id}
                        allowedTypes={['module_output']}
                    />
                    <input
                        type="color"
                        value={module.circleDetectedColor || '#ef4444'}
                        onChange={(e) => onUpdateModule(module.id, { circleDetectedColor: e.target.value })}
                        className="w-full h-6 bg-transparent cursor-pointer rounded overflow-hidden mt-1"
                    />
                </div>
            </div>

            {/* Outputs Info */}
            <div className="text-[9px] text-slate-500 pt-2 border-t border-slate-700/50">
                <div className="uppercase mb-1">Outputs:</div>
                <div className="grid grid-cols-1 gap-1">
                    {availableOutputs.map(out => (
                        <div key={out.key} className="flex justify-between">
                            <span>{out.label}</span>
                            <span className="font-mono text-slate-400">{out.key}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="text-[9px] text-slate-500 italic mt-2">
                Draws a circle and optionally detects the closest object within its radius.
            </div>
        </div>
    );
};

export default CircleDrawerModule;
