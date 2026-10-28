import * as THREE from './lib/three.module.min.js';
import { RoomEnvironment } from './lib/RoomEnvironment.js';

const PALETTE = {
  wall: 0xd9dbde,
  wallSide: 0xe2e4e7,
  plinthTop: 0xb6bac0,
  plinthSide: 0xa8adb4,
  floorStage: 0xf1f2f4,
  white: 0xf4f5f6,
  chrome: 0xdadde0,
  darkSeat: 0x191c21,
  darkSofa: 0x181b20,
  glassGreen: 0xd9e7dc,
  glassClear: 0xeef2f4
};

const matCache = new Map();

function std(key, opts) {
  if (!matCache.has(key)) {
    const m = new THREE.MeshStandardMaterial(opts);
    matCache.set(key, m);
  }
  return matCache.get(key);
}

export const materials = {
  get wall() {
    return std('wall', { color: PALETTE.wall, roughness: 0.85, metalness: 0 });
  },
  get wallSide() {
    return std('wallSide', { color: PALETTE.wallSide, roughness: 0.94, metalness: 0 });
  },
  get white() {
    return std('white', { color: PALETTE.white, roughness: 0.88, metalness: 0 });
  },
  get plinthTop() {
    return std('plinthTop', { color: PALETTE.plinthTop, roughness: 0.62, metalness: 0.02 });
  },
  get plinthSide() {
    return std('plinthSide', { color: PALETTE.plinthSide, roughness: 0.8, metalness: 0 });
  },
  get chrome() {
    return std('chrome', { color: PALETTE.chrome, roughness: 0.16, metalness: 1 });
  },
  get darkSeat() {
    return std('darkSeat', { color: PALETTE.darkSeat, roughness: 0.5, metalness: 0 });
  },
  get sofa() {
    return std('sofa', { color: PALETTE.darkSofa, roughness: 0.42, metalness: 0 });
  },
  glass(color) {
    const key = 'glass' + color;
    if (!matCache.has(key)) {
      matCache.set(key, new THREE.MeshPhysicalMaterial({
        color, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.38,
        side: THREE.DoubleSide, envMapIntensity: 1.4
      }));
    }
    return matCache.get(key);
  },
  glassTop() { return this.glass(PALETTE.glassGreen); },
  glassClear() { return this.glass(PALETTE.glassClear); }
};

function canvasTexture(w, h, draw, {
  srgb = true, repeat = null
} = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.anisotropy = 8;
  return t;
}

let coneTex = null;
export function lightConeTexture() {
  if (coneTex) return coneTex;
  coneTex = canvasTexture(128, 256, (ctx, w, h) => {
    const cx = w / 2;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.28, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.10, 0);
    ctx.lineTo(cx + w * 0.10, 0);
    ctx.lineTo(cx + w * 0.42, h);
    ctx.lineTo(cx - w * 0.42, h);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-in';
    const soft = ctx.createLinearGradient(0, 0, 0, h);
    soft.addColorStop(0, 'rgba(0,0,0,1)');
    soft.addColorStop(0.75, 'rgba(0,0,0,0.8)');
    soft.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = soft;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }, { srgb: false });
  return coneTex;
}

let blobTex = null;
export function blobShadowTexture() {
  if (blobTex) return blobTex;
  blobTex = canvasTexture(256, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(30,36,44,0.30)');
    g.addColorStop(0.55, 'rgba(30,36,44,0.15)');
    g.addColorStop(1, 'rgba(30,36,44,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, { srgb: false });
  return blobTex;
}

let floorRimTex = null;
export function floorRimTexture() {
  if (floorRimTex) return floorRimTex;
  floorRimTex = canvasTexture(512, 512, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w * 0.5);
    g.addColorStop(0, 'rgba(190,196,204,0.5)');
    g.addColorStop(0.55, 'rgba(198,204,212,0.22)');
    g.addColorStop(1, 'rgba(210,215,222,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, { srgb: false });
  return floorRimTex;
}

export function makeBlobShadow(w, d, opacity = 0.85) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({
      map: blobShadowTexture(), transparent: true,
      depthWrite: false, opacity
    })
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 2;
  return m;
}

export function makeLightCone(w, h, opacity = 1) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      map: lightConeTexture(), transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity
    })
  );
  m.renderOrder = 3;
  return m;
}

export function setupEnvironment(renderer, scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  const hemi = new THREE.HemisphereLight(0xffffff, 0xd8dae0, 1.2);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(6, 14, 3);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.4);
  fill.position.set(-7, 9, -6);
  scene.add(fill);
}

export function setupSceneDefaults(scene) {
  scene.background = new THREE.Color(0xf4f5f6);
  scene.fog = new THREE.Fog(0xf4f5f6, 18, 42);
}

export function makeStageFloor(radius = 34) {
  const geo = new THREE.CircleGeometry(radius, 64);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: PALETTE.floorStage, roughness: 0.92, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -0.002;

  const rimGeo = new THREE.PlaneGeometry(radius * 2.2, radius * 2.2);
  rimGeo.rotateX(-Math.PI / 2);
  const rim = new THREE.Mesh(
    rimGeo,
    new THREE.MeshBasicMaterial({ map: floorRimTexture(), transparent: true, depthWrite: false })
  );
  rim.renderOrder = 1;
  const group = new THREE.Group();
  group.add(mesh, rim);
  return group;
}
