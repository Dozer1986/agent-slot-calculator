/** Build page controller: renders the model, spins it, and wires the explode, lid, view and part controls. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildModel } from '../lib/build/scene';
import { BUILD_PARTS } from '../data/build';

const view = document.getElementById('view') as HTMLElement;
const noWebgl = document.getElementById('no-webgl') as HTMLElement;
const spin = document.getElementById('spin') as HTMLInputElement;
const explode = document.getElementById('explode') as HTMLInputElement;
const lidBox = document.getElementById('lid') as HTMLInputElement;
const info = document.getElementById('part-info') as HTMLElement;
const partButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('button[data-part]'));

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch {
  noWebgl.hidden = false;
  document.querySelector<HTMLElement>('.build-side')!.hidden = true;
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
view.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.9;
const camera = new THREE.PerspectiveCamera(32, 1, 10);
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI * 0.62;
controls.enableDamping = true;
controls.autoRotateSpeed = 1.2;

const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(400, 900, 500);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = key.shadow.camera.bottom = -450;
key.shadow.camera.right = key.shadow.camera.top = 450;
key.shadow.camera.near = 100;
key.shadow.camera.far = 2500;
key.shadow.bias = -0.0005;
scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.6);
fill.position.set(-700, 300, -500);
scene.add(fill);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.ShadowMaterial({ opacity: 0.28 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.5;
ground.receiveShadow = true;
scene.add(ground);

const model = buildModel();
scene.add(model.group);

const VIEWS: Record<string, [number, number, number]> = {
  iso: [520, 500, 680],
  'rear-iso': [-520, 400, -760],
  front: [0, 200, 1200],
  rear: [0, 200, -1200],
  top: [0, 1300, 1],
};
const VIEW_ASPECT = 1.5;
const fit = () => Math.max(1, VIEW_ASPECT / camera.aspect);
function setView(name: string) {
  const p = VIEWS[name] ?? VIEWS.iso;
  // An undamped update clears any glide left from the last drag, which would otherwise carry on past the preset.
  controls.enableDamping = false;
  controls.update();
  controls.enableDamping = true;
  controls.target.set(0, 60, 0);
  camera.position.set(p[0], p[1], p[2]).sub(controls.target).multiplyScalar(fit()).add(controls.target);
  controls.update();
}

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
spin.checked = !reduceMotion;
controls.autoRotate = spin.checked;
spin.addEventListener('change', () => (controls.autoRotate = spin.checked));
controls.addEventListener('start', () => {
  spin.checked = false;
  controls.autoRotate = false;
});

explode.addEventListener('input', () => model.setExplode(Number(explode.value) / 100));
model.setExplode(Number(explode.value) / 100);
lidBox.addEventListener('change', () => model.setLid(lidBox.checked));
model.setLid(lidBox.checked);
document.querySelectorAll<HTMLButtonElement>('button[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view!)));

// Part highlight: from the list, or by clicking the model.
const accent = new THREE.Color(token('--accent'));
let selected: string | undefined;
const black = new THREE.Color(0);
function select(part: string | undefined) {
  selected = part;
  for (const [id, objs] of model.byPart) {
    for (const o of objs) {
      o.traverse((m) => {
        const mat = (m as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (mat?.emissive) {
          mat.emissive.copy(id === part ? accent : black);
          mat.emissiveIntensity = 0.45;
        }
      });
    }
  }
  for (const b of partButtons) b.setAttribute('aria-pressed', String(b.dataset.part === part));
  const p = BUILD_PARTS.find((x) => x.id === part);
  info.innerHTML = p
    ? `<strong>${p.name}</strong><span>${p.spec}</span><span class="mono">${p.size} mm</span>${p.note ? `<span>${p.note}</span>` : ''}${p.source ? `<a href="${p.source}" rel="noopener" target="_blank">Source</a>` : ''}`
    : '<span>Click a part in the model or the list.</span>';
}
partButtons.forEach((b) => b.addEventListener('click', () => select(selected === b.dataset.part ? undefined : b.dataset.part)));
select(undefined);

const ray = new THREE.Raycaster();
let down: [number, number] | undefined;
renderer.domElement.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
  const r = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const hit = ray.intersectObjects(model.group.children, true).find((h) => h.object.userData.part !== 'chassis');
  select(hit ? hit.object.userData.part : undefined);
});

function resize() {
  const w = view.clientWidth, h = view.clientHeight;
  const before = fit();
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Limits and the far plane scale with the distance, so a clamp can't lose zoom across a resize.
  controls.minDistance = 250 * fit();
  controls.maxDistance = 2500 * fit();
  camera.far = 6000 * fit();
  camera.updateProjectionMatrix();
  camera.position.sub(controls.target).multiplyScalar(fit() / before).add(controls.target);
}
new ResizeObserver(resize).observe(view);
resize();
setView('iso');

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
