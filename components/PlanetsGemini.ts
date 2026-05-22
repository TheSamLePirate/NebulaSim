//import { CelestialBody, RenderOptions } from "../types";


import { Body, Vector2D, Particle, VisualConfig, PhysicsConfig, CoMData, FlightComputerModule, FlightComputerInput, RendezvousSolution } from '../types';


interface RenderOptions {
  primaryStar?: Body;
  visualConfig?: any;
  isGhost?: boolean;
  time?: number;
  forcedType?: string;
  dpr?: number;
}


//CelestialBody is Body plus planetType
interface CelestialBody extends Body {
  planetType?: string;
}

// ---------- CONSTANTS & PRESETS ----------

export const PlanetTypes = Object.freeze({
  DWARF: "dwarf",
  BARREN: "barren",
  EARTHLIKE: "earthlike",
  OCEAN: "ocean",
  DESERT: "desert",
  ICE: "ice",
  LAVA: "lava",
  GAS_GIANT: "gas_giant",
  ICE_GIANT: "ice_giant",
  RINGED_GAS: "ringed_gas",
  RINGED_ICE: "ringed_ice",
});

const PlanetPresets: Record<string, any> = Object.freeze({
  [PlanetTypes.DWARF]: {
    base: "#7b7f88",
    accent: "#5f646f",
    atmosphere: "rgba(170,190,220,0.15)",
    clouds: 0.0,
    noiseScale: 2.5,
    roughness: 0.8,
    craters: 0.8,
  },
  [PlanetTypes.BARREN]: {
    base: "#8b7560",
    accent: "#5f4a3a",
    atmosphere: "rgba(190,170,150,0.15)",
    clouds: 0.0,
    noiseScale: 1.5,
    roughness: 1.0,
    craters: 0.6,
  },
  [PlanetTypes.EARTHLIKE]: {
    base: "#1a468d",
    accent: "#2f8a54",
    accent2: "#8b7560",
    atmosphere: "rgba(60,160,255,0.45)",
    clouds: 0.75, // Higher cloud density
    noiseScale: 1.2,
    roughness: 0.6,
    craters: 0.05,
    iceCaps: 0.25,
    specular: true,
    cityLights: true,
  },
  [PlanetTypes.OCEAN]: {
    base: "#1f48a8",
    accent: "#1aa7a1",
    atmosphere: "rgba(100,210,255,0.5)",
    clouds: 0.55,
    noiseScale: 0.8,
    roughness: 0.3,
    craters: 0,
    specular: true,
  },
  [PlanetTypes.DESERT]: {
    base: "#e6ae6e",
    accent: "#a06030",
    atmosphere: "rgba(255,180,120,0.3)",
    clouds: 0.2,
    noiseScale: 1.8,
    roughness: 0.7,
    craters: 0.3,
  },
  [PlanetTypes.ICE]: {
    base: "#e0f0ff",
    accent: "#8cb0d0",
    atmosphere: "rgba(180,220,255,0.45)",
    clouds: 0.3,
    noiseScale: 1.5,
    roughness: 0.5,
    craters: 0.2,
    iceCaps: 0.8,
    specular: true,
  },
  [PlanetTypes.LAVA]: {
    base: "#2a1a14",
    accent: "#ff3300",
    atmosphere: "rgba(255,60,10,0.4)",
    clouds: 0.5,
    cloudColor: "rgba(30,20,20,0.9)",
    noiseScale: 2.0,
    roughness: 0.9,
    craters: 0.4,
    fissures: true,
    glow: true,
  },
  [PlanetTypes.GAS_GIANT]: {
    base: "#d4b483",
    accent: "#a06b3a",
    atmosphere: "rgba(240,220,190,0.35)",
    bands: 8,
    storms: 0.99, // High chance of storms
    clouds: 0.8,
  },
  [PlanetTypes.ICE_GIANT]: {
    base: "#7ac7d6",
    accent: "#2b5ea8",
    atmosphere: "rgba(170,235,255,0.4)",
    bands: 8,
    storms: 0.5,
    clouds: 0.0,
  },
  [PlanetTypes.RINGED_GAS]: {
    base: "#d0b089",
    accent: "#9b6b3e",
    atmosphere: "rgba(255,235,200,0.35)",
    bands: 10,
    storms: 0.7,
    rings: { colorA: "rgba(210,195,170,0.6)", colorB: "rgba(100,90,80,0.3)" },
  },
  [PlanetTypes.RINGED_ICE]: {
    base: "#a7d7ff",
    accent: "#3c7eb6",
    atmosphere: "rgba(190,240,255,0.45)",
    bands: 7,
    storms: 0.3,
    rings: { colorA: "rgba(210,230,255,0.65)", colorB: "rgba(120,160,210,0.25)" },
  },
});

