

import React, { useState } from 'react';
import { Body, CoMData } from '../types';
import { CircleDashed, ChevronDown, ChevronUp, AlertCircle, Crosshair } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';

interface CoMInfoPanelProps {
  coMData: CoMData;
  threshold: number;
  onThresholdChange: (val: number) => void;
}

const CoMInfoPanel: React.FC<CoMInfoPanelProps> = ({ coMData, threshold, onThresholdChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobile = useIsMobile();
  
  const { included, excluded, refinedCoM, realCoM } = coMData;

  return (
    <div 
        className={`absolute ${isMobile ? 'bottom-24 left-4 right-4 w-auto' : 'bottom-24 right-4 w-72'} bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-none p-3 shadow-2xl z-10 flex flex-col pointer-events-auto`}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
    >
        <div 
            className="flex justify-between items-center cursor-pointer select-none"
            onClick={() => setIsCollapsed(!isCollapsed)}
        >
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <CircleDashed size={16} />
                <span>Center of Mass Data</span>
            </div>
            {isCollapsed ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </div>

        {!isCollapsed && (
            <div className="mt-3 space-y-3">
                {/* Coordinates */}
                <div className="text-xs text-slate-400 border-b border-slate-700 pb-2 space-y-2">
                    <div className="bg-slate-800/50 p-2 rounded">
                        <div className="flex items-center gap-1 text-slate-500 font-bold mb-1">
                             <Crosshair size={10} /> REAL CoM (All Bodies)
                        </div>
                        <div className="flex justify-between pl-3">
                            <span>X: <span className="font-mono text-slate-300">{realCoM.x.toFixed(1)}</span></span>
                            <span>Y: <span className="font-mono text-slate-300">{realCoM.y.toFixed(1)}</span></span>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 p-2 rounded border-l-2 border-indigo-500">
                        <div className="flex items-center gap-1 text-indigo-400 font-bold mb-1">
                             <Crosshair size={10} /> REFINED CoM (Filtered)
                        </div>
                        <div className="flex justify-between pl-3">
                            <span>X: <span className="font-mono text-indigo-200">{refinedCoM.x.toFixed(1)}</span></span>
                            <span>Y: <span className="font-mono text-indigo-200">{refinedCoM.y.toFixed(1)}</span></span>
                        </div>
                    </div>
                </div>

                {/* Threshold Slider */}
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Distance Threshold</span>
                        <span className="text-blue-300 font-mono">{threshold}</span>
                    </div>
                    <input 
                        type="range" min="100" max="10000" step="100"
                        value={threshold}
                        onChange={(e) => onThresholdChange(Number(e.target.value))}
                        className="w-full accent-indigo-500 bg-slate-700 h-1 rounded-lg appearance-none"
                    />
                </div>

                {/* Lists */}
                <div>
                    <div className="text-xs font-bold text-slate-300 mb-1 flex justify-between">
                        <span>Included</span>
                        <span className="bg-slate-800 px-1.5 rounded text-slate-400">{included.length}</span>
                    </div>
                    <div className="max-h-24 overflow-y-auto custom-scrollbar bg-slate-800/50 rounded p-1">
                        {included.length === 0 ? (
                            <div className="text-[10px] text-slate-500 italic p-1">No bodies included</div>
                        ) : (
                            included.map(b => (
                                <div key={b.id} className="text-[10px] text-slate-400 px-1 py-0.5 truncate border-l-2 border-transparent hover:border-indigo-500 hover:bg-slate-700/50 hover:text-white transition-colors">
                                    {b.name}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div>
                    <div className="text-xs font-bold text-slate-300 mb-1 flex justify-between">
                        <span>Excluded (Outliers)</span>
                        <span className="bg-slate-800 px-1.5 rounded text-orange-400">{excluded.length}</span>
                    </div>
                    <div className="max-h-24 overflow-y-auto custom-scrollbar bg-slate-800/50 rounded p-1 border border-slate-700/50">
                        {excluded.length === 0 ? (
                            <div className="text-[10px] text-slate-500 italic p-1 flex items-center gap-1">
                                <CheckIcon /> All bodies inside threshold
                            </div>
                        ) : (
                            excluded.map(b => (
                                <div key={b.id} className="text-[10px] text-orange-300 px-1 py-0.5 truncate flex items-center gap-1 hover:bg-slate-700/50 transition-colors">
                                    <AlertCircle size={8} /> {b.name}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

const CheckIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
)

export default CoMInfoPanel;