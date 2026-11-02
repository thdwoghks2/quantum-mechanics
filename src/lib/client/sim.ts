/**
 * 시뮬레이션 공통 바탕.
 * - 캔버스를 화면 밀도에 맞춰 선명하게 그린다.
 * - 슬라이더(input[data-param])와 버튼(button[data-set="이름=값"])을 매개변수에 묶는다.
 * - 화면이 보일 때만 움직인다. 움직임을 줄이는 설정이면 자동 재생하지 않는다.
 */
import { prefersReducedMotion } from './bus.ts';

export interface Palette {
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  text: string;
  text2: string;
  muted: string;
  accent: string;
  time: string;
  space: string;
  motion: string;
  force: string;
  energy: string;
  charge: string;
  heat: string;
  ok: string;
  no: string;
}

export function palette(): Palette {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return {
    ink: v('--ink'), ink2: v('--ink-2'), ink3: v('--ink-3'), line: v('--line'), text: v('--text'), text2: v('--text-2'),
    muted: v('--muted'), accent: v('--accent'), time: v('--q-time'), space: v('--q-space'), motion: v('--q-motion'),
    force: v('--q-force'), energy: v('--q-energy'), charge: v('--q-charge'), heat: v('--q-heat'), ok: v('--ok'), no: v('--no'),
  };
}

export abstract class Sim extends HTMLElement {
  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  w = 0;
  h = 0;
  c!: Palette;
  p: Record<string, number> = {};
  t = 0;
  playing = false;
  /** false면 매개변수가 바뀔 때만 다시 그린다 */
  animated = true;
  private raf = 0;
  private last = 0;
  private visible = false;

  connectedCallback() {
    if (this.dataset.bound) return;
    this.dataset.bound = '1';
    this.canvas = this.querySelector('canvas')!;
    this.ctx = this.canvas.getContext('2d')!;
    this.c = palette();
    for (const input of this.querySelectorAll<HTMLInputElement>('input[data-param]')) {
      this.p[input.dataset.param!] = Number(input.value);
      input.addEventListener('input', () => {
        this.p[input.dataset.param!] = Number(input.value);
        this.changed(input.dataset.param!);
        this.renderOutputs();
        if (!this.playing) this.frame();
      });
    }
    for (const btn of this.querySelectorAll<HTMLButtonElement>('button[data-set]')) {
      btn.addEventListener('click', () => {
        for (const pair of btn.dataset.set!.split(',')) {
          const [k, v] = pair.split('=');
          this.p[k!.trim()] = Number(v);
          const input = this.querySelector<HTMLInputElement>(`input[data-param="${k!.trim()}"]`);
          if (input) input.value = String(v);
        }
        this.querySelectorAll('button[data-set]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        this.changed('set');
        this.renderOutputs();
        if (!this.playing) this.frame();
      });
    }
    this.querySelector<HTMLButtonElement>('button[data-play]')?.addEventListener('click', () => this.toggle());
    this.querySelector<HTMLButtonElement>('button[data-reset]')?.addEventListener('click', () => {
      this.t = 0;
      this.reset();
      this.frame();
    });
    this.init();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(this.canvas);
    const screen = this.closest('.screen');
    if (screen) {
      screen.addEventListener('qm:show', () => this.onShow());
      screen.addEventListener('qm:hide', () => this.onHide());
      if (screen.classList.contains('is-active') || !document.documentElement.classList.contains('js')) this.onShow();
    } else {
      this.onShow();
    }
    this.renderOutputs();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.raf);
  }

  onShow() {
    this.visible = true;
    this.resize();
    if (this.animated && !prefersReducedMotion() && this.dataset.autoplay !== 'false') this.play();
    else this.frame();
  }

  onHide() {
    this.visible = false;
    this.pause();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ratio = Number(this.dataset.ratio || 0.6);
    this.w = rect.width;
    this.h = rect.width * ratio;
    this.canvas.style.aspectRatio = `${1 / ratio}`;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.frame();
  }

