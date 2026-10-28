import * as THREE from './lib/three.module.min.js';
import { setupEnvironment, setupSceneDefaults, makeStageFloor } from './materials.js';
import { buildStand, MODEL_SPECS, logoFitTextureUpdate } from './stands.js';
import { BadgeLayer } from './badges.js';
import { Carousel } from './carousel.js';

const STEP_COUNT = 12;
const RADIUS = 8.5;
const MODEL_ORDER = ['C', 'B', 'A'];

console.info('[StShow] build 2026-10-28.2');

function companyInitials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'ST';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function roundedPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function makePlaceholderCanvas(name) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 320;
  const ctx = c.getContext('2d');
  const initials = companyInitials(name);
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(84,94,106,0.38)';
  roundedPath(ctx, 56, 72, 400, 176, 34);
  ctx.stroke();
  ctx.fillStyle = 'rgba(58,66,78,0.82)';
  ctx.font = '700 118px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, 256, 162, 330);
  return c;
}

function normalizeData(raw) {
  const out = [];
  const src = Array.isArray(raw) ? raw : [];
  for (let i = 0; i < STEP_COUNT; i++) {
    const c = src[i] || {};
    out.push({
      name: c.name || 'Empresa ' + (i + 1),
      logo: (!c.logo || c.logo === 'PLACEHOLDER') ? '' : c.logo
    });
  }
  return out;
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) {
    return false;
  }
}

function setUpFallback(root, companies) {
  const wrap = root.querySelector('.stshow__fallback') || root.appendChild(Object.assign(document.createElement('div'), { className: 'stshow__fallback' }));
  for (const c of companies) {
    const item = document.createElement('div');
    item.className = 'stshow__fallback-item';
    const logo = document.createElement('div');
    logo.className = 'stshow__fallback-logo';
    const canvas = c._placeholderCanvas;
    logo.style.backgroundImage = c.logo ? 'url("' + c.logo + '")' : 'url("' + canvas.toDataURL('image/png') + '")';
    const name = document.createElement('div');
    name.className = 'stshow__fallback-name';
    name.textContent = c.name;
    item.append(logo, name);
    wrap.appendChild(item);
  }
  root.classList.add('no-webgl', 'is-ready');
}

