

import { Body, Preset, VisualConfig, PhysicsConfig } from './types';

// Gravitational Constant for the simulation (tuned for visual stability with these units)
export const G_CONST = 0.5;

// Softening parameter to prevent singularities at close range (allows tighter slingshots)
export const SOFTENING = 0.15;

// Asteroid density heatmap grid resolution (256x256 cells)
export const ASTEROID_DENSITY_GRID_SIZE = 1024;

export const DEFAULT_VISUAL_CONFIG: VisualConfig = {
  showGrid: false,
  gridSpacing: 100,
  gridOpacity: 0.25,
  showWaves: false,
  waveSpeedMultiplier: 0.1,
  showGlow: true,
  glowIntensity: 1.0,
  showTrails: true,
  trailLength: 500, // Reduced from 150 to prevent memory issues
  centerOfMassThreshold: 2000,
  showStars: true,
  showNebula: true,
  starDensity: 800,
  starTwinkleSpeed: 2.0,
  nebulaCloudCount: 40,
  nebulaOpacity: 0.9,
  showCenterOfMass: false,
  showEclipses: false,
  showMagneticFields: false
};

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  gravitationalConstant: 0.5,
  collisions: true,
  timeStep: 0.008,
  timeReverseDuration: 4.0
};

export const createBody = (
  id: string,
  name: string,
  mass: number,
  radius: number,
  color: string,
  distance: number, // Distance from 0,0 (Sun)
  velocity: number, // Tangential velocity
  description: string,
  realMass: string = 'Unknown',
  realDiameter: string = 'Unknown',
  orbitPeriod: string = 'Unknown',
  isStar: boolean = false
): Body => ({
  id,
  name,
  mass,
  radius,
  color,
  position: { x: distance, y: 0 },
  velocity: { x: 0, y: velocity },
  trail: [],
  description,
  realMass,
  realDiameter,
  orbitPeriod,
  isStar
});

const SYSTEM_SOLAR: Body[] = [
  createBody(
    'sun', 'Sun', 5000, 35, '#FDB813', 0, 0,
    'The star at the center of the Solar System. It is a nearly perfect sphere of hot plasma.',
    '1.989 × 10^30 kg', '1.39 million km', 'N/A', true
  ),
  createBody(
    'mercury', 'Mercury', 5, 4, '#A5A5A5', 70, 5.9,
    'The smallest planet in the Solar System and the closest to the Sun.',
    '3.285 × 10^23 kg', '4,880 km', '88 days'
  ),
  createBody(
    'venus', 'Venus', 40, 8, '#E3BB76', 110, 4.7,
    'The second planet from the Sun. It has a thick, toxic atmosphere filled with carbon dioxide.',
    '4.867 × 10^24 kg', '12,104 km', '225 days'
  ),
  createBody(
    'earth', 'Earth', 45, 8.5, '#22A6B3', 160, 3.95,
    'Our home planet. The only astronomical object known to harbor life.',
    '5.972 × 10^24 kg', '12,742 km', '365.25 days'
  ),
  createBody(
    'mars', 'Mars', 15, 5, '#EB4D4B', 220, 3.3,
    'The fourth planet from the Sun and the second-smallest planet in the Solar System.',
    '6.39 × 10^23 kg', '6,779 km', '687 days'
  ),
  createBody(
    'jupiter', 'Jupiter', 600, 18, '#D980FA', 360, 2.6,
    'The largest planet in the Solar System. It is a gas giant with a mass more than two and a half times that of all the other planets combined.',
    '1.898 × 10^27 kg', '139,820 km', '11.86 years'
  ),
  createBody(
    'saturn', 'Saturn', 400, 16, '#F79F1F', 500, 2.2,
    'The sixth planet from the Sun and the second-largest in the Solar System, famous for its ring system.',
    '5.683 × 10^26 kg', '116,460 km', '29.45 years'
  ),
  createBody(
    'uranus', 'Uranus', 120, 12, '#7ED6DF', 650, 1.95,
    'The seventh planet from the Sun. It has the third-largest planetary radius and fourth-largest planetary mass in the Solar System.',
    '8.681 × 10^25 kg', '50,724 km', '84 years'
  ),
  createBody(
    'neptune', 'Neptune', 130, 12, '#30336B', 780, 1.78,
    'The eighth and farthest-known Solar planet from the Sun. It is 17 times the mass of Earth.',
    '1.024 × 10^26 kg', '49,244 km', '164.8 years'
  )
];

