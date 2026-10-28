import * as THREE from './lib/three.module.min.js';

const CHEVRON_D = 'M5.5 8.2l6.5 7.3 6.5-7.3';

const _v = new THREE.Vector3();
const _p = new THREE.Vector3();
const camFwd = new THREE.Vector3();
const camPos = new THREE.Vector3();

function makeBadge(company, index, onClick) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'stshow__badge';
  el.style.setProperty('--wave', String(index));
  el.setAttribute('aria-label', 'Ir al stand de ' + (company.name || 'empresa'));
  el.setAttribute('aria-current', 'false');

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'stshow__badge-chev');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', CHEVRON_D);
  svg.appendChild(path);

  const logo = document.createElement('span');
  logo.className = 'stshow__badge-logo';
  logo.setAttribute('aria-hidden', 'true');

  const name = document.createElement('span');
  name.className = 'stshow__badge-name';
  name.textContent = company.name || '';

  el.append(svg, logo, name);
  el.addEventListener('click', () => onClick(index));
  return { el, logoEl: logo, world: null, visible: false, focused: false };
}

export class BadgeLayer {
  constructor(uiRoot, companies, onClick) {
    const wrap = document.createElement('div');
    wrap.className = 'stshow__badges';
    this.items = companies.map((c, i) => {
      const it = makeBadge(c, i, onClick);
      wrap.appendChild(it.el);
      return it;
    });
    uiRoot.appendChild(wrap);
  }

  placeAnchor(i, worldPos) {
    const it = this.items[i];
    if (it) it.world = worldPos.clone();
  }

  setLogoImage(i, url) {
    const it = this.items[i];
    if (it) it.logoEl.style.backgroundImage = 'url("' + url + '")';
  }

  update(camera, width, height, focusIdx) {
    camera.getWorldDirection(camFwd);
    camFwd.y = 0;
    camFwd.normalize();
    camPos.setFromMatrixPosition(camera.matrixWorld);

    const outer = 80;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (!it.world) continue;

      _v.copy(it.world).sub(camPos);
      _v.y = 0;
      _v.normalize();

      let show = i === focusIdx && _v.dot(camFwd) > 0.3;
      if (show) {
        _p.copy(it.world).project(camera);
        if (_p.y > 1.1 || _p.y < -1.2) show = false;
      }
      if (show) {
        const cx = (_p.x * 0.5 + 0.5) * width;
        const cy = (-_p.y * 0.5 + 0.5) * height;
        if (cx < -outer || cx > width + outer) show = false;
      }

      if (!show) {
        if (it.visible) {
          it.visible = false;
          it.el.classList.remove('is-visible');
        }
        continue;
      }

      const cx = (_p.x * 0.5 + 0.5) * width;
      const cy = (-_p.y * 0.5 + 0.5) * height;
      if (!it.visible) {
        it.visible = true;
        it.el.classList.add('is-visible');
        it.el.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0) translate(-50%,-100%)';
      } else if (Math.abs(cx - it._px) > 0.75 || Math.abs(cy - it._py) > 0.75) {
        it.el.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0) translate(-50%,-100%)';
      }
      it._px = cx;
      it._py = cy;

      const isF = i === focusIdx;
      if (it.focused !== isF) {
        it.focused = isF;
        it.el.classList.toggle('is-focus', isF);
        it.el.setAttribute('aria-current', isF ? 'true' : 'false');
      }
    }
  }
}
