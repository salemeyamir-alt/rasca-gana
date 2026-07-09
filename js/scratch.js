/* scratch.js — motor generico de "rascar" sobre un <canvas> */

class ScratchCell {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} opts
   * @param {number} opts.threshold  fraccion (0-1) rascada para auto-revelar
   * @param {number} opts.brushSize  radio del pincel en px
   * @param {string} [opts.coverColor]  color solido de la capa a rascar
   * @param {string} [opts.textColor]  color del texto "RASCA"
   * @param {string} [opts.fontFamily]  tipografia del texto "RASCA"
   * @param {Function} opts.onRevealed  callback cuando se supera el threshold
   */
  constructor(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.threshold = opts.threshold ?? 0.55;
    this.brushSize = opts.brushSize ?? 22;
    this.coverColor = opts.coverColor || '#c9c9d6';
    this.textColor = opts.textColor || '#ffffff';
    this.fontFamily = opts.fontFamily || 'sans-serif';
    this.onRevealed = opts.onRevealed || function () {};
    this.revealed = false;
    this.drawing = false;
    this._lastPoint = null;
    this._checkCounter = 0;

    this._resize();
    this._paintCover();
    this._bindEvents();
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = rect.width;
    this.h = rect.height;
  }

  _paintCover() {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = this.coverColor;
    ctx.fillRect(0, 0, this.w, this.h);

    // textura simple tipo "raspa y gana"
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    for (let i = -this.h; i < this.w; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + this.h, this.h);
      ctx.stroke();
    }
    ctx.fillStyle = this.textColor;
    ctx.font = `${Math.max(10, Math.floor(this.h * 0.14))}px ${this.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RASCA', this.w / 2, this.h / 2);
  }

  _bindEvents() {
    const start = (e) => {
      if (this.revealed) return;
      this.drawing = true;
      this._lastPoint = this._pointFromEvent(e);
      this._scratchAt(this._lastPoint);
      e.preventDefault();
    };
    const move = (e) => {
      if (!this.drawing || this.revealed) return;
      const p = this._pointFromEvent(e);
      this._scratchLine(this._lastPoint, p);
      this._lastPoint = p;
      e.preventDefault();
    };
    const end = () => {
      this.drawing = false;
    };

    this.canvas.addEventListener('pointerdown', start);
    this.canvas.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
  }

  _pointFromEvent(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  _scratchAt(p) {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(p.x, p.y, this.brushSize, 0, Math.PI * 2);
    ctx.fill();
    this._maybeCheckProgress();
  }

  _scratchLine(a, b) {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = this.brushSize * 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    this._maybeCheckProgress();
  }

  _maybeCheckProgress() {
    // muestrear cada pocos trazos, no en cada pixel, por rendimiento
    this._checkCounter++;
    if (this._checkCounter % 4 !== 0) return;
    const pct = this._scratchedFraction();
    if (pct >= this.threshold) this.reveal();
  }

  _scratchedFraction() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width;
    const h = this.canvas.height;
    // muestreo disperso para no leer todo el buffer en cada chequeo
    const step = Math.max(1, Math.floor(4 * dpr));
    const data = this.ctx.getImageData(0, 0, w, h).data;
    let transparent = 0;
    let total = 0;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const idx = (y * w + x) * 4 + 3;
        total++;
        if (data[idx] < 20) transparent++;
      }
    }
    return total === 0 ? 0 : transparent / total;
  }

  reveal() {
    if (this.revealed) return;
    this.revealed = true;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.classList.add('scratched-done');
    this.onRevealed();
  }

  destroy() {
    // los listeners en window se acumulan por celda; se limpian recreando el DOM del juego
  }
}

window.ScratchCell = ScratchCell;