const SYSTEM_BINARY: Body[] = [
  {
    ...createBody('star1', 'Alpha Primary', 3000, 25, '#ff4757', -100, -2.5, 'A red giant star in a binary system.', 'Unknown', 'Unknown', 'N/A', true),
    velocity: { x: 0, y: -2.5 },
    position: { x: -100, y: 0 }
  },
  {
    ...createBody('star2', 'Beta Secondary', 3000, 25, '#3742fa', 100, 2.5, 'A blue star locked in orbit with Alpha.', 'Unknown', 'Unknown', 'N/A', true),
    velocity: { x: 0, y: 2.5 },
    position: { x: 100, y: 0 }
  },
  createBody('planet1', 'Tatooine', 20, 6, '#eccc68', 300, 3.5, 'A desert planet orbiting the binary pair.', 'Unknown', 'Unknown', 'N/A')
];

const SYSTEM_THREE_BODY: Body[] = [
  {
    ...createBody('tri1', 'Alpha Centauri A', 2500, 28, '#FFA500', 0, 0, 'Primary star in the triple system.', 'Unknown', 'Unknown', 'N/A', true),
    position: { x: -80, y: 0 },
    velocity: { x: 0, y: -2.0 }
  },
  {
    ...createBody('tri2', 'Alpha Centauri B', 2500, 24, '#FFD700', 0, 0, 'Secondary star orbiting the primary.', 'Unknown', 'Unknown', 'N/A', true),
    position: { x: 80, y: 0 },
    velocity: { x: 0, y: 2.0 }
  },
  {
    ...createBody('tri3', 'Proxima', 600, 15, '#FF6B6B', 0, 0, 'A distant red dwarf orbiting the central binary pair in a wide stable orbit.', 'Unknown', 'Unknown', 'N/A', true),
    position: { x: 0, y: 450 },
    velocity: { x: -2.4, y: 0 }
  }
];

// Scaled for G=0.5 and Mass=500
const SYSTEM_FIGURE_8: Body[] = [
  {
    ...createBody('f8_1', 'Body A', 500, 15, '#FF6B6B', 0, 0, 'Part of a stable Figure-8 3-body system.', '500 units', '30 units', 'N/A', true),
    position: { x: 97.000436, y: -24.308753 },
    velocity: { x: 0.4662036850 * 1.58, y: 0.4323657300 * 1.58 }
  },
  {
    ...createBody('f8_2', 'Body B', 500, 15, '#4ECDC4', 0, 0, 'Part of a stable Figure-8 3-body system.', '500 units', '30 units', 'N/A', true),
    position: { x: -97.000436, y: 24.308753 },
    velocity: { x: 0.4662036850 * 1.58, y: 0.4323657300 * 1.58 }
  },
  {
    ...createBody('f8_3', 'Body C', 500, 15, '#FFE66D', 0, 0, 'Part of a stable Figure-8 3-body system.', '500 units', '30 units', 'N/A', true),
    position: { x: 0, y: 0 },
    velocity: { x: -2 * 0.4662036850 * 1.58, y: -2 * 0.4323657300 * 1.58 }
  }
];

// --- 3-BODY CHOREOGRAPHIES (Scaled) ---
// Base mass M=500. Distance Scale D=120. G=0.5.
// Velocity Scale Factor K = sqrt(G*M/D) = sqrt(0.5*500/120) = 1.443


// Lagrange Equilateral Triangle
// 3 Equal masses in a perfect triangle. Velocity v = sqrt(GM / (R * sqrt(3)))
const SYSTEM_EQUILATERAL: Body[] = [];
const eqMass = 400;
const eqR = 150;
const eqV = Math.sqrt((G_CONST * eqMass) / (eqR * Math.sqrt(3)));

for (let i = 0; i < 3; i++) {
  const angle = i * (2 * Math.PI / 3);
  SYSTEM_EQUILATERAL.push({
    ...createBody(`eq_${i}`, `Star ${i + 1}`, eqMass, 20, ['#FF6B6B', '#4ECDC4', '#FFE66D'][i], 0, 0, 'One of three equal stars in a Lagrange Equilateral configuration.', '400 units', '40 units', 'N/A', true),
    position: { x: Math.cos(angle) * eqR, y: Math.sin(angle) * eqR },
    velocity: { x: Math.cos(angle + Math.PI / 2) * eqV, y: Math.sin(angle + Math.PI / 2) * eqV }
  });
}

