import { Body } from '../types';

/**
 * Draws magnetic field lines for a given body with refined aesthetics.
 * Optimized for performance: Reduced path resolution, removed expensive blurs, simplified layering.
 */
export const drawMagneticField = (
    ctx: CanvasRenderingContext2D,
    body: Body,
    cx: number,
    cy: number,
    scale: number,
    time: number,
) => {
    // Only draw for massive bodies (planets/stars)
    if (body.mass < 100) return;

    const screenX = cx + body.position.x * scale;
    const screenY = cy + body.position.y * scale;
    const radius = body.radius * scale;

    // Strict visibility check
    const maxFieldRadius = radius * 25;
    if (
        screenX + maxFieldRadius < 0 ||
        screenX - maxFieldRadius > ctx.canvas.width ||
        screenY + maxFieldRadius < 0 ||
        screenY - maxFieldRadius > ctx.canvas.height
    ) {
        return;
    }

    ctx.save();
    ctx.translate(screenX, screenY);

    // Animate sway
    const wobble = Math.sin(time * 0.1) * 0.2;
    ctx.rotate((body.angle || 0) + Math.PI / 2 + 0.2 + wobble);

    // Dynamic color based on body type/name, or default to a nice electric blue/purple
    const isEarth = body.name.includes("Earth");
    const baseColor = isEarth ? '#00e5ff' : (body.color || '#6366f1');

    // Optimization: Remove shadowBlur (expensive) and use globalCompositeOperation for glow
    // ctx.shadowBlur = 10; // REMOVED for performance
    // ctx.shadowColor = baseColor;
    ctx.lineWidth = 1.5;
    ctx.globalCompositeOperation = 'screen';

    // L-shells (distance at equator in radii)
    const shells = [3, 4.5, 6.5, 9, 13, 18, 25];

    shells.forEach((L_factor, i) => {
        const L = radius * L_factor;
        const opacity = Math.max(0.1, 0.6 * (1 - i / shells.length));

        // Create gradient for the stroke - Gradient is relatively cheap compared to blur
        const gradient = ctx.createRadialGradient(0, 0, radius, 0, 0, L);
        gradient.addColorStop(0, `${baseColor}00`); // Transparent at core
        gradient.addColorStop(0.2, `${baseColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, `${baseColor}00`); // Fade out at max extent

        ctx.strokeStyle = gradient;

        // Optimization: Reduced resolution (step 0.05 -> 0.15)
        // This cuts the number of line segments by 3x per line
        const step = 0.15;

        // Right side loop
        ctx.beginPath();
        let first = true;
        for (let theta = 0.2; theta < Math.PI - 0.2; theta += step) {
            const r = L * Math.pow(Math.sin(theta), 2);
            const x = r * Math.sin(theta);
            const y = r * Math.cos(theta);

            if (first) {
                ctx.moveTo(x, -y);
                first = false;
            } else {
                ctx.lineTo(x, -y);
            }
        }
        ctx.stroke();

        // Left side loop (Mirror)
        ctx.beginPath();
        first = true;
        for (let theta = 0.2; theta < Math.PI - 0.2; theta += step) {
            const r = L * Math.pow(Math.sin(theta), 2);
            const x = r * Math.sin(theta);
            const y = r * Math.cos(theta);

            if (first) {
                ctx.moveTo(-x, -y);
                first = false;
            } else {
                ctx.lineTo(-x, -y);
            }
        }
        ctx.stroke();
    });

    ctx.restore();
};

/**
 * Draws Van Allen radiation belts with volumetric effect.
 * Optimized: Reduced layers, removed blur.
 */
export const drawVanAllenBelt = (
    ctx: CanvasRenderingContext2D,
    body: Body,
    cx: number,
    cy: number,
    scale: number,
    time: number,
) => {
    if (body.mass < 100) return;

    const screenX = cx + body.position.x * scale;
    const screenY = cy + body.position.y * scale;
    const radius = body.radius * scale;

    const maxBeltRadius = radius * 8;
    if (
        screenX + maxBeltRadius < 0 ||
        screenX - maxBeltRadius > ctx.canvas.width ||
        screenY + maxBeltRadius < 0 ||
        screenY - maxBeltRadius > ctx.canvas.height
    ) {
        return;
    }

    ctx.save();
    ctx.translate(screenX, screenY);
    const wobble = Math.sin(time * 0.1) * 0.2;
    ctx.rotate((body.angle || 0) + Math.PI / 2 + 0.2 + wobble);

    ctx.globalCompositeOperation = 'screen'; // Additive blending for glow

    // Optimization: Dramatically reduced layer count.
    // Instead of 13+ passes, we do 4 total passes.

    // Inner Belt (Protons) - Red/Orange
    // Reduced from 5 to 2 layers
    drawBeltRegion(ctx, radius * 1.4, radius * 2.2, '#ef4444', 0.10);
    drawBeltRegion(ctx, radius * 1.6, radius * 2.0, '#ef4444', 0.15); // Core

    // Outer Belt (Electrons) - Blue/Cyan
    // Reduced from 9 to 2 layers
    drawBeltRegion(ctx, radius * 3.5, radius * 5.5, '#3b82f6', 0.08);
    drawBeltRegion(ctx, radius * 4.0, radius * 5.0, '#60a5fa', 0.12); // Core

    ctx.restore();
};

const drawBeltRegion = (
    ctx: CanvasRenderingContext2D,
    innerR: number,
    outerR: number,
    color: string,
    opacity: number
) => {
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    // Optimization: Removed shadowBlur
    // ctx.shadowBlur = 20;
    // ctx.shadowColor = color;

    // Optimization: Increased step size (0.1 -> 0.2)
    const step = 0.2;

    // Right side kidney
    ctx.beginPath();
    for (let theta = 0.3; theta < Math.PI - 0.3; theta += step) {
        const r = outerR * Math.pow(Math.sin(theta), 3);
        const x = r * Math.sin(theta);
        const y = r * Math.cos(theta);
        if (theta === 0.3) ctx.moveTo(x, -y);
        else ctx.lineTo(x, -y);
    }
    for (let theta = Math.PI - 0.3; theta >= 0.3; theta -= step) {
        const r = innerR * Math.pow(Math.sin(theta), 3);
        const x = r * Math.sin(theta);
        const y = r * Math.cos(theta);
        ctx.lineTo(x, -y);
    }
    ctx.closePath();
    ctx.fill();

    // Left side kidney (Mirror)
    ctx.beginPath();
    for (let theta = 0.3; theta < Math.PI - 0.3; theta += step) {
        // ... (Math logic same as above but -x) ... 
        // Optimization: To avoid redundant calculations, we could mirror the path in one go or precalc, 
        // but simple reducing the loop is enough.
        const r = outerR * Math.pow(Math.sin(theta), 3);
        const x = r * Math.sin(theta);
        const y = r * Math.cos(theta);
        if (theta === 0.3) ctx.moveTo(-x, -y);
        else ctx.lineTo(-x, -y);
    }
    for (let theta = Math.PI - 0.3; theta >= 0.3; theta -= step) {
        const r = innerR * Math.pow(Math.sin(theta), 3);
        const x = r * Math.sin(theta);
        const y = r * Math.cos(theta);
        ctx.lineTo(-x, -y);
    }
    ctx.closePath();
    ctx.fill();
};
