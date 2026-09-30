// Dev-only: xem 1 model. /viewer.html?model=models/twilight/scene.gltf&yaw=0.6&anim=1
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const q = new URLSearchParams(location.search);
const url = q.get('model') ?? 'models/twilight/scene.gltf';
const yaw = Number(q.get('yaw') ?? 0.7);
const animIdx = q.get('anim');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfff4e4);
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.01, 1000);
scene.add(new THREE.HemisphereLight(0xfff9ec, 0xbfe09c, 1.3));
const sun = new THREE.DirectionalLight(0xfff5e2, 2.2);
sun.position.set(4, 8, 5);
sun.castShadow = true;
scene.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(50, 48), new THREE.MeshStandardMaterial({ color: 0xc6e88e, roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const info = document.getElementById('info')!;
let mixer: THREE.AnimationMixer | null = null;
new GLTFLoader().load(url, (gltf) => {
  const obj = gltf.scene;
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) if ('metalness' in mat) (mat as THREE.MeshStandardMaterial).metalness = 0;
      const sm = m as unknown as THREE.SkinnedMesh;
      if (sm.isSkinnedMesh) sm.computeBoundingBox();
    }
  });
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj, true);
  const size = box.getSize(new THREE.Vector3());
  const s = 2 / Math.max(size.y, 1e-4);
  obj.scale.multiplyScalar(s);
  obj.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(obj, true);
  const c = box2.getCenter(new THREE.Vector3());
  obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= box2.min.y;
  obj.rotation.y = yaw;
  scene.add(obj);
  camera.position.set(4.5, 2.6, 5.5);
  camera.lookAt(0, 1, 0);
  const meshCount = (() => { let n = 0; obj.traverse((o) => { if ((o as THREE.Mesh).isMesh) n++; }); return n; })();
  info.textContent = `${url} | size ${size.x.toFixed(2)}×${size.y.toFixed(2)}×${size.z.toFixed(2)} | meshes ${meshCount} | anims ${gltf.animations.length}`;
  if (animIdx !== null && gltf.animations[Number(animIdx)]) {
    mixer = new THREE.AnimationMixer(obj);
    mixer.clipAction(gltf.animations[Number(animIdx)]).play();
    info.textContent += ` | playing ${gltf.animations[Number(animIdx)].name}`;
  }
  (window as any).__ready = true;
}, undefined, (e) => { info.textContent = 'ERR ' + String(e); (window as any).__ready = 'err'; });

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  mixer?.update(clock.getDelta());
  renderer.render(scene, camera);
});
