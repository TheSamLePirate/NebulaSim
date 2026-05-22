import React from 'react';
import { FlightComputerModule, FlightComputerInput, Body, FlightComputerModuleType, RendezvousSolution, PhysicsConfig } from '../../../types';
import InputSelector from '../InputSelector';
import { Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getUpdateForInput, getInput } from '../utils';

interface EdgeDetectorModuleProps {
    module: FlightComputerModule;
    bodies: Body[];
    modules: FlightComputerModule[];
    physicsConfig: PhysicsConfig;
    rendezvousSolutionMap: Record<string, RendezvousSolution>;
    onUpdateModule: (id: string, updates: Partial<FlightComputerModule>) => void;
    onAddModule: (type: FlightComputerModuleType, inputs?: Record<string, FlightComputerInput>) => void;
}

const EdgeDetectorModule: React.FC<EdgeDetectorModuleProps> = ({
    module,
    bodies,
    modules,
    onUpdateModule
}) => {
    // Inputs
    const signalInput = getInput(module, 'signal');

    const handleInputChange = (key: string, input: FlightComputerInput | undefined) => {
        onUpdateModule(module.id, getUpdateForInput(module, key, input));
    };

    return (
        <div className="flex flex-col gap-2 p-2 relative">
            <div className="absolute top-2 right-2 flex gap-1">
                <div className={`w-3 h-3 rounded-full ${module.edgeTriggered ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-gray-700'}`} title="Output State" />
            </div>

            <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-orange-400" />
                <span className="font-medium text-orange-100 text-sm">Edge Detector</span>
            </div>

            <div className="space-y-1">
                <InputSelector
                    label="Signal (Boolean)"
                    value={signalInput}
                    onChange={(input) => handleInputChange('signal', input)}
                    bodies={bodies}
                    modules={modules}
                    currentModuleId={module.id}
                    allowedTypes={['boolean', 'module_output']}
                />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                    onClick={() => onUpdateModule(module.id, { edgeMode: 'rising' })}
                    className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded text-xs transition-colors ${(module.edgeMode || 'rising') === 'rising'
                            ? 'bg-orange-500/30 text-orange-200 ring-1 ring-orange-500/50'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                >
                    <ArrowUpRight className="w-3 h-3" />
                    <span>Rising</span>
                </button>
                <button
                    onClick={() => onUpdateModule(module.id, { edgeMode: 'falling' })}
                    className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded text-xs transition-colors ${module.edgeMode === 'falling'
                            ? 'bg-orange-500/30 text-orange-200 ring-1 ring-orange-500/50'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                >
                    <ArrowDownRight className="w-3 h-3" />
                    <span>Falling</span>
                </button>
            </div>
        </div>
    );
};

export default EdgeDetectorModule;
