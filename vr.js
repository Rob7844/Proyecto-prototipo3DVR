import * as THREE from 'three';

export class VRManager {
  constructor(renderer, scene, camera, state, toast, blink) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.state = state;
    this.toast = toast;
    this.blink = blink;

    this.stereo = true;
    this.teleporting = false;
    this.teleportTarget = new THREE.Vector3();
    this.teleportCurve = null;
    this.teleportMarker = null;

    this._buildTeleportVisuals();
    this._bindInput();
  }

  setStereo(v) {
    this.stereo = v;
    
    this._applyStereo();
  }

  _applyStereo() {
    
    
    
    
    
  }

  _buildTeleportVisuals() {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(60 * 3);
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color: 0x44aaff });
    this.teleportCurve = new THREE.Line(geom, mat);
    this.teleportCurve.visible = false;
    this.scene.add(this.teleportCurve);

    const markerGeo = new THREE.RingGeometry(0.3, 0.42, 24);
    markerGeo.rotateX(-Math.PI / 2);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.8 });
    this.teleportMarker = new THREE.Mesh(markerGeo, markerMat);
    this.teleportMarker.visible = false;
    this.scene.add(this.teleportMarker);
  }

  _bindInput() {
    // Iniciar teletransporte con clic derecho o tecla T
    addEventListener('mousedown', (e) => {
      if (this.state.mode !== 'vr' || this.state.paused) return;
      if (e.button === 2 || this.keysT) this._startTeleport();
    });
    addEventListener('mouseup', (e) => {
      if (this.state.mode !== 'vr') return;
      if (e.button === 2) this._endTeleport();
    });
    addEventListener('contextmenu', (e) => e.preventDefault());

    this.keysT = false;
    addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 't') { this.keysT = true; this._startTeleport(); }
    });
    addEventListener('keyup', (e) => {
      if (e.key.toLowerCase() === 't') { this.keysT = false; this._endTeleport(); }
    });
  }

  _startTeleport() {
    this.teleporting = true;
    this.teleportCurve.visible = true;
    this.teleportMarker.visible = true;
  }

  _endTeleport() {
    if (!this.teleporting) return;
    this.teleporting = false;
    this.teleportCurve.visible = false;
    this.teleportMarker.visible = false;
    this.blink(() => {
      const p = this.teleportTarget;
      // Mover al jugador (usa el PlayerController a través de la escena)
      const pc = window.__player;
      if (pc) pc.position.set(p.x, 1.7, p.z);
      this.toast('Teletransportado');
    });
  }

  reset() {
    this.teleporting = false;
    this.teleportCurve.visible = false;
    this.teleportMarker.visible = false;
  }

  update(dt) {
    if (!this.teleporting) return;

    // Dirección de la mirada de la cámara
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const origin = this.camera.position.clone();
    const gravity = -20;
    const v0 = dir.clone().multiplyScalar(25);
    v0.y += 6;

    const positions = this.teleportCurve.geometry.attributes.position.array;
    const steps = positions.length / 3;
    let hit = null;
    let t = 0;
    for (let i = 0; i < steps; i++) {
      t = i * 0.05;
      const x = origin.x + v0.x * t;
      const z = origin.z + v0.z * t;
      const y = origin.y + v0.y * t + 0.5 * gravity * t * t;
      positions[i * 3]     = x;
      positions[i * 3 + 1] = Math.max(0.05, y);
      positions[i * 3 + 2] = z;
      if (y <= 0.05 && !hit) {
        hit = new THREE.Vector3(x, 0.05, z);
      }
    }
    this.teleportCurve.geometry.attributes.position.needsUpdate = true;

    if (hit) {
      this.teleportTarget.copy(hit);
      this.teleportMarker.position.set(hit.x, 0.06, hit.z);
    }
  }
}