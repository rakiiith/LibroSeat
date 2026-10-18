import * as THREE from 'three';
import {
  cachedBoxGeometry,
  cachedCylinderGeometry,
  cachedRoundedBoxGeometry,
  cachedSphereGeometry,
  createCarpetMaterial,
  createWallMaterial,
} from './sceneOptimization';

/*
 * SLIIT Library — proposed First and Second Floor concept layouts.
 * These are visual design proposals only. They are not measured floor plans.
 * Keep the existing Ground Floor builder unchanged in libraryScene.js.
 */

function makeMaterials(palette) {
  return {
    carpet: createCarpetMaterial(palette.carpet),
    wall: createWallMaterial(palette.wall),
    wallPanel: new THREE.MeshStandardMaterial({ color: palette.wallPanel, roughness: 0.8 }),
    wallPanelLight: new THREE.MeshStandardMaterial({ color: palette.wallPanelLight, roughness: 0.82 }),
    wallPanelDeep: new THREE.MeshStandardMaterial({ color: palette.wallPanelDeep, roughness: 0.76 }),
    wallTrim: new THREE.MeshStandardMaterial({ color: palette.wallTrim, metalness: 0.16, roughness: 0.56 }),
    white: new THREE.MeshStandardMaterial({ color: palette.table, roughness: 0.62 }),
    tableSurface: new THREE.MeshStandardMaterial({ color: palette.tableSurface, roughness: 0.68 }),
    blue: new THREE.MeshStandardMaterial({ color: '#0753bd', roughness: 0.48 }),
    blueDeep: new THREE.MeshStandardMaterial({ color: '#062e70', roughness: 0.55 }),
    chair: new THREE.MeshStandardMaterial({ color: palette.chair, roughness: 0.78 }),
    chairBack: new THREE.MeshStandardMaterial({ color: palette.chairBack, roughness: 0.78 }),
    chairInset: new THREE.MeshStandardMaterial({ color: palette.chairInset, roughness: 0.86 }),
    wood: new THREE.MeshStandardMaterial({ color: palette.wood, roughness: 0.76 }),
    metal: new THREE.MeshStandardMaterial({ color: '#8d9aa2', metalness: 0.62, roughness: 0.38 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: palette.glass,
      transparent: true,
      opacity: 0.58,
      roughness: 0.2,
      metalness: 0.04,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    accent: new THREE.MeshStandardMaterial({ color: palette.accent, roughness: 0.75 }),
    accentSoft: new THREE.MeshStandardMaterial({ color: palette.accentSoft, roughness: 0.68 }),
    dark: new THREE.MeshStandardMaterial({ color: '#26313a', roughness: 0.72 }),
    plant: new THREE.MeshStandardMaterial({ color: '#468453', roughness: 0.9 }),
    pot: new THREE.MeshStandardMaterial({ color: '#202b2d', roughness: 0.86 }),
    pipe: new THREE.MeshStandardMaterial({ color: '#a8472e', metalness: 0.35, roughness: 0.52 }),
    led: new THREE.MeshStandardMaterial({
      color: '#fff4df', emissive: '#fff0cc', emissiveIntensity: 1.35,
    }),
  };
}

function addBox(parent, x, y, z, w, h, d, material, name = 'floor-object') {
  const mesh = new THREE.Mesh(cachedBoxGeometry(parent, w, h, d), material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addRoundedBox(parent, x, y, z, w, h, d, radius, material, name, horizontal = false) {
  const mesh = new THREE.Mesh(cachedRoundedBoxGeometry(parent, w, h, d, radius, horizontal), material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, x, y, z, radiusTop, radiusBottom, height, material, segments = 20) {
  const mesh = new THREE.Mesh(
    cachedCylinderGeometry(parent, radiusTop, radiusBottom, height, segments),
    material
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addPlant(parent, x, z, m, scale = 1) {
  addCylinder(parent, x, 0.28 * scale, z, 0.29 * scale, 0.23 * scale, 0.56 * scale, m.pot);
  addCylinder(parent, x, 0.78 * scale, z, 0.035 * scale, 0.055 * scale, 0.82 * scale, m.wood, 10);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const leaf = new THREE.Mesh(cachedSphereGeometry(parent, 0.2 * scale, 10, 8), m.plant);
    leaf.position.set(
      x + Math.cos(angle) * 0.33 * scale,
      1.25 * scale + (i % 2) * 0.12 * scale,
      z + Math.sin(angle) * 0.33 * scale
    );
    leaf.scale.set(0.82, 1.55, 0.78);
    leaf.rotation.z = Math.cos(angle) * 0.42;
    leaf.castShadow = true;
    parent.add(leaf);
  }
}

function addColumn(parent, x, z, m) {
  // Keep the SLIIT blue structural columns consistent across all three levels.
  addBox(parent, x, 2.05, z, 0.72, 4.1, 0.72, m.blue, 'sliit-blue-column');
  addBox(parent, x, 4.13, z, 0.86, 0.14, 0.86, m.blueDeep, 'column-cap');
}

function addWindows(parent, m) {
  // Rear window line, matching the repeated wide glazed bays in the supplied photos.
  for (let i = 0; i < 7; i += 1) {
    const x = -7.05 + i * 2.35;
    const pane = new THREE.Mesh(cachedBoxGeometry(parent, 2.05, 2.25, 0.055), m.glass);
    pane.position.set(x, 2.34, -7.29);
    parent.add(pane);
    addBox(parent, x - 1.06, 2.34, -7.23, 0.07, 2.42, 0.12, m.wall, 'window-side-frame');
    addBox(parent, x + 1.06, 2.34, -7.23, 0.07, 2.42, 0.12, m.wall, 'window-side-frame');
    addBox(parent, x, 1.2, -7.23, 2.16, 0.08, 0.14, m.wall, 'window-sill');
    addBox(parent, x, 3.48, -7.23, 2.16, 0.08, 0.14, m.wall, 'window-head');
    addBox(parent, x, 2.34, -7.18, 0.045, 2.25, 0.07, m.metal, 'window-mullion');
  }
}

function addShell(parent, m, options = {}) {
  const { featureSide = 'right', backFeature = false } = options;
  addBox(parent, 0, -0.18, 0, 19.2, 0.36, 15.1, m.carpet, 'floor-slab');
  addBox(parent, -9.5, 2, 0, 0.2, 4, 15.1, m.wall, 'left-perimeter-wall');
  addBox(parent, 9.5, 2, 0, 0.2, 4, 15.1, m.wall, 'right-perimeter-wall');
  addBox(parent, -9.0, 2, -7.48, 1.0, 4, 0.2, m.wall, 'rear-left-wall-return');
  addBox(parent, 9.0, 2, -7.48, 1.0, 4, 0.2, m.wall, 'rear-right-wall-return');
  addBox(parent, 0, 0.48, -7.48, 17.0, 0.82, 0.2, m.wall, 'rear-window-sill');
  addBox(parent, 0, 3.8, -7.48, 17.0, 0.3, 0.2, m.wall, 'rear-window-head');
  addWindows(parent, m);

  // Colored acoustic wainscoting gives the long perimeter walls depth and a
  // restrained floor identity, with warm metal rails to finish each panel.
  const panelColors = [m.wallPanel, m.wallPanelLight, m.wallPanelDeep, m.wallPanel];
  for (const side of [-1, 1]) {
    for (const exterior of [false, true]) {
      const x = side * (exterior ? 9.63 : 9.37);
      const towardViewer = side * (exterior ? 1 : -1);
      for (let index = 0; index < 4; index += 1) {
        const z = -5.55 + index * 3.7;
        addBox(parent, x, 1.02, z, 0.045, 1.62, 3.1, panelColors[(index + (side > 0 ? 0 : 1)) % panelColors.length], 'colored-acoustic-wall-panel');
        addBox(parent, x + towardViewer * 0.028, 1.02, z, 0.012, 1.38, 2.82, m.wall, 'wall-panel-inset');
        for (const edge of [-1, 1]) {
          addBox(parent, x + towardViewer * 0.04, 1.02, z + edge * 1.53, 0.035, 1.67, 0.045, m.wallTrim, 'wall-panel-edge-trim');
        }
      }
      addBox(parent, x + towardViewer * 0.025, 1.88, 0, 0.05, 0.06, 14.7, m.wallTrim, 'continuous-wall-chair-rail');
    }
  }

  const columnPositions = [
    [-7.0, -3.4], [-1.8, -3.4], [4.1, -3.4],
    [-7.0, 2.5], [-1.8, 2.5], [4.1, 2.5],
  ];
  columnPositions.forEach(([x, z]) => addColumn(parent, x, z, m));

  if (featureSide === 'right') {
    addBox(parent, 9.34, 2.05, -0.9, 0.16, 4.1, 5.1, m.accent, 'floor-accent-wall');
    addBox(parent, 9.23, 2.65, -0.9, 0.08, 0.1, 3.6, m.accentSoft, 'accent-wall-detail');
  } else if (featureSide === 'left') {
    addBox(parent, -9.34, 2.05, -0.9, 0.16, 4.1, 5.1, m.accent, 'floor-accent-wall');
    addBox(parent, -9.23, 2.65, -0.9, 0.08, 0.1, 3.6, m.accentSoft, 'accent-wall-detail');
  }

  if (backFeature) {
    addBox(parent, 0, 2.05, -7.27, 4.7, 3.5, 0.16, m.accent, 'rear-collaboration-feature-wall');
    for (let row = 0; row < 3; row += 1) {
      addBox(parent, 0, 1.2 + row * 0.62, -7.16, 2.2 + row * 0.65, 0.09, 0.035, m.accentSoft, 'feature-wall-stripe');
    }
  }

  // Glass balustrade across the open front edge, leaving the centre as a circulation opening.
  for (const x of [-8.1, -6.45, -4.8, -3.15, 3.15, 4.8, 6.45, 8.1]) {
    const pane = new THREE.Mesh(cachedBoxGeometry(parent, 1.55, 1.32, 0.045), m.glass);
    pane.position.set(x, 0.74, 7.43);
    parent.add(pane);
    addBox(parent, x, 1.42, 7.43, 1.58, 0.055, 0.07, m.metal, 'glass-balustrade-rail');
  }

  // Exposed ceiling concept: beams, ducts, red service pipe and bright linear LEDs.
  for (const z of [-5.8, -2.0, 1.8, 5.1]) {
    addBox(parent, 0, 4.35, z, 19.0, 0.18, 0.28, m.wall, 'ceiling-beam');
  }
  for (const x of [-5.1, 5.0]) {
    addBox(parent, x, 4.58, 0, 0.62, 0.36, 12.7, m.metal, 'air-conditioning-duct');
  }
  for (const x of [-6.4, -2.1, 2.2, 6.5]) {
    for (const z of [-4.0, 0.1, 4.0]) {
      addBox(parent, x, 4.06, z, 2.25, 0.065, 0.1, m.led, 'linear-led-light');
    }
  }
  const pipe = new THREE.Mesh(cachedCylinderGeometry(parent, 0.04, 0.04, 18.5, 12), m.pipe);
  pipe.rotation.x = Math.PI / 2;
  pipe.position.set(0, 3.78, 0);
  parent.add(pipe);

  addPlant(parent, -8.1, 4.3, m, 0.95);
  addPlant(parent, 8.0, 4.5, m, 0.95);
  addPlant(parent, 7.8, -5.8, m, 0.9);
}

function addFocusChair(parent, x, z, m, rotation = 0) {
  const chair = new THREE.Group();
  chair.position.set(x, 0, z);
  chair.rotation.y = rotation;
  parent.add(chair);
  addRoundedBox(chair, 0, 0.52, 0, 0.62, 0.15, 0.62, 0.12, m.chair, 'quiet-chair-seat', true);
  addRoundedBox(chair, 0, 0.61, 0, 0.51, 0.025, 0.5, 0.08, m.chairInset, 'quiet-chair-seat-cushion', true);
  const back = addRoundedBox(chair, 0, 0.94, -0.24, 0.62, 0.78, 0.13, 0.12, m.chairBack, 'quiet-chair-back');
  back.rotation.x = -0.12;
  // Four slim dark metal legs: a distinct ergonomic chair from the Ground Floor's timber-leg model.
  for (const dx of [-0.23, 0.23]) {
    for (const dz of [-0.21, 0.21]) {
      const leg = addBox(chair, dx, 0.24, dz, 0.045, 0.48, 0.045, m.dark, 'quiet-chair-metal-leg');
      leg.rotation.x = dz * 0.12;
    }
  }
}

function addQuietDesk(parent, x, z, m, width = 3.15) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  addRoundedBox(group, 0, 0.92, 0, width, 0.13, 0.92, 0.075, m.white, 'first-floor-ash-study-table', true);
  addRoundedBox(group, 0, 0.996, 0, width * 0.96, 0.018, 0.87, 0.055, m.tableSurface, 'ash-table-laminate-inset', true);
  for (const dx of [-width * 0.43, width * 0.43]) {
    for (const dz of [-0.34, 0.34]) {
      addBox(group, dx, 0.43, dz, 0.07, 0.86, 0.07, m.metal, 'first-floor-table-leg');
    }
  }
  addBox(group, 0, 0.80, -0.32, width * 0.78, 0.075, 0.055, m.metal, 'quiet-table-long-support');
  addBox(group, 0, 0.80, 0.32, width * 0.78, 0.075, 0.055, m.metal, 'quiet-table-long-support');
  addBox(group, 0, 0.79, 0.405, width * 0.86, 0.13, 0.055, m.wood, 'quiet-table-timber-apron');
  for (const dx of [-width * 0.39, width * 0.39]) {
    addBox(group, dx, 0.80, 0, 0.055, 0.075, 0.58, m.metal, 'quiet-table-cross-support');
  }
  // Tall sage acoustic divider for quiet individual study.
  addBox(group, 0, 1.43, -0.02, width * 0.96, 0.72, 0.055, m.glass, 'sage-acoustic-divider');
  const count = Math.max(2, Math.floor(width / 0.78));
  for (let i = 0; i < count; i += 1) {
    const offset = (i - (count - 1) / 2) * 0.9;
    addFocusChair(group, offset, 0.98, m, Math.PI);
  }
}

function addIndividualCarrel(parent, x, z, m) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  addBox(group, 0, 0.9, 0, 1.55, 0.12, 0.85, m.white, 'individual-carrel-desk');
  addBox(group, 0, 1.55, -0.38, 1.58, 1.15, 0.07, m.accentSoft, 'carrel-back-privacy-panel');
  addBox(group, -0.76, 1.35, 0, 0.07, 0.82, 0.85, m.glass, 'carrel-left-partition');
  addBox(group, 0.76, 1.35, 0, 0.07, 0.82, 0.85, m.glass, 'carrel-right-partition');
  addFocusChair(group, 0, 0.85, m, Math.PI);
  for (const dx of [-0.62, 0.62]) {
    addBox(group, dx, 0.41, -0.3, 0.055, 0.82, 0.055, m.metal, 'carrel-table-leg');
  }
}

function addQuietReadingTable(parent, x, z, m) {
  addCylinder(parent, x, 0.92, z, 0.9, 0.9, 0.13, m.white, 40);
  addCylinder(parent, x, 0.997, z, 0.84, 0.84, 0.018, m.tableSurface, 40);
  addCylinder(parent, x, 0.425, z, 0.12, 0.18, 0.85, m.metal, 18);
  for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * Math.PI * 2;
    addFocusChair(parent, x + Math.cos(angle) * 1.25, z + Math.sin(angle) * 1.15, m, -angle);
  }
}

function addCollaborativeChair(parent, x, z, m, rotation = 0) {
  const chair = new THREE.Group();
  chair.position.set(x, 0, z);
  chair.rotation.y = rotation;
  parent.add(chair);
  addRoundedBox(chair, 0, 0.5, 0, 0.66, 0.16, 0.64, 0.12, m.chair, 'collaboration-chair-seat', true);
  addRoundedBox(chair, 0, 0.6, 0, 0.54, 0.025, 0.52, 0.08, m.chairInset, 'collaboration-chair-cushion', true);
  const back = addRoundedBox(chair, 0, 0.91, -0.25, 0.66, 0.72, 0.12, 0.12, m.chairBack, 'collaboration-chair-back');
  back.rotation.x = -0.09;
  // Warm timber splayed legs, intentionally different from First Floor metal-leg chairs.
  for (const dx of [-0.24, 0.24]) {
    for (const dz of [-0.2, 0.2]) {
      const leg = addBox(chair, dx, 0.24, dz, 0.06, 0.47, 0.06, m.wood, 'collaboration-chair-wood-leg');
      leg.rotation.z = dx * 0.12;
    }
  }
}

function addRoundCollaborationTable(parent, x, z, m, chairCount = 5) {
  const table = new THREE.Group();
  table.position.set(x, 0, z);
  parent.add(table);
  addCylinder(table, 0, 1.0, 0, 1.05, 1.05, 0.14, m.white, 40);
  addCylinder(table, 0, 0.5, 0, 0.16, 0.22, 0.86, m.metal, 20);
  addCylinder(table, 0, 0.08, 0, 0.52, 0.52, 0.1, m.dark, 28);
  for (let i = 0; i < chairCount; i += 1) {
    const angle = (i / chairCount) * Math.PI * 2;
    addCollaborativeChair(
      table,
      Math.cos(angle) * 1.55,
      Math.sin(angle) * 1.42,
      m,
      -angle
    );
  }
}

function addGroupIsland(parent, x, z, m, dividerColor = 'amber') {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  addRoundedBox(group, 0, 0.95, 0, 3.35, 0.14, 1.25, 0.085, m.white, 'second-floor-collaboration-table', true);
  addRoundedBox(group, 0, 1.032, 0, 3.22, 0.018, 1.16, 0.06, m.tableSurface, 'collaboration-table-laminate-inset', true);
  const dividerMaterial = dividerColor === 'teal' ? m.glass : m.accentSoft;
  addBox(group, 0, 1.36, -0.04, 3.12, 0.62, 0.05, dividerMaterial, 'second-floor-coloured-divider');
  for (const dx of [-1.35, 1.35]) {
    for (const dz of [-0.47, 0.47]) {
      addBox(group, dx, 0.44, dz, 0.07, 0.88, 0.07, m.metal, 'second-floor-table-leg');
    }
  }
  addBox(group, 0, 0.82, -0.43, 2.55, 0.075, 0.06, m.metal, 'collaboration-table-support');
  addBox(group, 0, 0.82, 0.43, 2.55, 0.075, 0.06, m.metal, 'collaboration-table-support');
  addCollaborativeChair(group, -0.95, 1.12, m, Math.PI);
  addCollaborativeChair(group, 0, 1.12, m, Math.PI);
  addCollaborativeChair(group, 0.95, 1.12, m, Math.PI);
  addCollaborativeChair(group, -0.95, -1.12, m, 0);
  addCollaborativeChair(group, 0, -1.12, m, 0);
  addCollaborativeChair(group, 0.95, -1.12, m, 0);
}

function addDigitalBench(parent, x, z, m, count = 4) {
  const width = count * 1.25;
  addBox(parent, x, 0.95, z, width, 0.14, 0.92, m.white, 'digital-learning-bench');
  for (const dx of [-width * 0.44, width * 0.44]) {
    addBox(parent, x + dx, 0.44, z, 0.08, 0.88, 0.78, m.metal, 'digital-bench-support');
  }
  for (let i = 0; i < count; i += 1) {
    const stationX = x - width / 2 + 0.7 + i * 1.25;
    addBox(parent, stationX, 1.48, z - 0.2, 0.72, 0.5, 0.08, m.dark, 'digital-monitor');
    addBox(parent, stationX, 1.22, z + 0.12, 0.55, 0.025, 0.26, m.accentSoft, 'keyboard-pad');
    addCollaborativeChair(parent, stationX, z + 0.92, m, Math.PI);
  }
}

function addModularLounge(parent, x, z, m) {
  // Separate modular seats, low benches and coloured ottomans for a collaborative social zone.
  addRoundedBox(parent, x - 1.45, 0.42, z, 2.35, 0.68, 0.92, 0.16, m.chair, 'modular-lounge-bench');
  addRoundedBox(parent, x - 1.45, 0.88, z - 0.34, 2.35, 0.66, 0.22, 0.11, m.chairBack, 'modular-lounge-back');
  addRoundedBox(parent, x + 1.15, 0.37, z - 0.2, 1.0, 0.58, 0.9, 0.12, m.accent, 'accent-ottoman');
  addRoundedBox(parent, x + 2.35, 0.37, z + 0.65, 1.0, 0.58, 0.9, 0.12, m.accentSoft, 'secondary-ottoman');
  addBox(parent, x + 0.4, 0.5, z + 1.15, 1.0, 0.08, 0.65, m.wood, 'lounge-side-table');
}

function buildFirstFloor(scene) {
  // LEVEL 01 — Quiet Study / Individual Focus concept.
  const m = makeMaterials({
    carpet: '#718078',
    wall: '#e7eee8',
    wallPanel: '#64887a', wallPanelLight: '#c7d5ca', wallPanelDeep: '#45685d', wallTrim: '#b4a078',
    tableSurface: '#ddd8c9', chairInset: '#758279',
    table: '#e7e4d9',
    chair: '#53675f',
    chairBack: '#3e554c',
    wood: '#b79b70',
    glass: '#a8d4c0',
    accent: '#245f55',
    accentSoft: '#9ebfae',
  });
  const group = new THREE.Group();
  group.name = 'sliit-first-floor-quiet-study-concept';
  scene.add(group);
  addShell(group, m, { featureSide: 'right', backFeature: false });

  // Two long quiet-study wings; central aisle is deliberately left clear.
  const rowZ = [-4.35, -1.15, 2.05, 5.15];
  rowZ.forEach((z, index) => {
    addQuietDesk(group, -5.35, z, m, 3.45);
    addQuietDesk(group, 5.35, z, m, 3.45);
    // Narrow acoustic end screens visually separate the individual study rows.
    if (index < 3) {
      addBox(group, -7.42, 1.3, z + 1.55, 0.07, 0.7, 0.85, m.glass, 'left-quiet-zone-divider');
      addBox(group, 7.42, 1.3, z + 1.55, 0.07, 0.7, 0.85, m.glass, 'right-quiet-zone-divider');
    }
  });

  // Individual privacy carrels along the rear corners, not in the central walkway.
  [-4.4, -2.2, 2.2, 4.4].forEach((x) => addIndividualCarrel(group, x, -5.55, m));

  // Two small round silent-reading tables at the front side bays.
  addQuietReadingTable(group, -5.4, 6.0, m);
  addQuietReadingTable(group, 5.4, 6.0, m);

  // Low sage acoustic panels on the side wall add a recognisably different floor identity.
  for (const z of [-5.2, -2.2, 0.8, 3.8]) {
    addBox(group, 9.35, 1.45, z, 0.08, 1.1, 1.8, m.accentSoft, 'sage-wall-acoustic-panel');
  }
  addPlant(group, -8.15, 5.8, m, 0.85);
  addPlant(group, 8.15, -5.7, m, 0.85);

  return group;
}

function buildSecondFloor(scene) {
  // LEVEL 02 — Collaborative / Digital Learning concept.
  const m = makeMaterials({
    carpet: '#76747d',
    wall: '#eee8df',
    wallPanel: '#516982', wallPanelLight: '#d2ad83', wallPanelDeep: '#34475f', wallTrim: '#bc9866',
    tableSurface: '#e8ddcc', chairInset: '#687482',
    table: '#f3eee5',
    chair: '#485463',
    chairBack: '#bd7854',
    wood: '#936746',
    glass: '#8bcbd1',
    accent: '#1d344e',
    accentSoft: '#d69a54',
  });
  const group = new THREE.Group();
  group.name = 'sliit-second-floor-collaborative-digital-concept';
  scene.add(group);
  addShell(group, m, { featureSide: 'left', backFeature: true });

  // Six round collaborative tables create a different circulation pattern from Levels 0 and 1.
  const roundPositions = [
    [-5.5, -2.65], [-0.3, -2.65], [5.0, -2.65],
    [-5.5, 2.15], [-0.3, 2.15], [5.0, 2.15],
  ];
  roundPositions.forEach(([x, z]) => addRoundCollaborationTable(group, x, z, m, 5));

  // Digital learning / laptop stations along the left-side zone.
  addDigitalBench(group, -6.55, 5.5, m, 4);
  addDigitalBench(group, -6.55, 3.65, m, 4);

  // Long team-project benches on the right side, with warm amber/teal dividers.
  addGroupIsland(group, 6.1, -0.1, m, 'amber');
  addGroupIsland(group, 6.1, 4.9, m, 'teal');

  // Flexible collaboration lounge at the front-right; the route to the front opening stays clear.
  addModularLounge(group, 4.2, -5.0, m);

  // Navy and amber media-wall panels distinguish Level 02 from the blue Ground Floor feature wall.
  addBox(group, 0, 1.9, -7.12, 4.6, 3.35, 0.13, m.accent, 'digital-collaboration-media-wall');
  for (let i = 0; i < 4; i += 1) {
    addBox(group, 0, 0.75 + i * 0.72, -7.02, 2.0 + (i % 2) * 0.8, 0.1, 0.035, m.accentSoft, 'amber-media-wall-stripe');
  }

  // Small high-top collaboration counter with stools near the side wall.
  addBox(group, 8.45, 1.12, -3.7, 0.72, 0.14, 3.1, m.wood, 'high-top-counter');
  for (const z of [-4.7, -3.7, -2.7]) {
    addCylinder(group, 7.8, 0.52, z, 0.27, 0.27, 0.82, m.chairBack, 18);
    addCylinder(group, 7.8, 0.1, z, 0.23, 0.23, 0.12, m.dark, 18);
  }

  addPlant(group, -8.1, -5.65, m, 0.9);
  addPlant(group, 8.0, 5.8, m, 0.9);
  addPlant(group, 0, 5.9, m, 0.8);

  return group;
}

export { buildFirstFloor, buildSecondFloor };
