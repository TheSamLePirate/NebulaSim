import React from 'react';
import { Body, FlightComputerModule, FlightComputerInput, PhysicsConfig, RendezvousSolution, FlightComputerModuleType } from '../../../types';
import { resolveInput } from '../../../services/orbitalMath';
import { getInput, getUpdateForInput } from '../utils';
import InputSelector from '../InputSelector';
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

const LagrangeCalculatorModule: React.FC<ModuleProps> = ({ 
    module, 
    bodies, 
    modules, 
    physicsConfig, 
    rendezvousSolutionMap, 
    onUpdateModule,
    onAddModule 
}) => {
    const bodyInput = getInput(module, 'body');
    const referenceInput = getInput(module, 'reference');

    const updateInput = (key: string, input: FlightComputerInput | undefined) => {
        onUpdateModule(module.id, getUpdateForInput(module, key, input));
    };

    const resolveVectorInputValue = (input?: FlightComputerInput) =>
        resolveInput(input, bodies, modules, physicsConfig.gravitationalConstant, rendezvousSolutionMap);

    const bodyResolved = resolveVectorInputValue(bodyInput);
    const referenceResolved = resolveVectorInputValue(referenceInput);

    // Both must be bodies (need mass)
    const hasValidInputs = bodyResolved && referenceResolved && 
        'mass' in bodyResolved && 'mass' in referenceResolved;

    // Get calculated Lagrange points from module state
    const L1 = module.lagrangeL1;
    const L2 = module.lagrangeL2;
    const L3 = module.lagrangeL3;
    const L4 = module.lagrangeL4;
    const L5 = module.lagrangeL5;

    const formatPosition = (point: { x: number; y: number } | undefined) => {
        if (!point) return '---';
        return `(${point.x.toFixed(0)}, ${point.y.toFixed(0)})`;
    };

    const renderLagrangePoint = (label: string, point: { x: number; y: number } | undefined, outputKey: string, colorClass: string) => (
        <div className="bg-slate-800/50 p-1.5 rounded group relative">
            <div className="text-[9px] text-slate-500 uppercase flex justify-between">
                {label}
                {point && (
                    <button
                        onClick={() => onAddModule('rendezvous_tracker', {
                            primary: { type: 'body', value: bodies.find(b => b.isRocket)?.id || '' },
                            target: { type: 'module_output', value: `${module.id}:${outputKey}`, label: `${module.name || 'Lagrange'} ${label}` }
                        })}
                        className="opacity-0 group-hover:opacity-100 text-purple-400 hover:text-purple-300 transition-opacity"
                        title={`Track Rendezvous to ${label}`}
                    >
                        <Navigation size={10} />
                    </button>
                )}
            </div>
            <div className={`text-xs ${colorClass} font-mono truncate`} title={formatPosition(point)}>
                {formatPosition(point)}
            </div>
        </div>
    );

    return (
        <div className="space-y-2">
            {/* Input Selectors */}
            <InputSelector
                label="Body (smaller mass, e.g. Earth)"
                value={bodyInput}
                onChange={(input) => updateInput('body', input)}
                bodies={bodies}
                modules={modules}
                currentModuleId={module.id}
                allowedTypes={['body', 'module_output']}
            />
            <InputSelector
                label="Reference Body (larger mass, e.g. Sun)"
                value={referenceInput}
                onChange={(input) => updateInput('reference', input)}
                bodies={bodies}
                modules={modules}
                currentModuleId={module.id}
                allowedTypes={['body', 'module_output']}
            />

            {/* Results Display */}
            {!hasValidInputs ? (
                <div className="text-xs text-slate-500 italic text-center py-2">
                    Select two bodies to calculate Lagrange points
                </div>
            ) : (
                <div className="space-y-2 mt-2">
                    <div className="text-[9px] text-slate-400 uppercase mb-1">Collinear Points</div>
                    <div className="grid grid-cols-3 gap-1">
                        {renderLagrangePoint('L1', L1, 'l1', 'text-cyan-300')}
                        {renderLagrangePoint('L2', L2, 'l2', 'text-orange-300')}
                        {renderLagrangePoint('L3', L3, 'l3', 'text-red-300')}
                    </div>
                    <div className="text-[9px] text-slate-400 uppercase mt-2 mb-1">Triangular Points (Stable)</div>
                    <div className="grid grid-cols-2 gap-1">
                        {renderLagrangePoint('L4', L4, 'l4', 'text-green-300')}
                        {renderLagrangePoint('L5', L5, 'l5', 'text-purple-300')}
                    </div>
                    <div className="text-[8px] text-slate-600 italic mt-2">
                        L4/L5 form equilateral triangles with both bodies
                    </div>
                </div>
            )}
        </div>
    );
};

export default LagrangeCalculatorModule;
