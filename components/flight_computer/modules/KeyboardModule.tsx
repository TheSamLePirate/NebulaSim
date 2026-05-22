import React, { useEffect } from 'react';
import { Body, FlightComputerModule, FlightComputerInput, PhysicsConfig, RendezvousSolution, FlightComputerModuleType } from '../../../types';
import { getUpdateForInput } from '../utils';

interface ModuleProps {
    module: FlightComputerModule;
    bodies: Body[];
    modules: FlightComputerModule[];
    physicsConfig: PhysicsConfig;
    rendezvousSolutionMap: Record<string, RendezvousSolution>;
    onUpdateModule: (id: string, updates: Partial<FlightComputerModule>) => void;
    onAddModule: (type: FlightComputerModuleType, inputs?: Record<string, FlightComputerInput>) => void;
}

const KeyboardModule: React.FC<ModuleProps> = ({ module, onUpdateModule }) => {

    const isAutodetect = module.keyboardAutodetect ?? false;
    const currentKey = module.keyboardKey ?? '';
    const isPressed = module.keyboardState ?? false;
    const listenMode = module.keyboardListenMode ?? 'specific';

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isAutodetect) {
                e.preventDefault();
                onUpdateModule(module.id, {
                    keyboardKey: e.code,
                    keyboardAutodetect: false
                });
            } else if (listenMode === 'any') {
                // Any key mode: update key and set state to true
                onUpdateModule(module.id, {
                    keyboardKey: e.code,
                    keyboardState: true
                });
            } else if (currentKey && e.code === currentKey) {
                // Specific key mode: only trigger for assigned key
                if (!isPressed) {
                    onUpdateModule(module.id, { keyboardState: true });
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (listenMode === 'any') {
                // Any key mode: set state to false on key release
                onUpdateModule(module.id, { keyboardState: false });
            } else if (currentKey && e.code === currentKey) {
                // Specific key mode: only trigger for assigned key
                onUpdateModule(module.id, { keyboardState: false });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [module.id, isAutodetect, currentKey, isPressed, onUpdateModule, listenMode]);

    return (
        <div className="mt-2 space-y-2">
            {/* Mode Selector */}
            <div className="flex gap-1 bg-slate-900/50 p-1 rounded border border-slate-700/30">
                <button
                    onClick={() => onUpdateModule(module.id, { keyboardListenMode: 'specific' })}
                    className={`flex-1 py-1 px-2 text-[10px] font-medium rounded transition-colors ${listenMode === 'specific'
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                >
                    Specific Key
                </button>
                <button
                    onClick={() => onUpdateModule(module.id, { keyboardListenMode: 'any' })}
                    className={`flex-1 py-1 px-2 text-[10px] font-medium rounded transition-colors ${listenMode === 'any'
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                >
                    Any Key
                </button>
            </div>

            {listenMode === 'specific' && (
                <>
                    <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded border border-slate-700/30">
                        <span className="text-xs text-slate-400">Assigned Key:</span>
                        <span className="font-mono text-sm text-slate-200 font-bold">
                            {currentKey || 'None'}
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => onUpdateModule(module.id, { keyboardAutodetect: !isAutodetect })}
                            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${isAutodetect
                                    ? 'bg-yellow-600 text-white animate-pulse'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            {isAutodetect ? 'Press any key...' : 'Set Key'}
                        </button>
                    </div>
                </>
            )}

            {listenMode === 'any' && (
                <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded border border-slate-700/30">
                    <span className="text-xs text-slate-400">Last Key Pressed:</span>
                    <span className="font-mono text-sm text-slate-200 font-bold">
                        {currentKey || 'None'}
                    </span>
                </div>
            )}

            <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Output State:</span>
                <span className={`font-mono font-bold ${isPressed ? 'text-green-400' : 'text-slate-600'}`}>
                    {isPressed ? 'TRUE' : 'FALSE'}
                </span>
            </div>
        </div>
    );
};

export default KeyboardModule;
