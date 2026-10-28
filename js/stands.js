import * as THREE from './lib/three.module.min.js';
import { materials, makeBlobShadow, makeLightCone } from './materials.js';

const geoCache = new Map();

function G(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}

function roundedRectPath(s, x, y, w, h, r) {
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
}

function roundedBoxGeo(w, h, d, r, bevelSegments = 3) {
  const key = ['rb', w, h, d, r, bevelSegments].join('_');
  return G(key, () => {
    const rr = Math.max(0.005, Math.min(r, w / 2 - 0.004, h / 2 - 0.004));
    const b = Math.min(rr, d / 2 - 0.004, 0.05);
    const s = new THREE.Shape();
    roundedRectPath(s, -w / 2, -h / 2, w, h, rr);
    const g = new THREE.ExtrudeGeometry(s, {
      depth: Math.max(0.02, d - b * 2),
      bevelEnabled: true,
      bevelThickness: b,
      bevelSize: b * 0.96,
      bevelSegments,
      curveSegments: 10
    });
    g.center();
    g.computeVertexNormals();
    return g;
  });
}

function stadiumGeo(len, dep, h) {
  const key = ['st', len, dep, h].join('_');
  return G(key, () => {
    const r = dep / 2;
    const b = 0.03;
    const s = new THREE.Shape();
    s.absarc(-len / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5, false);
    s.absarc(len / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {
      depth: Math.max(0.02, h - b * 2),
      bevelEnabled: true,
      bevelThickness: b,
      bevelSize: b * 0.96,
      bevelSegments: 4,
      curveSegments: 32
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, b, 0);
    g.computeVertexNormals();
    return g;
  });
}

function boxGeo(w, h, d) {
  const key = ['bx', w, h, d].join('_');
  return G(key, () => new THREE.BoxGeometry(w, h, d));
}

function cylGeo(rt, rb, h, seg = 32) {
  const key = ['cy', rt, rb, h, seg].join('_');
  return G(key, () => new THREE.CylinderGeometry(rt, rb, h, seg));
}

function latheGeo(key, pts, seg = 40) {
  return G(key, () => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg));
}

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

function roundedMesh(w, h, d, r, mat, x = 0, y = 0, z = 0) {
  return mesh(roundedBoxGeo(w, h, d, r), mat, x, y, z);
}

function block(w, h, d, mat, x, y, z) {
  return mesh(boxGeo(w, h, d), mat, x, y, z);
}

const PLINTH_H = 0.35;
const PLINTH_W = 3.9;
const PLINTH_D = 2.8;
const WALL_T = 0.18;
const H0 = PLINTH_H;

function buildPlinth() {
  const g = new THREE.Group();
  const top = roundedMesh(PLINTH_W, PLINTH_H, PLINTH_D, 0.045, materials.plinthTop, 0, PLINTH_H / 2, 0);
  g.add(top);
  g.add(roundedMesh(PLINTH_W + 0.02, 0.07, PLINTH_D + 0.02, 0.02, materials.plinthSide, 0, 0.035, 0));
  return g;
}

function tulipStool() {
  const g = new THREE.Group();
  const seat = mesh(
    latheGeo('stoolSeat', [
      [0.001, 0.27], [0.10, 0.272], [0.17, 0.26], [0.24, 0.215], [0.272, 0.14], [0.262, 0.06], [0.20, 0.012], [0.02, 0.0]
    ]),
    materials.darkSeat, 0, H0 + 0.72, 0
  );
  const aro = mesh(cylGeo(0.105, 0.105, 0.022, 32), materials.chrome, 0, H0 + 0.735, 0);
  g.add(seat, aro);
  const col = mesh(cylGeo(0.026, 0.03, 0.72, 24), materials.chrome, 0, H0 + 0.36, 0);
  const base = mesh(cylGeo(0.085, 0.2, 0.075, 32), materials.chrome, 0, H0 + 0.037, 0);
  g.add(col, base);
  const shadow = makeBlobShadow(0.62, 0.62, 0.7);
  shadow.position.y = H0 + 0.004;
  g.add(shadow);
  return g;
}

