#!/usr/bin/env node
/**
 * 내용 손질 후보 찾기. 강을 고칠 때 볼 목록을 부마다 docs/audit/part-NN.md로 만든다.
 *
 *   npm run audit:content            모든 부
 *   npm run audit:content -- 0 1     0부와 1부만
 *
 * 찾는 것
 * 1. 그래프 후보: 시각 자료에 그래프·시뮬레이션·표가 없는데, 글이 변화 관계("~할수록", "비례", "몇 배")를 말로만 설명하는 화면
 * 2. 글만 든 그림: 아이콘 없이 글만 든 Panels 칸이 셋 이상인 화면 (그림으로 바꾸거나 본문으로 옮길 후보)
 * 3. 정의 후보: 정의 카드 없이 "~라고 해요/불러요"로 이름을 붙이는 문장
 * 4. 어려운 화면: 글이 250자를 넘거나, 정의 카드가 둘 이상이거나, 수식 속 기호가 넷 이상인 화면.
 *    정의 카드보다 앞 화면에서 그 강의 새 용어를 먼저 쓴 곳도 찾는다.
 * 5. 평문 공식과 기호: $ 밖에 쓴 "E = hf", "진동수 f인" 같은 것 (기호 계약으로 바꿀 대상)
 * 이 목록은 판단을 돕는 후보일 뿐이다. 고칠지는 화면을 읽고 정한다.
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import { texKeys } from '../src/lib/tex.ts';

const root = new URL('..', import.meta.url).pathname;
const glossary = parse(readFileSync(join(root, 'src/content/glossary.yaml'), 'utf8'));
const only = process.argv.slice(2).map(Number).filter((x) => Number.isInteger(x));

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.mdx') ? [p] : [];
  });
}

const RELATION = /(할수록|ㄹ수록|을수록|를수록|수록 |비례|반비례|배가 되|배로 |배면|늘어나면|줄어들면|커지면|작아지면|높아지면|낮아지면|빨라지면|느려지면|가장 크|가장 세|봉우리|기울기|곡선|그래프)/;
const GRAPHY = /<(Plot|Sim[A-Z]\w*|DataTable|SlitGeometry)\b/;
const NAMING = /[^.?]{4,60}(이라고|라고) (해요|불러요|하죠|부르죠|했어요|불렀어요)/g;
const PLAIN_FORMULA = /(?<![A-Za-z가-힣$\\-])([A-Za-zλθψΔħν][₀-₉ₙ]?(?:\s?[×·]?\s?[A-Za-zλθψħν][₀-₉²³]?){0,3})\s?=\s?(?=[A-Za-z0-9½λθψΔħν(√−-])/g;
const LETTER_IN_PROSE = /(?<=[가-힣)] )([A-Za-zλθψħν])(?=[가-힣 ,.]|$)(?![A-Za-z])/g;

function prose(s) {
  return s
    .replace(/<Fragment slot="visual">[\s\S]*?<\/Fragment>/g, '')
    .replace(/\{[^{}]*\}/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const byPart = new Map();
for (const file of walk(join(root, 'src/content/lessons')).sort()) {
  const raw = readFileSync(file, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  const fm = parse(m[1]);
  if (only.length && !only.includes(fm.part)) continue;
  const n = fm.number;
  const body = raw.slice(m[0].length);
  const fmLines = m[0].split('\n').length - 1;
  const newTerms = glossary.filter((g) => g.taughtIn === n);
  const out = [];
  const defined = new Set();
  for (const sm of body.matchAll(/<Screen\b([^>]*)>([\s\S]*?)<\/Screen>/g)) {
    const attrs = sm[1];
    const block = sm[2];
    const line = body.slice(0, sm.index).split('\n').length + fmLines;
    const title = attrs.match(/title="([^"]*)"/)?.[1] ?? '';
    const kind = attrs.match(/kind="([^"]*)"/)?.[1] ?? '';
    if (['next', 'problem', 'one', 'three', 'recap', 'quote'].includes(kind)) continue;
    const visual = block.match(/<Fragment slot="visual">([\s\S]*?)<\/Fragment>/)?.[1] ?? '';
    const text = prose(block);
    const notes = [];
    if (RELATION.test(text) && !GRAPHY.test(visual)) notes.push(`그래프 후보: "${text.match(RELATION)[0]}" — 그림에 그래프·시뮬레이션·표가 없어요`);
    const panels = [...visual.matchAll(/\{\s*(?:big|title|caption)[^}]*\}/g)].map((x) => x[0]);
    const textOnly = panels.filter((p) => !/icon:/.test(p));
    if (textOnly.length >= 3) notes.push(`글만 든 그림: 아이콘 없는 Panels 칸 ${textOnly.length}개`);
    for (const nm of text.matchAll(NAMING)) {
      if (!/<Define\b/.test(block)) notes.push(`정의 후보: "…${nm[0].slice(-40)}"`);
    }
    if (text.length > 250) notes.push(`긴 화면: 글 ${text.length}자`);
    const definedHere = [...block.matchAll(/<Define\s+term="([^"]+)"/g)].map((x) => x[1]);
    if (definedHere.length >= 2) notes.push(`정의 카드 ${definedHere.length}개가 한 화면에: ${definedHere.join(', ')} — 화면을 나눠요`);
    const early = newTerms.filter((g) => !defined.has(g.id) && !definedHere.includes(g.id) && [g.term, ...(g.aliases ?? [])].some((t) => text.includes(t)));
    if (early.length && kind !== 'scene' && kind !== 'title') notes.push(`정의 카드 전에 쓴 새 용어: ${early.map((g) => g.term).join(', ')}`);
    definedHere.forEach((id) => defined.add(id));
    const math = [...block.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g)].flatMap((x) => texKeys(x[1] ?? x[2]).filter((k) => k.kind === 'symbol').map((k) => k.key));
    if (new Set(math).size >= 4) notes.push(`기호 ${new Set(math).size}개: ${[...new Set(math)].join(' ')}`);
    const outside = block
      .replace(/\$\$[\s\S]*?\$\$|\$[^$\n]*\$/g, ' ')
      .replace(/\b(?:id|term|name|icon|kind|from|q|xq|yq|alt|fn|title)="[^"]*"/g, ' ')
      .replace(/fn: '[^']*'/g, ' ');
    const formulas = [...outside.matchAll(PLAIN_FORMULA)].map((x) => outside.slice(x.index, x.index + 18).replace(/\s+/g, ' ').trim());
    if (formulas.length) notes.push(`평문 공식 ${formulas.length}곳: ${formulas.slice(0, 4).map((f) => `"${f}…"`).join(', ')}`);
    const letters = [...prose(outside).matchAll(LETTER_IN_PROSE)].map((x) => x[1]);
    if (letters.length) notes.push(`글 속 기호 글자: ${[...new Set(letters)].join(' ')}`);
    if (notes.length) out.push({ line, title, kind, notes });
  }
  const list = byPart.get(fm.part) ?? [];
  list.push({ n, title: fm.title, file: relative(root, file), out, symbols: !!fm.symbols });
  byPart.set(fm.part, list);
}

mkdirSync(join(root, 'docs/audit'), { recursive: true });
let total = 0;
for (const [part, lessons] of [...byPart.entries()].sort((a, b) => a[0] - b[0])) {
  const lines = [`# ${part}부 손질 후보`, '', '`npm run audit:content`가 만든 목록이에요. 후보일 뿐이고, 고칠지는 화면을 읽고 정해요.', ''];
  for (const l of lessons.sort((a, b) => a.n - b.n)) {
    const c = l.out.reduce((s, x) => s + x.notes.length, 0);
    total += c;
    lines.push(`## ${l.n}강 ${l.title}  (${c}건${l.symbols ? ', 기호 계약 적용' : ''})`, '', `\`${l.file}\``, '');
    for (const sc of l.out) {
      lines.push(`- ${sc.line}행 「${sc.title || sc.kind}」`);
      for (const nt of sc.notes) lines.push(`  - ${nt}`);
    }
    lines.push('');
  }
  writeFileSync(join(root, `docs/audit/part-${String(part).padStart(2, '0')}.md`), lines.join('\n'));
}
console.log(`후보 ${total}건을 docs/audit/에 적었어요.`);
