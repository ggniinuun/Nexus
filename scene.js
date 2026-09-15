import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

export function createScene(host, motion) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); }
  catch { host.querySelector('.scene-fallback').hidden = false; return { setMotion() {}, reset() {}, pulse() {} }; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  camera.position.set(0, 0, 8.8);
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(environment, .035);
  scene.environment = env.texture;
  environment.dispose(); pmrem.dispose();
  const group = new THREE.Group();
  scene.add(group);
  const material = new THREE.MeshStandardMaterial({ color: 0x939d98, metalness: 1, roughness: .18, envMapIntensity: 1.25 });
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.18, .39, 256, 40, 2, 3), material);
  group.add(knot);
  group.rotation.set(.22, -.32, -.28);
  const baseScale = .98;
  group.scale.setScalar(baseScale);
  const light = new THREE.DirectionalLight(0xf0f4ed, 3);
  light.position.set(-3, 4, 3); scene.add(light);
  const blue = new THREE.DirectionalLight(0xa4b7ef, 2);
  blue.position.set(4, -2, 0); scene.add(blue);
  let dragging = false, lastX = 0, lastY = 0, targetY = -.32, targetX = .22, energy = 0, visible = true;
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.position.z = camera.aspect < 1 ? 10.2 : 8.5;
    camera.updateProjectionMatrix();
    group.position.set(.13, -.13, 0);
    inspectPixels = true;
  };
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }).observe(host);
  renderer.domElement.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; renderer.domElement.setPointerCapture(e.pointerId); });
  renderer.domElement.addEventListener('pointermove', e => {
    if (!dragging) return;
    targetY += (e.clientX - lastX) * .009; targetX += (e.clientY - lastY) * .006;
    lastX = e.clientX; lastY = e.clientY;
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) renderer.domElement.addEventListener(event, () => { dragging = false; });
  let previous = performance.now(), inspectPixels = true;
  renderer.setAnimationLoop(now => {
    const delta = Math.min((now - previous) / 1000, .05); previous = now;
    if (!visible || document.hidden) return;
    if (motion && !dragging) targetY += delta * .095;
    const smoothing = 1 - Math.exp(-delta * 7);
    group.rotation.y += (targetY - group.rotation.y) * smoothing;
    group.rotation.x += (targetX - group.rotation.x) * smoothing;
    energy *= Math.exp(-delta * 3);
    group.scale.setScalar(baseScale + energy * .065);
    renderer.render(scene, camera);
    if (inspectPixels) {
      // A one-time render diagnostic used by browser smoke checks.
      const gl = renderer.getContext();
      const pixels = new Uint8Array(renderer.domElement.width * renderer.domElement.height * 4);
      gl.readPixels(0, 0, renderer.domElement.width, renderer.domElement.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let visiblePixels = 0;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) visiblePixels++;
      renderer.domElement.dataset.visiblePixels = String(visiblePixels);
      inspectPixels = false;
    }
  });
  resize();
  return {
    setMotion(value) { motion = value; },
    reset() { targetY = -.32; targetX = .22; },
    pulse() { if (motion) energy = 1; }
  };
}
