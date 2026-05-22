import React from 'react';
import { FlightComputerModule } from '../../../types';

interface ModuleProps {
    module: FlightComputerModule;
}

const SystemMonitorModule: React.FC<ModuleProps> = ({ module }) => {
    const stats = module.systemMonitorStats;

    if (!stats) return <div className="text-xs text-slate-500 italic p-1">Collecting stats...</div>;

    const totalLogic = stats.modules.reduce((sum, m) => sum + (m.accumulatedLogicMs || 0), 0);
    const totalDraw = stats.modules.reduce((sum, m) => sum + (m.accumulatedDrawMs || 0), 0);
    const totalTime = totalLogic + totalDraw;

    // Heaviness check: If total CPU used > 1000ms in a 1000ms window, we are lagging hard.
    // Or if > 16.6ms * 60 = 1000ms.
    // Basically if totalTime close to 1000ms, it's 100% CPU usage.
    const isHeavy = totalTime > 900;

    return (
        <div className="mt-2 flex flex-col gap-1 w-full min-w-[220px]">
            {/* Totals Header */}
            <div className="grid grid-cols-3 gap-1 mb-1">
                <div className="bg-slate-800/80 p-1.5 rounded flex flex-col items-center border border-slate-700">
                    <div className="text-[9px] text-slate-400 font-bold uppercase">Total CPU</div>
                    <div className={`text-xs font-mono font-bold ${isHeavy ? 'text-red-400' : 'text-slate-200'}`}>
                        {totalTime.toFixed(0)}ms
                    </div>
                </div>
                <div className="bg-slate-800/80 p-1.5 rounded flex flex-col items-center border border-slate-700">
                    <div className="text-[9px] text-slate-400 font-bold uppercase">Logic</div>
                    <div className="text-xs font-mono font-bold text-emerald-400">
                        {totalLogic.toFixed(0)}ms
                    </div>
                </div>
                <div className="bg-slate-800/80 p-1.5 rounded flex flex-col items-center border border-slate-700">
                    <div className="text-[9px] text-slate-400 font-bold uppercase">Draw</div>
                    <div className="text-xs font-mono font-bold text-sky-400">
                        {totalDraw.toFixed(0)}ms
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-0.5 mt-1 max-h-[300px] overflow-y-auto no-scrollbar">
                {stats.modules.map(m => {
                    // Use precalculated values
                    const logicMs = m.accumulatedLogicMs || 0;
                    const drawMs = m.accumulatedDrawMs || 0;
                    const percent = m.percentOfTotal || 0;

                    // Bars relative to Total Time (so they sum to 100% visually if stacked)
                    const logicPercentInfo = totalTime > 0 ? (logicMs / totalTime) * 100 : 0;
                    const drawPercentInfo = totalTime > 0 ? (drawMs / totalTime) * 100 : 0;

                    return (
                        <div key={m.id} className="flex flex-col bg-slate-900/40 rounded p-1 hover:bg-slate-800/60 transition-colors">
                            <div className="flex justify-between items-center text-[10px] mb-0.5">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="font-mono text-amber-300 font-bold min-w-[32px]">
                                        {percent.toFixed(1)}%
                                    </span>
                                    <span className="text-slate-300 truncate max-w-[90px]" title={m.name || m.type}>
                                        {m.name || m.type}
                                    </span>
                                </div>

                                <div className="flex gap-2">
                                    <span className={`font-mono ${logicMs > 5 ? 'text-emerald-300' : 'text-slate-600'}`}>
                                        L:{logicMs.toFixed(0)}
                                    </span>
                                    <span className={`font-mono ${drawMs > 5 ? 'text-sky-300' : 'text-slate-600'}`}>
                                        D:{drawMs.toFixed(0)}
                                    </span>
                                </div>
                            </div>
                            {/* Stacked Bar Chart */}
                            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden flex">
                                <div
                                    className="h-full bg-emerald-500/70"
                                    style={{ width: `${Math.min(100, logicPercentInfo)}%` }}
                                />
                                <div
                                    className="h-full bg-sky-500/70"
                                    style={{ width: `${Math.min(100, drawPercentInfo)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="text-[9px] text-slate-600 px-1 pt-1 italic text-center w-full">
                Logic (L) includes inputs • Draw (D) includes canvas
            </div>
        </div>
    );
};

export default SystemMonitorModule;
