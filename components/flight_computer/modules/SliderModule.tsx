import React from 'react';
import { Body, FlightComputerModule, FlightComputerInput, PhysicsConfig, RendezvousSolution, FlightComputerModuleType } from '../../../types';

interface ModuleProps {
    module: FlightComputerModule;
    bodies: Body[];
    modules: FlightComputerModule[];
    physicsConfig: PhysicsConfig;
    rendezvousSolutionMap: Record<string, RendezvousSolution>;
    onUpdateModule: (id: string, updates: Partial<FlightComputerModule>) => void;
    onAddModule: (type: FlightComputerModuleType, inputs?: Record<string, FlightComputerInput>) => void;
}

const SliderModule: React.FC<ModuleProps> = ({ module, onUpdateModule }) => {
    const min = module.sliderMin ?? 0;
    const max = module.sliderMax ?? 100;
    const step = module.sliderStep ?? 1;
    const value = module.sliderValue ?? min;

    return (
        <div className="space-y-2">
            {/* Configuration Controls */}
            <div className="grid grid-cols-3 gap-2">
                <div>
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Min</label>
                    <input
                        type="number"
                        value={min}
                        onChange={(e) => onUpdateModule(module.id, { sliderMin: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none"
                    />
                </div>
                <div>
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Max</label>
                    <input
                        type="number"
                        value={max}
                        onChange={(e) => onUpdateModule(module.id, { sliderMax: parseFloat(e.target.value) || 100 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none"
                    />
                </div>
                <div>
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Step</label>
                    <input
                        type="number"
                        value={step}
                        onChange={(e) => onUpdateModule(module.id, { sliderStep: parseFloat(e.target.value) || 1 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-purple-500 outline-none"
                    />
                </div>
            </div>

            {/* Slider Control */}
            <div>
                <label className="text-[9px] text-slate-500 uppercase block mb-1">
                    Value: <span className="text-slate-200 font-mono">{value.toFixed(Math.max(0, -Math.floor(Math.log10(step))))}</span>
                </label>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onUpdateModule(module.id, { sliderValue: parseFloat(e.target.value) })}
                    className="w-full accent-purple-500"
                />
            </div>

            {/* Output Display */}
            <div className="bg-slate-900/50 rounded p-2 border border-slate-700/30">
                <div className="text-[9px] text-slate-500 uppercase mb-1">Output</div>
                <div className="text-xs text-slate-200 font-mono">
                    <div className="flex justify-between">
                        <span className="text-slate-400">value:</span>
                        <span className="text-green-400">{value}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SliderModule;
