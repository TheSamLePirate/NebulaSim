import React from 'react';
import { FlightComputerModule, FlightComputerInput, Body, FlightComputerModuleType, RendezvousSolution, PhysicsConfig } from '../../../types';
import InputSelector from '../InputSelector';
import { ArrowRightLeft } from 'lucide-react';
import { getUpdateForInput, getInput } from '../utils';

interface ChangeDetectorModuleProps {
    module: FlightComputerModule;
    bodies: Body[];
    modules: FlightComputerModule[];
    physicsConfig: PhysicsConfig;
    rendezvousSolutionMap: Record<string, RendezvousSolution>;
    onUpdateModule: (id: string, updates: Partial<FlightComputerModule>) => void;
    onAddModule: (type: FlightComputerModuleType, inputs?: Record<string, FlightComputerInput>) => void;
}

const ChangeDetectorModule: React.FC<ChangeDetectorModuleProps> = ({
    module,
    bodies,
    modules,
    onUpdateModule
}) => {
    // Inputs
    const valueInput = getInput(module, 'value');
    const activateInput = getInput(module, 'activate'); // Inherited

    const handleInputChange = (key: string, input: FlightComputerInput | undefined) => {
        onUpdateModule(module.id, getUpdateForInput(module, key, input));
    };

    return (
        <div className="flex flex-col gap-2 p-2 relative">
            <div className="absolute top-2 right-2 flex gap-1">
                <div className={`w-3 h-3 rounded-full ${module.changeTriggered ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-gray-700'}`} title="Output State" />
            </div>

            <div className="flex items-center gap-2 mb-1">
                <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                <span className="font-medium text-emerald-100 text-sm">Change Detector</span>
            </div>

            <div className="space-y-1">
                <InputSelector
                    label="Value to Watch (Scalar/String/Bool)"
                    value={valueInput}
                    onChange={(input) => handleInputChange('value', input)}
                    bodies={bodies}
                    modules={modules}
                    currentModuleId={module.id}
                    allowedTypes={['scalar', 'string', 'boolean', 'module_output']}
                />
            </div>
            <div className="text-[10px] text-slate-500 italic mt-1">
                Outputs TRUE for one tick when value changes.
            </div>
        </div>
    );
};

export default ChangeDetectorModule;
