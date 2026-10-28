export class Carousel {
  constructor({ count = 12, cameraHeight = 1.95, viewDistance = 10, lookHeight = 2.55, onChange = null, onFocus = null }) {
    this.count = count;
    this.stepAngle = (Math.PI * 2) / count;
    this.cameraHeight = cameraHeight;
    this.viewDistance = viewDistance;
    this.lookHeight = lookHeight;
    this.yaw = 0;
    this.par = 0;
    this.parTarget = 0;
    this.anim = null;
    this.dragging = false;
    this.samples = [];
    this.lastPx = 0;
    this.capturedId = null;
    this.onChange = onChange;
    this.onFocus = onFocus;
    this.lastFocus = -1;
    this._now = 0;
  }

  get focusIndex() {
    const i = Math.round(this.yaw / this.stepAngle);
    return ((i % this.count) + this.count) % this.count;
  }

  applyTo(camera) {
    const y = this.yaw + this.par;
    camera.position.set(0, this.cameraHeight, 0);
    camera.lookAt(
      Math.sin(y) * this.viewDistance,
      this.lookHeight,
      Math.cos(y) * this.viewDistance
    );
  }

  update(now) {
    const dt = this._now ? Math.min(64, Math.max(1, now - this._now)) : 16;
    this._now = now;
    let changed = !!this._dirty;
    this._dirty = false;

    if (this.anim) {
      const { from, to, t0, dur } = this.anim;
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      this.yaw = from + (to - from) * e;
      if (t >= 1) { this.yaw = to; this.anim = null; }
      changed = true;
    }

    const dpar = this.parTarget - this.par;
    if (Math.abs(dpar) > 0.00002) {
      this.par += dpar * (1 - Math.exp(-dt * 0.0045));
      if (Math.abs(this.parTarget - this.par) < 0.00002) this.par = this.parTarget;
      changed = true;
    }

    const f = this.focusIndex;
    if (f !== this.lastFocus) {
      this.lastFocus = f;
      if (this.onFocus) this.onFocus(f);
    }
    if (changed && this.onChange) this.onChange();
    return changed;
  }

  isBusy() {
    return !!this.anim || Math.abs(this.parTarget - this.par) > 0.00002;
  }

  tweenTo(to, durSec) {
    this.anim = { from: this.yaw, to, t0: performance.now(), dur: Math.max(220, durSec * 1000) };
    this._dirty = true;
    if (this.onChange) this.onChange();
  }

  goToIndex(index, dir = 0) {
    const cur = Math.round(this.yaw / this.stepAngle);
    let d;
    if (dir) d = dir;
    else {
      const curIdx = ((cur % this.count) + this.count) % this.count;
      const diff = index - curIdx;
      d = ((diff % this.count) + this.count) % this.count;
      if (d > this.count / 2) d -= this.count;
    }
    this.tweenTo((cur + d) * this.stepAngle, 0.42 + Math.min(0.6, Math.abs(d) * 0.15));
  }

  step(dir) {
    const cur = Math.round(this.yaw / this.stepAngle);
    this.tweenTo((cur + dir) * this.stepAngle, 0.5);
  }

  beginDrag(clientX, pointerId) {
    this.anim = null;
    this.dragging = true;
    this.capturedId = pointerId;
    this.lastPx = clientX;
    this.samples = [{ t: performance.now(), yaw: this.yaw }];
  }

  dragMove(clientX) {
    if (!this.dragging) return;
    const dx = clientX - this.lastPx;
    this.lastPx = clientX;
    this.yaw -= dx * 0.0022;
    const t = performance.now();
    this.samples.push({ t, yaw: this.yaw });
    if (this.samples.length > 14) this.samples.shift();
    this._dirty = true;
    if (this.onChange) this.onChange();
  }

  endDrag() {
    if (!this.dragging) return;
    this.dragging = false;
    this.capturedId = null;
    const s = this.samples;
    if (s.length >= 2) {
      const now = s[s.length - 1].t;
      let past = s[0];
      for (const p of s) { if (now - p.t <= 110) break; past = p; }
      const dt = Math.max(1, s[s.length - 1].t - past.t);
      const v = ((s[s.length - 1].yaw - past.yaw) / dt) * 1000;
      const dlim = 1.6 * this.stepAngle;
      const drift = Math.max(-dlim, Math.min(dlim, v * 0.3));
      const target = Math.round(((this.yaw + drift) / this.stepAngle)) * this.stepAngle;
      const delta = Math.abs(target - this.yaw);
      this.tweenTo(target, 0.38 + 0.5 * Math.min(1, delta / (2.6 * this.stepAngle)));
    } else {
      this.step(0);
    }
  }

  cancelDrag() {
    this.dragging = false;
    this.capturedId = null;
    this.step(0);
  }
}