function barTable() {
  const g = new THREE.Group();
  const top = mesh(cylGeo(0.42, 0.42, 0.035, 56), materials.glassTop(), 0, H0 + 1.05, 0);
  const lip = mesh(cylGeo(0.42, 0.42, 0.045, 56), materials.chrome, 0, H0 + 1.02, 0);
  lip.scale.set(0.985, 1, 0.985);
  const col = mesh(cylGeo(0.03, 0.045, 0.98, 28), materials.chrome, 0, H0 + 0.51, 0);
  const base = mesh(cylGeo(0.09, 0.23, 0.08, 36), materials.chrome, 0, H0 + 0.04, 0);
  g.add(top, lip, col, base);
  const shadow = makeBlobShadow(1.0, 1.0, 0.75);
  shadow.position.y = H0 + 0.004;
  g.add(shadow);
  return g;
}

function loungeTable() {
  const g = new THREE.Group();
  const top = mesh(cylGeo(0.54, 0.54, 0.045, 56), materials.glassTop(), 0, H0 + 1.0, 0);
  const col = mesh(cylGeo(0.05, 0.065, 0.95, 28), materials.chrome, 0, H0 + 0.5, 0);
  const base = mesh(cylGeo(0.11, 0.28, 0.09, 36), materials.chrome, 0, H0 + 0.045, 0);
  g.add(top, col, base);
  const shadow = makeBlobShadow(1.25, 1.25, 0.8);
  shadow.position.y = H0 + 0.004;
  g.add(shadow);
  return g;
}

function capsuleCounter() {
  const g = new THREE.Group();
  const body = mesh(stadiumGeo(2.2, 0.95, 1.02), materials.white);
  g.add(body);
  const shadow = makeBlobShadow(2.6, 1.35, 0.85);
  shadow.position.y = H0 + 0.004;
  g.add(shadow);
  return g;
}

function blockCounter(w, h, d) {
  const g = new THREE.Group();
  const body = roundedMesh(w, h, d, 0.055, materials.white, 0, H0 + h / 2, 0);
  g.add(body);
  const shadow = makeBlobShadow(w + 0.5, d + 0.5, 0.85);
  shadow.position.y = H0 + 0.004;
  g.add(shadow);
  return g;
}

function buildSofa() {
  const g = new THREE.Group();
  const M = materials.sofa;
  const base = roundedMesh(1.9, 0.3, 0.88, 0.04, M, 0, H0 + 0.17, 0);
  const squat_Pie = [];
  for (const sx of [-0.8, 0.8]) {
    for (const sz of [-0.34, 0.34]) {
      squat_Pie.push(mesh(cylGeo(0.035, 0.03, 0.1, 10), materials.chrome, sx, H0 + 0.05, sz));
    }
  }
  const seatL = roundedMesh(0.86, 0.17, 0.8, 0.05, M, -0.455, H0 + 0.4, 0.02);
  const seatR = roundedMesh(0.86, 0.17, 0.8, 0.05, M, 0.455, H0 + 0.4, 0.02);
  const back = roundedMesh(1.9, 0.52, 0.2, 0.05, M, 0, H0 + 0.55, -0.35);
  const backTilt = back;
  backTilt.rotation.x = -0.09;
  const armL = roundedMesh(0.18, 0.34, 0.86, 0.05, M, -1.04, H0 + 0.52, 0);
  const armR = roundedMesh(0.18, 0.34, 0.86, 0.05, M, 1.04, H0 + 0.52, 0);
  g.add(base, ...squat_Pie, seatL, seatR, backTilt, armL, armR);
  const shadow = makeBlobShadow(2.4, 1.3, 0.85);
  shadow.position.y = H0 + 0.004;
  g.add(shadow);
  return g;
}

