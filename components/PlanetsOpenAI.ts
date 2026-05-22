// ---------- Ultra planet renderer (more detail + atmosphere) ----------

const PlanetTypes = Object.freeze({
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

const PlanetPresets = Object.freeze({
  [PlanetTypes.DWARF]:     { base:"#7b7f88", accent:"#5f646f", atmosphere:"rgba(170,190,220,0.12)", clouds:0.00, roughness:0.95, craters:34, fissures:0,  haze:0.10, spec:0.05 },
  [PlanetTypes.BARREN]:    { base:"#8b7560", accent:"#5f4a3a", atmosphere:"rgba(190,170,150,0.10)", clouds:0.00, roughness:1.00, craters:22, fissures:2,  haze:0.10, spec:0.07 },
  [PlanetTypes.EARTHLIKE]: { base:"#2b6aa8", accent:"#2f8a54", atmosphere:"rgba(120,180,255,0.45)", clouds:0.62, roughness:0.65, craters:6,  fissures:0,  iceCaps:0.22, haze:0.40, spec:0.22, cities:0.32 },
  [PlanetTypes.OCEAN]:     { base:"#1f5fa8", accent:"#1aa7a1", atmosphere:"rgba(135,200,255,0.48)", clouds:0.40, roughness:0.35, craters:0,  fissures:0,  haze:0.45, spec:0.30 },
  [PlanetTypes.DESERT]:    { base:"#c99a5c", accent:"#8d5a2b", atmosphere:"rgba(255,210,150,0.22)", clouds:0.14, roughness:0.90, craters:12, fissures:0,  haze:0.20, spec:0.12 },
  [PlanetTypes.ICE]:       { base:"#cfe8ff", accent:"#86b6e2", atmosphere:"rgba(180,220,255,0.55)", clouds:0.18, roughness:0.70, craters:10, fissures:0,  iceCaps:0.62, haze:0.48, spec:0.18, aurora:0.55 },
  [PlanetTypes.LAVA]:      { base:"#3a2a24", accent:"#ff5a2a", atmosphere:"rgba(255,120,80,0.28)",  clouds:0.00, roughness:0.95, craters:4,  fissures:12, haze:0.18, spec:0.10, lavaGlow:0.85 },
  [PlanetTypes.GAS_GIANT]: { base:"#caa77a", accent:"#a06b3a", atmosphere:"rgba(255,230,190,0.34)", bands:11, storms:1, clouds:0.00, haze:0.30, spec:0.15 },
  [PlanetTypes.ICE_GIANT]: { base:"#7ac7d6", accent:"#246fa8", atmosphere:"rgba(170,235,255,0.38)", bands:9,  storms:1, clouds:0.00, haze:0.34, spec:0.18 },
  [PlanetTypes.RINGED_GAS]:{ base:"#d0b089", accent:"#9b6b3e", atmosphere:"rgba(255,235,200,0.34)", bands:10, storms:1, clouds:0.00, haze:0.32, spec:0.16,
                            rings:{ colorA:"rgba(210,195,170,0.65)", colorB:"rgba(155,140,120,0.28)" } },
  [PlanetTypes.RINGED_ICE]:{ base:"#a7d7ff", accent:"#2c76b6", atmosphere:"rgba(190,240,255,0.44)", bands:8,  storms:0, clouds:0.00, haze:0.36, spec:0.18,
                            rings:{ colorA:"rgba(210,230,255,0.70)", colorB:"rgba(120,160,210,0.22)" } },
});

const __planetTexCache = new Map();
const __planetCloudCache = new Map();
const __planetNoiseCache = new Map();

// Add `dominantHex` argument (ex: "#ccffaa") and it becomes the planet dominant color.

export function drawBeautifulPlanetOpenAi(
  ctx,
  body,
  screenX,
  screenY,
  visualRadius,
  dominantHex, // <--- NEW: "#ccffaa" (or null/undefined to fallback)
  {
    primaryStar = null,
    visualConfig = { showGlow: true, glowIntensity: 1 },
    isGhost = false,
    time = 0,
    forcedType = null,
    dpr = (typeof devicePixelRatio === "number" ? devicePixelRatio : 1),
  } = {}
) {
  if (!Number.isFinite(visualRadius) || visualRadius <= 0) return;

  const type = forcedType || inferPlanetType(body);
  const preset = PlanetPresets[type] || PlanetPresets[PlanetTypes.BARREN];

  const seed = String(body.id ?? body.name ?? `${body.mass ?? 0}:${screenX},${screenY}`);
  const rng = mulberry32(hashString(seed));

  // sun direction
  let sunAngle = -Math.PI / 4;
  if (primaryStar?.position && body?.position) {
    const dx = body.position.x - primaryStar.position.x;
    const dy = body.position.y - primaryStar.position.y;
    sunAngle = Math.atan2(dy, dx);
  }
  const lx = Math.cos(sunAngle);
  const ly = Math.sin(sunAngle);

  // variation
  const hueShift   = (rng() - 0.5) * 16;
  const satShift   = (rng() - 0.5) * 0.12;
  const lightShift = (rng() - 0.5) * 0.10;
  const tilt = (rng() - 0.5) * 0.60;
  const spin = ((rng() * Math.PI * 2) + time * (0.045 + rng() * 0.11)) % (Math.PI * 2);

  const dom = normalizeHex6(dominantHex) || normalizeHex6(preset.base) || normalizeHex6(body.color) || "#888888";

  // dominant color drives ALL layers (base + accent + atmosphere)
  const baseColor   = tweakHsl(dom, hueShift, satShift, lightShift);
  const accentColor = tweakHsl(dom, hueShift + (rng() - 0.5) * 28, satShift + 0.10, lightShift - 0.08);
  const deepColor   = tweakHsl(dom, hueShift - 10, satShift - 0.12, lightShift - 0.18);

  const atmAlpha = 0.22 + (preset.haze || 0) * 0.22;
  const atmColor = rgba(tweakHsl(dom, -8, 0.10, 0.08), atmAlpha);

  // rings behind (if any)
  if (preset.rings) {
    const ringA = rgba(tweakHsl(dom, 6, -0.08, 0.12), 0.60);
    const ringB = rgba(tweakHsl(dom, -8, -0.12, -0.05), 0.24);
    drawRings(ctx, screenX, screenY, visualRadius, {
      tilt, spin, phase: "back",
      colorA: ringA, colorB: ringB,
      opacity: isGhost ? 0.18 : 0.96,
      sparkle: true,
    });
  }

  // planet clip
  ctx.save();
  ctx.beginPath();
  ctx.arc(screenX, screenY, visualRadius, 0, Math.PI * 2);
  ctx.clip();

  // base
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(screenX, screenY, visualRadius, 0, Math.PI * 2);
  ctx.fill();

  // texture (cached)
  const texSize = Math.max(96, Math.min(768, Math.round(visualRadius * 12)));
  const tex = getPlanetTextureCanvas(seed + `|dom:${dom}`, type, preset, baseColor, accentColor, texSize, dpr);
  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(tilt + spin * 0.22);
  ctx.globalAlpha = isGhost ? 0.32 : 0.96;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(tex, -visualRadius, -visualRadius, visualRadius * 2, visualRadius * 2);
  ctx.restore();

  // micro noise
  const micro = getNoiseCanvas(`${seed}|micro|${dom}`, texSize, dpr, 18);
  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(tilt * 0.6 + spin * 0.10);
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = isGhost ? 0.05 : 0.11;
  ctx.drawImage(micro, -visualRadius, -visualRadius, visualRadius * 2, visualRadius * 2);
  ctx.restore();
  ctx.globalCompositeOperation = "source-over";

  // clouds from dominant palette
  if ((preset.clouds || 0) > 0.001) {
    const cloud = getCloudCanvas(seed + `|dom:${dom}`, texSize, dpr);
    const cSpin = tilt - spin * (0.30 + preset.clouds * 0.48);

    // shadow
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(cSpin);
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = (isGhost ? 0.05 : 0.10) + preset.clouds * (isGhost ? 0.05 : 0.12);
    ctx.filter = `blur(${Math.max(0.6, visualRadius * 0.03)}px)`;
    ctx.drawImage(cloud, -visualRadius + lx * visualRadius * 0.06, -visualRadius + ly * visualRadius * 0.06, visualRadius * 2, visualRadius * 2);
    ctx.filter = "none";
    ctx.restore();

    // bright
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(cSpin);
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = (isGhost ? 0.10 : 0.18) + preset.clouds * (isGhost ? 0.10 : 0.30);
    ctx.filter = `blur(${Math.max(0.4, visualRadius * 0.012)}px)`;
    ctx.drawImage(cloud, -visualRadius, -visualRadius, visualRadius * 2, visualRadius * 2);
    ctx.filter = "none";
    ctx.restore();

    ctx.globalCompositeOperation = "source-over";
  }

  // gas shading overlays still use dominant palette
  if (preset.bands) {
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(tilt);
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = isGhost ? 0.06 : 0.14;

    const bands = Math.max(5, preset.bands | 0);
    const bandH = (visualRadius * 2) / bands;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      const w = 0.55 + 0.45 * Math.sin((t * 2.6 + spin * 0.7) * Math.PI * 2);
      ctx.fillStyle = w > 0.5 ? rgba(tweakHsl(dom, 8, -0.10, 0.20), 0.18) : rgba(deepColor, 0.18);
      ctx.fillRect(-visualRadius, -visualRadius + i * bandH, visualRadius * 2, bandH * 0.92);
    }

    const tur = getNoiseCanvas(`${seed}|gas|${dom}`, texSize, dpr, 9);
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = isGhost ? 0.05 : 0.10;
    ctx.drawImage(tur, -visualRadius, -visualRadius, visualRadius * 2, visualRadius * 2);

    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
  }

  // lighting
  const lightCx = screenX - lx * visualRadius * 0.38;
  const lightCy = screenY - ly * visualRadius * 0.38;

  // limb darkening
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = isGhost ? 0.55 : 0.92;
  const limb = ctx.createRadialGradient(lightCx, lightCy, visualRadius * 0.18, screenX, screenY, visualRadius * 1.22);
  limb.addColorStop(0.00, "rgba(255,255,255,1)");
  limb.addColorStop(0.40, "rgba(220,220,220,1)");
  limb.addColorStop(0.78, "rgba(90,90,90,1)");
  limb.addColorStop(1.00, "rgba(28,28,28,1)");
  ctx.fillStyle = limb;
  ctx.beginPath();
  ctx.arc(screenX, screenY, visualRadius * 1.02, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalCompositeOperation = "source-over";

  // day-side haze
  const haze = Math.max(0, preset.haze || 0);
  if (haze > 0.001) {
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(sunAngle);
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = (isGhost ? 0.06 : 0.12) + haze * (isGhost ? 0.10 : 0.22);

    const hg = ctx.createLinearGradient(-visualRadius * 1.1, 0, visualRadius * 1.1, 0);
    hg.addColorStop(0.00, "rgba(255,255,255,0.00)");
    hg.addColorStop(0.40, "rgba(255,255,255,0.00)");
    hg.addColorStop(0.65, atmColor);
    hg.addColorStop(1.00, "rgba(255,255,255,0.00)");

    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(0, 0, visualRadius * 1.02, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
  }

  // terminator
  if (primaryStar && !isGhost && !body.isStar) {
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(sunAngle);

    const tg = ctx.createLinearGradient(-visualRadius * 0.95, 0, visualRadius * 1.05, 0);
    tg.addColorStop(0.00, "rgba(0,0,0,0.00)");
    tg.addColorStop(0.45, "rgba(0,0,0,0.18)");
    tg.addColorStop(0.62, "rgba(0,0,0,0.72)");
    tg.addColorStop(1.00, "rgba(0,0,0,0.98)");

    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.arc(0, 0, visualRadius * 1.03, -Math.PI / 2, Math.PI / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
  }

  // specular highlight from dominant color
  const spec = Math.max(0, preset.spec || 0);
  if (spec > 0.001) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = (isGhost ? 0.08 : 0.14) + spec * (isGhost ? 0.10 : 0.22);

    const hx = screenX - lx * visualRadius * 0.60;
    const hy = screenY - ly * visualRadius * 0.60;
    const hi = ctx.createRadialGradient(hx, hy, visualRadius * 0.04, hx, hy, visualRadius * (0.80 + 0.25 * spec));
    hi.addColorStop(0.0, rgba(tweakHsl(dom, 0, 0.05, 0.35), 0.95));
    hi.addColorStop(0.18, "rgba(255,255,255,0.35)");
    hi.addColorStop(1.0, "rgba(255,255,255,0.00)");
    ctx.fillStyle = hi;
    ctx.beginPath();
    ctx.arc(screenX, screenY, visualRadius * 1.03, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
  }

  // fresnel rim (dominant)
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = isGhost ? 0.08 : 0.22;
  const rim = ctx.createRadialGradient(screenX, screenY, visualRadius * 0.78, screenX, screenY, visualRadius * 1.08);
  rim.addColorStop(0.0, "rgba(255,255,255,0)");
  rim.addColorStop(0.70, "rgba(255,255,255,0)");
  rim.addColorStop(0.86, atmColor);
  rim.addColorStop(1.0, "rgba(0,0,0,0)");
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(screenX, screenY, visualRadius * 1.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalCompositeOperation = "source-over";

  ctx.restore(); // end clip

  // outer atmosphere glow (dominant)
  if (visualConfig?.showGlow) {
    const glowK = Math.max(0.6, Number(visualConfig.glowIntensity) || 1);
    const atmRadius = visualRadius * (1.35 * glowK);
    if (Number.isFinite(atmRadius) && atmRadius > visualRadius * 0.95) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = isGhost ? 0.06 : 0.16;

      const ox = screenX - lx * visualRadius * 0.10;
      const oy = screenY - ly * visualRadius * 0.10;

      const g = ctx.createRadialGradient(ox, oy, visualRadius * 0.92, screenX, screenY, atmRadius);
      g.addColorStop(0.00, atmColor);
      g.addColorStop(0.45, rgba(tweakHsl(dom, 0, -0.05, 0.25), 0.05));
      g.addColorStop(1.00, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(screenX, screenY, atmRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
    }
  }

  // rings front (if any)
  if (preset.rings) {
    const ringA = rgba(tweakHsl(dom, 6, -0.08, 0.12), 0.65);
    const ringB = rgba(tweakHsl(dom, -8, -0.12, -0.05), 0.24);
    drawRings(ctx, screenX, screenY, visualRadius, {
      tilt, spin, phase: "front",
      colorA: ringA, colorB: ringB,
      opacity: isGhost ? 0.16 : 0.98,
      sparkle: true,
    });
  }
}

// ---- helper to validate "#RRGGBB" (returns "#rrggbb" or null)
function normalizeHex6(hex) {
  if (typeof hex !== "string") return null;
  const h = hex.trim();
  if (!/^#([0-9a-fA-F]{6})$/.test(h)) return null;
  return "#" + h.slice(1).toLowerCase();
}

// Usage:
// drawBeautifulPlanet(ctx, body, screenX, screenY, visualRadius, "#ccffaa", { primaryStar, visualConfig, isGhost, time });

/* NOTE:
   This uses the same helper functions from your previous version:
   - PlanetTypes, PlanetPresets
   - inferPlanetType
   - getPlanetTextureCanvas, getCloudCanvas, getNoiseCanvas
   - drawRings
   - hashString, mulberry32, rgba, tweakHsl, parseToRgb, rgbToHsl, hslToRgb, clamp01
*/

// ---------- Type inference ----------

function inferPlanetType(body) {
  if (body?.planetType && PlanetPresets[body.planetType]) return body.planetType;

  const seed = String(body?.id ?? body?.name ?? body?.mass ?? "0");
  const r = mulberry32(hashString(seed));
  const m = Number(body?.mass || 0);

  if (m > 520) return r() < 0.60 ? PlanetTypes.RINGED_GAS : PlanetTypes.GAS_GIANT;
  if (m > 320) return r() < 0.32 ? PlanetTypes.RINGED_GAS : PlanetTypes.GAS_GIANT;
  if (m > 220) return r() < 0.38 ? PlanetTypes.RINGED_ICE : PlanetTypes.ICE_GIANT;
  if (m > 120) {
    const roll = r();
    if (roll < 0.18) return PlanetTypes.ICE;
    if (roll < 0.40) return PlanetTypes.DESERT;
    if (roll < 0.70) return PlanetTypes.EARTHLIKE;
    return PlanetTypes.OCEAN;
  }
  const roll = r();
  if (roll < 0.16) return PlanetTypes.DWARF;
  if (roll < 0.36) return PlanetTypes.BARREN;
  if (roll < 0.52) return PlanetTypes.ICE;
  if (roll < 0.70) return PlanetTypes.DESERT;
  if (roll < 0.86) return PlanetTypes.LAVA;
  return PlanetTypes.BARREN;
}

// ---------- Cached textures ----------

function getPlanetTextureCanvas(seed, type, preset, baseColor, accentColor, size, dpr) {
  const key = `${seed}|${type}|${size}|${dpr}|${baseColor}|${accentColor}`;
  const hit = __planetTexCache.get(key);
  if (hit) return hit;

  const off = document.createElement("canvas");
  off.width = Math.round(size);
  off.height = Math.round(size);
  const g = off.getContext("2d");
  g.clearRect(0, 0, off.width, off.height);

  const R = off.width * 0.5;
  const rng = mulberry32(hashString(`${seed}|albedo|${type}`));

  // base
  g.save();
  g.translate(R, R);
  g.fillStyle = baseColor;
  g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
  g.restore();

  if (preset.bands) {
    drawGasBands(g, off.width, off.height, preset, baseColor, accentColor, rng);
    if (preset.storms) drawStorm(g, off.width, off.height, accentColor, rng);
  } else {
    drawTerrain(g, off.width, off.height, preset, baseColor, accentColor, rng, type);
  }

  // subtle depth vignette inside texture
  g.save();
  g.globalCompositeOperation = "multiply";
  g.globalAlpha = 0.30;
  const v = g.createRadialGradient(R, R, R * 0.20, R, R, R);
  v.addColorStop(0, "rgba(255,255,255,1)");
  v.addColorStop(1, "rgba(80,80,80,1)");
  g.fillStyle = v;
  g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.fill();
  g.restore();

  __planetTexCache.set(key, off);
  if (__planetTexCache.size > 320) __planetTexCache.delete(__planetTexCache.keys().next().value);
  return off;
}

function getCloudCanvas(seed, size, dpr) {
  const key = `${seed}|cloud|${size}|${dpr}`;
  const hit = __planetCloudCache.get(key);
  if (hit) return hit;

  const off = document.createElement("canvas");
  off.width = Math.round(size);
  off.height = Math.round(size);
  const g = off.getContext("2d");
  g.clearRect(0, 0, off.width, off.height);

  const rng = mulberry32(hashString(`${seed}|clouds`));
  const R = off.width * 0.5;

  g.save();
  g.translate(R, R);

  // soft cloud masses
  for (let i = 0; i < 220; i++) {
    const a = rng() * Math.PI * 2;
    const rad = (rng() ** 0.55) * R * 0.98;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    const s = (0.06 + rng() * 0.22) * R;

    const blob = g.createRadialGradient(x, y, 0, x, y, s);
    blob.addColorStop(0.0, "rgba(255,255,255,0.70)");
    blob.addColorStop(0.55, "rgba(255,255,255,0.18)");
    blob.addColorStop(1.0, "rgba(255,255,255,0)");
    g.fillStyle = blob;
    g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
  }

  // wisp streaks
  g.globalCompositeOperation = "overlay";
  g.globalAlpha = 0.42;
  for (let i = 0; i < 34; i++) {
    g.save();
    g.rotate(rng() * Math.PI * 2);
    const y = (rng() - 0.5) * R * 1.2;
    const h = (0.012 + rng() * 0.05) * R;
    const grd = g.createLinearGradient(-R, 0, R, 0);
    grd.addColorStop(0, "rgba(255,255,255,0)");
    grd.addColorStop(0.5, "rgba(255,255,255,0.75)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(-R, y, R * 2, h);
    g.restore();
  }

  g.restore();

  // mask circle
  g.save();
  g.globalCompositeOperation = "destination-in";
  g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.fill();
  g.restore();

  __planetCloudCache.set(key, off);
  if (__planetCloudCache.size > 320) __planetCloudCache.delete(__planetCloudCache.keys().next().value);
  return off;
}

function getNoiseCanvas(keySeed, size, dpr, scale = 12) {
  const key = `${keySeed}|${size}|${dpr}|${scale}`;
  const hit = __planetNoiseCache.get(key);
  if (hit) return hit;

  const off = document.createElement("canvas");
  off.width = Math.round(size);
  off.height = Math.round(size);
  const g = off.getContext("2d");
  g.clearRect(0, 0, off.width, off.height);

  const rng = mulberry32(hashString(keySeed));
  const w = off.width, h = off.height;

  // value-noise style grid + blur-y sampling via layered dots
  const cell = Math.max(6, Math.floor(w / scale));
  for (let y = 0; y < h; y += cell) {
    for (let x = 0; x < w; x += cell) {
      const v = rng();
      g.fillStyle = v > 0.5 ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)";
      g.globalAlpha = 0.18 + rng() * 0.22;
      g.beginPath();
      g.arc(x + rng() * cell, y + rng() * cell, (0.35 + rng() * 0.85) * cell * 0.45, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.globalAlpha = 1;

  // soften
  g.save();
  g.globalCompositeOperation = "source-in";
  g.filter = `blur(${Math.max(0.6, w * 0.006)}px)`;
  g.drawImage(off, 0, 0);
  g.filter = "none";
  g.restore();

  // circle mask
  const R = w * 0.5;
  g.save();
  g.globalCompositeOperation = "destination-in";
  g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.fill();
  g.restore();

  __planetNoiseCache.set(key, off);
  if (__planetNoiseCache.size > 480) __planetNoiseCache.delete(__planetNoiseCache.keys().next().value);
  return off;
}

function getCityCanvas(seed, size, dpr) {
  const key = `${seed}|cities|${size}|${dpr}`;
  const hit = __planetNoiseCache.get(key);
  if (hit) return hit;

  const off = document.createElement("canvas");
  off.width = Math.round(size);
  off.height = Math.round(size);
  const g = off.getContext("2d");
  g.clearRect(0, 0, off.width, off.height);

  const rng = mulberry32(hashString(`${seed}|cities`));
  const R = off.width * 0.5;

  g.save();
  g.translate(R, R);
  g.globalCompositeOperation = "source-over";

  // city clusters
  for (let i = 0; i < 520; i++) {
    const a = rng() * Math.PI * 2;
    const rad = (rng() ** 0.70) * R * 0.95;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;

    // bias toward a couple “continents”
    const bias = Math.exp(-((x + R * 0.15) ** 2 + (y - R * 0.10) ** 2) / (R * R * 0.40))
               + Math.exp(-((x - R * 0.25) ** 2 + (y + R * 0.05) ** 2) / (R * R * 0.35));
    if (rng() > Math.min(1, bias)) continue;

    const s = (0.5 + rng() * 1.6) * (R / 180);
    const c = g.createRadialGradient(x, y, 0, x, y, s * 2.5);
    c.addColorStop(0.0, "rgba(255,210,140,0.95)");
    c.addColorStop(0.35, "rgba(255,180,90,0.35)");
    c.addColorStop(1.0, "rgba(0,0,0,0)");
    g.fillStyle = c;
    g.beginPath(); g.arc(x, y, s * 2.5, 0, Math.PI * 2); g.fill();
  }

  // big blur glow
  g.filter = `blur(${Math.max(0.8, R * 0.02)}px)`;
  g.globalAlpha = 0.9;
  g.drawImage(off, 0, 0);
  g.filter = "none";
  g.restore();

  // mask circle
  g.save();
  g.globalCompositeOperation = "destination-in";
  g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.fill();
  g.restore();

  __planetNoiseCache.set(key, off);
  return off;
}

function getLavaGlowCanvas(seed, size, dpr) {
  const key = `${seed}|lavaglow|${size}|${dpr}`;
  const hit = __planetNoiseCache.get(key);
  if (hit) return hit;

  const off = document.createElement("canvas");
  off.width = Math.round(size);
  off.height = Math.round(size);
  const g = off.getContext("2d");
  g.clearRect(0, 0, off.width, off.height);

  const rng = mulberry32(hashString(`${seed}|lavaglow`));
  const R = off.width * 0.5;

  g.save();
  g.translate(R, R);
  g.globalCompositeOperation = "screen";

  // glowing cracks
  for (let i = 0; i < 90; i++) {
    const x0 = (rng() - 0.5) * R * 1.9;
    const y0 = (rng() - 0.5) * R * 1.9;
    const x1 = x0 + (rng() - 0.5) * R * 1.0;
    const y1 = y0 + (rng() - 0.5) * R * 1.0;

    const grd = g.createLinearGradient(x0, y0, x1, y1);
    grd.addColorStop(0.0, "rgba(255,210,140,0)");
    grd.addColorStop(0.5, "rgba(255,110,40,0.95)");
    grd.addColorStop(1.0, "rgba(255,210,140,0)");

    g.strokeStyle = grd;
    g.lineWidth = Math.max(1, R * (0.006 + rng() * 0.010));
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo(
      (x0 + x1) * 0.5 + (rng() - 0.5) * R * 0.30,
      (y0 + y1) * 0.5 + (rng() - 0.5) * R * 0.30,
      x1, y1
    );
    g.stroke();
  }

  // hot pools
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2;
    const rad = (rng() ** 0.65) * R * 0.95;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    const s = (0.03 + rng() * 0.09) * R;
    const c = g.createRadialGradient(x, y, 0, x, y, s * 3);
    c.addColorStop(0.0, "rgba(255,240,200,0.85)");
    c.addColorStop(0.35, "rgba(255,120,60,0.55)");
    c.addColorStop(1.0, "rgba(0,0,0,0)");
    g.fillStyle = c;
    g.beginPath(); g.arc(x, y, s * 3, 0, Math.PI * 2); g.fill();
  }

  g.filter = `blur(${Math.max(0.8, R * 0.018)}px)`;
  g.globalAlpha = 0.9;
  g.drawImage(off, 0, 0);
  g.filter = "none";
  g.restore();

  // mask circle
  g.save();
  g.globalCompositeOperation = "destination-in";
  g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.fill();
  g.restore();

  __planetNoiseCache.set(key, off);
  return off;
}

// ---------- Texture painters ----------

function drawGasBands(g, w, h, preset, baseColor, accentColor, rng) {
  const R = w * 0.5;
  g.save();
  g.translate(R, R);

  const bands = Math.max(5, preset.bands | 0);
  const bandH = (R * 2) / bands;

  for (let i = 0; i < bands; i++) {
    const y = -R + i * bandH;
    const t = i / (bands - 1);

    const c1 = tweakHsl(baseColor, (rng() - 0.5) * 12, (rng() - 0.5) * 0.12, (rng() - 0.5) * 0.10);
    const c2 = tweakHsl(accentColor,(rng() - 0.5) * 12, (rng() - 0.5) * 0.12, (rng() - 0.5) * 0.10);

    const grd = g.createLinearGradient(-R, 0, R, 0);
    grd.addColorStop(0.0, "rgba(255,255,255,0)");
    grd.addColorStop(0.28 + rng() * 0.10, rgba(c1, 0.95));
    grd.addColorStop(0.62 + rng() * 0.06, rgba(c2, 0.95));
    grd.addColorStop(1.0, "rgba(255,255,255,0)");

    g.globalCompositeOperation = "overlay";
    g.globalAlpha = 0.16 + 0.14 * Math.sin(t * Math.PI);
    g.fillStyle = grd;
    g.fillRect(-R, y, R * 2, bandH * 1.06);
  }

  // jet streams
  g.globalCompositeOperation = "soft-light";
  g.globalAlpha = 0.20;
  for (let i = 0; i < 60; i++) {
    g.save();
    g.rotate((rng() - 0.5) * 0.55);
    const yy = (rng() - 0.5) * R * 1.5;
    const hh = (0.012 + rng() * 0.05) * R;
    const grd = g.createLinearGradient(-R, 0, R, 0);
    grd.addColorStop(0.0, "rgba(255,255,255,0)");
    grd.addColorStop(0.5, rng() > 0.5 ? "rgba(255,255,255,0.70)" : "rgba(0,0,0,0.70)");
    grd.addColorStop(1.0, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(-R, yy, R * 2, hh);
    g.restore();
  }

  g.restore();

  // mask circle
  g.save();
  g.globalCompositeOperation = "destination-in";
  g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.fill();
  g.restore();
}

function drawStorm(g, w, h, accentColor, rng) {
  const R = w * 0.5;
  g.save();
  g.translate(R, R);

  const cx = (rng() - 0.2) * R * 0.75;
  const cy = (rng() - 0.5) * R * 0.55;
  const rx = (0.18 + rng() * 0.26) * R;
  const ry = rx * (0.55 + rng() * 0.35);

  g.globalCompositeOperation = "overlay";
  g.globalAlpha = 0.32;

  const storm = g.createRadialGradient(cx, cy, 0, cx, cy, rx * 1.25);
  storm.addColorStop(0.0, "rgba(255,255,255,0.78)");
  storm.addColorStop(0.35, tweakHsl(accentColor, 12, 0.10, 0.06));
  storm.addColorStop(1.0, "rgba(255,255,255,0)");
  g.fillStyle = storm;
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, (rng() - 0.5) * 0.6, 0, Math.PI * 2);
  g.fill();

  g.globalCompositeOperation = "soft-light";
  g.globalAlpha = 0.25;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rr = (i / 24) * rx * 1.1;
    const x = cx + Math.cos(a * 1.7) * rr;
    const y = cy + Math.sin(a * 1.55) * rr * 0.65;
    g.strokeStyle = rng() > 0.5 ? "rgba(255,255,255,0.42)" : "rgba(0,0,0,0.42)";
    g.lineWidth = Math.max(1, R * 0.01);
    g.beginPath();
    g.arc(x, y, rr * 0.22, a - 0.65, a + 0.65);
    g.stroke();
  }

  g.restore();
}

function drawTerrain(g, w, h, preset, baseColor, accentColor, rng, type) {
  const R = w * 0.5;

  g.save();
  g.translate(R, R);

  // continents / plates
  g.globalCompositeOperation = "overlay";
  const blobs = 26 + Math.floor(rng() * 26);
  for (let i = 0; i < blobs; i++) {
    const a = rng() * Math.PI * 2;
    const rad = (rng() ** 0.55) * R * 0.97;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    const s = (0.08 + rng() * 0.32) * R;

    let col = accentColor;
    if (type === PlanetTypes.DESERT) col = tweakHsl(baseColor, 0, -0.08, 0.03);
    if (type === PlanetTypes.ICE)    col = tweakHsl(baseColor, -8, 0.02, 0.07);
    if (type === PlanetTypes.LAVA)   col = "rgba(0,0,0,0.90)";
    if (type === PlanetTypes.EARTHLIKE) col = tweakHsl(accentColor, -8, 0.12, -0.06);
    if (type === PlanetTypes.OCEAN)  col = tweakHsl(accentColor, -6, 0.14, 0.02);

    const blob = g.createRadialGradient(x, y, 0, x, y, s);
    blob.addColorStop(0.0, rgba(col, 0.90));
    blob.addColorStop(0.75, rgba(col, 0.12));
    blob.addColorStop(1.0, "rgba(0,0,0,0)");
    g.fillStyle = blob;
    g.globalAlpha = 0.26 + rng() * 0.28;
    g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
  }

  // ridges / dunes / currents
  if (type === PlanetTypes.DESERT || type === PlanetTypes.OCEAN || type === PlanetTypes.ICE) {
    g.globalCompositeOperation = "soft-light";
    g.globalAlpha = 0.22;
    for (let i = 0; i < 58; i++) {
      g.save();
      g.rotate((rng() - 0.5) * 0.85);
      const y = (rng() - 0.5) * R * 1.35;
      const hh = (0.008 + rng() * 0.032) * R;
      const grd = g.createLinearGradient(-R, 0, R, 0);
      grd.addColorStop(0.0, "rgba(255,255,255,0)");
      grd.addColorStop(0.5, type === PlanetTypes.OCEAN ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.62)");
      grd.addColorStop(1.0, "rgba(255,255,255,0)");
      g.fillStyle = grd;
      g.fillRect(-R, y, R * 2, hh);
      g.restore();
    }
  }

  // ice caps
  if (preset.iceCaps) {
    g.globalCompositeOperation = "screen";
    g.globalAlpha = 0.22 + preset.iceCaps * 0.26;
    const cap = (0.22 + preset.iceCaps * 0.24) * R;

    let grd = g.createRadialGradient(0, -R * 0.78, 0, 0, -R * 0.78, cap);
    grd.addColorStop(0, "rgba(255,255,255,0.92)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.beginPath(); g.arc(0, -R * 0.78, cap, 0, Math.PI * 2); g.fill();

    grd = g.createRadialGradient(0, R * 0.78, 0, 0, R * 0.78, cap);
    grd.addColorStop(0, "rgba(255,255,255,0.86)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.beginPath(); g.arc(0, R * 0.78, cap, 0, Math.PI * 2); g.fill();
  }

  // craters
  const craterCount = Math.max(0, preset.craters | 0);
  if (craterCount > 0) {
    g.globalCompositeOperation = "multiply";
    g.globalAlpha = 0.42;
    for (let i = 0; i < craterCount; i++) {
      const a = rng() * Math.PI * 2;
      const rad = (rng() ** 0.55) * R * 0.97;
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      const rr = (0.025 + rng() * 0.11) * R;

      const c = g.createRadialGradient(x - rr * 0.25, y - rr * 0.25, rr * 0.12, x, y, rr * 1.30);
      c.addColorStop(0.0, "rgba(255,255,255,0.18)");
      c.addColorStop(0.36, "rgba(0,0,0,0.34)");
      c.addColorStop(1.0, "rgba(0,0,0,0)");
      g.fillStyle = c;
      g.beginPath(); g.arc(x, y, rr * 1.35, 0, Math.PI * 2); g.fill();

      g.globalAlpha = 0.28;
      g.strokeStyle = "rgba(255,255,255,0.22)";
      g.lineWidth = Math.max(1, R * 0.01);
      g.beginPath(); g.arc(x, y, rr * 0.95, 0, Math.PI * 2); g.stroke();
      g.globalAlpha = 0.42;
    }
  }

  // lava fissures (albedo hint only; glow handled separately)
  const fiss = Math.max(0, preset.fissures | 0);
  if (fiss > 0) {
    g.globalCompositeOperation = "screen";
    g.globalAlpha = 0.18;
    for (let i = 0; i < fiss * 3; i++) {
      const x0 = (rng() - 0.5) * R * 1.9;
      const y0 = (rng() - 0.5) * R * 1.9;
      const x1 = x0 + (rng() - 0.5) * R * 0.9;
      const y1 = y0 + (rng() - 0.5) * R * 0.9;
      const grd = g.createLinearGradient(x0, y0, x1, y1);
      grd.addColorStop(0, "rgba(255,220,140,0)");
      grd.addColorStop(0.5, "rgba(255,120,40,0.55)");
      grd.addColorStop(1, "rgba(255,220,140,0)");
      g.strokeStyle = grd;
      g.lineWidth = Math.max(1, R * (0.008 + rng() * 0.010));
      g.beginPath();
      g.moveTo(x0, y0);
      g.quadraticCurveTo(
        (x0 + x1) * 0.5 + (rng() - 0.5) * R * 0.25,
        (y0 + y1) * 0.5 + (rng() - 0.5) * R * 0.25,
        x1, y1
      );
      g.stroke();
    }
  }

  g.restore();

  // mask circle
  g.save();
  g.globalCompositeOperation = "destination-in";
  g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.fill();
  g.restore();
}

// ---------- Rings ----------

function drawRings(ctx, x, y, r, { tilt = 0, spin = 0, phase = "front", colorA, colorB, opacity = 1, sparkle = false } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt + Math.PI / 10 + Math.sin(spin) * 0.02);

  // phase clip
  ctx.beginPath();
  if (phase === "back") ctx.rect(-r * 3, -r * 3, r * 6, r * 3);
  else ctx.rect(-r * 3, 0, r * 6, r * 3);
  ctx.clip();

  const inner = r * 1.32;
  const outer = r * 2.34;
  const squash = 0.41;

  ctx.globalAlpha = opacity;

  // many thin bands
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const rr = inner + (outer - inner) * t;
    const lw = Math.max(1, r * (0.018 + 0.018 * (1 - t)));
    const grd = ctx.createLinearGradient(-rr, 0, rr, 0);
    grd.addColorStop(0.0, "rgba(255,255,255,0)");
    grd.addColorStop(0.25, colorB);
    grd.addColorStop(0.52, colorA);
    grd.addColorStop(0.78, colorB);
    grd.addColorStop(1.0, "rgba(255,255,255,0)");
    ctx.strokeStyle = grd;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(0, 0, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // subtle dust haze
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = opacity * 0.20;
  const haze = ctx.createRadialGradient(0, 0, r * 1.15, 0, 0, r * 2.55);
  haze.addColorStop(0.0, "rgba(255,255,255,0.00)");
  haze.addColorStop(0.55, "rgba(255,255,255,0.10)");
  haze.addColorStop(1.0, "rgba(255,255,255,0.00)");
  ctx.strokeStyle = haze;
  ctx.lineWidth = r * 0.20;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 2.05, r * 2.05 * squash, 0, 0, Math.PI * 2);
  ctx.stroke();

  // sparkles
  if (sparkle) {
    const rng = mulberry32(hashString(`${x}|${y}|${r}|rings`));
    ctx.globalAlpha = opacity * 0.14;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    for (let i = 0; i < 70; i++) {
      const a = rng() * Math.PI * 2;
      const rr = inner + (outer - inner) * (rng() ** 0.7);
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr * squash;
      const s = (0.5 + rng() * 1.6) * Math.max(1, r * 0.01);
      ctx.beginPath();
      ctx.arc(px, py, s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
  ctx.globalCompositeOperation = "source-over";
}

// ---------- Color + RNG utils ----------

function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rgba(color, alpha = 1) {
  if (!color) return `rgba(0,0,0,${alpha})`;
  if (color.startsWith("rgba")) return color.replace(/rgba\(([^)]+)\)/, (m, inner) => {
    const p = inner.split(",").map(s => s.trim());
    return `rgba(${p[0]},${p[1]},${p[2]},${alpha})`;
  });
  if (color.startsWith("rgb")) return color.replace(/rgb\(([^)]+)\)/, (m, inner) => `rgba(${inner},${alpha})`);
  if (color[0] === "#") {
    const hex = color.slice(1);
    const full = hex.length === 3 ? hex.split("").map(c => c + c).join("") : hex.slice(0, 6);
    const n = parseInt(full, 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}
function tweakHsl(color, dh = 0, ds = 0, dl = 0) {
  const { r, g, b } = parseToRgb(color);
  const { h, s, l } = rgbToHsl(r, g, b);
  const nh = (h + dh + 360) % 360;
  const ns = clamp01(s + ds);
  const nl = clamp01(l + dl);
  const out = hslToRgb(nh, ns, nl);
  return `rgb(${out.r},${out.g},${out.b})`;
}
function parseToRgb(color) {
  if (!color) return { r: 128, g: 128, b: 128 };
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const full = hex.length === 3 ? hex.split("").map(c => c + c).join("") : hex.slice(0, 6);
    const n = parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(",").map(s => parseFloat(s.trim()));
    return { r: p[0] | 0, g: p[1] | 0, b: p[2] | 0 };
  }
  return { r: 128, g: 128, b: 128 };
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return { h, s, l };
}
function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

// ---------- Replace your whole block with ----------
// drawBeautifulPlanet(ctx, body, screenX, screenY, visualRadius, { primaryStar, visualConfig, isGhost, time });