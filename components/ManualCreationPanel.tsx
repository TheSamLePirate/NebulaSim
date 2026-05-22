
import React from 'react';
import { Check, X, MousePointer2, Sun } from 'lucide-react';
import { Body } from '../types';
import useIsMobile from '../hooks/useIsMobile';

interface ManualCreationPanelProps {
    candidate: Body;
    predictionSteps: number;
    onUpdate: (updates: Partial<Body>) => void;
    onStepsChange: (steps: number) => void;
    onSpawn: () => void;
    onCancel: () => void;
}

const ManualCreationPanel: React.FC<ManualCreationPanelProps> = ({ candidate, predictionSteps, onUpdate, onStepsChange, onSpawn, onCancel }) => {
    const isMobile = useIsMobile();



    if (isMobile) {
        return (
            <div
                className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 p-4 shadow-2xl z-50 animate-in slide-in-from-bottom duration-300 max-h-[80vh] overflow-y-auto"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <MousePointer2 size={16} className="text-blue-400" />
                        Manual Build
                    </h3>
                    <button onClick={onCancel} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4 pb-20"> {/* Padding for safe area */}
                    {/* NAME */}
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300">Name</span>
                        </div>
                        <input
                            type="text"
                            value={candidate.name}
                            onChange={(e) => onUpdate({ name: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                            maxLength={20}
                            placeholder="Body Name"
                        />
                    </div>

                    {/* STAR TOGGLE */}
                    <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2">
                            <Sun size={20} className={candidate.isStar ? "text-yellow-400 animate-pulse" : "text-slate-500"} />
                            <span className={`text-sm font-bold ${candidate.isStar ? "text-yellow-100" : "text-slate-400"}`}>
                                Is Star?
                            </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={!!candidate.isStar}
                                onChange={(e) => {
                                    const isStar = e.target.checked;
                                    const updates: Partial<Body> = { isStar };
                                    if (isStar && candidate.mass < 500) {
                                        updates.mass = 2000;
                                        updates.radius = 35;
                                        updates.color = '#FDB813';
                                    }
                                    onUpdate(updates);
                                }}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                        </label>
                    </div>

                    {/* MASS */}
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300">Mass</span>
                            <span className="text-blue-300 font-mono">{candidate.mass}</span>
                        </div>
                        <input
                            type="range" min="0.001" max={candidate.isStar ? "10000" : "1000"} step="0.001"
                            value={candidate.mass}
                            onChange={(e) => onUpdate({ mass: Number(e.target.value), radius: Math.log(Number(e.target.value)) * 3 })}
                            className="w-full h-4 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>

                    {/* VELOCITY CONTROLS */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-300">Vel X</span>
                                <span className="text-emerald-300 font-mono">{candidate.velocity.x.toFixed(1)}</span>
                            </div>
                            <input
                                type="range" min="-8" max="8" step="0.1"
                                value={candidate.velocity.x}
                                onChange={(e) => onUpdate({ velocity: { ...candidate.velocity, x: Number(e.target.value) } })}
                                className="w-full h-4 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-300">Vel Y</span>
                                <span className="text-emerald-300 font-mono">{candidate.velocity.y.toFixed(1)}</span>
                            </div>
                            <input
                                type="range" min="-8" max="8" step="0.1"
                                value={candidate.velocity.y}
                                onChange={(e) => onUpdate({ velocity: { ...candidate.velocity, y: Number(e.target.value) } })}
                                className="w-full h-4 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                        </div>
                    </div>

                    {/* COLOR */}
                    <div>
                        <label className="block text-xs text-slate-400 mb-2">Color</label>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {['#EB4D4B', '#22A6B3', '#D980FA', '#F79F1F', '#FDB813', '#ffffff', '#3742fa'].map(c => (
                                <button
                                    key={c}
                                    onClick={() => onUpdate({ color: c })}
                                    style={{ backgroundColor: c }}
                                    className={`w-8 h-8 rounded-full flex-shrink-0 ${candidate.color === c ? 'ring-4 ring-white/50 scale-110' : 'opacity-60'}`}
                                />
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={onSpawn}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 mt-4 shadow-lg shadow-blue-900/50"
                    >
                        <Check size={20} /> Spawn {candidate.isStar ? 'Star' : 'Body'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="absolute top-20 right-4 w-72 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-none p-4 shadow-2xl z-30 cursor-auto"
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <MousePointer2 size={16} className="text-blue-400" />
                    Manual Orbit Build
                </h3>
                <button onClick={onCancel} className="text-slate-400 hover:text-white">
                    <X size={18} />
                </button>
            </div>

            <div className="text-xs text-slate-400 mb-4 bg-slate-800 p-2 rounded">
                Click anywhere on space to reposition. Adjust sliders to set orbit.
            </div>

            <div className="space-y-4">
                {/* NAME */}
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">Name</span>
                    </div>
                    <input
                        type="text"
                        value={candidate.name}
                        onChange={(e) => {
                            if (e.target.value == "Pomme") {
                                onUpdate({ mass: 1.048, radius: Math.log(1.048) * 3, name: e.target.value, color: "#ff0000" })
                            } else {
                                onUpdate({ name: e.target.value })
                            }
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none placeholder-slate-500"
                        maxLength={20}
                        placeholder="Body Name"
                    />
                </div>

                {/* STAR TOGGLE */}
                <div className="flex items-center justify-between bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                    <div className="flex items-center gap-2">
                        <Sun size={16} className={candidate.isStar ? "text-yellow-400 animate-pulse" : "text-slate-500"} />
                        <span className={`text-xs font-bold ${candidate.isStar ? "text-yellow-100" : "text-slate-400"}`}>
                            Is Star?
                        </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={!!candidate.isStar}
                            onChange={(e) => {
                                const isStar = e.target.checked;
                                const updates: Partial<Body> = { isStar };
                                if (isStar && candidate.mass < 500) {
                                    // Auto-upgrade stats for a star if currently small
                                    updates.mass = 2000;
                                    updates.radius = 35;
                                    updates.color = '#FDB813';
                                }
                                onUpdate(updates);
                            }}
                            className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-600"></div>
                    </label>
                </div>

                {/* MASS */}
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">Mass</span>
                        <span className="text-blue-300 font-mono">{candidate.mass}</span>
                    </div>
                    <input
                        type="range" min="1.001" max={candidate.isStar ? "10000" : "1000"} step="0.001"
                        value={candidate.mass}
                        onChange={(e) => {

                            onUpdate({ mass: Number(e.target.value), radius: Math.log(Number(e.target.value)) * 3 })
                        }}
                        className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>

                {/* VELOCITY X */}
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">Velocity X</span>
                        <span className="text-emerald-300 font-mono">{candidate.velocity.x.toFixed(2)}</span>
                    </div>
                    <input
                        type="range" min="-8" max="8" step="0.1"
                        value={candidate.velocity.x}
                        onChange={(e) => onUpdate({ velocity: { ...candidate.velocity, x: Number(e.target.value) } })}
                        className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                </div>

                {/* VELOCITY Y */}
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">Velocity Y</span>
                        <span className="text-emerald-300 font-mono">{candidate.velocity.y.toFixed(2)}</span>
                    </div>
                    <input
                        type="range" min="-8" max="8" step="0.1"
                        value={candidate.velocity.y}
                        onChange={(e) => onUpdate({ velocity: { ...candidate.velocity, y: Number(e.target.value) } })}
                        className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                </div>

                {/* PREDICTION STEPS */}
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">Prediction Trail</span>
                        <span className="text-purple-300 font-mono">{predictionSteps}</span>
                    </div>
                    <input
                        type="range" min="100" max="3000" step="100"
                        value={predictionSteps}
                        onChange={(e) => onStepsChange(Number(e.target.value))}
                        className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                </div>

                {/* COLOR */}
                <div>
                    <label className="block text-xs text-slate-400 mb-2">Color</label>
                    <div className="flex gap-2 flex-wrap">
                        {['#EB4D4B', '#22A6B3', '#D980FA', '#F79F1F', '#FDB813', '#ffffff', '#3742fa'].map(c => (
                            <button
                                key={c}
                                onClick={() => onUpdate({ color: c })}
                                style={{ backgroundColor: c }}
                                className={`w-6 h-6 rounded-full ${candidate.color === c ? 'ring-2 ring-white scale-110' : 'opacity-60'}`}
                            />
                        ))}
                    </div>
                </div>

                <button
                    onClick={onSpawn}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 mt-2"
                >
                    <Check size={16} /> Spawn {candidate.isStar ? 'Star' : 'Body'}
                </button>
            </div>
        </div>
    );
};

export default ManualCreationPanel;
