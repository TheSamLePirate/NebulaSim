import React, { useState } from 'react';
import { Body } from '../types';
import { X, Crosshair, Ban, Trash2, Sun, ArrowRightLeft, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import useIsMobile from '../hooks/useIsMobile';
import ObjectPlacementModal from './ObjectPlacementModal';
import { SurfaceObject } from '../types';

interface InfoPanelProps {
    body: Body | null;
    onClose: () => void;
    allBodies: Body[]; // For relative charts
    isFollowing: boolean;
    onToggleFollow: (id: string) => void;
    onDelete: (id: string) => void;
    onMakeStar: (id: string) => void;
    onPlaceObject: (bodyId: string, object: SurfaceObject) => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ body, onClose, allBodies, isFollowing, onToggleFollow, onDelete, onMakeStar, onPlaceObject }) => {
    if (!body) return null;

    const currentVel = Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y).toFixed(2);

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showPlacementModal, setShowPlacementModal] = useState(false);
    const isMobile = useIsMobile();

    // Prepare data for a comparison chart (Mass comparison relative to Earth approx)
    const chartData = allBodies
        .filter(b => b.mass < 1000) // Exclude sun for scale
        .map(b => ({
            name: b.name.substring(0, 3),
            mass: b.mass,
            color: b.color
        }));

    return (
        <div
            className={`fixed ${isMobile ? `${isCollapsed ? 'bottom-20 h-auto' : 'top-0 bottom-20'} left-0 right-0 w-full` : 'top-16 bottom-16 left-0 w-80'} bg-slate-900/90 backdrop-blur-md border-r border-slate-700 shadow-2xl overflow-hidden flex flex-col z-20 transition-all duration-300 ${!isMobile && isCollapsed ? 'w-12' : ''}`}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
        >

            <div className={`p-2 border-b border-slate-700 flex ${isCollapsed ? 'flex-col justify-start gap-4' : 'justify-between'} items-center bg-slate-800/50 transition-all`}>
                {!isCollapsed && (
                    <div className="flex items-center gap-2 truncate">
                        <div className={`w-3 h-3 rounded-full ${body.isStar ? 'animate-pulse' : ''}`} style={{ backgroundColor: body.color, boxShadow: body.isStar ? `0 0 8px ${body.color}` : 'none' }}></div>
                        <h2 className="text-lg font-bold text-white truncate max-w-[120px]">{body.name}</h2>
                    </div>
                )}

                <div className={`flex ${isCollapsed ? 'flex-col' : ''} items-center gap-2`}>
                    {!isCollapsed && (
                        <>
                            {!body.isStar && (
                                <button
                                    onClick={() => onMakeStar(body.id)}
                                    className="p-1.5 rounded-lg bg-yellow-600/30 text-yellow-500 hover:bg-yellow-600 hover:text-white transition-colors"
                                    title="Ignite into Star"
                                >
                                    <Sun size={14} />
                                </button>
                            )}

                            {!body.isStar && !body.isRocket && (
                                <button
                                    onClick={() => setShowPlacementModal(true)}
                                    className="p-1.5 rounded-lg bg-purple-600/30 text-purple-400 hover:bg-purple-600 hover:text-white transition-colors"
                                    title="Place Object"
                                >
                                    <MapPin size={14} />
                                </button>
                            )}

                            <button
                                onClick={() => onDelete(body.id)}
                                className="p-1.5 rounded-lg bg-red-600/30 text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                                title="Delete Body"
                            >
                                <Trash2 size={14} />
                            </button>

                            <button
                                onClick={() => onToggleFollow(body.id)}
                                className={`p-1.5 rounded-lg transition-colors ${isFollowing ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'}`}
                                title={isFollowing ? "Stop Following" : "Follow Body"}
                            >
                                {isFollowing ? <Ban size={14} /> : <Crosshair size={14} />}
                            </button>
                            <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded">
                                <X size={16} />
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                        title={isCollapsed ? "Expand" : "Collapse"}
                    >
                        {isCollapsed ? <ArrowRightLeft size={18} /> : <ArrowRightLeft size={18} className="rotate-180" />}
                    </button>

                    {isCollapsed && (
                        <div className="flex flex-col gap-4 items-center mt-2">
                            <button
                                onClick={() => onToggleFollow(body.id)}
                                className={`p-1.5 rounded-lg transition-colors ${isFollowing ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'}`}
                                title={isFollowing ? "Stop Following" : "Follow Body"}
                            >
                                {isFollowing ? <Ban size={14} /> : <Crosshair size={14} />}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {!isCollapsed && (
                <div className="p-4 overflow-y-auto custom-scrollbar">
                    <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                        {body.description}
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-slate-800/50 p-3 rounded-lg">
                            <div className="text-xs text-slate-500 mb-1">REAL MASS</div>
                            <div className="text-sm font-mono text-blue-300">{body.mass}</div>
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-lg">
                            <div className="text-xs text-slate-500 mb-1">DIAMETER</div>
                            <div className="text-sm font-mono text-blue-300">{body.radius * 2}</div>
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-lg">
                            <div className="text-xs text-slate-500 mb-1">ORBIT PERIOD</div>
                            <div className="text-sm font-mono text-emerald-300">{body.orbitPeriod}</div>
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-lg">
                            <div className="text-xs text-slate-500 mb-1">CURRENT VEL</div>
                            <div className="text-sm font-mono text-emerald-300">{currentVel} <span className="text-[10px]">sim-u/f</span></div>
                        </div>
                    </div>

                    <div className="mb-2">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Relative Mass Comparison</h3>
                        <div className="h-32 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <XAxis dataKey="name" hide />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                                        itemStyle={{ color: '#e2e8f0' }}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar dataKey="mass" radius={[4, 4, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {showPlacementModal && (
                <ObjectPlacementModal
                    body={body}
                    onClose={() => setShowPlacementModal(false)}
                    onPlace={(obj) => onPlaceObject(body.id, obj)}
                />
            )}
        </div>
    );
};

export default InfoPanel;
