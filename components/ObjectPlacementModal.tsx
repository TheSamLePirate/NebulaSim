import React, { useState, useEffect, useRef } from 'react';
import { SurfaceObject, Body } from '../types';
import { X, Check, Hexagon, Circle, Square, Triangle, Box, Fuel, Zap, Gem, Anchor } from 'lucide-react';

interface ObjectPlacementModalProps {
    body: Body;
    onClose: () => void;
    onPlace: (object: SurfaceObject) => void;
}

const OBJECT_TYPES = [
    { id: 'mineral', label: 'Mineral', icon: Gem, color: '#a855f7' },
    { id: 'artifact', label: 'Artifact', icon: Anchor, color: '#f59e0b' },
    { id: 'technology', label: 'Technology', icon: Zap, color: '#3b82f6' },
    { id: 'fuel', label: 'Fuel', icon: Fuel, color: '#ef4444' },
    { id: 'custom', label: 'Custom', icon: Box, color: '#ffffff' },
];

const DESIGNS = [
    { id: 'circle', icon: Circle },
    { id: 'square', icon: Square },
    { id: 'triangle', icon: Triangle },
    { id: 'hexagon', icon: Hexagon },
];

const ObjectPlacementModal: React.FC<ObjectPlacementModalProps> = ({ body, onClose, onPlace }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<SurfaceObject['type']>('mineral');
    const [color, setColor] = useState('#a855f7');
    const [mass, setMass] = useState(10);
    const [radius, setRadius] = useState(5);
    const [angle, setAngle] = useState(0); // Degrees for UI, convert to radians for data
    const [design, setDesign] = useState('circle');

    // Update color when type changes if it matches default
    useEffect(() => {
        const typeDef = OBJECT_TYPES.find(t => t.id === type);
        if (typeDef) {
            setColor(typeDef.color);
        }
    }, [type]);

    const handlePlace = () => {
        if (!name) {
            alert("Please enter a name.");
            return;
        }

        const newObject: SurfaceObject = {
            id: `obj_${Date.now()}`,
            type,
            name,
            color,
            mass,
            radius,
            angle: (angle * Math.PI) / 180,
            design
        };

        onPlace(newObject);
        onClose();
    };

    // Visual Preview
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        ctx.clearRect(0, 0, w, h);

        // Draw Planet Surface Arc
        ctx.beginPath();
        ctx.arc(cx, cy + 100, 100, Math.PI, 2 * Math.PI); // Big arc representing surface
        ctx.fillStyle = body.color;
        ctx.fill();

        // Draw Object
        // Calculate position based on angle (relative to "up" which is -90deg in canvas arc)
        // But here we just show it on top for preview, maybe rotate it slightly based on angle slider?
        // Let's just show it fixed on top for simplicity, or rotate the whole planet representation.

        // Actually, let's visualize the angle on a circle representing the planet
        const previewRadius = 60;

        // Draw Planet Circle
        ctx.beginPath();
        ctx.arc(cx, cy, previewRadius, 0, Math.PI * 2);
        ctx.strokeStyle = body.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = body.color + '33'; // Transparent fill
        ctx.fill();

        // Draw Object on Surface
        const rad = (angle * Math.PI) / 180;
        const objX = cx + Math.cos(rad) * previewRadius;
        const objY = cy + Math.sin(rad) * previewRadius;

        ctx.save();
        ctx.translate(objX, objY);
        ctx.rotate(rad + Math.PI / 2); // Rotate to align with surface normal

        ctx.fillStyle = color;
        ctx.beginPath();

        const size = radius * 2; // Scale for preview?

        if (design === 'square') {
            ctx.fillRect(-size / 2, -size / 2, size, size);
        } else if (design === 'triangle') {
            ctx.moveTo(0, -size / 2);
            ctx.lineTo(size / 2, size / 2);
            ctx.lineTo(-size / 2, size / 2);
            ctx.fill();
        } else if (design === 'hexagon') {
            // Simple hex approximation
            ctx.moveTo(size / 2, 0);
            for (let i = 1; i <= 6; i++) {
                ctx.lineTo(size / 2 * Math.cos(i * 2 * Math.PI / 6), size / 2 * Math.sin(i * 2 * Math.PI / 6));
            }
            ctx.fill();
        } else {
            // Circle
            ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Draw Angle Indicator
        ctx.strokeStyle = '#ffffff44';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(objX, objY);
        ctx.stroke();

    }, [body.color, color, radius, angle, design]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
                    <h2 className="text-xl font-bold text-white">Place Object on {body.name}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Preview */}
                    <div className="flex justify-center bg-slate-950 rounded-lg p-4 border border-slate-800">
                        <canvas ref={canvasRef} width={200} height={200} />
                    </div>

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                placeholder="Object Name"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
                            <div className="grid grid-cols-5 gap-2">
                                {OBJECT_TYPES.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setType(t.id as any)}
                                        className={`flex flex-col items-center justify-center p-2 rounded border ${type === t.id ? 'bg-slate-800 border-blue-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                                    >
                                        <t.icon size={16} style={{ color: t.color }} />
                                        <span className="text-[10px] mt-1">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Appearance */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Color</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="h-9 w-12 bg-transparent border-0 p-0 cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 text-xs text-white font-mono"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Design</label>
                            <div className="flex gap-2">
                                {DESIGNS.map(d => (
                                    <button
                                        key={d.id}
                                        onClick={() => setDesign(d.id)}
                                        className={`p-2 rounded border ${design === d.id ? 'bg-slate-800 border-blue-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                                    >
                                        <d.icon size={16} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Physics Properties */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Mass ({mass} units)</label>
                            <input
                                type="range"
                                min="1"
                                max="1000"
                                value={mass}
                                onChange={(e) => setMass(Number(e.target.value))}
                                className="w-full accent-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Radius ({radius} units)</label>
                            <input
                                type="range"
                                min="1"
                                max="50"
                                value={radius}
                                onChange={(e) => setRadius(Number(e.target.value))}
                                className="w-full accent-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Angle ({angle}°)</label>
                            <input
                                type="range"
                                min="0"
                                max="360"
                                value={angle}
                                onChange={(e) => setAngle(Number(e.target.value))}
                                className="w-full accent-blue-500"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handlePlace}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                        <Check size={18} />
                        Place Object
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ObjectPlacementModal;
