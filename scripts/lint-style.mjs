#!/usr/bin/env node
/**
 * 문체 검사 (docs/STYLE.md 4장). 경고를 낸다. --strict면 경고가 있을 때 실패한다.
 *
 * - 금지 표현 ("흥미롭게도", "여러분", "정리하자면" …)
 * - 명사로 끝나는 본문 문장 ("1900년 10월 7일, 일요일 오후.")
 * - 반전 공식 ("문제는 …였다", "단순히 …가 아니라")
 * - 화면당 글자 수(120~250자 목표, 320자 넘으면 경고)
 * - 그래프 없는 화면의 방향어 ("오른쪽", "꼭대기", "쪽으로")
 * - "그는/그녀는" 남발, 줄표(—)로 극적 효과 내기
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const strict = process.argv.includes('--strict');

const BANNED = [
  '흥미롭게도', '놀랍게도', '여러분', '알아보겠습니다', '알아봅시다', '정리하자면', '요약하자면', '핵심은',
  '단순히', '이야기는 여기서 끝나지 않는다', '우리는 이제', '살펴보겠습니다', '것이 바로', '바로 이것',
  '어떤 의미에서', '라고 할 수 있다', '셈이다', '말하자면', '!',
];
const FLIP = [/문제는 [^.]{0,40}(였다|이다)\./, /가 아니라 [^.]{0,30}(이다|였다)\./];
const DIRECTION = /(오른쪽|왼쪽|꼭대기|위쪽|아래쪽|쪽으로|언덕)/;
const LITERAL = /(뒤|앞|옆|안|바깥|다음|처음|첫|북|남|동|서|산|봉우리|에베레스트|롤러코스터|코스터|건물|탑|나무|미끄럼틀|그네|관람차|첫|두 번째)\s*$|(산|코스터|언덕|건물|탑|미끄럼틀)\s?\S*\s*$/;
const GRAPHY = /<(Plot|Sim[A-Z]\w*|Spectrum|Flow)\b/;

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.mdx') ? [p] : [];
  });
}

/** 화면(<Screen …>…</Screen>)에서 본문 글만 꺼낸다. 시각 자료(slot="visual")와 JSX는 뺀다. */
function prose(block) {
  let s = block;
  s = s.replace(/<Fragment slot="visual">[\s\S]*?<\/Fragment>/g, '');
  s = s.replace(/<(DailyProblem|Check|Numeric|ThreeLines|Reflect)\b[\s\S]*?<\/\1>/g, (m) => m.replace(/<[^>]+>/g, ' '));
  s = s.replace(/\{[^{}]*\}/g, ' ');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s.replace(/\$\$[\s\S]*?\$\$|\$[^$\n]*\$/g, '수식');
  return s;
}

const warnings = [];
const warn = (file, line, msg) => warnings.push(`${file}:${line}  ${msg}`);

for (const file of walk(join(root, 'src/content/lessons'))) {
  const raw = readFileSync(file, 'utf8');
  const rel = relative(root, file);
  const lineOf = (idx) => raw.slice(0, idx).split('\n').length;

  for (const m of raw.matchAll(/<Screen\b[^>]*>([\s\S]*?)<\/Screen>/g)) {
    const block = m[1];
    const at = lineOf(m.index);
    const text = prose(block);
    const plain = text.replace(/\s+/g, ' ').trim();

    for (const w of BANNED) if (plain.includes(w)) warn(rel, at, `금지 표현 "${w}"`);
    for (const re of FLIP) if (re.test(plain)) warn(rel, at, `반전 공식: "${plain.match(re)[0]}"`);
    if (/—/.test(plain)) warn(rel, at, '줄표(—)를 본문에 쓰지 않는다');
    if ((plain.match(/(^|\s)(그는|그녀는|그가|그녀가)\s/g) ?? []).length > 1) warn(rel, at, '"그는/그녀는"을 줄이고 이름으로 부른다');

    const len = plain.replace(/\s/g, '').length;
    const kind = (m[0].match(/kind="(\w+)"/) ?? [])[1];
    const free = ['problem', 'three', 'check', 'worked', 'analogy', 'next'].includes(kind);
    if (!free && len > 320) warn(rel, at, `글이 ${len}자다. 한 화면 120~250자를 목표로 나눈다`);

    if (!GRAPHY.test(block)) {
      // 롤러코스터, 산, 미끄럼틀처럼 실제 사물이 나오는 화면의 "꼭대기", "언덕"은 괜찮다.
      const physical = /(롤러코스터|차량|산|미끄럼틀|건물|사다리|계단)/.test(plain);
      for (const d of plain.matchAll(new RegExp(DIRECTION, 'g'))) {
        if (physical && /꼭대기|언덕/.test(d[0])) continue;
        const before = plain.slice(Math.max(0, d.index - 10), d.index);
        if (LITERAL.test(before) || /(이|저|그|양|한|반대)\s*$/.test(before)) continue;
        warn(rel, at, `그래프가 없는 화면의 방향어 "${d[0]}"`);
      }
    }

    // 명사로 끝나는 문장: 마침표 앞 글자가 한글인데 "다/요/자/까/지/라/네/며/고/냐/서"로 끝나지 않는 것
    // 풀이와 답(①, =)은 짧은 답 형식을 허용한다.
    const answerKey = ['problem', 'check'].includes(kind);
    for (const s of plain.split(/(?<=[.?])\s+/)) {
      const t = s.trim();
      if (answerKey && (/^[①②③④⑤]/.test(t) || t.includes('='))) continue;
      if (!/[가-힣][.]$/.test(t)) continue;
      if (/(다|요|자|까|지|라|네|며|고|냐|서|죠|군)\.$/.test(t)) continue;
      warn(rel, at, `명사로 끝나는 문장: "${t.slice(-24)}"`);
    }
  }
}

if (warnings.length) {
  console.warn(`문체 경고 ${warnings.length}건\n`);
  for (const w of warnings) console.warn('  ' + w);
  if (strict) process.exit(1);
} else {
  console.log('문체 검사: 경고 없음');
}
