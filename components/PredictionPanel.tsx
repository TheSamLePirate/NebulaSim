import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Activity, CheckSquare, Square, Rocket, Globe, Crosshair } from 'lucide-react';
import { Body } from '../types';
import useIsMobile from '../hooks/useIsMobile';

interface PredictionPanelProps {
    bodies: Body[];
    isEnabled: boolean;
    onToggleEnabled: (enabled: boolean) => void;
    predictionSteps: number;
    onStepsChange: (steps: number) => void;
    selectedBodyIds: string[];
    onToggleBody: (id: string) => void;
    followingBodyId: string | null;
    onFollowBody: (id: string) => void;
}

const PredictionPanel: React.FC<PredictionPanelProps> = ({
    bodies,
    isEnabled,
    onToggleEnabled,
    predictionSteps,
    onStepsChange,
    selectedBodyIds,
    onToggleBody,
    followingBodyId,
    onFollowBody
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isMobile = useIsMobile();

    const toggleExpanded = () => setIsExpanded(!isExpanded);

    return (
        <div className={`fixed ${isMobile ? 'top-0 left-0' : 'top-0 left-0 right-0'} z-50 flex flex-col items-center pointer-events-none`}>
            {/* Header / Main Control */}
            <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border-b border-x border-slate-700 rounded-b-lg shadow-xl px-4 py-1.5 flex items-center gap-4 transition-all hover:bg-slate-800/90">

                {/* Expand Toggle */}
                <button
                    onClick={toggleExpanded}
                    className="text-slate-400 hover:text-blue-400 transition-colors p-1"
                >
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                <div className="h-4 w-px bg-slate-700" />

                {/* Title & Global Toggle */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-slate-200 font-medium text-sm">
                        <Activity size={16} className={isEnabled ? "text-blue-400" : "text-slate-500"} />
                        <span>Trajectory Prediction</span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isEnabled}
                            onChange={(e) => onToggleEnabled(e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>

            {/* Expanded Config Body */}
            {isExpanded && (
                <div className="pointer-events-auto mt-0 bg-slate-900/95 backdrop-blur-md border-x border-b border-slate-700 rounded-b-lg shadow-2xl p-4 w-[320px] animate-in fade-in slide-in-from-top-2 duration-200">

                    {/* Steps Slider */}
                    <div className="mb-4">
                        <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-slate-400">Prediction Steps</span>
                            <span className="text-blue-300 font-mono">{predictionSteps}</span>
                        </div>
                        <input
                            type="range"
                            min="100"
                            max="400000"
                            step="100"
                            value={predictionSteps}
                            onChange={(e) => onStepsChange(Number(e.target.value))}
                            className="w-full accent-blue-500 bg-slate-700 h-1 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    <div className="h-px bg-slate-700/50 mb-3" />

                    {/* Bodies List */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Bodies to Trace
                        </div>

                        {bodies.length === 0 && (
                            <div className="text-xs text-slate-500 italic text-center py-2">No bodies in system</div>
                        )}

                        {bodies.map(body => {
                            const isSelected = selectedBodyIds.includes(body.id);
                            const isFollowing = followingBodyId === body.id;
                            return (
                                <div
                                    key={body.id}
                                    className={`flex items-center justify-between p-2 rounded-lg transition-colors border border-transparent
                                        ${isSelected ? 'bg-blue-500/10 border-blue-500/30' : 'hover:bg-slate-800'}`}
                                >
                                    <div
                                        className="flex items-center gap-2 overflow-hidden flex-1 cursor-pointer"
                                        onClick={() => onToggleBody(body.id)}
                                    >
                                        {body.isRocket ? (
                                            <Rocket size={14} className="text-orange-400 shrink-0" style={{ color: body.color }} />
                                        ) : (
                                            <Globe size={14} className="text-slate-400 shrink-0" style={{ color: body.color }} />
                                        )}
                                        <span className={`text-xs truncate ${isSelected ? 'text-blue-200' : 'text-slate-300'}`}>
                                            {body.name}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onFollowBody(body.id);
                                            }}
                                            className={`p-1 rounded transition-colors ${isFollowing ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-700 hover:text-blue-400'}`}
                                            title={isFollowing ? "Following" : "Follow"}
                                        >
                                            <Crosshair size={12} />
                                        </button>

                                        <div
                                            className={`cursor-pointer ${isSelected ? "text-blue-400" : "text-slate-600"}`}
                                            onClick={() => onToggleBody(body.id)}
                                        >
                                            {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PredictionPanel;
