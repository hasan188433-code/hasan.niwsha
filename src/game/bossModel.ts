import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getBossModelFromCache, saveBossModelToCache } from '../utils/idbStorage';

export interface BossModelStructure {
  group: THREE.Group;
  shieldMesh: THREE.Mesh;
  thrusterLights: THREE.Mesh[];
  rotatingRings: THREE.Group;
  cannons: THREE.Object3D[];
  collidableMeshes: THREE.Mesh[];
}

/**
 * Creates custom boss spaceship structure from uploaded GLB/GLTF ArrayBuffer
 */
export async function createCustomGLBBossModel(arrayBuffer: ArrayBuffer): Promise<BossModelStructure> {
  const loader = new GLTFLoader();
  const group = new THREE.Group();
  const collidableMeshes: THREE.Mesh[] = [];

  const gltf = await new Promise<any>((resolve, reject) => {
    loader.parse(
      arrayBuffer,
      '',
      (loadedGltf) => resolve(loadedGltf),
      (err) => reject(err)
    );
  });

  const customModel = gltf.scene || gltf.scenes[0];

  // Calculate bounding box to normalize model size to fit boss dimensions (~18-20 units wide)
  const box = new THREE.Box3().setFromObject(customModel);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  // Center model origin
  customModel.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const targetScale = maxDim > 0 ? 26 / maxDim : 1;
  customModel.scale.set(targetScale, targetScale, targetScale);

  // Add localized high-intensity PointLight parented to the custom boss so it stays perfectly illuminated and colorful regardless of environment
  const bossGlowLight = new THREE.PointLight(0xffffff, 6.0, 70);
  bossGlowLight.position.set(0, 6, 0);
  group.add(bossGlowLight);

  // Enable shadows, compute normals, and preserve vibrant colors & textures
  customModel.traverse((child: any) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      collidableMeshes.push(child);
      if (child.geometry) {
        child.geometry.computeVertexNormals();
        child.geometry.computeBoundingSphere?.();
        child.geometry.computeBoundingBox?.();
      }
      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((mat: any) => {
          mat.side = THREE.DoubleSide;
          mat.needsUpdate = true;

          // Ensure color map has proper sRGB color space
          if (mat.map) {
            mat.map.colorSpace = THREE.SRGBColorSpace;
            mat.map.needsUpdate = true;
          }

          // Fix black appearance on high metalness materials without envMap
          if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
            if (mat.metalness > 0.5) {
              mat.metalness = 0.25;
            }
            if (mat.roughness < 0.2) {
              mat.roughness = 0.4;
            }
          }
        });
      }
    }
  });

  group.add(customModel);

  // Virtual Cannons placed at wings/front
  const leftCannon = new THREE.Object3D();
  leftCannon.position.set(-6.5, 0, 4.0);
  group.add(leftCannon);

  const rightCannon = new THREE.Object3D();
  rightCannon.position.set(6.5, 0, 4.0);
  group.add(rightCannon);

  const cannons = [leftCannon, rightCannon];

  // Clean empty rotating rings (geometric shapes removed)
  const rotatingRings = new THREE.Group();

  // Invisible dummy shield mesh to maintain API structure
  const shieldGeo = new THREE.BufferGeometry();
  const shieldMat = new THREE.MeshBasicMaterial({ visible: false });
  const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  shieldMesh.visible = false;

  return {
    group,
    shieldMesh,
    thrusterLights: [],
    rotatingRings,
    cannons,
    collidableMeshes,
  };
}

/**
 * Attempts to load any saved custom boss model from server host or IndexedDB / local cache
 */
