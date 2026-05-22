import React, { useMemo } from 'react';
import { Month, StarPosition } from '../../types';

interface TelescopeViewProps {
  orbitRadius: number;
  starDistance: number;
  currentMonth: Month;
  starName?: string;
  angleJan: number;
  angleJuly: number;
}

export const TelescopeView: React.FC<TelescopeViewProps> = ({
  orbitRadius,
  starDistance,
  currentMonth,
  starName = "Étoile",
  angleJan,
  angleJuly
}) => {
  // Generate random background stars (only once)
  const backgroundStars = useMemo<StarPosition[]>(() => {
    return Array.from({ length: 50 }).map(() => ({
      x: Math.random() * 100, // percentage
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.3,
    }));
  }, []);

  // Use the actual input angle for the current month
  // Angles are passed in normalized (-180 to 180) from App.tsx
  const currentAngleDeg = currentMonth === Month.January ? angleJan : angleJuly;

  // DYNAMIC SCALING:
  // "Scale based on angle"
  // We want to ensure the star is visible, but also support "up to -50 +50".
  // Minimum FOV is 30 degrees (range -15 to +15) for visibility of small angles.
  // Dynamic FOV expands if the angle is larger.
  // Factor 2.4 ensures the star is at ~83% of the half-width max (leaving padding).
  const fovDegrees = Math.max(30, Math.abs(currentAngleDeg) * 2.4);

  // Calculate grid step based on zoom level to avoid clutter
  // If FOV is huge (zoomed out), use 10 degree steps.
  // If FOV is small (zoomed in), use 5 degree steps.
  let majorStep = 5;
  let minorStep = 1;

  if (fovDegrees > 120) {
    majorStep = 20;
    minorStep = 5;
  } else if (fovDegrees > 60) {
    majorStep = 10;
    minorStep = 2; // or 5
  }

  // Calculate percentage offset from center. 
  // +degrees -> +% (Right)
  // -degrees -> -% (Left)
  // Formula: (angle / fov) * 100
  // Result is relative to width. e.g. 0 deg = 0 shift.
  // CSS calc will be: 50% + shift%.
  const shiftPercentage = (currentAngleDeg / fovDegrees) * 100;

  // Clamp shift to keep it strictly inside the circle (visual bounds ~48% to leave room for star width)
  const clampedShift = Math.max(-48, Math.min(48, shiftPercentage));

  // Generate ticks centered around 0
  const halfFov = fovDegrees / 2;
  // Start from the lowest multiple of majorStep that is visible
  const startTick = Math.ceil(-halfFov / majorStep) * majorStep;
  const endTick = Math.floor(halfFov / majorStep) * majorStep;

  const ticks = [];
  for (let t = startTick; t <= endTick; t += majorStep) {
    ticks.push(t);
  }

  // Generate intermediate minor ticks if needed
  const allTicks = [];
  // Range covers full visible area
  const startAll = Math.ceil(-halfFov / minorStep) * minorStep;
  const endAll = Math.floor(halfFov / minorStep) * minorStep;

  for (let t = startAll; t <= endAll; t += minorStep) {
    allTicks.push(t);
  }

  return (
    <div className="relative w-full aspect-square max-w-md mx-auto">
      <div className="absolute -top-6 left-0 w-full text-center text-cyan-400 font-bold tracking-widest uppercase text-sm">
        Vue Simulée du Télescope
      </div>

      {/* Telescope Circle Container */}
      <div className="w-full h-full rounded-full overflow-hidden border-4 border-slate-600 bg-black relative shadow-2xl telescope-lens">

        {/* Crosshairs - Perfectly Centered */}
        <div className="absolute top-0 left-1/2 w-0.5 h-full bg-cyan-900/30 transform -translate-x-1/2 z-10 pointer-events-none"></div>
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-cyan-900/30 transform -translate-y-1/2 z-10 pointer-events-none"></div>

        {/* Horizontal Angle Graduation */}
        <div className="absolute top-1/2 left-0 w-full h-0 z-10 pointer-events-none">
          {allTicks.map((tickAngle) => {
            // Calculate left position percentage
            // 0 deg => 50%
            const leftPos = 50 + (tickAngle / fovDegrees) * 100;

            // Determine if major or minor tick
            const isMajor = tickAngle % majorStep === 0;
            const isZero = tickAngle === 0;

            // Skip rendering if too close to edge to avoid clipping ugliness
            if (leftPos < 2 || leftPos > 98) return null;

            return (
              <div
                key={tickAngle}
                className="absolute top-0 w-0 h-0"
                style={{ left: `${leftPos}%` }}
              >
                {/* Tick Mark - Centered on position using translate-x */}
                <div
                  className={`absolute top-0 left-0 -translate-x-1/2 ${isZero ? 'bg-cyan-400' : 'bg-white/50'}`}
                  style={{
                    width: isMajor ? '2px' : '1px',
                    height: isMajor ? '12px' : '6px',
                    marginTop: isMajor ? '-6px' : '-3px'
                  }}
                />

                {/* Label - Centered on position */}
                {isMajor && (
                  <div
                    className={`absolute top-2 left-0 -translate-x-1/2 text-[10px] font-mono whitespace-nowrap ${isZero ? 'text-cyan-400 font-bold' : 'text-white/50'}`}
                  >
                    {tickAngle > 0 ? `+${tickAngle}` : tickAngle}°
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Background Stars (Fixed at Infinity relative to aperture, simple simulation) */}
        {backgroundStars.map((star, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full opacity-40"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
            }}
          />
        ))}

        {/* Target Star (Moves based on measured Angle) */}
        {/* Perfectly centered logic: left 50% + shift, then translate back 50% of self width (using transform only, no negative margins) */}
        <div
          className="absolute w-6 h-6 bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.8)] transition-all duration-700 ease-out z-20"
          style={{
            left: `calc(50% + ${clampedShift}%)`,
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          {/* Star Glow */}
          <div className="absolute inset-0 bg-yellow-200 blur-sm rounded-full animate-pulse"></div>
        </div>

        {/* Label for Shift */}
        <div className="absolute bottom-8 w-full text-center z-20 pointer-events-none">
          <span className={`px-2 py-1 rounded bg-black/60 backdrop-blur-sm text-xs font-mono border border-slate-700 ${Math.abs(currentAngleDeg) > 0.01 ? 'text-yellow-400' : 'text-slate-400'}`}>
            Angle: {currentAngleDeg.toFixed(2)}°
          </span>
        </div>

        {/* FOV Indicator (Debug/Info style) */}
        <div className="absolute top-4 right-4 z-10 text-[9px] text-slate-600 font-mono pointer-events-none">
          FOV: {fovDegrees.toFixed(0)}°
        </div>

      </div>

      {/* Compass/Month Indicator on Telescope */}
      <div className="absolute bottom-0 right-0 transform translate-y-1/2 translate-x-1/4 bg-slate-800 border border-slate-600 rounded-full p-4 w-24 h-24 flex items-center justify-center shadow-xl z-30">
        <div className="text-center">
          <div className="text-[10px] text-slate-400 uppercase">Actuel</div>
          <div className="text-lg font-bold text-white">{currentMonth === Month.January ? 'JAN' : 'JUIL'}</div>
        </div>
      </div>
    </div>
  );
};