// Euler's Line (Unstable exact solution)
// M - m - m rotating in a line.
// v = sqrt( G(M + m/4) / r )
const SYSTEM_EULER: Body[] = [
  {
    ...createBody('euler_center', 'Central Star', 1000, 30, '#FDB813', 0, 0, 'The pivot of Euler\'s Line.', '1000 units', '60 units', 'N/A', true),
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 }
  }
];
const eulerDist = 200;
const eulerSmallMass = 100;
const eulerV = Math.sqrt((G_CONST * (1000 + eulerSmallMass / 4)) / eulerDist);

SYSTEM_EULER.push({
  ...createBody('euler_1', 'Planet A', eulerSmallMass, 12, '#48dbfb', 0, 0, 'Locked in unstable equilibrium.', '100 units', '24 units', 'N/A'),
  position: { x: -eulerDist, y: 0 },
  velocity: { x: 0, y: -eulerV }
});
SYSTEM_EULER.push({
  ...createBody('euler_2', 'Planet B', eulerSmallMass, 12, '#ff9f43', 0, 0, 'Locked in unstable equilibrium.', '100 units', '24 units', 'N/A'),
  position: { x: eulerDist, y: 0 },
  velocity: { x: 0, y: eulerV }
});

// Trappist-1 Inspired (Ultra Compact)
const SYSTEM_TRAPPIST: Body[] = [
  createBody('trappist_star', 'Trappist', 2000, 30, '#e74c3c', 0, 0, 'An ultra-cool red dwarf.', 'Unknown', 'Unknown', 'N/A', true)
];
const distances = [60, 80, 100, 120, 140, 160, 180];
distances.forEach((d, i) => {
  const v = Math.sqrt(G_CONST * 2000 / d);
  SYSTEM_TRAPPIST.push({
    ...createBody(`trap_${i}`, String.fromCharCode(98 + i), 15 + Math.random() * 10, 5, `hsl(${10 + i * 30}, 70%, 60%)`, d, 0, 'A terrestrial planet in a compact resonant chain.', 'Unknown', '10 units', 'N/A'),
    position: { x: d, y: 0 },
    velocity: { x: 0, y: v * (i % 2 === 0 ? 1 : -1) } // Alternate directions for chaos? No, keep same for stability
  });
  // Actually keep same direction for stability
  SYSTEM_TRAPPIST[SYSTEM_TRAPPIST.length - 1].velocity = { x: 0, y: v };
});

const generateRandomSystem = (): Body[] => {
  const bodies = [createBody('sun', 'Sun', 5000, 30, '#FDB813', 0, 0, 'Central Star', 'Unknown', 'Unknown', 'N/A', true)];
  for (let i = 0; i < 200; i++) {
    const dist = (25 * i) + (Math.random() * 10);
    let multiplier = 1;
    if (i % 2 == 0) {
      multiplier = -1;
    }
    const speed = multiplier * Math.sqrt(G_CONST * 5000 / dist); // Orbital velocity formula v = sqrt(GM/r)
    bodies.push(createBody(
      `rnd_${i}`,
      `Planet ${i + 1}`,
      1 + Math.random() * 2,
      4 + Math.random() * 8,
      `hsl(${Math.random() * 360}, 70%, 60%)`,
      dist,
      speed,
      'A randomly generated world.'
    ));
  }
  return bodies;
};

