import * as THREE from 'three';
import { buildWorld } from './world.js';
import { PlayerController } from './player.js';
import { VRManager } from './vr.js';

/* ============================================================
   ESTADO GLOBAL
   ============================================================ */
const state = {
  mode: 'menu',           // 'menu' | 'fps' | 'vr'
  paused: true,
  stereo: true,
  shadowEnabled: true,
  sens: 1,
  speedMul: 1,
  inXR: false,
  ready: false,           // ¿se inicializó el motor?
};

let renderer, scene, camera, sun;
let world;               // { dispose, cars }
let player, vrMgr;
let lastTime = 0;

/* DOM refs */
const $ = id => document.getElementById(id);
const els = {
  menu:$('menu'), cross:$('cross'), blink:$('blink'), toast:$('toast'),
  hud:$('hud'), hudA:$('hudA'), hudB:$('hudB'), help:$('help'),
  btnFps:$('btnFps'), btnVr:$('btnVr'), btnXr:$('btnXr'),
  btnReport:$('btnReport'),
  sens:$('sens'), spd:$('spd'), shadows:$('shadows'), stereo:$('stereo'),
};

/* ============================================================
   UTILIDADES
   ============================================================ */
let toastTimer;
function toast(msg, ms = 1600) {
  els.toast.textContent = msg;
  els.toast.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.style.opacity = '0', ms);
}

function blink(cb, ms = 110) {
  els.blink.style.opacity = '1';
  setTimeout(() => { cb(); els.blink.style.opacity = '0'; }, ms);
}

function buildReport() {
  const lines = [
    '=====================================================',
    ' REPORTE DE PRUEBAS — Simulador 3D / VR',
    '=====================================================',
    'Fecha: ' + new Date().toISOString(),
    'Navegador: ' + navigator.userAgent,
    'Renderer: ' + (renderer ? renderer.info.render.calls + ' draw calls, ' +
      renderer.info.render.triangles + ' triángulos' : 'N/A'),
    '',
    'Modos probados:',
    '  [x] Recorrido FPS',
    '  [x] Simulador VR (teletransporte + giro por pasos)',
    '  [x] Vista estéreo (dos ojos)',
    '  [x] WebXR (si el navegador lo soporta)',
    '',
    'Ajustes:',
    '  Sensibilidad: ' + state.sens,
    '  Velocidad:    ' + state.speedMul,
    '  Sombras:      ' + state.shadowEnabled,
    '  Estéreo:      ' + state.stereo,
    '',
    'Fin del reporte.',
  ];
  return lines.join('\n');
}

function downloadReport() {
  const url = URL.createObjectURL(new Blob([buildReport()], { type:'text/plain' }));
  const a = Object.assign(document.createElement('a'),
    { href:url, download:'reporte-simulador.txt' });
  a.click();
  URL.revokeObjectURL(url);
  toast('Reporte descargado');
}

/* ============================================================
   INICIALIZACIÓN DEL MOTOR 3D (diferida)
   ============================================================ */
async function initEngine() {
  if (state.ready) return;

  const canvas = $('c');

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.xr.enabled = true;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b7e8);
  scene.fog = new THREE.Fog(0x87b7e8, 40, 140);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 500);

  /* Luces */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 1.1);
  scene.add(hemi);

  sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(30, 50, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 160;
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);

  /* Mundo (usa InstancedMesh internamente) */
  world = buildWorld(scene);

  /* Jugador y VR */
  player = new PlayerController(camera, scene, state);
  vrMgr = new VRManager(renderer, scene, camera, state, toast, blink);

  /* Comprobar WebXR */
  if (navigator.xr) {
    const supported = await navigator.xr.isSessionSupported('immersive-vr').catch(() => false);
    if (supported) els.btnXr.style.display = '';
  }

  /* Bucle de render */
  renderer.setAnimationLoop(animate);

  /* Resize */
  let rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight, false);
    }, 120);
  });

  /* No gastar GPU en pestaña oculta */
  document.addEventListener('visibilitychange', () => {
    if (state.inXR) return;
    state.paused = document.hidden || state.mode === 'menu';
  });

  /* En XR bajar calidad para mantener FPS */
  renderer.xr.addEventListener('sessionstart', () => {
    state.inXR = true;
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = false;
  });
  renderer.xr.addEventListener('sessionend', () => {
    state.inXR = false;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = state.shadowEnabled;
    exitToMenu();
  });

  state.ready = true;
}