function wallBlock(w, h, x, z) {
  const g = new THREE.Group();
  const body = block(w, h, WALL_T, materials.wall, 0, H0 + h / 2, 0);
  const shadow = makeBlobShadow(w + 0.25, 0.7, 0.6);
  shadow.position.y = H0 + 0.004;
  const rear = block(w, h * 0.86, 0.09, materials.wallSide, 0, H0 + h * 0.43 + 0.01, -WALL_T / 2 - 0.048);
  g.add(body, rear, shadow);
  g.position.set(x, 0, z);
  return g;
}

function fixtureCone(x, topY, z, coneW, coneH, tilt) {
  const g = new THREE.Group();
  const fx = roundedMesh(0.36, 0.095, 0.185, 0.02, materials.white, 0, 0.05, 0);
  fx.rotation.x = tilt;
  g.add(fx);
  const cone = makeLightCone(coneW, coneH, 0.9);
  cone.position.set(0, -coneH / 2 - 0.07, -0.004);
  g.add(cone);
  g.position.set(x, topY, z);
  return g;
}

function wallLighting(group, cx, wallW, z, topY) {
  const n = 3;
  const span = Math.min(wallW - 0.75, 2.4);
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? cx : cx - span / 2 + (span * i) / (n - 1);
    group.add(fixtureCone(x, topY, z, 1.05, 3.15, 0.55));
  }
}

function makeLogoCore(spec) {
  const geo = G('logoPlane', () => new THREE.PlaneGeometry(1, 1));
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0,
    transparent: true,
    opacity: 0.96,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(spec.x, spec.y, spec.z);
  m.userData.spec = spec;
  m.visible = false;
  return m;
}

function stepsRight() {
  const g = new THREE.Group();
  const s1 = roundedMesh(1.05, 0.23, 0.55, 0.02, materials.plinthSide, 1.35, 0.115, PLINTH_D / 2 + 0.27);
  const s2 = roundedMesh(1.05, 0.115, 0.5, 0.02, materials.plinthSide, 1.35, 0.0575, PLINTH_D / 2 + 0.75);
  g.add(s1, s2);
  return g;
}

function buildModelA(logoSpec) {
  const g = new THREE.Group();

  const wall = wallBlock(2.4, 5.0, -0.65, -1.22);
  g.add(wall);

  const beam = roundedMesh(4.35, 0.52, 0.85, 0.05, materials.white, 0.05, H0 + 4.15, -1.02);
  g.add(beam);

  const ped = roundedMesh(1.9, 0.55, 1.0, 0.04, materials.white, 1.02, H0 + 0.275, -0.72);
  const panel = roundedMesh(1.7, 2.4, 0.16, 0.03, materials.wallSide, 1.02, H0 + 1.75, -0.72);
  g.add(ped, panel);

  const counter = blockCounter(2.0, 1.08, 0.72);
  counter.position.set(0.1, 0, 0.5);
  g.add(counter);

  const sofa = buildSofa();
  sofa.position.set(0.62, 0, -0.35);
  g.add(sofa);

  const table = barTable();
  table.position.set(-1.32, 0, 0.7);
  g.add(table);
  const sA = tulipStool(); sA.rotation.y = 0.5; sA.position.set(-1.9, 0, 0.55);
  const sB = tulipStool(); sB.rotation.y = -0.4; sB.position.set(-1.25, 0, 1.25);
  const sC = tulipStool(); sC.rotation.y = 2.3; sC.position.set(-0.95, 0, 0.35);
  g.add(sA, sB, sC);

  g.add(stepsRight());

  wallLighting(g, -0.65, 2.4, -1.115, H0 + 5.0);

  const beamLight = fixtureCone(1.02, H0 + 3.15, -0.63, 0.85, 2.1, 0.18);
  g.add(beamLight);

  return g;
}