const SYSTEM_THREE_BODY_MINTAKA_STABLE: Body[] = [
  {
    ...createBody(
      'mintaka_aa1',
      'Mintaka Aa1',
      3200,
      30,
      '#0066FF', // exaggerated O-type: electric blue
      0,
      0,
      'Primary of the tight inner binary (hierarchical triple).',
      'O-type (blue, massive)',
      'Orion',
      'N/A',
      true
    ),
    position: { x: -36.6101694915, y: -202.8169014085 },
    velocity: { x: 0.3184469355, y: -3.0441664134 }
  },
  {
    ...createBody(
      'mintaka_aa2',
      'Mintaka Aa2',
      2700,
      26,
      '#00D5FF', // exaggerated B/early-type: neon cyan
      0,
      0,
      'Close companion in the inner binary.',
      'Early-type massive star',
      'Orion',
      'N/A',
      true
    ),
    position: { x: 43.3898305085, y: -202.8169014085 },
    velocity: { x: 0.3184469355, y: 3.6079009344 }
  },
  {
    ...createBody(
      'mintaka_ab',
      'Mintaka Ab',
      1200,
      22,
      '#B8FFFF', // exaggerated hot companion: icy white-blue
      0,
      0,
      'Outer companion orbiting the inner-binary barycenter (wide, stable orbit).',
      'B-type / massive companion',
      'Orion',
      'N/A',
      true
    ),
    position: { x: 0, y: 997.1830985915 },
    velocity: { x: -1.5656974327, y: 0 }
  }
];

const SYSTEM_THREE_BODY_HD188753_STABLE: Body[] = [
  {
    ...createBody(
      'hd188753_a',
      'HD 188753 A',
      2500,
      22,
      '#FFE600', // exaggerated G8V: blazing yellow-gold
      0,
      0,
      'Primary star (G-type). Outer-orbit partner to the tight Ba–Bb binary.',
      'G8V (yellow dwarf)',
      'Cygnus',
      'N/A',
      true
    ),
    position: { x: 0, y: 723.8095238095 },
    velocity: { x: -1.0705287227, y: 0 }
  },
  {
    ...createBody(
      'hd188753_ba',
      'HD 188753 Ba',
      2150,
      20,
      '#FF7A00', // exaggerated K0V: hot orange
      0,
      0,
      'Brighter component of the tight inner binary (Ba–Bb), orbiting their barycenter.',
      'K0V (orange dwarf)',
      'Cygnus',
      'N/A',
      true
    ),
    position: { x: -34.7368421053, y: -476.1904761905 },
    velocity: { x: 0.7042952123, y: 2.3180498837 }
  },
  {
    ...createBody(
      'hd188753_bb',
      'HD 188753 Bb',
      1650,
      18,
      '#FF2A00', // exaggerated K7V: fiery red-orange
      0,
      0,
      'Fainter component of the tight inner binary (Ba–Bb), in a stable hierarchical triple with A.',
      'K7V (deep orange/red dwarf)',
      'Cygnus',
      'N/A',
      true
    ),
    position: { x: 45.2631578947, y: -476.1904761905 },
    velocity: { x: 0.7042952123, y: -3.0204892424 }
  }
];

const SYSTEM_THREE_BODY_HD188753_WITH_PLANET_STABLE: Body[] = [
  {
    ...createBody(
      'hd188753_a',
      'HD 188753 A',
      2500,
      22,
      '#FFE600', // exaggerated G8V: blazing yellow-gold
      0,
      0,
      'Primary star (G-type). Outer-orbit partner to the tight Ba–Bb binary.',
      'G8V (yellow dwarf)',
      'Cygnus',
      'N/A',
      true
    ),
    position: { x: 0, y: 723.8095238095 },
    velocity: { x: -1.0705287227, y: 0 }
  },
  {
    ...createBody(
      'hd188753_ba',
      'HD 188753 Ba',
      2150,
      20,
      '#FF7A00', // exaggerated K0V: hot orange
      0,
      0,
      'Brighter component of the tight inner binary (Ba–Bb), orbiting their barycenter.',
      'K0V (orange dwarf)',
      'Cygnus',
      'N/A',
      true
    ),
    position: { x: -34.7368421053, y: -476.1904761905 },
    velocity: { x: 0.7042952123, y: 2.3180498837 }
  },
  {
    ...createBody(
      'hd188753_bb',
      'HD 188753 Bb',
      1650,
      18,
      '#FF2A00', // exaggerated K7V: fiery red-orange
      0,
      0,
      'Fainter component of the tight inner binary (Ba–Bb), in a stable hierarchical triple with A.',
      'K7V (deep orange/red dwarf)',
      'Cygnus',
      'N/A',
      true
    ),
    position: { x: 45.2631578947, y: -476.1904761905 },
    velocity: { x: 0.7042952123, y: -3.0204892424 }
  },
  {
    ...createBody(
      'hd188753_ab_p1',
      'HD 188753 Ab',
      10,
      8,
      '#B100FF', // exaggerated hot-jupiter: neon violet
      0,
      0,
      'Exoplanet (hot Jupiter) orbiting HD 188753 A on a tight, fast, stable orbit.',
      'Hot Jupiter (gas giant)',
      'Cygnus',
      'N/A',
      false
    ),
    position: { x: 90, y: 723.8095238095 },
    velocity: { x: -1.0705287227, y: 4.08 }
  }
];

