import * as THREE from 'three';
import { buildFirstFloor, buildSecondFloor } from './floorLayouts';
import {
  cachedBoxGeometry,
  cachedCylinderGeometry,
  cachedRoundedBoxGeometry,
  cachedSphereGeometry,
  createCarpetMaterial,
  disposeObjectResources,
  instanceRepeatedOpaqueMeshes,
} from './sceneOptimization';

function createExpoRenderer(gl, mobileOptimized, width, height) {
  // Three.js expects a small subset of the browser canvas API. expo-gl
  // provides the WebGL context and drawing buffer, so supply that canvas shim
  // directly and avoid expo-three's outdated Three.js peer dependency.
  const canvas = {
    width,
    height,
    clientWidth: width,
    clientHeight: height,
    style: {},
    addEventListener() {},
    removeEventListener() {},
  };

  return new THREE.WebGLRenderer({
    canvas,
    context: gl,
    antialias: !mobileOptimized,
    precision: mobileOptimized ? 'mediump' : 'highp',
    powerPreference: mobileOptimized ? 'low-power' : 'high-performance',
  });
}

// Concept dimensions only. Replace these with measured SLIIT dimensions later.
const createMaterials = () => ({
  carpet: createCarpetMaterial('#55545a'),
  wall: new THREE.MeshStandardMaterial({ color: '#e6e5e1', roughness: 0.86 }),
  white: new THREE.MeshStandardMaterial({ color: '#f4f3ef', roughness: 0.6 }),
  blue: new THREE.MeshStandardMaterial({ color: '#074bb4', roughness: 0.48 }),
  blueDeep: new THREE.MeshStandardMaterial({ color: '#062f78', roughness: 0.52 }),
  dividerBlue: new THREE.MeshPhysicalMaterial({
    color: '#078bc9', transparent: true, opacity: 0.62, roughness: 0.2,
    metalness: 0.04, side: THREE.DoubleSide, depthWrite: false,
  }),
  dividerYellow: new THREE.MeshPhysicalMaterial({
    color: '#d5d44b', transparent: true, opacity: 0.66, roughness: 0.2,
    metalness: 0.02, side: THREE.DoubleSide, depthWrite: false,
  }),
  grey: new THREE.MeshStandardMaterial({ color: '#44484e', roughness: 0.72 }),
  chair: new THREE.MeshStandardMaterial({ color: '#454b52', roughness: 0.74 }),
  wood: new THREE.MeshStandardMaterial({ color: '#a97849', roughness: 0.78 }),
  yellow: new THREE.MeshStandardMaterial({ color: '#d9ad37', roughness: 0.84 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: '#77c9e9', transparent: true, opacity: 0.42,
    roughness: 0.18, metalness: 0.04, side: THREE.DoubleSide, depthWrite: false,
  }),
  paleGlass: new THREE.MeshPhysicalMaterial({
    color: '#d4edf6', transparent: true, opacity: 0.28,
    roughness: 0.12, metalness: 0.03, side: THREE.DoubleSide, depthWrite: false,
  }),
  metal: new THREE.MeshStandardMaterial({ color: '#b7bdc4', metalness: 0.62, roughness: 0.38 }),
  dark: new THREE.MeshStandardMaterial({ color: '#202a34', roughness: 0.75 }),
  plant: new THREE.MeshStandardMaterial({ color: '#3f8050', roughness: 0.9 }),
  pot: new THREE.MeshStandardMaterial({ color: '#202b2d', roughness: 0.86 }),
  redPipe: new THREE.MeshStandardMaterial({ color: '#a8472e', metalness: 0.35, roughness: 0.52 }),
});

