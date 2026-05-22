/**
 * Dessine une pomme rouge réaliste sur le context canvas fourni.
 * 
 * @param ctx Le contexte de rendu 2D du canvas
 * @param screenX La position X du centre de la pomme sur l'écran
 * @param screenY La position Y du centre de la pomme sur l'écran
 * @param radius Le rayon de base de la pomme (taille)
 * @param scale Le facteur d'échelle (zoom)
 * @param angle L'angle de rotation en degrés
 */
export function drawApple(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  radius: number,
  scale: number,
  angle: number = 0
) {
  ctx.save();
  
  // Appliquer la transformation de position
  ctx.translate(screenX, screenY);
  
  // Appliquer la rotation (conversion degrés -> radians)
  // On le fait après la translation pour tourner autour du centre de la pomme
  ctx.rotate((angle * Math.PI) / 180);

  // Appliquer l'échelle
  ctx.scale(scale, scale);

  const r = radius;

  // 1. Ombre portée (Shadow)
  // Dessinée en premier pour être derrière la pomme
  ctx.save();
  ctx.scale(1, 0.25); // Aplatir pour faire une ellipse
  ctx.beginPath();
  ctx.arc(0, r * 4.2, r * 0.9, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.filter = 'blur(10px)'; // Effet de flou pour l'ombre
  ctx.fill();
  ctx.restore();

  // 2. Corps de la pomme (Shape)
  // Utilisation de courbes de Bézier pour une forme organique
  ctx.beginPath();
  
  // Départ du creux supérieur (tige)
  ctx.moveTo(0, -r * 0.4);
  
  // Lobe supérieur droit
  ctx.bezierCurveTo(
    r * 0.4, -r * 0.9,  // Point de contrôle 1
    r * 0.9, -r * 0.6,  // Point de contrôle 2
    r * 0.95, -r * 0.1  // Point d'arrivée (flanc droit)
  );
  
  // Flanc droit vers le bas
  ctx.bezierCurveTo(
    r * 1.0, r * 0.4,   // PC1
    r * 0.7, r * 0.9,   // PC2
    0, r * 0.95         // Bas de la pomme
  );
  
  // Flanc gauche vers le haut (symétrie approximative)
  ctx.bezierCurveTo(
    -r * 0.7, r * 0.9,
    -r * 1.0, r * 0.4,
    -r * 0.95, -r * 0.1
  );
  
  // Lobe supérieur gauche
  ctx.bezierCurveTo(
    -r * 0.9, -r * 0.6,
    -r * 0.4, -r * 0.9,
    0, -r * 0.4
  );
  
  ctx.closePath();

  // 3. Coloration (Gradient Radial pour l'effet 3D)
  // Le point lumineux est décalé vers le haut gauche (-r/3, -r/3)
  const gradient = ctx.createRadialGradient(
    -r * 0.3, -r * 0.3, r * 0.1, // Cercle interne (highlight)
    0, 0, r * 1.1                // Cercle externe (shadow)
  );
  
  gradient.addColorStop(0, '#ff6b6b');   // Rouge clair / Brillant
  gradient.addColorStop(0.3, '#d31515'); // Rouge vif
  gradient.addColorStop(0.7, '#8f0808'); // Rouge foncé
  gradient.addColorStop(1, '#4a0202');   // Ombre sombre sur les bords

  ctx.fillStyle = gradient;
  ctx.fill();

  // 4. Texture (Petits points jaunes/verts subtils)
  // Ajoute du réalisme
  ctx.save();
  ctx.clip(); // Restreindre le dessin à l'intérieur de la pomme
  for (let i = 0; i < 40; i++) {
    const rx = (Math.random() - 0.5) * r * 1.8;
    const ry = (Math.random() - 0.5) * r * 1.8;
    const size = Math.random() * (r * 0.04);
    
    ctx.beginPath();
    ctx.arc(rx, ry, size, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 150, 0.15)'; // Jaune très transparent
    ctx.fill();
  }
  ctx.restore();

  // 5. Reflet brillant (Specular Highlight)
  // Une forme ovale blanche/rose transparente
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.15, r * 0.25, Math.PI / 4, 0, Math.PI * 2);
  const highlightGrad = ctx.createLinearGradient(-r * 0.4, -r * 0.5, -r * 0.2, -r * 0.2);
  highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = highlightGrad;
  ctx.fill();

  // 6. La Tige (Stem)
  ctx.beginPath();
  // Base de la tige (dans le creux)
  ctx.moveTo(0, -r * 0.35);
  // Courbe vers le haut
  ctx.quadraticCurveTo(
    r * 0.05, -r * 0.6, // Point de contrôle
    r * 0.1, -r * 0.75  // Bout de la tige
  );
  ctx.lineWidth = r * 0.08;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#5d4037'; // Marron
  ctx.stroke();

  // 7. Petite feuille (Leaf) - Bonus esthétique
  ctx.beginPath();
  ctx.moveTo(r * 0.05, -r * 0.6);
  ctx.quadraticCurveTo(r * 0.4, -r * 0.8, r * 0.5, -r * 0.55);
  ctx.quadraticCurveTo(r * 0.2, -r * 0.45, r * 0.05, -r * 0.6);
  ctx.fillStyle = '#4caf50'; // Vert feuille
  ctx.fill();

  // Bordure de la feuille pour définition
  ctx.strokeStyle = '#2e7d32';
  ctx.lineWidth = r * 0.01;
  ctx.stroke();

  ctx.restore();
}