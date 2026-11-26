import * as THREE from 'three';

/* Generador determinista simple (mulberry32) */
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const rand = rng(1337);
const r = (a, b) => a + rand() * (b - a);

export function buildWorld(scene) {
  const disposables = [];
  const track = (obj) => { disposables.push(obj); return obj; };

  /* ---------- Suelo (terreno plano con variación de color) ---------- */
  const groundGeo = track(new THREE.PlaneGeometry(300, 300, 1, 1));
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = track(new THREE.MeshLambertMaterial({ color: 0x4a7c3f }));
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  scene.add(ground);

  /* ---------- Calles (grid) ---------- */
  const roadMat = track(new THREE.MeshLambertMaterial({ color: 0x2a2a30 }));
  const roadGeo = track(new THREE.PlaneGeometry(4, 300));
  roadGeo.rotateX(-Math.PI / 2);

  const roadGroup = new THREE.Group();
  for (let i = -4; i <= 4; i++) {
    const vertical = new THREE.Mesh(roadGeo, roadMat);
    vertical.position.set(i * 20, 0.01, 0);
    roadGroup.add(vertical);

    const horizontal = new THREE.Mesh(roadGeo, roadMat);
    horizontal.rotation.y = Math.PI / 2;
    horizontal.position.set(0, 0.01, i * 20);
    roadGroup.add(horizontal);
  }
  scene.add(roadGroup);

  /* ---------- InstancedMesh: EDIFICIOS ---------- */
  const buildingGeo = track(new THREE.BoxGeometry(1, 1, 1));
  const buildingMat = track(new THREE.MeshLambertMaterial({ color: 0x8899aa }));
  const BUILDINGS = 120;
  const buildings = new THREE.InstancedMesh(buildingGeo, buildingMat, BUILDINGS);
  buildings.castShadow = true;
  buildings.receiveShadow = true;
  buildings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let bi = 0;
  for (let gx = -4; gx <= 4; gx++) {
    for (let gz = -4; gz <= 4; gz++) {
      // dejar cruces libres
      if (gx === 0 || gz === 0) continue;
      if (rand() < 0.55) continue; // huecos
      const w = r(4, 8), h = r(6, 22), d = r(4, 8);
      const x = gx * 20 + r(-4, 4);
      const z = gz * 20 + r(-4, 4);
      dummy.position.set(x, h / 2, z);
      dummy.scale.set(w, h, d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      buildings.setMatrixAt(bi, dummy.matrix);
      color.setHSL(r(0.55, 0.65), r(0.05, 0.25), r(0.45, 0.7));
      buildings.setColorAt(bi, color);
      bi++;
      if (bi >= BUILDINGS) break;
    }
    if (bi >= BUILDINGS) break;
  }
  buildings.count = bi;
  buildings.instanceMatrix.needsUpdate = true;
  if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;
  scene.add(buildings);

  /* ---------- InstancedMesh: ÁRBOLES ---------- */
  const trunkGeo = track(new THREE.CylinderGeometry(0.18, 0.22, 1.4, 5));
  const trunkMat = track(new THREE.MeshLambertMaterial({ color: 0x5a3a1e }));
  const leafGeo = track(new THREE.ConeGeometry(1.0, 2.4, 6));
  const leafMat = track(new THREE.MeshLambertMaterial({ color: 0x2e7d32 }));

  const TREES = 250;
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, TREES);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, TREES);
  trunks.castShadow = leaves.castShadow = true;

  let ti = 0;
  for (let i = 0; i < TREES * 4 && ti < TREES; i++) {
    const x = r(-70, 70);
    const z = r(-70, 70);
    // evitar calles (cerca de múltiplos de 20 en X o Z)
    if (Math.abs(x % 20) < 4 || Math.abs(z % 20) < 4) continue;
    const s = r(0.8, 1.4);

    dummy.position.set(x, 0.7 * s, z);
    dummy.scale.set(s, s, s);
    dummy.rotation.set(0, r(0, Math.PI * 2), 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(ti, dummy.matrix);

    dummy.position.set(x, 1.4 * s + 1.2 * s, z);
    dummy.updateMatrix();
    leaves.setMatrixAt(ti, dummy.matrix);

    ti++;
  }
  trunks.count = leaves.count = ti;
  trunks.instanceMatrix.needsUpdate = true;
  leaves.instanceMatrix.needsUpdate = true;
  scene.add(trunks, leaves);

  /* ---------- InstancedMesh: POSTES DE LUZ ---------- */
  const poleGeo = track(new THREE.CylinderGeometry(0.08, 0.08, 6, 5));
  const poleMat = track(new THREE.MeshLambertMaterial({ color: 0x333338 }));
  const POLES = 60;
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, POLES);
  poles.castShadow = true;

  let pi = 0;
  for (let i = -4; i <= 4; i++) {
    for (let j = -4; j <= 4; j++) {
      if (i !== 0 && j !== 0) continue;
      const x = i * 20 + (i === 0 ? 10 : 0);
      const z = j * 20 + (j === 0 ? 10 : 0);
      dummy.position.set(x + 2, 3, z + 2);
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      poles.setMatrixAt(pi++, dummy.matrix);
      if (pi >= POLES) break;
    }
    if (pi >= POLES) break;
  }
  poles.count = pi;
  poles.instanceMatrix.needsUpdate = true;
  scene.add(poles);

  /* ---------- InstancedMesh: AUTOS (con animación por grupo) ---------- */
  const CAR_COLORS = [0xef4444, 0x3b82f6, 0x22c55e, 0xfacc15, 0xe5e7eb, 0x111827];
  const carGeo = track(new THREE.BoxGeometry(1.8, 1.1, 4.2));
  const carMat = track(new THREE.MeshLambertMaterial({ color: 0xffffff }));
  const CARS = 30;
  const cars = new THREE.InstancedMesh(carGeo, carMat, CARS);
  cars.castShadow = true;

  const carData = [];
  for (let i = 0; i < CARS; i++) {
    const axis = rand() < 0.5 ? 'x' : 'z';
    const lane = (Math.floor(r(-4, 5)) * 20) + (rand() < 0.5 ? -3 : 3);
    const pos = r(-100, 100);
    const speed = r(6, 16) * (rand() < 0.5 ? 1 : -1);
    carData.push({ axis, lane, pos, speed });
    const c = new THREE.Color(CAR_COLORS[(rand() * CAR_COLORS.length) | 0]);
    cars.setColorAt(i, c);
  }
  if (cars.instanceColor) cars.instanceColor.needsUpdate = true;
  scene.add(cars);

  function updateCars(dt) {
    for (let i = 0; i < carData.length; i++) {
      const c = carData[i];
      c.pos += c.speed * dt;
      if (c.pos > 120) c.pos = -120;
      if (c.pos < -120) c.pos = 120;
      if (c.axis === 'x') {
        dummy.position.set(c.pos, 0.55, c.lane);
        dummy.rotation.set(0, c.speed > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
      } else {
        dummy.position.set(c.lane, 0.55, c.pos);
        dummy.rotation.set(0, c.speed > 0 ? 0 : Math.PI, 0);
      }
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      cars.setMatrixAt(i, dummy.matrix);
    }
    cars.instanceMatrix.needsUpdate = true;
  }
  // primera pasada para fijar matrices
  updateCars(0);

  
  return {
    updateCars,
    dispose() {
      scene.remove(buildings, trunks, leaves, poles, cars, roadGroup, ground);
      disposables.forEach(d => d.dispose?.());
      cars.dispose?.();
      buildings.dispose?.();
      trunks.dispose?.();
      leaves.dispose?.();
      poles.dispose?.();
    },
  };
}