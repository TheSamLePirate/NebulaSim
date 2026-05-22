import React from 'react';
import { FlightComputerModule, FlightComputerInput } from '../../../types';
import { getInput, getUpdateForInput } from '../utils';
import InputSelector from '../InputSelector';
import { Clock } from 'lucide-react';

interface WaitModuleProps {
    module: FlightComputerModule;
    onUpdateModule: (id: string, updates: Partial<FlightComputerModule>) => void;
    bodies: any[];
    modules: FlightComputerModule[];
}

const WaitModule: React.FC<WaitModuleProps> = ({ module, onUpdateModule, bodies, modules }) => {
    const startInput = getInput(module, 'start');
    const timeInput = getInput(module, 'time');

    const updateInput = (key: string, input: FlightComputerInput | undefined) => {
        onUpdateModule(module.id, getUpdateForInput(module, key, input));
    };

    const isWaiting = module.waitActive;
    const isDone = module.waitTriggered;
    const status = isWaiting ? 'WAITING...' : (isDone ? 'DONE' : 'IDLE');
    const statusColor = isWaiting ? 'text-yellow-400' : (isDone ? 'text-green-400' : 'text-slate-500');

    // Format remaining time
    const remainingMs = module.waitRemainingTime ?? 0;
    const formatTime = (ms: number) => {
        if (ms < 1000) return ``; // Don't show if small or 0? User asked: "format if > 1000ms"

        const seconds = Math.floor(ms / 1000);
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        const pad = (n: number) => n.toString().padStart(2, '0');
        if (d > 0) return `${pad(d)} - ${pad(h)} - ${pad(m)} - ${pad(s)}`;
        if (h > 0) return `${pad(h)} - ${pad(m)} - ${pad(s)}`;
        if (m > 0) return `${pad(m)} - ${pad(s)}`;
        return `${pad(s)}s`; // Just seconds if small
    };

    // User asked strictly: DD - HH - MM - SS
    // Let's stick to strict user request: "DD - HH - MM - SS" if > 1000ms
    const formatStrict = (ms: number) => {
        if (ms <= 1000) return `${(ms / 1000).toFixed(1)}s`;

        const totalSeconds = Math.floor(ms / 1000);
        const d = Math.floor(totalSeconds / (3600 * 24));
        const h = Math.floor((totalSeconds % (3600 * 24)) / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = Math.floor(totalSeconds % 60);

        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(d)} - ${pad(h)} - ${pad(m)} - ${pad(s)}`;
    };

    const remainingText = formatStrict(remainingMs);

    // Calculate progress if waiting (this is just a visual estimation based on start time and duration)
    // Actually we don't have the current simulation time here easily passed in props to ModuleContent? 
    // Ah, ModuleContent props include `physicsConfig` etc but not `simulationTime`.
    // Wait, useFlightComputerLogic has simulationTime. ModuleContent currently doesn't receive it?
    // Let's check ModuleContent props.
    // ModuleContent: (module, bodies, modules, physicsConfig, rendezvousSolutionMap, onUpdateModule, onAddModule, isFollowing)
    // It does not receive simulation time.
    // So visual progress bar might be tricky without passing sim time down.
    // For now, just show text status.

    return (
        <div className="space-y-2">
            {/* Status Display */}
            <div className={`text-center font-mono font-bold ${statusColor} text-sm py-1 bg-slate-900/50 rounded border border-slate-700/50 flex flex-col`}>
                <span>{status}</span>
                {isWaiting && (
                    <span className="text-xs text-slate-300 mt-1">{remainingText}</span>
                )}
            </div>

            {/* Mode Selection */}
            <div className="flex bg-slate-800 rounded p-0.5 mb-2">
                <button
                    onClick={() => onUpdateModule(module.id, { waitMode: 'simulation' })}
                    className={`flex-1 py-1 text-[10px] rounded ${(!module.waitMode || module.waitMode === 'simulation') ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    SIMULATION TIME
                </button>
                <button
                    onClick={() => onUpdateModule(module.id, { waitMode: 'realtime' })}
                    className={`flex-1 py-1 text-[10px] rounded ${module.waitMode === 'realtime' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    REALTIME
                </button>
            </div>

            {/* Start Signal Input */}
            <InputSelector
                label="Start Signal"
                value={startInput}
                onChange={(input) => updateInput('start', input)}
                bodies={bodies}
                modules={modules}
                currentModuleId={module.id}
                allowedTypes={['boolean', 'module_output']}
            />

            {/* Time Configuration */}
            <div className="space-y-1">
                <InputSelector
                    label="Duration (Time)"
                    value={timeInput}
                    onChange={(input) => updateInput('time', input)}
                    bodies={bodies}
                    modules={modules}
                    currentModuleId={module.id}
                    allowedTypes={['scalar', 'module_output']}
                />

                {/* Fallback Manual Input if no logic input connected (or always show for default?) */}
                {!timeInput && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 w-20">Manual (ms):</span>
                        <input
                            type="number"
                            value={module.waitDuration ?? 1000}
                            onChange={(e) => onUpdateModule(module.id, { waitDuration: parseFloat(e.target.value) })}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default WaitModule;