function buildModelB(logoSpec) {
  const g = new THREE.Group();

  const side = wallBlock(1.8, 4.3, -1.35, -1.22);
  g.add(side);

  const main = wallBlock(1.95, 5.0, 0.05, -1.22);
  g.add(main);

  const rightWall = wallBlock(0.95, 3.35, 1.5, -0.62);
  g.add(rightWall);

  const beam = roundedMesh(3.3, 0.4, 0.5, 0.04, materials.white, 0.55, H0 + 3.42, -0.6);
  g.add(beam);

  const counter = blockCounter(1.6, 1.12, 0.68);
  counter.position.set(0.05, 0, 0.42);
  g.add(counter);

  const table = loungeTable();
  table.position.set(1.0, 0, 0.25);
  g.add(table);
  const s1 = tulipStool(); s1.rotation.y = 0.4; s1.position.set(0.38, 0, -0.1);
  const s2 = tulipStool(); s2.rotation.y = -0.4; s2.position.set(1.62, 0, -0.1);
  const s3 = tulipStool(); s3.rotation.y = 2.5; s3.position.set(0.38, 0, 0.62);
  const s4 = tulipStool(); s4.rotation.y = -2.5; s4.position.set(1.62, 0, 0.62);
  g.add(s1, s2, s3, s4);

  wallLighting(g, 0.05, 1.95, -1.115, H0 + 5.0);
  wallLighting(g, -1.35, 1.8, -1.115, H0 + 4.3);

  return g;
}

function buildModelC(logoSpec) {
  const g = new THREE.Group();

  const wall = wallBlock(3.8, 5.0, 0, -1.22);
  g.add(wall);

  const counter = capsuleCounter();
  counter.position.set(-0.55, 0, 0.55);
  g.add(counter);

  const table = barTable();
  table.position.set(0.85, 0, 0.7);
  g.add(table);
  const sA = tulipStool(); sA.rotation.y = 0.35; sA.position.set(0.28, 0, 0.5);
  const sB = tulipStool(); sB.rotation.y = -2.9; sB.position.set(1.42, 0, 0.5);
  g.add(sA, sB);

  wallLighting(g, 0, 3.8, -1.115, H0 + 5.0);

  return g;
}

export function buildStand(model, logoSpec) {
  const g = new THREE.Group();
  g.add(buildPlinth());

  let builder;
  if (model === 'A') builder = buildModelA;
  else if (model === 'B') builder = buildModelB;
  else builder = buildModelC;

  const structure = builder(logoSpec);
  g.add(structure);

  const logoMesh = makeLogoCore(logoSpec);
  g.add(logoMesh);

  g.userData.badgeAnchor = new THREE.Vector3(logoSpec.badgeX, H0 + 5.0 + 0.42, logoSpec.badgeZ);
  g.userData.logoMesh = logoMesh;
  g.userData.model = model;
  return g;
}

export const MODEL_SPECS = {
  A: { logo: { x: -0.65, y: 3.0, z: -1.1, maxW: 2.0, maxH: 1.55, badgeX: -0.65, badgeZ: -1.1 } },
  B: { logo: { x: 0.05, y: 3.0, z: -1.1, maxW: 1.6, maxH: 1.55, badgeX: 0.05, badgeZ: -1.1 } },
  C: { logo: { x: 0, y: 3.0, z: -1.1, maxW: 2.7, maxH: 1.6, badgeX: 0, badgeZ: -1.1 } }
};

export function logoFitTextureUpdate(mesh, imgW, imgH) {
  const spec = mesh.userData.spec;
  const aspect = imgW && imgH ? imgW / imgH : 2.4;
  let w = spec.maxW;
  let h = w / aspect;
  if (h > spec.maxH) { h = spec.maxH; w = h * aspect; }
  mesh.scale.set(w, h, 1);
  mesh.visible = true;
  if (mesh.material.map) {
    mesh.material.map.colorSpace = THREE.SRGBColorSpace;
    mesh.material.needsUpdate = true;
  }
}