/* ============================================================
   BUCLE
   ============================================================ */
function animate(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (!state.paused && state.mode !== 'menu' && !state.inXR) {
    player.update(dt);
    if (state.mode === 'vr') vrMgr.update(dt);
    world.updateCars?.(dt);
  }

  renderer.render(scene, camera);

  if (state.mode !== 'menu') {
    els.hudA.textContent =
      'XYZ ' + player.position.x.toFixed(1) + ', ' +
      player.position.y.toFixed(1) + ', ' +
      player.position.z.toFixed(1);
    els.hudB.textContent =
      'Modo: ' + state.mode.toUpperCase() +
      ' | FPS: ' + Math.round(1000 / Math.max(1, dt * 1000)).toString().padStart(3, ' ');
  }
}

/* ============================================================
   FLUJO DE UI
   ============================================================ */
function hideMenu() { els.menu.style.display = 'none'; }
function showMenu() {
  els.menu.style.display = '';
  els.hud.style.display = 'none';
  els.help.style.display = 'none';
  els.cross.style.display = 'none';
}

function enterFPS() {
  state.mode = 'fps';
  state.paused = false;
  hideMenu();
  els.hud.style.display = '';
  els.help.style.display = '';
  els.help.innerHTML =
    '<b>WASD</b> mover · <b>Mouse</b> mirar · <b>Shift</b> correr · ' +
    '<b>Espacio</b> saltar · <b>Clic izq.</b> interactuar · ' +
    '<b>2</b> VR · <b>R</b> reiniciar · <b>P</b> captura · <b>Esc</b> menú';
  els.cross.style.display = state.stereo ? '' : 'none';
  player.reset();
  player.setFPSMode();
  if (document.pointerLockElement !== document.body) {
    document.body.requestPointerLock?.();
  }
  toast('Recorrido FPS');
}

function enterVR() {
  state.mode = 'vr';
  state.paused = false;
  hideMenu();
  els.hud.style.display = '';
  els.help.style.display = '';
  els.help.innerHTML =
    '<b>WASD</b> mover · <b>Mouse</b> mirar · ' +
    '<b>Clic der.</b> o <b>T</b> teletransporte · ' +
    '<b>Q</b>/<b>E</b> giro por pasos · <b>V</b> estéreo · ' +
    '<b>1</b> FPS · <b>Esc</b> menú';
  els.cross.style.display = state.stereo ? '' : 'none';
  player.reset();
  player.setVRMode();
  vrMgr.reset();
  if (document.pointerLockElement !== document.body) {
    document.body.requestPointerLock?.();
  }
  toast('Simulador VR');
}

function exitToMenu() {
  state.paused = true;
  state.mode = 'menu';
  if (document.pointerLockElement) document.exitPointerLock();
  showMenu();
}

async function enterWebXR() {
  await initEngine();
  try {
    const session = await navigator.xr.requestSession('immersive-vr', {
      optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
    });
    renderer.xr.setSession(session);
    state.mode = 'vr';
    state.paused = false;
    hideMenu();
    toast('WebXR activo');
  } catch (err) {
    console.error(err);
    toast('No se pudo iniciar WebXR');
  }
}

/* ============================================================
   INPUT GLOBAL
   ============================================================ */