function initRoot(root) {
  if (root.__stshow) return;
  root.__stshow = true;
  let raf = 0;
  let ready = false;

  const raw = (window.StShowData && window.StShowData.companies) || [];
  const companies = normalizeData(raw).map((c, i) => ({ ...c, _placeholderCanvas: makePlaceholderCanvas(c.name) }));

  root.setAttribute('role', 'region');
  root.setAttribute('aria-roledescription', 'carrusel de stands');
  root.setAttribute('aria-label', 'Recorrido de stands comerciales');
  root.tabIndex = 0;
  if (root.dataset.height) root.style.setProperty('--stshow-h', root.dataset.height);
  if (root.clientHeight < 200) {
    root.style.height = window.innerHeight + 'px';
  }
  if (root.dataset.title) {
    const title = document.createElement('div');
    title.className = 'stshow__title';
    title.textContent = root.dataset.title;
    root.appendChild(title);
  }
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('reduce-motion');
  }

  if (!hasWebGL()) {
    setUpFallback(root, companies);
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'stshow__canvas';
  const ui = document.createElement('div');
  ui.className = 'stshow__ui';
  root.append(canvas, ui);

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'stshow__arrow stshow__arrow--prev';
  prev.setAttribute('aria-label', 'Mover hacia la izquierda');
  prev.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg>';
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'stshow__arrow stshow__arrow--next';
  next.setAttribute('aria-label', 'Mover hacia la derecha');
  next.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5L16 12l-6.5 6.5"/></svg>';

  const badges = new BadgeLayer(ui, companies, i => {
    carousel.goToIndex(i);
    schedule();
  });

  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) {
    setUpFallback(root, companies);
    return;
  }
  if (!renderer.getContext()) {
    setUpFallback(root, companies);
    return;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  try { renderer.toneMapping = THREE.NeutralToneMapping; } catch (e) { renderer.toneMapping = THREE.ACESFilmicToneMapping; }

  const scene = new THREE.Scene();
  setupSceneDefaults(scene);
  setupEnvironment(renderer, scene);
  scene.add(makeStageFloor());

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 70);

  const carousel = new Carousel({
    count: STEP_COUNT,
    onChange: schedule,
    onFocus: i => {
      root.setAttribute('aria-label', 'Recorrido de stands. En foco: ' + companies[i].name);
    }
  });

  ui.append(prev, next);
  prev.addEventListener('click', () => { carousel.step(1); schedule(); });
  next.addEventListener('click', () => { carousel.step(-1); schedule(); });

  root.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { carousel.step(-1); schedule(); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { carousel.step(1); schedule(); e.preventDefault(); }
  });

  const stands = [];
  for (let i = 0; i < STEP_COUNT; i++) {
    const model = MODEL_ORDER[i % MODEL_ORDER.length];
    const stand = buildStand(model, { ...MODEL_SPECS[model].logo });
    const theta = (i / STEP_COUNT) * Math.PI * 2;
    stand.position.set(Math.sin(theta) * RADIUS, 0, Math.cos(theta) * RADIUS);
    stand.rotation.y = theta + Math.PI;
    scene.add(stand);
    stands.push(stand);

    const anchorLocal = stand.userData.badgeAnchor;
    const anchorWorld = anchorLocal.clone().applyMatrix4(stand.matrixWorld);
    badges.placeAnchor(i, anchorWorld);

    const comp = companies[i];
    badges.setLogoImage(i, comp.logo || comp._placeholderCanvas.toDataURL('image/png'));
    const logoMesh = stand.userData.logoMesh;
    if (comp.logo) {
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      loader.load(comp.logo, tex => {
        const img = tex.image;
        logoMesh.material.map = tex;
        logoFitTextureUpdate(logoMesh, img.width, img.height);
        schedule();
      }, undefined, () => {
        applyPlaceholder3D(logoMesh, comp);
        schedule();
      });
    } else {
      applyPlaceholder3D(logoMesh, comp);
    }
  }

  scene.updateMatrixWorld(true);
  stands.forEach((stand, i) => {
    badges.placeAnchor(i, stand.userData.badgeAnchor.clone().applyMatrix4(stand.matrixWorld));
  });
  stands.forEach(stand => {
    if (stand.userData.logoMesh.material.map) schedule();
  });

  function applyPlaceholder3D(logoMesh, comp) {
    const tex = new THREE.CanvasTexture(comp._placeholderCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    logoMesh.material.map = tex;
    logoFitTextureUpdate(logoMesh, comp._placeholderCanvas.width, comp._placeholderCanvas.height);
    schedule();
  }

  let width = 0;
  let height = 0;
  function resize() {
    const w = root.clientWidth;
    const h = root.clientHeight;
    if (!w || !h || w < 50 || h < 50) return;
    const aspect = w / h;
    let vf;
    if (aspect > 1.35) vf = 50;
    else if (aspect > 0.9) vf = 56;
    else vf = Math.min(92, (2 * Math.atan(Math.tan((34 * Math.PI) / 180) / aspect) * 180) / Math.PI);
    camera.fov = vf;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    if (width !== w || height !== h) {
      width = w;
      height = h;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      console.info('[StShow] buffer ' + Math.round(w * dpr) + 'x' + Math.round(h * dpr) + ' @ dpr ' + dpr);
      schedule();
    }
  }
  const ro = new ResizeObserver(resize);
  ro.observe(root);
  resize();

  canvas.addEventListener('pointerdown', e => {
    if (!e.isPrimary || carousel.capturedId !== null) return;
    canvas.setPointerCapture(e.pointerId);
    carousel.beginDrag(e.clientX, e.pointerId);
    root.classList.add('is-dragging');
    schedule();
  });
  canvas.addEventListener('pointermove', e => {
    if (carousel.capturedId === e.pointerId) {
      carousel.dragMove(e.clientX);
      schedule();
    }
  });
  function release(e) {
    if (carousel.capturedId !== e.pointerId) return;
    root.classList.remove('is-dragging');
    if (e.type === 'pointercancel') carousel.cancelDrag();
    else carousel.endDrag();
    schedule();
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  if (!root.classList.contains('reduce-motion')) {
    root.addEventListener('pointermove', e => {
      if (carousel.dragging || !e.isPrimary || e.pointerType !== 'mouse') return;
      const r = root.getBoundingClientRect();
      carousel.parTarget = ((e.clientX - r.left) / r.width - 0.5) * 0.055;
      schedule();
    });
    root.addEventListener('pointerleave', () => {
      carousel.parTarget = 0;
      schedule();
    });
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    raf = 0;
    try {
      const changed = carousel.update(now || performance.now());
      carousel.applyTo(camera);
      if (changed || !ready) {
        badges.update(camera, width, height, carousel.focusIndex);
        renderer.render(scene, camera);
        if (!ready) {
          ready = true;
          root.classList.add('is-ready');
        }
      }
      if (carousel.isBusy()) schedule();
    } catch (err) {
      raf = 0;
      console.error('StShow: error en el render, mostrando fallback.', err);
      renderer.dispose();
      setUpFallback(root, companies);
    }
  }

  if ('IntersectionObserver' in window && root.dataset.eager !== '1') {
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) {
          io.disconnect();
          resize();
          schedule();
        }
      }
    }, { rootMargin: '140px' });
    io.observe(root);
  } else {
    schedule();
  }
}

function boot() {
  if (window.StShowData && window.StShowData.auto !== false) {
    document.querySelectorAll('[data-stshow]').forEach(initRoot);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
