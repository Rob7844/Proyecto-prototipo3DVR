import * as THREE from 'three';

export class PlayerController {
  constructor(camera, scene, state) {
    this.camera = camera;
    this.scene = scene;
    this.state = state;

    this.position = new THREE.Vector3(0, 1.7, 10);
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = true;
    this.sensitivity = 1;
    this.mode = 'fps';

    this.keys = new Set();
    this._bindMouse();
    this.applyCamera();
  }

  setSensitivity(v) { this.sensitivity = v; }
  setFPSMode() { this.mode = 'fps'; }
  setVRMode()  { this.mode = 'vr'; }

  reset() {
    this.position.set(0, 1.7, 10);
    this.velocity.set(0, 0, 0);
    this.yaw = 0; this.pitch = 0;
    this.applyCamera();
  }

  handleKey(e) {
    const k = e.key.toLowerCase();
    if (e.type === 'keydown') this.keys.add(k);
    else this.keys.delete(k);

    if (e.type === 'keydown' && k === ' ') {
      if (this.onGround) { this.velocity.y = 6; this.onGround = false; }
    }
    if (e.type === 'keydown' && (k === 'q' || k === 'e') && this.mode === 'vr') {
      this.snapTurn(k === 'q' ? +Math.PI / 6 : -Math.PI / 6);
    }
  }

  snapTurn(angle) {
    this.yaw += angle;
    this.applyCamera();
  }

  _bindMouse() {
    addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== document.body) return;
      if (this.state.paused) return;
      const s = 0.0022 * this.sensitivity;
      this.yaw   -= e.movementX * s;
      this.pitch -= e.movementY * s;
      this.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.pitch));
      this.applyCamera();
    });
  }

  applyCamera() {
    this.camera.position.copy(this.position);
    this.camera.rotation.set(0, 0, 0, 'YXZ');
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  update(dt) {
    const spdBase = 5.0 * this.state.speedMul;
    const run = this.keys.has('shift') ? 1.9 : 1;
    const speed = spdBase * run;

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right   = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const move = new THREE.Vector3();
    if (this.keys.has('w')) move.add(forward);
    if (this.keys.has('s')) move.sub(forward);
    if (this.keys.has('d')) move.add(right);
    if (this.keys.has('a')) move.sub(right);
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed * dt);

    this.position.add(move);

    // gravedad + salto
    this.velocity.y -= 20 * dt;
    this.position.y += this.velocity.y * dt;
    if (this.position.y <= 1.7) {
      this.position.y = 1.7;
      this.velocity.y = 0;
      this.onGround = true;
    }

    // límite del terreno
    const R = 140;
    this.position.x = Math.max(-R, Math.min(R, this.position.x));
    this.position.z = Math.max(-R, Math.min(R, this.position.z));

    this.applyCamera();
  }
}