const SYSTEM_SOLAR_WITH_MOONS_ULTRASTABLE: Body[] = [
  {
    ...createBody(
      'sun',
      'Sun',
      30000,
      90,
      '#FFF200',
      0,
      0,
      'G-type star at the center of the Solar System (ultra-stable scaled model).',
      'G2V (yellow star)',
      'Solar System',
      'N/A',
      true
    ),
    position: { x: 0, y: 0 },
    velocity: { x: -0.0062090868715925, y: -0.0033452105359302 }
  },
  {
    ...createBody(
      'mercury',
      'Mercury',
      3,
      7,
      '#BFC5CC',
      0,
      0,
      'Small rocky planet.',
      'Terrestrial planet',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: 5795.55495773441, y: 1552.914270615124 },
    velocity: { x: -0.3872983346207417, y: 1.4455942922321757 }
  },
  {
    ...createBody(
      'venus',
      'Venus',
      30,
      10,
      '#FF7A00',
      0,
      0,
      'Hot rocky planet with thick atmosphere.',
      'Terrestrial planet',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: 2484.691509984873, y: 9270.070976170951 },
    velocity: { x: -1.1172329759061058, y: 0.2993329841578524 }
  },
  {
    ...createBody(
      'earth',
      'Earth',
      35,
      11,
      '#00FF9A',
      0,
      0,
      'Rocky planet with oceans.',
      'Terrestrial planet',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: -9957.531350558611, y: 8355.716877652394 },
    velocity: { x: -0.7982854187305342, y: -0.9508480426816774 }
  },
  {
    ...createBody(
      'mars',
      'Mars',
      10,
      9,
      '#FF0033',
      0,
      0,
      'Cold desert world.',
      'Terrestrial planet',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: -14864.121433602272, y: -6920.540778883103 },
    velocity: { x: 0.5221267220862738, y: -1.1215413938138064 }
  },
  {
    ...createBody(
      'jupiter',
      'Jupiter',
      300,
      18,
      '#FFD1A3',
      0,
      0,
      'Largest planet (gas giant).',
      'Gas giant',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: -2179.455741445166, y: -24809.73490458728 },
    velocity: { x: 1.1967665075618444, y: -0.1050996909194897 }
  },
  {
    ...createBody(
      'saturn',
      'Saturn',
      200,
      17,
      '#FFE6A1',
      0,
      0,
      'Gas giant with rings.',
      'Gas giant',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: 27055.785774963374, y: -18929.11593395979 },
    velocity: { x: 0.7566814471534825, y: 1.081240745859245 }
  },
  {
    ...createBody(
      'uranus',
      'Uranus',
      90,
      15,
      '#00FFF7',
      0,
      0,
      'Ice giant with extreme axial tilt.',
      'Ice giant',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: 34406.61560500112, y: 24092.19654724426 },
    velocity: { x: -0.5746725736877854, y: 0.8206509862395217 }
  },
  {
    ...createBody(
      'neptune',
      'Neptune',
      100,
      15,
      '#0033FF',
      0,
      0,
      'Ice giant with fast winds.',
      'Ice giant',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: -17784.333381094326, y: 48872.69190156079 },
    velocity: { x: -0.7247476197830793, y: -0.2638508525959962 }
  },
  {
    ...createBody(
      'pluto',
      'Pluto',
      2,
      8,
      '#B77CFF',
      0,
      0,
      'Dwarf planet (Kuiper belt).',
      'Dwarf planet',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: -63750.72589837764, y: -5583.469361642514 },
    velocity: { x: 0.06686059071651, y: -0.7633367589353688 }
  },
  {
    ...createBody(
      'moon',
      'Moon',
      0.4,
      6,
      '#EAF0FF',
      0,
      0,
      'Earth\'s moon.',
      'Moon',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: -9830.656995178623, y: 8414.883339489047 },
    velocity: { x: -0.9240637049375284, y: -0.6810147393080352 }
  },
  {
    ...createBody(
      'phobos',
      'Phobos',
      0.02,
      4,
      '#7A7A7A',
      0,
      0,
      'Inner moon of Mars.',
      'Moon',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: -14795.198549610956, y: -6908.381178371227 },
    velocity: { x: 0.4486152514149281, y: -1.5385514863899615 }
  },
  {
    ...createBody(
      'deimos',
      'Deimos',
      0.02,
      4,
      '#A0A0A0',
      0,
      0,
      'Outer moon of Mars.',
      'Moon',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: -14972.48153591489, y: -6939.641137534651 },
    velocity: { x: 0.5226713690823355, y: -1.3550213549739793 }
  },
  {
    ...createBody(
      'io',
      'Io',
      0.08,
      6,
      '#FFF000',
      0,
      0,
      'Volcanic Galilean moon.',
      'Moon',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: -1980.216548022219, y: -24792.303730792633 },
    velocity: { x: 1.1585962286856678, y: 0.3311654402791783 }
  },
  {
    ...createBody(
      'europa',
      'Europa',
      0.06,
      6,
      '#00FFD5',
      0,
      0,
      'Icy Galilean moon.',
      'Moon',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: -2309.455741445166, y: -24584.577149797465 },
    velocity: { x: 0.9260580936779016, y: 0.0401653571352701 }
  },
  {
    ...createBody(
      'ganymede',
      'Ganymede',
      0.1,
      7,
      '#B44DFF',
      0,
      0,
      'Largest moon.',
      'Moon',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: -2453.519061964906, y: -25049.73490458728 },
    velocity: { x: 1.062389948667504, y: 0.2774332994390424 }
  },
  {
    ...createBody(
      'callisto',
      'Callisto',
      0.08,
      7,
      '#8B5A2B',
      0,
      0,
      'Cratered Galilean moon.',
      'Moon',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: -1969.455741445166, y: -25209.73490458728 },
    velocity: { x: 1.4685968088506482, y: -0.1050996909194897 }
  },
  {
    ...createBody(
      'enceladus',
      'Enceladus',
      0.03,
      5,
      '#CFFFFF',
      0,
      0,
      'Icy moon with geysers.',
      'Moon',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: 27248.970616584847, y: -18877.351059194988 },
    velocity: { x: 0.6843619195820429, y: 1.3513093997112682 }
  },
  {
    ...createBody(
      'rhea',
      'Rhea',
      0.04,
      6,
      '#BFD8FF',
      0,
      0,
      'Large icy moon.',
      'Moon',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: 26825.97761530256, y: -18736.3006908021 },
    velocity: { x: 0.9706566961566572, y: 1.2257672865582838 }
  },
  {
    ...createBody(
      'titan',
      'Titan',
      0.08,
      8,
      '#FF8A00',
      0,
      0,
      'Largest Saturn moon.',
      'Moon',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: 26919.80168958625, y: -19323.862182017253 },
    velocity: { x: 1.05303011571244, y: 1.0565816553325286 }
  },
  {
    ...createBody(
      'iapetus',
      'Iapetus',
      0.03,
      6,
      '#A66A3A',
      0,
      0,
      'Two-tone moon.',
      'Moon',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: 27500.37991584037, y: -19179.11593395979 },
    velocity: { x: 0.8976061541369688, y: 0.9913194356670234 }
  },
  {
    ...createBody(
      'miranda',
      'Miranda',
      0.02,
      5,
      '#FF4FD8',
      0,
      0,
      'Small Uranus moon.',
      'Moon',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: 34587.86840692092, y: 24176.721443703613 },
    velocity: { x: -0.6825865254530191, y: 1.0522403737089566 }
  },
  {
    ...createBody(
      'titania',
      'Titania',
      0.03,
      7,
      '#7CFF00',
      0,
      0,
      'Largest Uranus moon.',
      'Moon',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: 34111.04658858528, y: 24387.141852644214 },
    velocity: { x: -0.84285878903336, y: 0.5818281131951442 }
  },
  {
    ...createBody(
      'oberon',
      'Oberon',
      0.03,
      7,
      '#FF0044',
      0,
      0,
      'Second-largest Uranus moon.',
      'Moon',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: 34806.61560500112, y: 24092.19654724426 },
    velocity: { x: -0.9419720826111648, y: 0.8206509862395217 }
  },
  {
    ...createBody(
      'triton',
      'Triton',
      0.04,
      7,
      '#00B8FF',
      0,
      0,
      'Large retrograde moon.',
      'Moon',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: -17600.49531215526, y: 49056.529970499855 },
    velocity: { x: -0.6331656049286661, y: -0.3933785298001547 }
  },
  {
    ...createBody(
      'charon',
      'Charon',
      0.02,
      6,
      '#DAD4FF',
      0,
      0,
      'Pluto\'s large moon.',
      'Moon',
      'Solar System',
      'N/A',
      false
    ),
    position: { x: -63750.72589837764, y: -5383.469361642514 },
    velocity: { x: -0.1772544762924847, y: -0.7633367589353688 }
  }
];

