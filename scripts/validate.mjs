#!/usr/bin/env node
/**
 * 콘텐츠 검사. 하나라도 어기면 빌드가 실패한다.
 *
 * 1. 용어 계약: 강 본문에 쓴 용어는 그 강 이전(또는 그 강)에서 정식 도입된 것이어야 한다.
 *    정식 도입하는 강에는 그 용어의 정의 카드(<Define term="…">)가 있어야 한다.
 *    일부러 미리 언급할 때는 <Later n={강}>…</Later>로 감싼다.
 * 2. frontmatter: assumes는 앞 강에서 배운 용어, introduces는 이 강에서 배우는 용어.
 * 3. 강 번호는 커리큘럼에 있고, 부 번호가 맞아야 한다.
 * 4. 통과 시험 문제 ID는 본문에 있어야 하고, 문제 ID는 전체에서 겹치지 않아야 한다.
 * 5. 공개된 강에는 마지막 점검, 한 문장으로(또는 예전의 세 줄), 다음 강으로 화면이 있어야 한다.
 *    되짚기(<Recap terms>)의 용어는 이 강까지 배운 것이어야 한다.
 * 6. 인물·사건이 가리키는 강과 사람이 실제로 있어야 한다.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import { contractViolations } from '../src/lib/terms.ts';

const root = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), 'utf8');
const glossary = parse(read('src/content/glossary.yaml'));
const curriculum = parse(read('src/content/curriculum.yaml'));
const people = parse(read('src/content/people.yaml'));
const events = parse(read('src/content/events.yaml'));

const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

const gById = new Map(glossary.map((g) => [g.id, g]));
if (gById.size !== glossary.length) err('glossary.yaml', '용어 id가 겹친다');
for (const g of glossary) {
  if (!g.examples || g.examples.length < 2) err('glossary.yaml', `${g.id}: 일상 예시가 2개 이상 필요하다`);
}

const planned = new Map();
for (const part of curriculum) for (const l of part.lessons) planned.set(l.n, { part: part.number, ...l });

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.mdx') ? [p] : [];
  });
}

/** 본문에서 검사하지 않을 부분을 지운다. 위치를 유지하려고 같은 길이의 공백으로 바꾼다. */
function blank(s, re) {
  return s.replace(re, (m) => m.replace(/[^\n]/g, ' '));
}

const lessons = walk(join(root, 'src/content/lessons')).map((file) => {
  const raw = readFileSync(file, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) {
    err(relative(root, file), 'frontmatter가 없다');
    return null;
  }
  return { file: relative(root, file), fm: parse(m[1]), body: raw.slice(m[0].length), fmLines: m[0].split('\n').length - 1 };
}).filter(Boolean);