function box(parent, x, y, z, w, h, d, material, name = 'library-object') {
  const mesh = new THREE.Mesh(cachedBoxGeometry(parent, w, h, d), material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function roundedBox(parent, x, y, z, w, h, d, radius, material, name, horizontal = false) {
  const geometry = cachedRoundedBoxGeometry(parent, w, h, d, radius, horizontal);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// Keep the longer alias used by a few descriptive scene-building calls.
const addBox = box;

function cylinder(parent, x, y, z, radiusTop, radiusBottom, height, material, segments = 12) {
  const mesh = new THREE.Mesh(
    cachedCylinderGeometry(parent, radiusTop, radiusBottom, height, segments), material
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function roundedSeat(parent, x, z, m, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  parent.add(group);
  roundedBox(group, 0, 0.52, 0, 0.64, 0.16, 0.62, 0.12, m.chair, 'chair-seat', true);
  const back = roundedBox(group, 0, 0.88, -0.24, 0.64, 0.66, 0.13, 0.12, m.chair, 'chair-back');
  back.rotation.x = -0.08;
  for (const dx of [-0.24, 0.24]) {
    for (const dz of [-0.21, 0.21]) {
      const leg = box(group, dx, 0.25, dz, 0.055, 0.48, 0.055, m.wood, 'wood-chair-leg');
      leg.rotation.x = dz * 0.2;
      leg.rotation.z = dx * -0.08;
    }
  }
}

function studyDesk(parent, x, z, m, options = {}) {
  const { width = 3.0, depth = 1.1, divider = 'blue', seatingSides = ['front', 'back'] } = options;
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  roundedBox(group, 0, 0.94, 0, width, 0.13, depth, 0.075, m.white, 'white-study-table', true);
  for (const dx of [-width * 0.43, width * 0.43]) {
    for (const dz of [-depth * 0.36, depth * 0.36]) {
      box(group, dx, 0.47, dz, 0.07, 0.88, 0.07, m.metal, 'white-table-frame');
    }
  }
  box(group, 0, 0.82, -depth * 0.34, width * 0.78, 0.075, 0.055, m.metal, 'study-table-long-support');
  box(group, 0, 0.82, depth * 0.34, width * 0.78, 0.075, 0.055, m.metal, 'study-table-long-support');
  for (const dx of [-width * 0.39, width * 0.39]) {
    box(group, dx, 0.82, 0, 0.055, 0.075, depth * 0.58, m.metal, 'study-table-cross-support');
  }
  const dividerMaterial = divider === 'yellow'
    ? m.dividerYellow
    : divider === 'glass' ? m.paleGlass : m.dividerBlue;
  box(group, 0, 1.34, -0.02, width * 0.96, 0.62, 0.045, dividerMaterial, 'coloured-acoustic-divider');
  box(group, 0, 1.665, -0.02, width * 0.98, 0.045, 0.07, m.metal, 'divider-top-rail');
  const count = Math.max(2, Math.floor(width / 0.78));
  const seatOffset = depth / 2 + 0.48;
  for (let i = 0; i < count; i += 1) {
    const offset = (i - (count - 1) / 2) * 0.88;
    if (seatingSides.includes('front')) roundedSeat(group, offset, seatOffset, m, 0);
    if (seatingSides.includes('back')) roundedSeat(group, offset, -seatOffset, m, Math.PI);
  }
  return group;
}

function addPlant(parent, x, z, m, scale = 1) {
  cylinder(parent, x, 0.29 * scale, z, 0.31 * scale, 0.24 * scale, 0.58 * scale, m.pot, 18);
  cylinder(parent, x, 0.86 * scale, z, 0.035 * scale, 0.06 * scale, 0.95 * scale, m.wood, 10);
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const leaf = new THREE.Mesh(cachedSphereGeometry(parent, 0.22 * scale, 10, 8), m.plant);
    leaf.position.set(
      x + Math.cos(a) * 0.35 * scale,
      1.35 * scale + (i % 2) * 0.13 * scale,
      z + Math.sin(a) * 0.35 * scale
    );
    leaf.scale.set(0.8, 1.6, 0.75);
    leaf.rotation.z = Math.cos(a) * 0.42;
    leaf.castShadow = true;
    parent.add(leaf);
  }
  const topLeaf = new THREE.Mesh(cachedSphereGeometry(parent, 0.2 * scale, 10, 8), m.plant);
  topLeaf.position.set(x, 1.85 * scale, z);
  topLeaf.scale.set(0.8, 1.5, 0.8);
  parent.add(topLeaf);
}

function addBookcase(parent, x, z, m) {
  // Glass-fronted book/display zone, modelled as frames, shelves and coloured book spines.
  box(parent, x, 1.48, z, 0.22, 2.95, 3.0, m.dark, 'bookcase-back');
  for (let row = 0; row < 5; row += 1) {
    const y = 0.35 + row * 0.55;
    box(parent, x + 0.18, y, z, 0.12, 0.065, 2.95, m.wood, 'bookshelf-shelf');
    for (let i = 0; i < 13; i += 1) {
      const palette = [m.blue, m.yellow, m.wood, m.white, m.plant];
      const book = box(
        parent, x + 0.25, y + 0.22, z - 1.34 + i * 0.22,
        0.16, 0.34 + (i % 3) * 0.04, 0.15, palette[(i + row) % palette.length], 'book-spine'
      );
      book.rotation.x = (i % 2) * 0.025;
    }
  }
  // Transparent front pane and metal uprights.
  const pane = new THREE.Mesh(cachedBoxGeometry(parent, 0.05, 3.0, 3.05), m.paleGlass);
  pane.position.set(x + 0.57, 1.5, z);
  parent.add(pane);
  for (const dz of [-1.52, 0, 1.52]) {
    box(parent, x + 0.62, 1.5, z + dz, 0.07, 3.05, 0.07, m.metal, 'glass-display-frame');
  }
}

function addKiosk(parent, x, z, m) {
  box(parent, x, 0.78, z, 0.82, 1.56, 0.68, m.white, 'self-service-kiosk');
  box(parent, x, 1.59, z + 0.02, 0.68, 0.055, 0.52, m.dark, 'kiosk-top');
  const screen = new THREE.MeshStandardMaterial({ color: '#16466a', emissive: '#0a4f87', emissiveIntensity: 0.55 });
  box(parent, x, 1.64, z + 0.36, 0.62, 0.46, 0.04, screen, 'kiosk-screen');
}

function addSofa(parent, x, z, m, rotation = 0, width = 3.0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  parent.add(group);
  roundedBox(group, 0, 0.43, 0, width, 0.72, 1.05, 0.18, m.grey, 'grey-lounge-sofa');
  roundedBox(group, 0, 0.88, -0.38, width, 0.75, 0.25, 0.12, m.grey, 'sofa-back');
  for (let i = 0; i < 3; i += 1) {
    const cx = (i - 1) * (width / 3.2);
    roundedBox(group, cx, 1.05, -0.2, width / 3.5, 0.25, 0.16, 0.06, m.yellow, 'yellow-sofa-back-cushion');
  }
  for (const xArm of [-width / 2 + 0.06, width / 2 - 0.06]) {
    roundedBox(group, xArm, 0.72, 0, 0.18, 0.78, 1.05, 0.07, m.grey, 'sofa-arm');
  }
}

function addFeatureWall(parent, m) {
  box(parent, 0.1, 2.05, -7.05, 5.0, 4.05, 0.22, m.blue, 'blue-reader-feature-wall');
  // Decorative blue wall graphics and readable lettering are represented by raised 3D bars.
  // The wording is kept in the UI/scene annotation because CanvasTexture is not native-safe.
  const barMaterial = new THREE.MeshStandardMaterial({ color: '#dcecff', emissive: '#b4d9ff', emissiveIntensity: 0.16 });
  const textBars = [
    { y: 2.85, w: 1.7 }, { y: 2.35, w: 2.3 }, { y: 1.85, w: 2.55 }, { y: 1.35, w: 2.0 },
  ];
  textBars.forEach((item) => box(parent, 0.1, item.y, -6.91, item.w, 0.09, 0.025, barMaterial, 'feature-wall-lettering-accent'));
}

function addWindows(parent, m) {
  // Continuous high window line along the far wall, with white piers between panes.
  const start = -7.2;
  for (let i = 0; i < 7; i += 1) {
    const x = start + i * 2.35;
    const pane = new THREE.Mesh(cachedBoxGeometry(parent, 2.08, 2.35, 0.055), m.paleGlass);
    pane.position.set(x, 2.35, -6.88);
    parent.add(pane);
    box(parent, x - 1.06, 2.35, -6.82, 0.07, 2.48, 0.12, m.white, 'window-side-frame');
    box(parent, x + 1.06, 2.35, -6.82, 0.07, 2.48, 0.12, m.white, 'window-side-frame');
    box(parent, x, 1.16, -6.82, 2.18, 0.08, 0.16, m.white, 'window-sill');
    box(parent, x, 3.54, -6.82, 2.18, 0.08, 0.16, m.white, 'window-head');
    box(parent, x, 2.35, -6.78, 0.045, 2.34, 0.07, m.metal, 'window-mullion');
  }
}

function addColumns(parent, m) {
  // Keep the blue structural columns at the outer edges of the furniture banks
  // so the main circulation route stays open from the entrance to the back.
  const positions = [
    [-7.35, -3.4], [7.35, -3.4],
    [-7.35, 2.5], [7.35, 2.5],
  ];
  positions.forEach(([x, z]) => {
    box(parent, x, 2.05, z, 0.72, 4.1, 0.72, m.blue, 'blue-structural-column');
    box(parent, x, 4.13, z, 0.86, 0.14, 0.86, m.blueDeep, 'column-cap');
  });
}

function addCeiling(parent, m) {
  // Open cutaway ceiling with beams, ducts, pipes and linear LED lights.
  for (const z of [-6.0, -2.2, 1.7, 5.3]) {
    box(parent, 0, 4.35, z, 19.1, 0.2, 0.28, m.wall, 'ceiling-beam');
  }
  for (const x of [-5.0, 5.2]) {
    box(parent, x, 4.62, 0, 0.65, 0.42, 12.8, m.metal, 'air-conditioning-duct');
  }
  const ledMaterial = new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#fff0cb', emissiveIntensity: 1.55 });
  for (const x of [-7, -2.3, 2.4, 7]) {
    for (const z of [-4.4, 0, 4.2]) {
      box(parent, x, 4.05, z, 2.35, 0.07, 0.11, ledMaterial, 'linear-led-light');
    }
  }
  const pipe = new THREE.Mesh(cachedCylinderGeometry(parent, 0.045, 0.045, 18, 12), m.redPipe);
  pipe.rotation.x = Math.PI / 2;
  pipe.position.set(0, 3.75, 0);
  parent.add(pipe);
}

function buildFloor(scene, floorIndex) {
  const m = createMaterials();
  const group = new THREE.Group();
  group.name = `sliit-library-floor-${floorIndex}`;
  scene.add(group);

  // Main carpet floor and cutaway perimeter.
  box(group, 0, -0.18, 0, 19.2, 0.36, 15.1, m.carpet, 'carpet-floor');
  box(group, -9.5, 2.0, 0, 0.2, 4.0, 15.1, m.wall, 'left-perimeter-wall');
  box(group, 9.5, 2.0, 0, 0.2, 4.0, 15.1, m.wall, 'right-perimeter-wall');
  // Window wall is built as piers/frames to keep the glazing visible.
  box(group, -9.0, 2.0, -7.48, 1.0, 4.0, 0.2, m.wall, 'rear-left-wall-return');
  box(group, 9.0, 2.0, -7.48, 1.0, 4.0, 0.2, m.wall, 'rear-right-wall-return');
  box(group, 0, 0.45, -7.48, 17.0, 0.9, 0.2, m.wall, 'rear-window-sill-wall');
  box(group, 0, 3.86, -7.48, 17.0, 0.28, 0.2, m.wall, 'rear-window-head-wall');
  addWindows(group, m);

  // Blue feature wall, columns, study tables and other recognisable furniture.
  addFeatureWall(group, m);
  addColumns(group, m);

  // Left-side glass book/display zone.
  addBookcase(group, -8.95, -3.55, m);
  addBookcase(group, -8.95, 0.05, m);
  // Glass partitions in front of the display/book zone.
  for (const z of [-5.25, -2.0, 1.25]) {
    const glass = new THREE.Mesh(cachedBoxGeometry(group, 0.045, 3.2, 3.0), m.paleGlass);
    glass.position.set(-8.3, 1.62, z);
    group.add(glass);
  }

  // Study Area 01 (left) and Study Area 02 (right): three parallel desk rows
  // per side, with double-sided seating and a wide open central aisle.
  const sideRows = [2.7, -0.1, -2.9];
  sideRows.forEach((z, row) => {
    studyDesk(group, -5.0, z, m, {
      width: 3.35, depth: 1.05,
      divider: row === 1 ? 'glass' : 'blue',
    });
    studyDesk(group, 5.0, z, m, {
      width: 3.35, depth: 1.05,
      divider: row === 1 ? 'yellow' : 'blue',
    });
  });

  // Study Area 03 sits at the rear. The two long tables leave the centre gap
  // open, extending the main aisle to the windows and blue feature wall.
  studyDesk(group, -5.0, -5.7, m, {
    width: 3.45, depth: 1.0, divider: 'glass', seatingSides: ['front'],
  });
  studyDesk(group, 5.0, -5.7, m, {
    width: 3.45, depth: 1.0, divider: 'yellow', seatingSides: ['front'],
  });

  // Entrance / information kiosks and technology stands.
  addKiosk(group, -6.3, 5.9, m);
  addKiosk(group, -4.7, 5.9, m);
  addKiosk(group, -3.1, 5.9, m);
  for (const z of [-4.8, -2.75, -0.7]) {
    box(group, -8.0, 0.9, z, 0.9, 0.12, 0.72, m.white, 'computer-standing-desk');
    box(group, -8.0, 1.48, z - 0.18, 0.7, 0.52, 0.08, m.dark, 'computer-monitor');
  }

  // Plants and open-front glass balustrade.
  [[-8.2, 4.2], [7.8, 4.4], [7.9, -5.6], [-6.8, -6.1], [2.6, -6.2]].forEach(([x, z]) => addPlant(group, x, z, m));
  for (const x of [-8.2, -6.5, -4.8, -3.1, 3.1, 4.8, 6.5, 8.2]) {
    const pane = new THREE.Mesh(cachedBoxGeometry(group, 1.58, 1.35, 0.045), m.glass);
    pane.position.set(x, 0.76, 7.38);
    group.add(pane);
    box(group, x, 1.45, 7.38, 1.6, 0.055, 0.07, m.metal, 'glass-partition-top-rail');
  }
  addCeiling(group, m);

  // Small floor-specific label prop; the geometry remains a concept placeholder on all levels.
  if (floorIndex === 1) addBox(group, 0, 0.12, 0, 1.2, 0.18, 1.2, m.yellow, 'first-level-marker');
  if (floorIndex === 2) addBox(group, 0, 0.12, 0, 1.2, 0.18, 1.2, m.blue, 'second-level-marker');

  return group;
}

function buildFloorForIndex(scene, floorIndex) {
  const group = floorIndex === 1 ? buildFirstFloor(scene)
    : floorIndex === 2 ? buildSecondFloor(scene) : buildFloor(scene, 0);
  instanceRepeatedOpaqueMeshes(group);
  return group;
}

export function createLibraryScene(gl, initialFloor = 0, { mobileOptimized = false, width, height } = {}) {
  let viewWidth = Number(gl.drawingBufferWidth) > 0 ? gl.drawingBufferWidth : width;
  let viewHeight = Number(gl.drawingBufferHeight) > 0 ? gl.drawingBufferHeight : height;
  if (!(viewWidth > 0 && viewHeight > 0)) {
    throw new Error('The GL view has no measurable size yet. Try reopening this screen.');
  }
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#111c2b');
  scene.fog = new THREE.Fog('#111c2b', 42, 100);

  const cameraAspect = viewWidth / Math.max(viewHeight, 1);
  const camera = new THREE.PerspectiveCamera(42, cameraAspect, 0.2, 100);

  function updateCameraFraming(aspect) {
    // Preserve a useful horizontal view on narrow portrait screens. A fixed
    // vertical FOV crops most of the room on phones even when the GL view works.
    const horizontalFov = THREE.MathUtils.degToRad(50);
    camera.fov = THREE.MathUtils.clamp(
      THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(horizontalFov / 2) / aspect)),
      42,
      78
    );
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    const visibleHorizontalFov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect);
    const projectedRoomWidth = Math.hypot(19.2 * Math.cos(0.72), 15.1 * Math.sin(0.72));
    const fitRadius = projectedRoomWidth / (2 * Math.tan(visibleHorizontalFov / 2) * Math.cos(0.58)) * 1.06;
    return THREE.MathUtils.clamp(Math.max(31, fitRadius), 31, 46);
  }

  let defaultRadius = updateCameraFraming(cameraAspect);

  const renderer = createExpoRenderer(gl, mobileOptimized, viewWidth, viewHeight);
  renderer.setSize(viewWidth, viewHeight);
  // Keep the completed frame's call count available to the native startup
  // guard; Three.js otherwise resets it before the caller can inspect it.
  renderer.info.autoReset = false;
  renderer.setClearColor('#111c2b', 1);
  renderer.shadowMap.enabled = !mobileOptimized;
  // Keep the renderer on the broadly supported PCF path for Expo GL.
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  scene.add(new THREE.HemisphereLight(0xdceeff, 0x645b50, 1.85));
  const sun = new THREE.DirectionalLight(0xffe5c5, 2.65);
  sun.position.set(-12, 22, 16);
  sun.castShadow = !mobileOptimized;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 10;
  sun.shadow.camera.bottom = -10;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 48;
  sun.shadow.bias = -0.00012;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 2;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x91bfff, 0.8);
  fill.position.set(15, 12, -12);
  scene.add(fill);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.MeshStandardMaterial({ color: '#111a27', roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.43;
  ground.receiveShadow = true;
  scene.add(ground);

  const startingFloor = Number.isInteger(initialFloor) && initialFloor >= 0 && initialFloor <= 2
    ? initialFloor
    : 0;
  let floorGroup = buildFloorForIndex(scene, startingFloor);
  const state = {
    yaw: 0.72,
    pitch: 0.58,
    radius: defaultRadius,
    target: new THREE.Vector3(0, 0.9, 0),
    floor: startingFloor,
    tween: null,
    animationClock: 0,
  };

  const setCameraFromOrbit = () => {
    const p = state.pitch;
    const y = state.yaw;
    const r = state.radius;
    camera.position.set(
      state.target.x + r * Math.sin(y) * Math.cos(p),
      state.target.y + r * Math.sin(p),
      state.target.z + r * Math.cos(y) * Math.cos(p)
    );
    camera.lookAt(state.target);
  };
  setCameraFromOrbit();

  function animateTo(position, target, duration = 900) {
    state.tween = {
      elapsed: 0,
      duration,
      fromPosition: camera.position.clone(),
      toPosition: new THREE.Vector3(...position),
      fromTarget: state.target.clone(),
      toTarget: new THREE.Vector3(...target),
    };
  }

  return {
    scene,
    camera,
    renderer,
    state,
    render(_time, deltaMs = 1000 / 60) {
      // Integrate camera easing by elapsed time for stable transitions across
      // different device refresh rates.
      const delta = THREE.MathUtils.clamp(Number(deltaMs) || 1000 / 60, 0, 50);
      state.animationClock += delta;
      const lightPulse = Math.sin(state.animationClock * 0.00055) * 0.045;
      sun.intensity = 2.65 + lightPulse;
      fill.intensity = 0.8 - lightPulse * 0.45;
      if (state.tween) {
        state.tween.elapsed = Math.min(state.tween.elapsed + delta, state.tween.duration);
        const t = state.tween.elapsed / state.tween.duration;
        const eased = t * t * (3 - 2 * t);
        camera.position.lerpVectors(state.tween.fromPosition, state.tween.toPosition, eased);
        state.target.lerpVectors(state.tween.fromTarget, state.tween.toTarget, eased);
        camera.lookAt(state.target);
        if (t >= 1) {
          const completedTween = state.tween;
          state.target.copy(completedTween.toTarget);
          const orbitOffset = camera.position.clone().sub(state.target);
          state.radius = orbitOffset.length();
          state.yaw = Math.atan2(orbitOffset.x, orbitOffset.z);
          state.pitch = Math.asin(THREE.MathUtils.clamp(orbitOffset.y / state.radius, -1, 1));
          state.tween = null;
        }
      } else {
        setCameraFromOrbit();
      }
      renderer.info.reset();
      renderer.render(scene, camera);
      gl.endFrameEXP();
      return renderer.info.render.calls;
    },
    resize(width, height) {
      const nextWidth = Number(width);
      const nextHeight = Number(height);
      if (!(nextWidth > 0 && nextHeight > 0)) return;
      viewWidth = nextWidth;
      viewHeight = nextHeight;
      renderer.setSize(viewWidth, viewHeight, false);
      defaultRadius = updateCameraFraming(viewWidth / viewHeight);
    },
    setFloor(nextFloor) {
      const floorIndex = Number.isInteger(nextFloor) && nextFloor >= 0 && nextFloor <= 2
        ? nextFloor
        : 0;
      if (floorIndex === state.floor) return;
      if (floorGroup) {
        scene.remove(floorGroup);
        disposeObjectResources(floorGroup);
      }
      floorGroup = buildFloorForIndex(scene, floorIndex);
      state.floor = floorIndex;
      camera.up.set(0, 1, 0);
      const target = [0, 0.9, 0];
      const yaw = 0.72;
      const pitch = 0.58;
      const radius = defaultRadius;
      state.radius = radius;
      const horizontalRadius = radius * Math.cos(pitch);
      const position = [
        target[0] + horizontalRadius * Math.sin(yaw),
        target[1] + radius * Math.sin(pitch),
        target[2] + horizontalRadius * Math.cos(yaw),
      ];
      animateTo(position, target, 900);
    },
    setOrbit(yaw, pitch, radius) {
      state.tween = null;
      state.yaw = yaw;
      state.pitch = THREE.MathUtils.clamp(pitch, 0.16, 1.38);
      state.radius = THREE.MathUtils.clamp(radius, 13, 70);
      setCameraFromOrbit();
    },
    reset() {
      camera.up.set(0, 1, 0);
      state.yaw = 0.72;
      state.pitch = 0.58;
      state.radius = defaultRadius;
      state.target.set(0, 0.9, 0);
      state.tween = null;
      setCameraFromOrbit();
    },
    zoom(factor) {
      const radius = THREE.MathUtils.clamp(state.radius * factor, 13, 70);
      state.radius = radius;
      const horizontalRadius = radius * Math.cos(state.pitch);
      const position = [
        state.target.x + horizontalRadius * Math.sin(state.yaw),
        state.target.y + radius * Math.sin(state.pitch),
        state.target.z + horizontalRadius * Math.cos(state.yaw),
      ];
      animateTo(position, [state.target.x, state.target.y, state.target.z], 420);
    },
    focus(position, target) {
      camera.up.set(0, 1, 0);
      animateTo(position, target);
    },
    topView() {
      camera.up.set(0, 0, -1);
      const topRadius = Math.max(30, 9.6 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.08);
      animateTo([0, topRadius, 0.01], [0, 0, 0], 800);
    },
    walkthrough() {
      camera.up.set(0, 1, 0);
      animateTo([0, 2.0, 11.7], [0, 1.75, -1.0], 1100);
    },
    walkStep(direction) {
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      if (forward.lengthSq() < 0.0001) forward.set(0, 0, -1);
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
      const movement = direction === 'forward' ? forward
        : direction === 'back' ? forward.clone().negate()
        : direction === 'left' ? right.clone().negate() : right;
      movement.multiplyScalar(0.32);
      camera.position.add(movement);
      state.target.add(movement);
      state.tween = null;
      camera.lookAt(state.target);
    },
    dispose() {
      disposeObjectResources(scene);
      renderer.dispose();
    },
  };
}