// Empty System
const SYSTEM_BLANK: Body[] = [];

export const PRESETS: Preset[] = [
  {
    id: 'solar',
    name: 'Solar System',
    bodies: SYSTEM_SOLAR,
    defaultScale: 0.8,
    description: 'Our home system.'
  },
  {
    id: 'inner',
    name: 'Inner Planets',
    bodies: SYSTEM_SOLAR.slice(0, 5), // Sun through Mars
    defaultScale: 2.5,
    description: 'Zoomed in view of the rocky planets.'
  },
  {
    id: 'binary',
    name: 'Binary Stars',
    bodies: SYSTEM_BINARY,
    defaultScale: 1.0,
    description: 'Two massive stars orbiting a common center of mass.'
  },
  {
    id: 'threebody',
    name: 'Alpha Centauri',
    bodies: SYSTEM_THREE_BODY,
    defaultScale: 0.7,
    description: 'A triple star system based on Alpha Centauri.'
  },
  {
    id: 'figure8',
    name: 'Figure-8 Loop',
    bodies: SYSTEM_FIGURE_8,
    defaultScale: 3,
    description: 'Three equal masses chasing each other in a stable figure-eight pattern.'
  },
  {
    id: 'equilateral',
    name: 'Lagrange Triangle',
    bodies: SYSTEM_EQUILATERAL,
    defaultScale: 1.2,
    description: 'Three equal-mass stars in a perfect equilateral triangle rotation.'
  },
  {
    id: 'euler',
    name: 'Euler\'s Line',
    bodies: SYSTEM_EULER,
    defaultScale: 1.0,
    description: 'A theoretically exact (but unstable) solution with 3 bodies in a line.'
  },
  {
    id: 'trappist',
    name: 'Trappist-1',
    bodies: SYSTEM_TRAPPIST,
    defaultScale: 1.5,
    description: 'Inspired by TRAPPIST-1. Seven planets packed in tight orbit.'
  },
  {
    id: 'mintaka',
    name: 'Mintaka',
    bodies: SYSTEM_THREE_BODY_MINTAKA_STABLE,
    defaultScale: 0.2,
    description: 'Inspired by Mintaka. Three stars in a stable hierarchical triple system.'
  },
  {
    id: 'hd188753',
    name: 'HD 188753',
    bodies: SYSTEM_THREE_BODY_HD188753_STABLE,
    defaultScale: 0.3,
    description: 'Inspired by HD 188753. Three stars in a stable hierarchical triple system.'
  },
  {
    id: 'hd188753_with_planet',
    name: 'HD 188753 with Planet',
    bodies: SYSTEM_THREE_BODY_HD188753_WITH_PLANET_STABLE,
    defaultScale: 0.3,
    description: 'Inspired by HD 188753. Three stars in a stable hierarchical triple system.'
  },
  {
    id: 'solar_with_moons',
    name: 'Solar System with Moons',
    bodies: SYSTEM_SOLAR_WITH_MOONS_ULTRASTABLE,
    defaultScale: 0.02,
    description: 'Inspired by the Solar System. Eight planets with their moons.'
  },
  {
    id: 'random',
    name: 'Chaos Cluster',
    bodies: generateRandomSystem(),
    defaultScale: 1.2,
    description: 'Random generated bodies. May be unstable!'
  },
  {
    id: 'blank',
    name: 'Empty Void',
    bodies: SYSTEM_BLANK,
    defaultScale: 1.0,
    description: 'A completely empty universe. Start from scratch.',

  }
];

export const INITIAL_BODIES = SYSTEM_SOLAR;