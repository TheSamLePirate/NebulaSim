import React from 'react';
import { Play, Repeat } from 'lucide-react';
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

const CustomScriptModule: React.FC<ModuleProps> = ({ module, bodies, modules, onUpdateModule }) => {
    const updateInput = (moduleId: string, key: string, input: FlightComputerInput | undefined) => {
        onUpdateModule(moduleId, getUpdateForInput(module, key, input));
    };

    const inputsCount = module.customScriptInputsCount ?? 2;
    const outputType = module.customScriptOutputType ?? 'scalar';
    const scriptMode = module.customScriptMode || 'sync';
    const scriptResult = module.customScriptLastResult;
    const isReady = module.customScriptAsyncState ?? true;

    return (
        <div className="mt-2 space-y-3">
            {/* Configuration */}
            <div className="grid grid-cols-3 gap-2">
                <div>
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Inputs</label>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={inputsCount}
                        onChange={(e) => onUpdateModule(module.id, { customScriptInputsCount: parseInt(e.target.value) || 1 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                    />
                </div>
                <div>
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Type</label>
                    <select
                        value={outputType}
                        onChange={(e) => onUpdateModule(module.id, { customScriptOutputType: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                    >
                        <option value="scalar">Scalar</option>
                        <option value="boolean">Boolean</option>
                        <option value="string">String</option>
                        <option value="vector">Vector</option>
                        <option value="body">Body</option>
                    </select>
                </div>
                <div>
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Mode</label>
                    <select
                        value={scriptMode}
                        onChange={(e) => onUpdateModule(module.id, { customScriptMode: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                    >
                        <option value="sync">Sync (Realtime)</option>
                        <option value="async">Async (Promise)</option>
                    </select>
                </div>
            </div>

            {/* Inputs List */}
            <div className="space-y-1 bg-slate-900/30 p-2 rounded border border-slate-800">
                <label className="text-[9px] text-slate-500 uppercase block mb-1">Inputs</label>

                {/* Trigger Input */}
                <div className="mb-2 pb-2 border-b border-slate-800 flex items-end gap-2">
                    <div className="flex-1">
                        <InputSelector
                            label="Run Trigger (True to Run)"
                            value={module.inputs?.trigger}
                            onChange={(input) => updateInput(module.id, 'trigger', input)}
                            bodies={bodies}
                            modules={modules}
                            currentModuleId={module.id}
                            allowedTypes={['boolean', 'module_output']}
                        />
                    </div>
                    <button
                        onClick={() => onUpdateModule(module.id, { customScriptManualTrigger: Date.now() })}
                        className="bg-green-600 hover:bg-green-500 text-white p-1 rounded transition-colors h-[26px] w-[26px] flex items-center justify-center"
                        title="Run Script Now"
                    >
                        <Play size={14} />
                    </button>
                    <button
                        onClick={() => onUpdateModule(module.id, { customScriptContinuousRun: !module.customScriptContinuousRun })}
                        className={`p-1 rounded transition-colors h-[26px] w-[26px] flex items-center justify-center ${module.customScriptContinuousRun ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
                        title="Continuous Run (Loop)"
                    >
                        <Repeat size={14} />
                    </button>
                </div>

                {/* Dynamic Data Inputs */}
                {Array.from({ length: inputsCount }).map((_, i) => (
                    <div key={i}>
                        <InputSelector
                            label={`input[${i}]`}
                            value={module.inputs?.[`input_${i}`]}
                            onChange={(input) => updateInput(module.id, `input_${i}`, input)}
                            bodies={bodies}
                            modules={modules}
                            currentModuleId={module.id}
                            allowedTypes={['body', 'module_output', 'scalar', 'boolean', 'string', 'vector']}
                        />
                    </div>
                ))}
            </div>

            {/* Code Editor */}
            <div>
                <label className="text-[9px] text-slate-500 uppercase block mb-1">
                    Script ({scriptMode === 'async' ? 'Async Function Body' : 'Function Body'})
                </label>
                <textarea
                    value={module.customScriptCode || ''}
                    onChange={(e) => onUpdateModule(module.id, { customScriptCode: e.target.value })}
                    placeholder={scriptMode === 'async' ? "// const data = await fetch(...);\n// return data.value;" : "// return input[1] * 2;"}
                    className="w-full h-24 bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-green-400 outline-none resize-y"
                    spellCheck={false}
                />
            </div>

            {/* Console & Result */}
            <div className="bg-slate-950 rounded border border-slate-800 p-2 font-mono text-[10px] space-y-2">
                <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                    <span className="text-slate-500 uppercase">Console / Result</span>
                    <span className={isReady ? "text-green-500" : "text-yellow-500"}>
                        {isReady ? "READY" : "RUNNING..."}
                    </span>
                </div>

                {/* Logs */}
                <div className="max-h-20 overflow-y-auto space-y-0.5 text-slate-400">
                    {module.customScriptLogs?.map((log, i) => (
                        <div key={i} className="whitespace-pre-wrap break-all">{log}</div>
                    ))}
                    {!module.customScriptLogs?.length && <div className="italic opacity-50">No logs</div>}
                </div>

                {/* Result */}
                <div className="pt-1 border-t border-slate-800">
                    <span className="text-purple-400 font-bold">=&gt; </span>
                    <span className="text-slate-200">
                        {scriptResult === undefined ? 'undefined' :
                            typeof scriptResult === 'object' ? JSON.stringify(scriptResult) :
                                String(scriptResult)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default CustomScriptModule;