export async function loadSavedHostBossModel(): Promise<BossModelStructure | null> {
  try {
    // 1. Try fetching from server host with timestamp cache-buster to prevent stale browser caches
    const res = await fetch(`/api/boss-model?t=${Date.now()}`, { cache: 'no-cache' });
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      if (buffer && buffer.byteLength > 100) {
        // Cache ArrayBuffer in IndexedDB non-blockingly
        saveBossModelToCache('sky_custom_boss_glb', buffer).catch(() => {});
        return await createCustomGLBBossModel(buffer);
      }
    }
  } catch (serverErr) {
    console.warn('Could not load boss model from server:', serverErr);
  }

  try {
    // 2. Try IndexedDB or local cache fallback
    const cached = await getBossModelFromCache('sky_custom_boss_glb');
    if (cached) {
      if (cached instanceof ArrayBuffer) {
        return await createCustomGLBBossModel(cached);
      } else if (typeof cached === 'string') {
        const binaryString = atob(cached.includes('base64,') ? cached.split('base64,')[1] : cached);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return await createCustomGLBBossModel(bytes.buffer);
      }
    }
  } catch (err) {
    console.warn('Error reading boss model from local cache:', err);
  }

  return null;
}

/**
 * Procedural 3D War Spaceship Guardian Model for the Moon Boss
 * High-tech stealth war cruiser with swept wings, plasma cannons, ion thrusters,
 * cockpit canopy, energy shield dome, and animated rotating defense rings.
 */
