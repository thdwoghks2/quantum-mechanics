#!/usr/bin/env node
/**
 * 그림이 틀 밖으로 넘치는지 검사한다. 먼저 `npm run build`와 `npm run preview`(다른 터미널)를 해 둔다.
 *
 *   npm run check:bounds -- 1-137          모든 강, 슬라이더 양 끝과 모든 버튼까지
 *   npm run check:bounds -- 21,22 --quick  처음 값만
 *
 * 잡는 것
 * - 캔버스 시뮬레이션의 글자가 캔버스 밖으로 나가는 곳
 * - 좌표가 NaN이나 무한대가 되어 아무것도 안 그려지는 곳
 * - SVG 그림(Plot 등)의 글자가 그림 틀 밖으로 나가는 곳
 * - 페이지의 JS 오류
 * 선이나 점이 틀 밖으로 나가는 것은 잡지 않는다. 날아가는 공이나 끝없는 격자처럼 잘려 보이는 게 맞는 경우가 많다.
 *
 * Playwright가 필요하다(이 저장소의 의존성이 아니라 미리 깔린 것을 쓴다).
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Playwright를 찾을 수 없어요. 미리 깔린 환경에서 돌리거나 따로 설치해 주세요.');
  process.exit(2);
}

const base = process.env.BASE_URL ?? 'http://localhost:4321/';
const args = process.argv.slice(2);
const quick = args.includes('--quick');
const arg = args.find((a) => !a.startsWith('--')) ?? '1';
const lessons = arg.split(',').flatMap((part) => {
  const [a, b] = part.split('-').map(Number);
  return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a];
});

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();

// 캔버스에 그리는 함수를 감싸서, 틀 밖 글자와 NaN 좌표를 모은다.
await page.addInitScript(() => {
  window.__oob = [];
  const P = CanvasRenderingContext2D.prototype;
  const tag = (ctx) => ctx.canvas.closest('.sim')?.tagName?.toLowerCase() ?? 'canvas';
  const at = (ctx, x, y) => {
    const t = ctx.getTransform();
    const d = ctx.canvas.width / (ctx.canvas.clientWidth || 1);
    return [(t.a * x + t.c * y + t.e) / d, (t.b * x + t.d * y + t.f) / d];
  };
  const nan = (ctx, kind, ...v) => {
    if (v.some((n) => !Number.isFinite(n))) window.__oob.push(`${tag(ctx)} ${kind} 좌표가 NaN`);
  };
  const ft = P.fillText;
  P.fillText = function (s, x, y, ...r) {
    nan(this, '글자', x, y);
    const w = this.measureText(s).width;
    const a = this.textAlign;
    const x0 = a === 'center' ? x - w / 2 : a === 'right' || a === 'end' ? x - w : x;
    const [X0, Y] = at(this, x0, y);
    const [X1] = at(this, x0 + w, y);
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;
    if (Math.min(X0, X1) < -1 || Math.max(X0, X1) > W + 1 || Y < 0 || Y > H) {
      window.__oob.push(`${tag(this)} 글자 "${s}" (${Math.round(X0)}, ${Math.round(Y)}) / ${W}×${H}`);
    }
    return ft.call(this, s, x, y, ...r);
  };
  for (const name of ['lineTo', 'moveTo']) {
    const f = P[name];
    P[name] = function (x, y) {
      nan(this, '선', x, y);
      return f.call(this, x, y);
    };
  }
  const arc = P.arc;
  P.arc = function (x, y, r, ...rest) {
    nan(this, '점', x, y, r);
    return arc.call(this, x, y, r, ...rest);
  };
});

let errors = [];
page.on('pageerror', (e) => errors.push(String(e.message ?? e)));

let total = 0;
for (const n of lessons) {
  errors = [];
  const res = await page.goto(`${base}lessons/${n}/`);
  if (!res || res.status() >= 400) {
    console.log(`${n}강: 페이지가 없어요`);
    continue;
  }
  await page.evaluate(() => document.fonts.ready);
  const count = await page.evaluate(() => document.querySelector('qm-lesson').screens.length);
  const found = [];
  for (let i = 0; i < count; i++) {
    const res = await page.evaluate(
      async ({ i, quick }) => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const l = document.querySelector('qm-lesson');
        l.show(i, { allSteps: true });
        const screen = l.screens[i];
        await sleep(60);
        const out = [];
        // SVG 글자
        for (const svg of screen.querySelectorAll('svg')) {
          if (svg.closest('.katex, .icon, button')) continue;
          const box = svg.getBoundingClientRect();
          if (!box.width) continue;
          for (const t of svg.querySelectorAll('text')) {
            const r = t.getBoundingClientRect();
            if (!r.width || getComputedStyle(t).visibility === 'hidden') continue;
            if (r.left < box.left - 2 || r.right > box.right + 2 || r.top < box.top - 2 || r.bottom > box.bottom + 2) {
              out.push(`SVG 글자 "${t.textContent.trim().slice(0, 20)}"가 그림 밖으로 나가요`);
            }
          }
        }
        // 캔버스 시뮬레이션
        for (const sim of screen.querySelectorAll('.sim')) {
          const ranges = [...sim.querySelectorAll('input[type=range]')];
          const sets = [...sim.querySelectorAll('button[data-set]')];
          const trials = [[]];
          if (!quick) {
            for (const r of ranges) trials.push([[r, r.min]], [[r, r.max]]);
            if (ranges.length > 1) trials.push(ranges.map((r) => [r, r.max]), ranges.map((r) => [r, r.min]));
          }
          const original = ranges.map((r) => r.value);
          for (const b of quick || !sets.length ? [null] : sets) {
            if (b) b.click();
            for (const t of trials) {
              window.__oob = [];
              for (const [r, v] of t) {
                r.value = v;
                r.dispatchEvent(new Event('input', { bubbles: true }));
              }
              await sleep(quick ? 250 : 400);
              const what = t.map(([r, v]) => `${r.closest('.sim__row')?.querySelector('label')?.textContent ?? '?'}=${v}`).join(', ') || '처음 값';
              for (const o of new Set(window.__oob)) out.push(`${b ? `[${b.textContent.trim()}] ` : ''}${what}: ${o}`);
            }
          }
          ranges.forEach((r, k) => {
            r.value = original[k];
            r.dispatchEvent(new Event('input', { bubbles: true }));
          });
        }
        return [...new Set(out)];
      },
      { i, quick },
    );
    for (const r of res.slice(0, 4)) found.push(`  화면 ${i + 1}: ${r}`);
  }
  for (const e of new Set(errors)) found.push(`  JS 오류: ${e}`);
  total += found.length;
  console.log(`${n}강: ${found.length ? `문제 ${found.length}건` : '이상 없음'}`);
  for (const f of found) console.log(f);
}
await browser.close();
if (total) {
  console.log(`\n문제 ${total}건`);
  process.exit(1);
}
console.log('\n모두 틀 안에 있어요.');
