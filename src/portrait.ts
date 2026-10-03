// Dev-only: vẽ chân dung (mặt) 1 nhân vật cho khung phụ đề. /portrait.html?id=elsa|rapunzel|… — scripts/render-portraits.mjs
// chụp lại thành src/assets/portraits/<id>.png. Không nằm trong game (vite build chỉ đóng gói index.html).
import * as THREE from 'three';
import { PrincessActor } from './princess.ts';
import { ElsaGuide } from './elsa.ts';
import { princessInfo } from './rooms/princesses.ts';

const id = new URLSearchParams(location.search).get('id') ?? 'elsa';
const S = 384;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(S, S);
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xfff6fb, 0xd8c8ff, 1.5));
const key = new THREE.DirectionalLight(0xfff3e0, 2.0);
key.position.set(1.5, 3, 4);
scene.add(key);
const camera = new THREE.PerspectiveCamera(20, 1, 0.05, 50);

async function main(): Promise<void> {
  let head: THREE.Vector3;
  if (id === 'elsa') {
    const e = new ElsaGuide(1.9);
    await e.load();
    scene.add(e.root);
    for (let i = 0; i < 10; i++) e.update(1 / 30);
    e.root.updateMatrixWorld(true);
    head = e.headWorld(new THREE.Vector3()).add(new THREE.Vector3(0, -0.02, 0));
  } else {
    const model = `p_${id}.glb`;
    const info = princessInfo(model);
    const a = new PrincessActor({ model, height: 1.75, tuning: info?.tuning, hide: info?.hide, hideBones: info?.hideBones });
    await a.load(false);
    scene.add(a.root);
    for (let i = 0; i < 10; i++) a.update(1 / 30);
    a.root.updateMatrixWorld(true);
    head = new THREE.Vector3(0, 1.75 * 0.875, 0);
  }
  camera.position.set(head.x, head.y + 0.02, head.z + (id === 'elsa' ? 1.9 : 1.75));
  camera.lookAt(head);
  renderer.render(scene, camera);
  (window as unknown as Record<string, unknown>).__ready = true;
}
main().catch((e) => { console.error(e); (window as unknown as Record<string, unknown>).__ready = 'err'; });