export function createBossSpaceshipModel(): BossModelStructure {
  const group = new THREE.Group();

  // Dark stealth hull material with metallic specular reflections
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x181824,
    roughness: 0.35,
    metalness: 0.85,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x8b1a3e,
    roughness: 0.4,
    metalness: 0.6,
  });

  const glowingPlasmaMat = new THREE.MeshBasicMaterial({
    color: 0xff2a5f,
  });

  const cyanEnergyMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
  });

  // 1. Central Heavy Fuselage / Command Hull
  const fuselageGeo = new THREE.ConeGeometry(3.2, 12, 6);
  fuselageGeo.rotateX(Math.PI / 2);
  const fuselage = new THREE.Mesh(fuselageGeo, hullMat);
  fuselage.scale.set(1.1, 0.6, 1.2);
  group.add(fuselage);

  // Upper Cockpit Canopy (Deep Crimson Cybernetic Visor)
  const cockpitGeo = new THREE.BoxGeometry(1.6, 1.0, 4.5);
  const cockpitMat = new THREE.MeshStandardMaterial({
    color: 0xff0055,
    emissive: 0xbb0033,
    emissiveIntensity: 0.7,
    roughness: 0.1,
    metalness: 0.9,
  });
  const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
  cockpit.position.set(0, 0.7, 0.8);
  group.add(cockpit);

  // Front Cyber Eye (Targeting sensor)
  const eyeGeo = new THREE.SphereGeometry(0.5, 16, 16);
  const eyeMesh = new THREE.Mesh(eyeGeo, glowingPlasmaMat);
  eyeMesh.position.set(0, 0.4, 6.2);
  group.add(eyeMesh);

  // 2. Swept Combat Wings (Left & Right)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(7.5, -4.5);
  wingShape.lineTo(8.2, -6.5);
  wingShape.lineTo(2.0, -4.0);
  wingShape.lineTo(0, -5.5);
  wingShape.closePath();

  const wingExtrudeSettings = {
    depth: 0.4,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.1,
    bevelThickness: 0.1,
  };

  const wingGeo = new THREE.ExtrudeGeometry(wingShape, wingExtrudeSettings);
  wingGeo.center();

  // Right Wing
  const rightWing = new THREE.Mesh(wingGeo, hullMat);
  rightWing.position.set(4.2, 0, -0.5);
  rightWing.rotation.x = Math.PI / 2;
  rightWing.rotation.z = -0.15;
  group.add(rightWing);

  // Left Wing (Mirrored)
  const leftWing = new THREE.Mesh(wingGeo, hullMat);
  leftWing.position.set(-4.2, 0, -0.5);
  leftWing.rotation.x = Math.PI / 2;
  leftWing.rotation.z = Math.PI + 0.15;
  group.add(leftWing);

  // Wing Armor Plates / Accents
  const armorPlateGeo = new THREE.BoxGeometry(3.5, 0.25, 2.0);
  const leftPlate = new THREE.Mesh(armorPlateGeo, accentMat);
  leftPlate.position.set(-4.0, 0.3, -1.0);
  group.add(leftPlate);

  const rightPlate = new THREE.Mesh(armorPlateGeo, accentMat);
  rightPlate.position.set(4.0, 0.3, -1.0);
  group.add(rightPlate);

  // 3. Wingtip Plasma Cannons (Dual heavy blasters)
  const cannons: THREE.Object3D[] = [];
  const cannonGeo = new THREE.CylinderGeometry(0.32, 0.4, 4.5, 8);
  cannonGeo.rotateX(Math.PI / 2);

  const leftCannon = new THREE.Mesh(cannonGeo, accentMat);
  leftCannon.position.set(-7.2, -0.1, 1.2);
  group.add(leftCannon);
  cannons.push(leftCannon);

  const rightCannon = new THREE.Mesh(cannonGeo, accentMat);
  rightCannon.position.set(7.2, -0.1, 1.2);
  group.add(rightCannon);
  cannons.push(rightCannon);

  // Cannon glowing muzzles
  const muzzleGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.6, 8);
  muzzleGeo.rotateX(Math.PI / 2);
  const leftMuzzle = new THREE.Mesh(muzzleGeo, glowingPlasmaMat);
  leftMuzzle.position.set(-7.2, -0.1, 3.5);
  group.add(leftMuzzle);

  const rightMuzzle = new THREE.Mesh(muzzleGeo, glowingPlasmaMat);
  rightMuzzle.position.set(7.2, -0.1, 3.5);
  group.add(rightMuzzle);

  // 4. Twin Ion Thrusters (Rear Engines)
  const thrusterLights: THREE.Mesh[] = [];
  const thrusterGeo = new THREE.CylinderGeometry(0.9, 1.3, 3.2, 12);
  thrusterGeo.rotateX(Math.PI / 2);

  const leftThruster = new THREE.Mesh(thrusterGeo, hullMat);
  leftThruster.position.set(-1.8, 0.1, -5.5);
  group.add(leftThruster);

  const rightThruster = new THREE.Mesh(thrusterGeo, hullMat);
  rightThruster.position.set(1.8, 0.1, -5.5);
  group.add(rightThruster);

  // Glowing Plasma Exhaust Flames
  const flameGeo = new THREE.ConeGeometry(0.9, 3.5, 12);
  flameGeo.rotateX(-Math.PI / 2);

  const leftFlame = new THREE.Mesh(flameGeo, glowingPlasmaMat);
  leftFlame.position.set(-1.8, 0.1, -7.5);
  group.add(leftFlame);
  thrusterLights.push(leftFlame);

  const rightFlame = new THREE.Mesh(flameGeo, glowingPlasmaMat);
  rightFlame.position.set(1.8, 0.1, -7.5);
  group.add(rightFlame);
  thrusterLights.push(rightFlame);

  // 5. Clean empty rotating rings (geometric shapes removed)
  const rotatingRings = new THREE.Group();

  // 6. Invisible dummy shield mesh
  const shieldGeo = new THREE.BufferGeometry();
  const shieldMat = new THREE.MeshBasicMaterial({ visible: false });
  const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  shieldMesh.visible = false;

  // Scale whole ship
  group.scale.set(1.8, 1.8, 1.8);

  // Add high-tech local cyan/plasma PointLight to standard model as well
  const defaultGlow = new THREE.PointLight(0xff0055, 5.0, 50);
  defaultGlow.position.set(0, 3, 0);
  group.add(defaultGlow);

  const collidableMeshes: THREE.Mesh[] = [];
  group.traverse((child: any) => {
    if (child.isMesh && child !== shieldMesh) {
      collidableMeshes.push(child);
      if (child.geometry) {
        child.geometry.computeBoundingSphere?.();
        child.geometry.computeBoundingBox?.();
      }
    }
  });

  return {
    group,
    shieldMesh,
    thrusterLights,
    rotatingRings,
    cannons,
    collidableMeshes,
  };
}
