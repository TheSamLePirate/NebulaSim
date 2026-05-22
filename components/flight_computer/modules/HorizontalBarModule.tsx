import React, { useMemo } from 'react';
import { Body, FlightComputerModule, FlightComputerInput, PhysicsConfig, RendezvousSolution, FlightComputerModuleType } from '../../../types';
import InputSelector from '../InputSelector';
import { getInput, getUpdateForInput, interpolateColor } from '../utils';
import { resolveScalarInput } from '../../../services/orbitalMath';

interface ModuleProps {
    module: FlightComputerModule;
    bodies: Body[];
    modules: FlightComputerModule[];
    physicsConfig: PhysicsConfig;
    rendezvousSolutionMap: Record<string, RendezvousSolution>;
    onUpdateModule: (id: string, updates: Partial<FlightComputerModule>) => void;
    onAddModule: (type: FlightComputerModuleType, inputs?: Record<string, FlightComputerInput>) => void;
}

const HorizontalBarModule: React.FC<ModuleProps> = ({ module, bodies, modules, physicsConfig, rendezvousSolutionMap, onUpdateModule }) => {
    const min = module.barMin ?? 0;
    const max = module.barMax ?? 100;
    const colorLow = module.barColorLow ?? '#ff0000';
    const colorMid = module.barColorMid ?? '#ffff00';
    const colorHigh = module.barColorHigh ?? '#00ff00';

    const input = getInput(module, 'value');
    const currentValue = input
        ? resolveScalarInput(input, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap) ?? 0
        : 0;

    // Calculate percentage (0 to 1)
    const range = max - min;
    const percentage = range === 0 ? 0 : Math.max(0, Math.min(1, (currentValue - min) / range));

    // Calculate dynamic color
    const barColor = useMemo(() => {
        if (percentage < 0.5) {
            // Interpolate between Low and Mid
            return interpolateColor(colorLow, colorMid, percentage * 2);
        } else {
            // Interpolate between Mid and High
            return interpolateColor(colorMid, colorHigh, (percentage - 0.5) * 2);
        }
    }, [percentage, colorLow, colorMid, colorHigh]);

    const updateInput = (key: string, input: FlightComputerInput | undefined) => {
        onUpdateModule(module.id, getUpdateForInput(module, key, input));
    };

    return (
        <div className="space-y-2">
            {/* Input Selection */}
            <InputSelector
                label="Value Input"
                value={input}
                onChange={(input) => updateInput('value', input)}
                bodies={bodies}
                modules={modules}
                currentModuleId={module.id}
                allowedTypes={['module_output', 'scalar']}
            />

            {/* Configuration */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Min Value</label>
                    <input
                        type="number"
                        value={min}
                        onChange={(e) => onUpdateModule(module.id, { barMin: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                    />
                </div>
                <div>
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Max Value</label>
                    <input
                        type="number"
                        value={max}
                        onChange={(e) => onUpdateModule(module.id, { barMax: parseFloat(e.target.value) || 100 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                <div>
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Low Color</label>
                    <input
                        type="color"
                        value={colorLow}
                        onChange={(e) => onUpdateModule(module.id, { barColorLow: e.target.value })}
                        className="w-full h-6 rounded cursor-pointer"
                    />
                </div>
                <div>
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Mid Color</label>
                    <input
                        type="color"
                        value={colorMid}
                        onChange={(e) => onUpdateModule(module.id, { barColorMid: e.target.value })}
                        className="w-full h-6 rounded cursor-pointer"
                    />
                </div>
                <div>
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">High Color</label>
                    <input
                        type="color"
                        value={colorHigh}
                        onChange={(e) => onUpdateModule(module.id, { barColorHigh: e.target.value })}
                        className="w-full h-6 rounded cursor-pointer"
                    />
                </div>
            </div>

            {/* Visualization */}
            <div className="mt-2">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>{min}</span>
                    <span className="font-mono text-white font-bold">{currentValue.toFixed(2)}</span>
                    <span>{max}</span>
                </div>
                <div className="h-4 w-full bg-slate-900 rounded-full border border-slate-700 overflow-hidden relative">
                    <div
                        className="h-full transition-all duration-300 ease-out"
                        style={{
                            width: `${percentage * 100}%`,
                            backgroundColor: barColor
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default HorizontalBarModule;
