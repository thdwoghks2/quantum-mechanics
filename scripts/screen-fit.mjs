#!/usr/bin/env node
/**
 * 휴대폰 화면(390×844)에서 강의 화면마다 단계를 다 열었을 때 넘치는지 잰다.
 * 먼저 `npm run build`와 `npm run preview`(다른 터미널)를 해 둔다.
 *
 *   npm run check:screens -- 21,22,23
 *   BASE_URL=http://localhost:4321/ npm run check:screens -- 1-20
 *
 * 넘치는 화면이 있으면 실패한다. 촘촘한 모양(is-dense)이 붙은 화면 수도 알려 준다.
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
const arg = process.argv[2] ?? '1';
const lessons = arg.split(',').flatMap((part) => {
  const [a, b] = part.split('-').map(Number);
  return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a];
});

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
let failed = 0;
for (const n of lessons) {
  const res = await page.goto(`${base}lessons/${n}/`);
  if (!res || res.status() >= 400) {
    console.log(`${n}강: 페이지가 없어요 (공개하지 않은 강일 수 있어요)`);
    continue;
  }
  await page.evaluate(() => document.fonts.ready);
  const screens = await page.evaluate(async () => {
    const l = document.querySelector('qm-lesson');
    const out = [];
    for (let i = 0; i < l.screens.length; i++) {
      l.show(i, { allSteps: true });
      await new Promise((r) => requestAnimationFrame(() => r()));
      const s = l.screens[i];
      out.push({
        i: i + 1,
        title: s.dataset.title || s.dataset.label,
        dense: s.classList.contains('is-dense'),
        over: s.scrollHeight - s.clientHeight,
        hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      });
    }
    return out;
  });
  const bad = screens.filter((s) => s.over > 1 || s.hscroll > 0);
  const dense = screens.filter((s) => s.dense).length;
  console.log(`${n}강: 화면 ${screens.length}장, 촘촘하게 ${dense}장, 넘침 ${bad.length}장`);
  for (const s of bad) console.log(`  ${s.i}번째 화면 「${s.title}」: ${s.over > 1 ? `${s.over}px 넘침` : ''}${s.hscroll > 0 ? ` 가로 ${s.hscroll}px` : ''}`);
  failed += bad.length;
}
await browser.close();
process.exit(failed ? 1 : 0);