const numbers = new Set();
const allIds = new Map();
for (const { file, fm, body, fmLines } of lessons) {
  const n = fm.number;
  if (numbers.has(n)) err(file, `강 번호 ${n}이 겹친다`);
  numbers.add(n);
  const plan = planned.get(n);
  if (!plan) err(file, `강 번호 ${n}이 커리큘럼에 없다`);
  else if (plan.part !== fm.part) err(file, `부 번호가 커리큘럼(${plan.part}부)과 다르다`);
  const published = fm.status === 'published';

  // frontmatter의 용어 목록
  for (const id of fm.assumes ?? []) {
    const g = gById.get(id);
    if (!g) err(file, `assumes의 '${id}'가 용어집에 없다`);
    else if (g.taughtIn >= n) err(file, `assumes의 '${id}'는 ${g.taughtIn}강에서 배우는데, 이 강은 ${n}강이다`);
  }
  for (const id of fm.introduces ?? []) {
    const g = gById.get(id);
    if (!g) err(file, `introduces의 '${id}'가 용어집에 없다`);
    else if (g.taughtIn !== n) err(file, `introduces의 '${id}'는 용어집에서 ${g.taughtIn}강으로 되어 있다`);
  }
  for (const g of glossary.filter((x) => x.taughtIn === n)) {
    if (!(fm.introduces ?? []).includes(g.id)) err(file, `용어 '${g.term}'은 이 강에서 배우는데 introduces에 없다`);
    if (!new RegExp(`<Define\\s+term="${g.id}"`).test(body)) err(file, `용어 '${g.term}'의 정의 카드(<Define term="${g.id}" />)가 없다`);
  }

  // 용어 계약
  let text = body;
  text = blank(text, /^import .*$/gm);
  text = blank(text, /\{\/\*[\s\S]*?\*\/\}/g);
  text = blank(text, /<Later\b[^>]*>[\s\S]*?<\/Later>/g);
  text = blank(text, /\b(?:term|id|name|icon|kind|from|q|xq|yq)="[^"]*"/g);
  for (const v of contractViolations(text, n, glossary)) {
    const line = text.slice(0, v.index).split('\n').length + fmLines;
    err(`${file}:${line}`, `'${v.surface}'은 ${v.taughtIn}강에서 정식으로 배운다. ${n}강에서는 풀어 쓰거나 <Later n={${v.taughtIn}}>로 감싼다`);
  }

  // 되짚기의 용어
  for (const m of body.matchAll(/<Recap\s+terms=\{\[([^\]]*)\]\}/g)) {
    for (const id of [...m[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map((x) => x[1] ?? x[2])) {
      const g = gById.get(id);
      if (!g) err(file, `되짚기의 '${id}'가 용어집에 없다`);
      else if (g.taughtIn > n) err(file, `되짚기의 '${id}'는 ${g.taughtIn}강에서 배운다`);
    }
  }

  // 문제 ID
  const ids = [...body.matchAll(/<(?:Check|Numeric|DailyProblem|Reflect)\b[^>]*?\bid="([^"]+)"/g)].map((x) => x[1]);
  for (const id of ids) {
    if (allIds.has(id)) err(file, `문제 ID '${id}'가 ${allIds.get(id)}에도 있다`);
    allIds.set(id, file);
  }
  for (const id of fm.testout ?? []) if (!ids.includes(id)) err(file, `통과 시험 문제 '${id}'가 본문에 없다`);

  if (published) {
    if (!fm.mechanism) err(file, 'mechanism이 비어 있다');
    if (!/<DailyProblem\b/.test(body)) err(file, '마지막 점검(<DailyProblem>)이 없다');
    if (!/<(OneLine|ThreeLines)\b/.test(body)) err(file, '한 문장으로(<OneLine>)가 없다');
    if (!/<Screen\s+kind="next"/.test(body)) err(file, '다음 강으로 화면이 없다');
    if ((fm.testout ?? []).length === 0) err(file, '통과 시험 문제가 없다');
  }
}

// 인물과 사건
const personIds = new Set(people.map((p) => p.id));
for (const p of people) for (const l of p.lessons ?? []) if (!planned.has(l)) err('people.yaml', `${p.id}: ${l}강이 커리큘럼에 없다`);
for (const e of events) {
  for (const l of e.lessons ?? []) if (!planned.has(l)) err('events.yaml', `${e.id}: ${l}강이 커리큘럼에 없다`);
  for (const p of e.people ?? []) if (!personIds.has(p)) err('events.yaml', `${e.id}: 인물 '${p}'가 people.yaml에 없다`);
}

// 커리큘럼 번호는 1부터 빠짐없이
const all = [...planned.keys()].sort((a, b) => a - b);
all.forEach((n, i) => {
  if (n !== i + 1) err('curriculum.yaml', `강 번호가 ${i + 1}에서 끊긴다`);
});

if (errors.length) {
  console.error(`검사 실패 ${errors.length}건\n`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log(`검사 통과: 강 ${lessons.length}개, 용어 ${glossary.length}개, 인물 ${people.length}명, 사건 ${events.length}개, 커리큘럼 ${all.length}강`);
