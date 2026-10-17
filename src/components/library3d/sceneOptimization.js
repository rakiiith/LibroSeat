import * as THREE from 'three';

// Each floor owns a cache so its geometries can be released when that floor is
// replaced. Reusing geometry avoids allocating hundreds of identical boxes.
const floorGeometryCaches = new WeakMap();

function getFloorRoot(parent) {
  let root = parent;
  while (root?.parent && !root.parent.isScene) root = root.parent;
  return root;
}

function getCache(parent) {
  const root = getFloorRoot(parent);
  let cache = floorGeometryCaches.get(root);
  if (!cache) {
    cache = new Map();
    floorGeometryCaches.set(root, cache);
  }
  return cache;
}

export function cachedGeometry(parent, key, create) {
  const cache = getCache(parent);
  if (!cache.has(key)) cache.set(key, create());
  return cache.get(key);
}

export const cachedBoxGeometry = (parent, width, height, depth) =>
  cachedGeometry(parent, `box:${width}:${height}:${depth}`, () => new THREE.BoxGeometry(width, height, depth));

export const cachedCylinderGeometry = (parent, radiusTop, radiusBottom, height, segments) =>
  cachedGeometry(parent, `cylinder:${radiusTop}:${radiusBottom}:${height}:${segments}`, () =>
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments));

export const cachedSphereGeometry = (parent, radius, widthSegments, heightSegments) =>
  cachedGeometry(parent, `sphere:${radius}:${widthSegments}:${heightSegments}`, () =>
    new THREE.SphereGeometry(radius, widthSegments, heightSegments));

function makeRoundedBoxGeometry(width, height, depth, radius, horizontal) {
  const r = Math.min(radius, width / 2, height / 2);
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2 + r, -height / 2);
  shape.lineTo(width / 2 - r, -height / 2);
  shape.absarc(width / 2 - r, -height / 2 + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(width / 2, height / 2 - r);
  shape.absarc(width / 2 - r, height / 2 - r, r, 0, Math.PI / 2, false);
  shape.lineTo(-width / 2 + r, height / 2);
  shape.absarc(-width / 2 + r, height / 2 - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(-width / 2, -height / 2 + r);
  shape.absarc(-width / 2 + r, -height / 2 + r, r, Math.PI, Math.PI * 1.5, false);

  const bevel = Math.min(depth * 0.16, r * 0.3, 0.025);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(depth - bevel * 2, 0.01),
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 3,
    steps: 1,
  });
  geometry.translate(0, 0, -depth / 2 + bevel);
  if (horizontal) geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

export const cachedRoundedBoxGeometry = (parent, width, height, depth, radius, horizontal = false) =>
  cachedGeometry(parent, `rounded:${width}:${height}:${depth}:${radius}:${horizontal}`, () =>
    makeRoundedBoxGeometry(width, height, depth, radius, horizontal));

function makeNoiseTexture(colorTexture) {
  const size = 32;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      // Fixed, low-contrast grain avoids random flicker and needs no canvas/DOM.
      const value = 222 + ((x * 17 + y * 29 + x * y * 7) % 28);
      pixels[index] = value;
      pixels[index + 1] = value;
      pixels[index + 2] = value;
      pixels[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 6);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  if (colorTexture) texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createCarpetMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    map: makeNoiseTexture(true),
    roughnessMap: makeNoiseTexture(false),
    roughness: 0.96,
  });
}

export function createWallMaterial(color) {
  const texture = makeNoiseTexture(false);
  return new THREE.MeshStandardMaterial({
    color,
    roughnessMap: texture,
    bumpMap: texture,
    bumpScale: 0.018,
    roughness: 0.9,
  });
}

/** Batch repeated opaque static meshes into InstancedMesh draw calls. */
export function instanceRepeatedOpaqueMeshes(root, minimumCount = 4) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  root.traverse((object) => {
    if (!object.isMesh || object.isInstancedMesh || !object.geometry || !object.material) return;
    if (Array.isArray(object.material) || object.material.transparent || object.material.opacity < 1) return;
    const key = `${object.geometry.uuid}:${object.material.uuid}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(object);
  });

  const rootInverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  buckets.forEach((meshes) => {
    if (meshes.length < minimumCount) return;
    const first = meshes[0];
    const instances = new THREE.InstancedMesh(first.geometry, first.material, meshes.length);
    instances.name = `${first.name || 'library-object'}-instances`;
    instances.castShadow = meshes.some((mesh) => mesh.castShadow);
    instances.receiveShadow = meshes.some((mesh) => mesh.receiveShadow);
    const localMatrix = new THREE.Matrix4();
    meshes.forEach((mesh, index) => {
      mesh.updateWorldMatrix(true, false);
      localMatrix.multiplyMatrices(rootInverse, mesh.matrixWorld);
      instances.setMatrixAt(index, localMatrix);
      mesh.parent?.remove(mesh);
    });
    instances.instanceMatrix.needsUpdate = true;
    instances.computeBoundingSphere();
    root.add(instances);
  });
  root.updateMatrixWorld(true);
}

export function disposeObjectResources(root) {
  if (!root) return;
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) {
      (Array.isArray(object.material) ? object.material : [object.material])
        .forEach((material) => {
          materials.add(material);
          Object.values(material).forEach((value) => {
            if (value?.isTexture) textures.add(value);
          });
        });
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
  floorGeometryCaches.delete(root);
}