  play() {
    if (this.playing || !this.animated) return;
    this.playing = true;
    this.last = performance.now();
    this.querySelector('button[data-play]')?.replaceChildren('멈춤');
    const loop = (now: number) => {
      if (!this.playing) return;
      // 첫 프레임의 시각(now)은 play()에서 잰 시각보다 이를 수 있다. 음수 시간이 들어가면
      // √(시간)을 쓰는 시뮬레이션(브라운 운동, 공기 기둥)이 NaN이 되어 아무것도 안 그려진다.
      const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000));
      this.last = now;
      this.t += dt;
      this.tick(dt);
      this.frame();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  pause() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.querySelector('button[data-play]')?.replaceChildren('재생');
  }

  toggle() {
    if (this.playing) this.pause();
    else if (this.visible) this.play();
  }

  frame() {
    if (!this.w) return;
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.draw();
    const r = this.querySelector('.sim__readout');
    if (r) r.textContent = this.readout();
  }

  renderOutputs() {
    for (const out of this.querySelectorAll<HTMLOutputElement>('output[data-out]')) {
      out.value = this.format(out.dataset.out!);
    }
    const r = this.querySelector('.sim__readout');
    if (r) r.textContent = this.readout();
  }

  /* 하위 클래스가 채우는 것 */
  init(): void {}
  reset(): void {}
  changed(_name: string): void {}
  tick(_dt: number): void {}
  abstract draw(): void;
  format(name: string): string {
    return String(this.p[name] ?? '');
  }
  readout(): string {
    return '';
  }

  /* 그리기 도우미 */
  line(x0: number, y0: number, x1: number, y1: number, color: string, width = 1.5) {
    const g = this.ctx;
    g.strokeStyle = color;
    g.lineWidth = width;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  }

  dot(x: number, y: number, r: number, color: string) {
    const g = this.ctx;
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  /**
   * 글자 한 줄. 캔버스 밖으로 나가지 않게 한다.
   * 좁은 화면에서 글이 캔버스보다 넓으면 글자를 줄이고, 가장자리에 걸치면 안쪽으로 민다.
   */
  text(s: string, x: number, y: number, color = this.c.text2, size = 12, align: CanvasTextAlign = 'left') {
    const g = this.ctx;
    const family = (this.fontFamily ??= getComputedStyle(document.body).fontFamily);
    const pad = 3;
    g.fillStyle = color;
    g.font = `${size}px ${family}`;
    let tw = g.measureText(s).width;
    if (this.w && tw > this.w - pad * 2) {
      size = Math.max(8, Math.floor((size * (this.w - pad * 2)) / tw));
      g.font = `${size}px ${family}`;
      tw = g.measureText(s).width;
    }
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    let x0 = align === 'center' ? x - tw / 2 : align === 'right' || align === 'end' ? x - tw : x;
    if (this.w) x0 = Math.max(pad, Math.min(this.w - pad - tw, x0));
    if (this.h) y = Math.max(pad + size / 2, Math.min(this.h - pad - size / 2, y));
    g.fillText(s, x0, y);
  }

  private fontFamily?: string;

  /** 그래프 영역 밖으로 나가는 선과 점을 잘라 낸다. 그린 뒤에는 꼭 restore()를 부른다. */
  clipRect(x: number, y: number, w: number, h: number) {
    const g = this.ctx;
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
  }

  restore() {
    this.ctx.restore();
  }

  arrow(x0: number, y0: number, x1: number, y1: number, color: string, width = 2) {
    const g = this.ctx;
    this.line(x0, y0, x1, y1, color, width);
    const a = Math.atan2(y1 - y0, x1 - x0);
    const len = Math.hypot(x1 - x0, y1 - y0);
    const hs = Math.min(9, len * 0.5);
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x1 - hs * Math.cos(a - 0.45), y1 - hs * Math.sin(a - 0.45));
    g.lineTo(x1 - hs * Math.cos(a + 0.45), y1 - hs * Math.sin(a + 0.45));
    g.closePath();
    g.fill();
  }
}

export function define(name: string, ctor: CustomElementConstructor) {
  if (!customElements.get(name)) customElements.define(name, ctor);
}