addEventListener('keydown', (e) => {
  if (state.mode === 'menu') return;
  const k = e.key.toLowerCase();

  if (k === 'escape') { exitToMenu(); return; }
  if (k === '1') { enterFPS(); return; }
  if (k === '2') { enterVR(); return; }
  if (k === 'v') {
    state.stereo = !state.stereo;
    vrMgr.setStereo(state.stereo);
    els.cross.style.display = state.stereo && state.mode !== 'menu' ? '' : 'none';
    toast('Vista estéreo: ' + (state.stereo ? 'ON' : 'OFF'));
    return;
  }
  if (k === 'r') { player.reset(); toast('Posición reiniciada'); return; }
  if (k === 'p') { captureScreenshot(); return; }

  player.handleKey(e);
});

addEventListener('keyup', (e) => player.handleKey(e));

/* Pausa si se pierde el pointer lock (Esc del navegador) */
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && state.mode !== 'menu' && !state.inXR) {
    state.paused = true;
    showMenu();
  }
});

/* Reanudar al hacer clic en el canvas */
$('c').addEventListener('click', () => {
  if (state.mode !== 'menu' && !state.inXR && !document.pointerLockElement) {
    document.body.requestPointerLock?.();
    state.paused = false;
  }
});

/* ============================================================
   CAPTURA PNG
   ============================================================ */
function captureScreenshot() {
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  const a = Object.assign(document.createElement('a'),
    { href:url, download:'captura-' + Date.now() + '.png' });
  a.click();
  toast('Captura guardada');
}

/* ============================================================
   BOTONES Y AJUSTES
   ============================================================ */
els.btnFps.addEventListener('click', async () => {
  await initEngine();
  enterFPS();
});
els.btnVr.addEventListener('click', async () => {
  await initEngine();
  enterVR();
});
els.btnXr.addEventListener('click', enterWebXR);
els.btnReport.addEventListener('click', downloadReport);

els.sens.addEventListener('input', () => {
  state.sens = parseFloat(els.sens.value);
  player?.setSensitivity(state.sens);
});
els.spd.addEventListener('input', () => {
  state.speedMul = parseFloat(els.spd.value);
});
els.shadows.addEventListener('change', () => {
  state.shadowEnabled = els.shadows.checked;
  renderer.shadowMap.enabled = state.shadowEnabled;
  scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
});
els.stereo.addEventListener('change', () => {
  state.stereo = els.stereo.checked;
  vrMgr?.setStereo(state.stereo);
  els.cross.style.display = state.stereo && state.mode !== 'menu' ? '' : 'none';
});

/* Asistente IA conectado al backend OpenAI */
(() => {
  const $ai = id => document.getElementById(id);
  const panel=$ai('aiPanel'), history=[];
  $ai('aiToggle').addEventListener('click',()=>panel.classList.toggle('open'));
  $ai('aiClose').addEventListener('click',()=>panel.classList.remove('open'));
  function addMessage(text,role){
    const el=document.createElement('div'); el.className=`aiMsg ${role}`;
    el.textContent=text; $ai('aiMessages').appendChild(el);
    $ai('aiMessages').scrollTop=$ai('aiMessages').scrollHeight;
  }
  $ai('aiForm').addEventListener('submit',async event=>{
    event.preventDefault();
    const input=$ai('aiInput'), send=$ai('aiSend'), status=$ai('aiStatus');
    const message=input.value.trim(); if(!message||send.disabled)return;
    addMessage(message,'user'); input.value=''; send.disabled=true;
    status.textContent='La IA está preparando una respuesta...';
    try{
      const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message,mode:state.mode,position:player?{
          x:Number(player.position.x.toFixed(1)),y:Number(player.position.y.toFixed(1)),
          z:Number(player.position.z.toFixed(1))}:null,history:history.slice(-10)})});
      const data=await response.json(); if(!response.ok)throw new Error(data.error||'Error de conexión');
      addMessage(data.reply,'bot'); history.push({role:'user',content:message},{role:'assistant',content:data.reply});
      status.textContent='Respuesta generada por OpenAI.';
    }catch(error){
      addMessage(`No se pudo obtener respuesta: ${error.message}`,'bot');
      status.textContent='Verifica el servidor y la configuración de OPENAI_API_KEY.';
    }finally{send.disabled=false;input.focus();}
  });
})();
