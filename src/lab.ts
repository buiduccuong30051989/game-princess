// Dev lab: xem 12 tượng cùng lúc ở 1 trạng thái để soát tư thế / băng.
// /lab.html?state=frozen|bind|rest|wave|curtsy|open|cheer|twirl&ice=0..2&only=p_belle
import * as THREE from 'three';
import { PrincessActor } from './princess.ts';
import { PRINCESS_MODELS } from './rooms/princesses.ts';
import { updateTweens } from './tween.ts';

const q = new URLSearchParams(location.search);
const state = q.get('state') ?? 'rest';
const iceLevel = Number(q.get('ice') ?? 0);
const only = q.get('only');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfbeef6);
scene.add(new THREE.HemisphereLight(0xffffff, 0xf3d6ea, 1.5));
const sun = new THREE.DirectionalLight(0xfff5e8, 2.2);
sun.position.set(3, 7, 6);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 100);

const list = PRINCESS_MODELS.filter((p) => !only || p.model.startsWith(only));
const cols = Math.min(6, list.length);
const rows = Math.ceil(list.length / cols);
const gap = 1.25;
camera.position.set(0, 1.0 + (rows - 1) * 1.1, 6.5 * Math.max(cols / 6, 0.45) + rows * 1.6);
camera.lookAt(0, 0.9 + (rows - 1) * 1.0, 0);

const actors: PrincessActor[] = [];
const info: string[] = [];
const bar = document.getElementById('bar')!;
for (const s of ['frozen', 'bind', 'rest', 'wave', 'curtsy', 'open', 'cheer', 'twirl']) {
  const a = document.createElement('a');
  a.textContent = s;
  const u = new URLSearchParams(q); u.set('state', s);
  a.href = '?' + u.toString();
  bar.appendChild(a);
}
await Promise.all(list.map(async (p, i) => {
  const a = new PrincessActor({ model: p.model, height: 1.6, tuning: p.tuning, hide: p.hide, hideBones: p.hideBones });
  await a.load(state === 'frozen', iceLevel);
  const c = i % cols, r = Math.floor(i / cols);
  a.root.position.set((c - (cols - 1) / 2) * gap, (rows - 1 - r) * 2.0, 0);
  scene.add(a.root);
  actors[i] = a;
  const w = a.w;
  a.idleLife = false;
  if (state === 'bind') { w.rest = 0; w.breathe = 0; }
  if (state === 'wave') w.wave = 1;
  if (state === 'curtsy') w.curtsy = 1;
  if (state === 'open') w.open = 1;
  if (state === 'cheer') w.cheer = 1;
  info[i] = `${p.model} ${a.poser?.group} ok=${a.poser?.ok} yaw=${a.poser?.facingYaw.toFixed(2)}`;
}));
document.getElementById('info')!.textContent = info.join('\n');

const timer = new THREE.Timer();
let turn = 0;
renderer.setAnimationLoop(() => {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);
  updateTweens(dt);
  if (state === 'twirl') { turn -= dt; if (turn <= 0) { turn = 3; actors.forEach((a) => void a.twirl()); } }
  for (const a of actors) a?.update(dt);
  renderer.render(scene, camera);
});
(window as unknown as Record<string, unknown>).__lab = { actors, scene, camera, renderer, ready: true };