const __planetTexCache = new Map<string, HTMLCanvasElement>();
const __cloudTexCache = new Map<string, HTMLCanvasElement>();

/**
 * High-fidelity Planet Renderer
 */
export function drawBeautifullPlanetGemini(
  ctx: CanvasRenderingContext2D,
  body: Body,
  screenX: number,
  screenY: number,
  visualRadius: number,
  {
    primaryStar = null,
    visualConfig = { showGlow: true, glowIntensity: 1 },
    isGhost = false,
    time = 0,
    forcedType = null,
    dpr = (typeof devicePixelRatio === "number" ? devicePixelRatio : 1),
  }: RenderOptions = {}
) {
  if (!Number.isFinite(visualRadius) || visualRadius <= 0) return;

  const type = forcedType || inferPlanetType(body);
  const preset = PlanetPresets[type] || PlanetPresets[PlanetTypes.BARREN];
  const seed = String(body.id ?? body.name ?? `${body.mass ?? 0}`);
  const rng = mulberry32(hashString(seed));

  // --- Lighting Calculations ---
  let sunAngle = -Math.PI / 4;
  if (primaryStar && primaryStar.position && body.position) {
    const dx = body.position.x - primaryStar.position.x;
    const dy = body.position.y - primaryStar.position.y;
    sunAngle = Math.atan2(dy, dx);
  }

  const lx = Math.cos(sunAngle + Math.PI); // Light Vector X (pointing TO sun)
  const ly = Math.sin(sunAngle + Math.PI); // Light Vector Y

  // --- Procedural Variation ---
  const hueShift = (rng() - 0.5) * 15;
  const satShift = (rng() - 0.5) * 0.1;
  const baseColor = body.color || tweakHsl(preset.base || body.color || "#888", hueShift, satShift, 0);
  const accentColor = tweakHsl(preset.accent || "#040404ff", hueShift, satShift, 0);
  const atmColor = preset.atmosphere || "rgba(140,200,255,0.2)";

  // Animation params
  const spinSpeed = 0.05 + rng() * 0.05;

  const rotation = ((rng() * Math.PI * 2) + time * (0.045 + rng() * 0.11)) % (Math.PI * 2);
  const tilt = (rng() - 0.5) * 0.4;

  // --- 1. Big Atmosphere Halo (Back) ---
  if (visualConfig?.showGlow && !isGhost) {
    // significantly larger glow for "big atmosphere" look
    const glowScale = preset.atmosphere ? 0.35 : 0.1;
    const glowRadius = visualRadius * (1.3 + glowScale * visualConfig.glowIntensity!);

    const glow = ctx.createRadialGradient(screenX, screenY, visualRadius * 0.85, screenX, screenY, glowRadius);
    glow.addColorStop(0, atmColor);
    glow.addColorStop(0.4, rgba(atmColor, 0.5));
    glow.addColorStop(1, "rgba(0,0,0,0)");

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(screenX, screenY, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1.0;
  }

  // --- 2. Rings (Back Section) ---
  if (preset.rings) {
    drawRings(ctx, screenX, screenY, visualRadius, {
      tilt,
      rotation,
      phase: "back",
      colorA: preset.rings.colorA,
      colorB: preset.rings.colorB,
      opacity: isGhost ? 0.2 : 0.9,
    }, rng);
  }

  // --- 3. Planet Surface ---
  ctx.save();
  ctx.beginPath();
  ctx.arc(screenX, screenY, visualRadius, 0, Math.PI * 2);
  ctx.clip();

  // Background Fill
  ctx.fillStyle = baseColor;
  ctx.fillRect(screenX - visualRadius, screenY - visualRadius, visualRadius * 2, visualRadius * 2);

  // Texture
  const texSize = Math.min(512, Math.max(128, Math.round(visualRadius * 4 * dpr)));
  const texture = getPlanetTexture(seed, type, preset, baseColor, accentColor, texSize);

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(rotation + tilt);
  ctx.globalAlpha = isGhost ? 0.4 : 1.0;
  ctx.drawImage(texture, -visualRadius * 1.01, -visualRadius * 1.01, visualRadius * 2.02, visualRadius * 2.02);
  ctx.restore();

  // --- 4. Volumetric Clouds (Two-Pass + Shadow) ---
  if (preset.clouds > 0) {
    const cloudTex = getCloudTexture(seed, preset, texSize, time);

    // Pass 0: Shadows (Offset by light direction)
    // Offset creates height illusion.
    const shadowDist = visualRadius * 0.04;
    const shaX = -lx * shadowDist;
    const shaY = -ly * shadowDist;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(rotation * 1.2 + tilt); // Lower clouds rotation
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 0.5;
    // Draw shadow slightly offset
    ctx.drawImage(cloudTex, -visualRadius + shaX, -visualRadius + shaY, visualRadius * 2, visualRadius * 2);
    ctx.restore();

    // Pass 1: Lower Clouds
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(rotation * 1.2 + tilt);
    ctx.globalCompositeOperation = "source-over"; // or screen for lighter clouds
    ctx.globalAlpha = isGhost ? 0.2 : (preset.clouds * 0.9);
    ctx.drawImage(cloudTex, -visualRadius, -visualRadius, visualRadius * 2, visualRadius * 2);
    ctx.restore();

    // Pass 2: Upper Volumetric Clouds (Wispy, Parallax)
    // We scale them slightly up and rotate them slightly differently to simulate a higher layer
    ctx.save();
    ctx.translate(screenX, screenY);
    // Rotate faster or with phase shift
    ctx.rotate(rotation * 1.35 + tilt + 1.0);
    // Scale up to look "above"
    ctx.scale(1.03, 1.03);
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = isGhost ? 0.1 : (preset.clouds * 0.4);
    ctx.drawImage(cloudTex, -visualRadius, -visualRadius, visualRadius * 2, visualRadius * 2);
    ctx.restore();
  }

  // C. Specular Highlight
  if (preset.specular && !isGhost) {
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.5;
    const specX = screenX - lx * visualRadius * 0.5;
    const specY = screenY - ly * visualRadius * 0.5;
    const specGrad = ctx.createRadialGradient(specX, specY, 0, specX, specY, visualRadius * 0.5);
    specGrad.addColorStop(0, "white");
    specGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = specGrad;
    ctx.fillRect(screenX - visualRadius, screenY - visualRadius, visualRadius * 2, visualRadius * 2);
  }

  // --- 5. Shading & Terminator (The "3D" Look) ---

  // A. Atmospheric Rim (stronger inside now)
  ctx.globalCompositeOperation = "screen";
  const rimSize = visualRadius * 0.25; // Bigger inner rim
  const rimGrad = ctx.createRadialGradient(screenX, screenY, visualRadius - rimSize, screenX, screenY, visualRadius);
  rimGrad.addColorStop(0, "rgba(0,0,0,0)");
  rimGrad.addColorStop(0.3, rgba(atmColor, 0.2));
  rimGrad.addColorStop(1, atmColor);
  ctx.fillStyle = rimGrad;
  ctx.globalAlpha = isGhost ? 0.2 : 0.8;
  ctx.fillRect(screenX - visualRadius, screenY - visualRadius, visualRadius * 2, visualRadius * 2);

  // B. Terminator (Mid-Planet Shift)
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = isGhost ? 0.5 : 1.0;

  // To get the terminator closer to the middle, we tighten the gradient transition.
  // We position the "light center" closer to the surface (or just outside) 
  // and make the gradient radius smaller so the falloff happens faster.

  // Shift light source further away to flatten the curve slightly, but adjust stops to bring darkness in.
  const lightDistFactor = Math.PI / 3; // Distance of light center from planet center (in radii)
  const lightX = screenX + lx * visualRadius * lightDistFactor;
  const lightY = screenY + ly * visualRadius * lightDistFactor;

  // The gradient moves from Light (Transparent/White) -> Dark (Black)
  // If we start the darkness earlier, we get a larger night side.
  // Radius of gradient:
  const gradStart = visualRadius * 0.3;
  const gradEnd = visualRadius * 2.1; // Reduced from 3.5 to make shadow encroach more

  const shadowGrad = ctx.createRadialGradient(lightX, lightY, gradStart, lightX, lightY, gradEnd);

  shadowGrad.addColorStop(0.0, "rgba(255,255,255,1)"); // Fully lit
  shadowGrad.addColorStop(0.40, "rgba(220,220,220,1)"); // Start falloff

  if (preset.atmosphere) {
    shadowGrad.addColorStop(0.48, "#ffbba0"); // Sunset
    shadowGrad.addColorStop(0.53, "#2a1a40"); // Twilight
  } else {
    shadowGrad.addColorStop(0.5, "#555");
  }

  shadowGrad.addColorStop(0.85, "black"); // Full Night

  ctx.fillStyle = shadowGrad;
  ctx.fillRect(screenX - visualRadius * 2, screenY - visualRadius * 2, visualRadius * 4, visualRadius * 4);



  // D. City Lights (Night Side)
  if (preset.cityLights && !isGhost) {
    const lightsTex = getCityLightsTexture(seed, texSize);
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(rotation + tilt);
    ctx.globalCompositeOperation = "color-dodge"; // Brighter lights
    ctx.globalAlpha = 0.9;
    ctx.drawImage(lightsTex, -visualRadius, -visualRadius, visualRadius * 2, visualRadius * 2);
    ctx.restore();
  }

  ctx.restore(); // End Planet Clip

  // --- 6. Rings (Front Section) ---
  if (preset.rings) {
    drawRings(ctx, screenX, screenY, visualRadius, {
      tilt,
      rotation,
      phase: "front",
      colorA: preset.rings.colorA,
      colorB: preset.rings.colorB,
      opacity: isGhost ? 0.2 : 0.9,
    }, rng);
  }
}

// ---------- HELPERS & GENERATORS ----------

function inferPlanetType(body: CelestialBody): string {
  if (body.planetType && PlanetPresets[body.planetType]) return body.planetType;

  const seed = String(body.name ?? body.mass);
  const r = mulberry32(hashString(seed));
  const m = body.mass || 0;

  if (body.name.includes("Earth") || body.name.includes("Terre")) return PlanetTypes.EARTHLIKE;
  if (body.name.includes("Jupiter") || body.name.includes("Jupiter")) return PlanetTypes.GAS_GIANT

  if (m > 300) return r() > 0.5 ? PlanetTypes.GAS_GIANT : PlanetTypes.RINGED_GAS;
  if (m > 100) return r() > 0.5 ? PlanetTypes.ICE_GIANT : PlanetTypes.RINGED_ICE;

  const roll = r();
  if (roll < 0.1) return PlanetTypes.LAVA;
  if (roll < 0.3) return PlanetTypes.DESERT;
  if (roll < 0.5) return PlanetTypes.ICE;
  if (roll < 0.7) return PlanetTypes.OCEAN;
  if (roll < 0.85) return PlanetTypes.EARTHLIKE;

  return PlanetTypes.BARREN;
}

function getPlanetTexture(seed: string, type: string, preset: any, baseColor: string, accentColor: string, size: number) {
  const key = `${seed}|${type}|${size}`;
  if (__planetTexCache.has(key)) return __planetTexCache.get(key)!;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rng = mulberry32(hashString(seed));

  const R = size / 2;
  ctx.translate(R, R);

  // 1. Base Fill
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();

  if (preset.bands) {
    generateGasBands(ctx, R, preset, baseColor, accentColor, rng);
  } else {
    generateTerrestrialSurface(ctx, R, type, preset, baseColor, accentColor, rng);
  }

  __planetTexCache.set(key, canvas);
  return canvas;
}

function getCloudTexture(seed: string, preset: any, size: number, time: number) {
  const key = `${seed}|clouds|${size}`;
  if (__cloudTexCache.has(key)) return __cloudTexCache.get(key)!;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const R = size / 2;
  ctx.translate(R, R);


  const rng = mulberry32(hashString(seed + "clouds"));

  const noiseFn = createNoise2D(rng);

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  const scale = 3.5;
  const cutoff = 0.35; // Lower cutoff for more clouds


  //move the noise with time
  const t = time * 10;


  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x - size / 2) / (size / 2);
      const ny = (y - size / 2) / (size / 2);
      const d = Math.sqrt(nx * nx + ny * ny);

      if (d >= 1) continue;

      // Simple UV mapping with distortion
      const u = nx * scale;
      const v = ny * scale;

      let n = fbm(u + t, v + t, 5, noiseFn);
      n = (n + 1) / 2;

      if (n > cutoff) {
        // Smooth fade alpha
        const alpha = Math.min(1, (n - cutoff) / (1 - cutoff) * 1.5);
        const idx = (y * size + x) * 4;
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = Math.floor(alpha * 255);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  ctx.globalCompositeOperation = "destination-in";
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();

  __cloudTexCache.set(key, canvas);
  return canvas;
}

function getCityLightsTexture(seed: string, size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const R = size / 2;
  ctx.translate(R, R);
  const rng = mulberry32(hashString(seed + "lights"));

  for (let i = 0; i < 500; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = rng() * R * 0.95;
    const cx = Math.cos(angle) * dist;
    const cy = Math.sin(angle) * dist;
    const r = rng() * (size * 0.1);

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, "rgba(255, 230, 180, 1)");
    grad.addColorStop(1, "rgba(255, 230, 180, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "destination-in";
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

// --- GENERATION IMPLS ---

function generateTerrestrialSurface(ctx: CanvasRenderingContext2D, R: number, type: string, preset: any, base: string, accent: string, rng: () => number) {
  const size = R * 2;
  const noiseFn = createNoise2D(rng);
  const scale = preset.noiseScale || 2.0;

  const imgData = ctx.createImageData(size, size);
  const d = imgData.data;

  const cBase = parseToRgb(base);
  const cAccent = parseToRgb(accent);
  const cAccent2 = preset.accent2 ? parseToRgb(preset.accent2) : cAccent;
  const isLava = type === PlanetTypes.LAVA;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x - size / 2) / R;
      const ny = (y - size / 2) / R;
      const distSq = nx * nx + ny * ny;
      if (distSq >= 1) continue;

      let n = fbm(nx * scale, ny * scale, 5, noiseFn);

      if (preset.roughness > 0.8) {
        n = Math.abs(n);
      }

      const idx = (y * size + x) * 4;
      let r, g, b;

      if (n < -0.1 && type === PlanetTypes.EARTHLIKE) {
        const depth = Math.abs(n);
        r = lerp(cBase.r, 10, depth);
        g = lerp(cBase.g, 10, depth);
        b = lerp(cBase.b, 50, depth);
      } else if (n < 0.05 && type === PlanetTypes.EARTHLIKE) {
        r = 194; g = 178; b = 128; // Sand
      } else {
        let mix = (n + 1) / 2;
        if (isLava && n > 0.6) {
          r = 255; g = 200; b = 50;
        } else {
          if (type === PlanetTypes.EARTHLIKE && n > 0.6) {
            const snow = (n - 0.6) * 3;
            r = lerp(cAccent2.r, 255, snow);
            g = lerp(cAccent2.g, 255, snow);
            b = lerp(cAccent2.b, 255, snow);
          } else {
            r = lerp(cBase.r, cAccent.r, mix);
            g = lerp(cBase.g, cAccent.g, mix);
            b = lerp(cBase.b, cAccent.b, mix);
          }
        }
      }

      if (preset.iceCaps) {
        const polarDist = Math.abs(ny);
        const iceThreshold = 0.95 - preset.iceCaps * 0.4;
        if (polarDist + n * 0.1 > iceThreshold) {
          r = 240; g = 245; b = 255;
        }
      }

      const relief = 0.9 + 0.2 * n;

      d[idx] = r * relief;
      d[idx + 1] = g * relief;
      d[idx + 2] = b * relief;
      d[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

function generateGasBands(ctx: CanvasRenderingContext2D, R: number, preset: any, base: string, accent: string, rng: () => number) {
  const size = R * 2;
  const numBands = preset.bands || 10;
  const bands = [];

  for (let i = 0; i < numBands; i++) {
    bands.push({
      color: rng() > 0.5 ? base : accent,
      width: 1 / numBands,
      turbulence: rng()
    });
  }

  const cBase = parseToRgb(base);
  const cAccent = parseToRgb(accent);

  const imgData = ctx.createImageData(size, size);
  const d = imgData.data;
  const noiseFn = createNoise2D(rng);

  for (let y = 0; y < size; y++) {
    const ny = (y - size / 2) / R;

    // Turbulence
    const bandNoise = noiseFn(0, ny * 5);
    const yPerturbed = ny + bandNoise * 0.05;
    const u = (yPerturbed + 1) / 2;

    // Color mixing
    const t = (Math.sin(ny * 25 + bandNoise * 7) + 1) / 2;

    for (let x = 0; x < size; x++) {
      const nx = (x - size / 2) / R;
      if (nx * nx + ny * ny >= 1) continue;

      // Swirl noise
      const detail = fbm(nx * 4, ny * 12 + bandNoise, 3, noiseFn);

      const col = lerpColor(cBase, cAccent, t + detail * 0.25);

      const idx = (y * size + x) * 4;
      d[idx] = col.r;
      d[idx + 1] = col.g;
      d[idx + 2] = col.b;
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Multiple Storms
  const stormProb = preset.storms || 0;
  if (stormProb > 0) {
    // Draw 1 to 3 storms if high probability
    const numStorms = Math.max(1, Math.floor(rng() * 3));

    for (let i = 0; i < numStorms; i++) {
      if (rng() > stormProb && i > 0) continue; // Always at least one if prob high?

      const sx = (rng() - 0.5) * R * 1.2;
      const sy = (rng() - 0.5) * R * 0.6;
      const sr = R * (0.15 + rng() * 0.2);

      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      ctx.translate(size / 2 + sx, size / 2 + sy);
      // Rotate swirl
      ctx.rotate(rng() * Math.PI);
      ctx.scale(1.5, 0.9);

      const stormGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, sr);
      stormGrad.addColorStop(0, tweakHsl(accent, 15, 0.2, -0.1));
      stormGrad.addColorStop(0.6, tweakHsl(base, 0, 0.1, -0.05));
      stormGrad.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = stormGrad;
      ctx.beginPath();
      ctx.arc(0, 0, sr, 0, Math.PI * 2);
      ctx.fill();

      // Swirl lines
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, sr * 0.7, 0, Math.PI * 1.5);
      ctx.stroke();

      ctx.restore();
    }
  }
}

function drawRings(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, { tilt, rotation, phase, colorA, colorB, opacity }: any, rng: () => number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt + Math.PI / 12);
  ctx.scale(1, 0.3);

  const innerR = r * 1.4;
  const outerR = r * 2.5;

  ctx.beginPath();
  if (phase === "back") {
    ctx.rect(-outerR, -outerR, outerR * 2, outerR);
  } else {
    ctx.rect(-outerR, 0, outerR * 2, outerR);
  }
  ctx.clip();

  const numRings = 40;
  ctx.globalAlpha = opacity;

  for (let i = 0; i < numRings; i++) {
    const t = i / numRings;
    const curR = innerR + (outerR - innerR) * t;
    const color = i % 2 === 0 ? colorA : colorB;

    ctx.beginPath();
    ctx.arc(0, 0, curR, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = (outerR - innerR) / numRings * 1.5;
    ctx.globalAlpha = opacity * (0.5 + 0.5 * Math.sin(t * 10));
    ctx.stroke();
  }

  ctx.restore();
}

// ---------- NOISE & MATH ----------

function createNoise2D(rng: () => number) {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 0; i < 256; i++) {
    const r = Math.floor(rng() * 256);
    const tmp = p[i]; p[i] = p[r]; p[r] = tmp;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  return function (x: number, y: number) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = fade(x);
    const v = fade(y);
    const A = perm[X] + Y, B = perm[X + 1] + Y;
    return lerp(
      lerp(grad(perm[A], x, y), grad(perm[B], x - 1, y), u),
      lerp(grad(perm[A + 1], x, y - 1), grad(perm[B + 1], x - 1, y - 1), u),
      v
    );
  };
}

function fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a: number, b: number, t: number) { return a + t * (b - a); }
function grad(hash: number, x: number, y: number) {
  const h = hash & 15;
  const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

function fbm(x: number, y: number, octaves: number, noiseFn: (x: number, y: number) => number) {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += noiseFn(x * freq, y * freq) * amp;
    freq *= 2;
    amp *= 0.5;
  }
  return val;
}

function hashString(str: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tweakHsl(color: string, dh: number, ds: number, dl: number) {
  const { r, g, b } = parseToRgb(color);
  return `rgb(${Math.max(0, Math.min(255, r + dl * 50))}, ${Math.max(0, Math.min(255, g + dl * 50))}, ${Math.max(0, Math.min(255, b + dl * 50))})`;
}

function rgba(color: string, alpha: number) {
  const { r, g, b } = parseToRgb(color);
  return `rgba(${r},${g},${b},${alpha})`;
}

function parseToRgb(color: string) {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const n = parseInt(hex.length === 3 ? hex.split("").map(c => c + c).join("") : hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  if (color.startsWith("rgb")) {
    const parts = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
    return { r: parts[0], g: parts[1], b: parts[2] };
  }
  return { r: 128, g: 128, b: 128 };
}

function lerpColor(c1: { r: number, g: number, b: number }, c2: { r: number, g: number, b: number }, t: number) {
  return {
    r: lerp(c1.r, c2.r, t),
    g: lerp(c1.g, c2.g, t),
    b: lerp(c1.b, c2.b, t)
  }
}
