import React, { useState, useMemo } from 'react';
import { Month } from '../types';
import { TopDownView } from './Parallaxe/TopDownView';
import { TelescopeView } from './Parallaxe/TelescopeView';
import { Calculator, Info, Orbit, Settings } from 'lucide-react';

const Parralaxe: React.FC = () => {
    // State
    const [orbitRadius, setOrbitRadius] = useState<number>(1); // 1 meter default
    const [currentMonth, setCurrentMonth] = useState<Month>(Month.January);

    // Naming State
    const [sunName, setSunName] = useState("Soleil");
    const [earthName, setEarthName] = useState("Terre");
    const [starName, setStarName] = useState("Étoile");

    // Input States (Initialize with a valid example: r=1, d=10 => angle ~5.71)
    const [angleJanInput, setAngleJanInput] = useState<string>('5.71');
    const [angleJulyInput, setAngleJulyInput] = useState<string>('354.29'); // 354.29 is approx -5.71

    // Helper: Normalize angle to [-180, 180]
    // e.g., 350 -> -10
    const normalizeAngle = (deg: number) => {
        return ((deg + 180) % 360 + 360) % 360 - 180;
    };

    // Parse angles safely
    const rawAngleJan = parseFloat(angleJanInput);
    const rawAngleJuly = parseFloat(angleJulyInput);

    // Use normalized angles for all calculations and logic
    // We handle NaN by defaulting to 0 for the calculation, but allowing input state to be whatever
    const angleJan = isNaN(rawAngleJan) ? 0 : normalizeAngle(rawAngleJan);
    const angleJuly = isNaN(rawAngleJuly) ? 0 : normalizeAngle(rawAngleJuly);

    // Derived Calculation
    const calculationResult = useMemo(() => {
        const a1 = angleJan;
        const a2 = angleJuly;

        // Logic: Total shift is difference between angles. Parallax angle p is half that.
        const totalShift = Math.abs(a1 - a2);
        const p = totalShift / 2;

        // Avoid division by zero or extremely small angles
        if (p <= 0.0001) return { distance: 0, parallaxAngle: 0, isValid: false };

        const pRad = (p * Math.PI) / 180;
        // d = r / tan(p)
        const dist = orbitRadius / Math.tan(pRad);

        return { distance: dist, parallaxAngle: p, isValid: true };
    }, [angleJan, angleJuly, orbitRadius]);

    // We clamp the distance for visualization purposes only
    const visualDistance = calculationResult.isValid
        ? Math.min(100, Math.max(1, calculationResult.distance))
        : 10;

    return (
        <div className="absolute top-0 left-0 w-full h-full z-[70] flex flex-col bg-slate-950 text-slate-100 font-sans overflow-hidden">

            {/* 1. Header & Controls Area - Fixed Height */}
            <div className="flex-none bg-slate-900 border-b border-slate-800 shadow-xl z-20">

                {/* Title Bar */}
                <header className="px-6 py-3 flex items-center justify-between border-b border-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-900/20">
                            <Calculator className="text-white" size={20} />
                        </div>
                        <h1 className="text-lg font-bold tracking-tight text-white">Calculateur de Parallaxe <span className="text-slate-500 font-normal text-sm ml-2">| Édition Salle de Concert</span></h1>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                        <Info size={14} /> Mesurez les angles, trouvez la distance.
                    </div>
                </header>

                {/* Naming Configuration Row */}
                <div className="px-6 py-2 bg-slate-900/50 border-b border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <div className="flex items-center gap-2 text-xs text-slate-400 uppercase font-bold tracking-wider">
                        <Settings size={12} /> Noms des Objets :
                    </div>
                    <input
                        value={sunName} onChange={(e) => setSunName(e.target.value)}
                        className="bg-slate-800 border-slate-700 border rounded px-2 py-1 text-xs text-orange-300 focus:border-orange-500 outline-none" placeholder="Nom du Soleil"
                    />
                    <input
                        value={earthName} onChange={(e) => setEarthName(e.target.value)}
                        className="bg-slate-800 border-slate-700 border rounded px-2 py-1 text-xs text-cyan-300 focus:border-cyan-500 outline-none" placeholder="Nom de la Terre"
                    />
                    <input
                        value={starName} onChange={(e) => setStarName(e.target.value)}
                        className="bg-slate-800 border-slate-700 border rounded px-2 py-1 text-xs text-yellow-300 focus:border-yellow-500 outline-none" placeholder="Nom de l'Étoile"
                    />
                </div>

                {/* Controls Grid */}
                <div className="p-4 grid grid-cols-12 gap-6 items-center max-w-7xl mx-auto w-full">

                    {/* Input 1: Orbit Radius */}
                    <div className="col-span-3 flex flex-col justify-center border-r border-slate-800 pr-6">
                        <label className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Orbit size={14} /> Base (Rayon Orbite)
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min="0.5"
                                max="5"
                                step="0.1"
                                value={orbitRadius}
                                onChange={(e) => setOrbitRadius(parseFloat(e.target.value))}
                                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                            <span className="text-xl font-mono font-bold text-white w-16 text-right">{orbitRadius}m</span>
                        </div>
                    </div>

                    {/* Input 2: Angles */}
                    <div className="col-span-5 flex items-center gap-4 border-r border-slate-800 pr-6">
                        <div className="flex-1">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Angle Janvier (°)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={angleJanInput}
                                    onChange={(e) => setAngleJanInput(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white font-mono focus:border-cyan-500 outline-none"
                                    placeholder="0.0"
                                />
                                <div className="absolute right-3 top-2.5 text-xs text-slate-500 pointer-events-none">
                                    {angleJan !== rawAngleJan ? `≈ ${angleJan.toFixed(1)}°` : ''}
                                </div>
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Angle Juillet (°)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={angleJulyInput}
                                    onChange={(e) => setAngleJulyInput(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white font-mono focus:border-cyan-500 outline-none"
                                    placeholder="0.0"
                                />
                                <div className="absolute right-3 top-2.5 text-xs text-slate-500 pointer-events-none">
                                    {angleJuly !== rawAngleJuly ? `≈ ${angleJuly.toFixed(1)}°` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Result: Distance */}
                    <div className="col-span-4 pl-4 flex items-center justify-between bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                        <div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider">Distance Calculée</div>
                            <div className="text-[10px] text-slate-500">d = r / tan(p)</div>
                        </div>
                        <div className="text-right">
                            {calculationResult.isValid ? (
                                <>
                                    <span className="text-3xl font-mono font-bold text-yellow-400">{calculationResult.distance.toFixed(2)}</span>
                                    <span className="text-yellow-600 ml-1 font-bold">m</span>
                                </>
                            ) : (
                                <span className="text-red-400 font-mono text-sm">Entrées Invalides</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Visuals Area - Flex Grow to Fill Screen */}
            <div className="flex-1 relative grid grid-cols-2 bg-slate-950 overflow-hidden">

                {/* Left: Schema (Map View) */}
                <div className="relative border-r border-slate-800 p-4 flex flex-col">
                    <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur px-3 py-1 rounded border border-slate-700 text-xs font-medium text-slate-300">
                        1. La Scène (Vue de dessus)
                    </div>

                    {/* Month Toggles inside the view */}
                    <div className="absolute top-4 right-4 z-10 flex gap-1">
                        <button
                            onClick={() => setCurrentMonth(Month.January)}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${currentMonth === Month.January ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                        >
                            JAN
                        </button>
                        <button
                            onClick={() => setCurrentMonth(Month.July)}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${currentMonth === Month.July ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                        >
                            JUIL
                        </button>
                    </div>

                    <div className="flex-1 w-full h-full min-h-0">
                        <TopDownView
                            orbitRadius={orbitRadius}
                            starDistance={visualDistance}
                            currentMonth={currentMonth}
                            sunName={sunName}
                            earthName={earthName}
                            starName={starName}
                            angleJan={angleJan}
                            angleJuly={angleJuly}
                        />
                    </div>
                </div>

                {/* Right: Telescope View */}
                <div className="relative p-4 flex flex-col items-center justify-center bg-black/20">
                    <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur px-3 py-1 rounded border border-slate-700 text-xs font-medium text-slate-300">
                        2. Vue au Télescope
                    </div>

                    <div className="w-full max-w-[50vh] aspect-square relative">
                        <TelescopeView
                            orbitRadius={orbitRadius}
                            starDistance={visualDistance}
                            currentMonth={currentMonth}
                            starName={starName}
                            angleJan={angleJan}
                            angleJuly={angleJuly}
                        />
                    </div>

                    <div className="mt-6 text-center max-w-sm">
                        <div className="inline-flex items-center gap-2 bg-indigo-900/30 px-3 py-1.5 rounded-full border border-indigo-500/20">
                            <span className="text-indigo-400 text-xs font-bold uppercase">Vérification Visuelle</span>
                            <span className="text-indigo-200 text-xs">
                                {starName} se déplace de {calculationResult.isValid ? calculationResult.parallaxAngle.toFixed(2) : '--'}°
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Parralaxe;