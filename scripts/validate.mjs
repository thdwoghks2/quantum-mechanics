#!/usr/bin/env node
/**
 * 콘텐츠 검사. 하나라도 어기면 빌드가 실패한다.
 *
 * 1. 용어 계약: 강 본문에 쓴 용어는 그 강 이전(또는 그 강)에서 정식 도입된 것이어야 한다.
 *    정식 도입하는 강에는 그 용어의 정의 카드(<Define term="…">)가 있어야 한다.
 *    일부러 미리 언급할 때는 <Later n={강}>…</Later>로 감싼다.
 *    앞 강들이 일상어로 이미 쓰고 있던 말(원자, 전자 …)은 용어집 항목의 previewIn에 그 강 번호를 적는다.
 *    previewIn에 적힌 강에서는 그 용어를 정식 도입 전에도 쓸 수 있다.
 * 2. frontmatter: assumes는 앞 강에서 배운 용어, introduces는 이 강에서 배우는 용어.
 * 3. 강 번호는 커리큘럼에 있고, 부 번호가 맞아야 한다.
 * 4. 통과 시험 문제 ID는 본문에 있어야 하고, 문제 ID는 전체에서 겹치지 않아야 한다.
 * 5. 공개된 강에는 마지막 점검, 한 문장으로(또는 예전의 세 줄), 다음 강으로 화면이 있어야 한다.
 *    되짚기(<Recap terms>)의 용어는 이 강까지 배운 것이어야 한다.
 * 6. 인물·사건이 가리키는 강과 사람이 실제로 있어야 한다.
 * 7. 아직 쓰지 않은 강의 용어는 glossary.yaml에 planned: true로 이름과 강 번호만 정해 둔다.
 *    공개한 강이 planned 용어를 가르치면 안 된다(내용을 채우고 planned를 지운다).
 * 8. 기호 계약(frontmatter에 symbols가 있는 강부터 적용한다. 모든 강에 symbols가 생기면 전체에 적용).
 *    - 수식($…$) 속 글자는 모두 이 강의 symbols에서 무슨 기호인지 정해져 있어야 한다. 단위는 \mathrm{…}로 쓴다.
 *    - 그 기호는 이 강이나 앞 강에서 배운 것이어야 하고(taughtIn), 이 강에서 처음 배우는 기호는
 *      공식 카드(<Formula>, <FormulaBuild>)나 기호 표(<SymTable>)로 뜻을 보여 줘야 한다.
 *    - 같은 강에서 같은 글자를 두 뜻으로 쓸 수 없다(symbols가 글자마다 하나라서 저절로 지켜진다).
 *    - $ 밖에 평문 공식("E = hf")을 쓰지 않는다.
 * 9. 공식 카드와 개념 카드: 쓰는 기호와 용어가 있어야 하고, 처음 배우는 강에서 카드를 보여 줘야 한다.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import { contractViolations } from '../src/lib/terms.ts';
import { baseKey, texKeys } from '../src/lib/tex.ts';
import { texToPlain } from '../src/lib/math.ts';

const root = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), 'utf8');
const glossary = parse(read('src/content/glossary.yaml'));
const curriculum = parse(read('src/content/curriculum.yaml'));
const people = parse(read('src/content/people.yaml'));
const events = parse(read('src/content/events.yaml'));
const symbolList = parse(read('src/content/symbols.yaml'));
const formulaList = parse(read('src/content/formulas.yaml'));
const conceptList = parse(read('src/content/concepts.yaml'));

const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

const gById = new Map(glossary.map((g) => [g.id, g]));
if (gById.size !== glossary.length) err('glossary.yaml', '용어 id가 겹친다');
for (const g of glossary) {
  if (!g.examples || g.examples.length < 2) err('glossary.yaml', `${g.id}: 일상 예시가 2개 이상 필요하다`);
  for (const k of g.previewIn ?? []) {
    if (!Number.isInteger(k) || k >= g.taughtIn) err('glossary.yaml', `${g.id}: previewIn의 ${k}강은 정식 도입(${g.taughtIn}강)보다 앞이어야 한다`);
  }
}

// 기호, 공식, 개념
const sById = new Map(symbolList.map((x) => [x.id, x]));
if (sById.size !== symbolList.length) err('symbols.yaml', '기호 id가 겹친다');
const unitByText = new Map();
for (const x of symbolList) {
  if (x.kind === 'unit') unitByText.set(texToPlain(`$${x.sym}$`).trim(), x.id);
}
const fById = new Map(formulaList.map((x) => [x.id, x]));
const cById = new Map(conceptList.map((x) => [x.id, x]));
/** 수식 속 열쇠 하나를 기호 id로. map(글자 → id)에서 찾고, 없으면 바탕 글자로. 단위는 단위 표에서. */
function resolveKey(k, map) {
  if (k.kind === 'unit') return unitByText.get(k.key) ?? null;
  return map?.[k.key] ?? map?.[baseKey(k.key)] ?? null;
}
for (const f of formulaList) {
  for (const [k, id] of Object.entries(f.symbols ?? {})) {
    const x = sById.get(id);
    if (!x) err('formulas.yaml', `${f.id}: 글자 '${k}'의 기호 '${id}'가 기호 사전에 없다`);
    else if (x.taughtIn > f.taughtIn) err('formulas.yaml', `${f.id}: 기호 '${id}'는 ${x.taughtIn}강에서 배우는데 공식은 ${f.taughtIn}강이다`);
  }
  for (const t of [f.tex, f.example?.tex, ...(f.build ?? []).map((b) => b.tex)].filter(Boolean)) {
    for (const k of texKeys(t)) if (!resolveKey(k, f.symbols)) err('formulas.yaml', `${f.id}: 식의 '${k.key}'가 무슨 기호인지 symbols에 없다`);
  }
}
for (const c of conceptList) {
  for (const t of c.terms ?? []) if (!gById.has(t)) err('concepts.yaml', `${c.id}: 용어 '${t}'가 용어집에 없다`);
  for (const f of c.formulas ?? []) if (!fById.has(f)) err('concepts.yaml', `${c.id}: 공식 '${f}'가 없다`);
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
    if (published && g.planned) err(file, `용어 '${g.term}'이 아직 planned다. 정의와 예시를 채우고 planned를 지운다`);
    if (!(fm.introduces ?? []).includes(g.id)) err(file, `용어 '${g.term}'은 이 강에서 배우는데 introduces에 없다`);
    if (!new RegExp(`<Define\\s+term="${g.id}"`).test(body)) err(file, `용어 '${g.term}'의 정의 카드(<Define term="${g.id}" />)가 없다`);
  }

  // 용어 계약
  let text = body;
  text = blank(text, /^import .*$/gm);
  text = blank(text, /\{\/\*[\s\S]*?\*\/\}/g);
  text = blank(text, /<Later\b[^>]*>[\s\S]*?<\/Later>/g);
  text = blank(text, /\b(?:term|id|name|icon|kind|from|q|xq|yq)="[^"]*"/g);
  const usable = glossary.filter((g) => !(g.previewIn ?? []).includes(n));
  for (const v of contractViolations(text, n, usable)) {
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

  // 공식·개념 카드
  const usedFormulas = [...body.matchAll(/<Formula(?:Build)?\s+id="([^"]+)"/g)].map((x) => x[1]);
  for (const id of usedFormulas) {
    const f = fById.get(id);
    if (!f) err(file, `공식 카드 '${id}'가 formulas.yaml에 없다`);
    else if (f.taughtIn > n) err(file, `공식 '${f.name}'은 ${f.taughtIn}강에서 배운다`);
  }
  const usedConcepts = [...body.matchAll(/<Concept\s+id="([^"]+)"/g)].map((x) => x[1]);
  for (const id of usedConcepts) {
    const c = cById.get(id);
    if (!c) err(file, `개념 카드 '${id}'가 concepts.yaml에 없다`);
    else if (c.taughtIn > n) err(file, `개념 '${c.name}'은 ${c.taughtIn}강에서 배운다`);
  }
  const tables = [...body.matchAll(/<SymTable\s+ids=\{\[([^\]]*)\]\}/g)].flatMap((x) => [...x[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map((y) => y[1] ?? y[2]));
  for (const id of tables) if (!sById.has(id)) err(file, `기호 표의 '${id}'가 기호 사전에 없다`);

  // 기호 계약: symbols가 있는 강만
  if (fm.symbols) {
    for (const f of formulaList.filter((x) => x.taughtIn === n)) {
      if (!usedFormulas.includes(f.id)) err(file, `공식 '${f.name}'은 이 강에서 배우는데 공식 카드(<Formula id="${f.id}" />)가 없다`);
    }
    for (const c of conceptList.filter((x) => x.taughtIn === n)) {
      if (!usedConcepts.includes(c.id)) err(file, `개념 '${c.name}'은 이 강에서 배우는데 개념 카드(<Concept id="${c.id}" />)가 없다`);
    }
    for (const [k, id] of Object.entries(fm.symbols)) {
      const x = sById.get(id);
      if (!x) err(file, `symbols의 '${k}: ${id}'가 기호 사전에 없다`);
      else if (x.taughtIn > n) err(file, `symbols의 '${id}'(${x.name})는 ${x.taughtIn}강에서 배운다`);
    }
    // 이 강에서 뜻을 보여 준 기호: 공식 카드의 기호 + 기호 표
    const shown = new Set([...tables, ...usedFormulas.flatMap((id) => Object.values(fById.get(id)?.symbols ?? {}))]);
    const used = new Set();
    let plainBody = blank(body, /\{\/\*[\s\S]*?\*\/\}/g);
    for (const m of plainBody.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g)) {
      const t = m[1] ?? m[2];
      const line = plainBody.slice(0, m.index).split('\n').length + fmLines;
      for (const k of texKeys(t)) {
        const id = resolveKey(k, fm.symbols);
        if (!id) err(`${file}:${line}`, k.kind === 'unit' ? `단위 '${k.key}'가 기호 사전에 없다` : `수식의 '${k.key}'가 무슨 기호인지 symbols에 없다`);
        else used.add(id);
      }
    }
    for (const id of used) {
      const x = sById.get(id);
      if (x && x.taughtIn === n && x.kind !== 'unit' && !shown.has(id)) err(file, `기호 '${x.name}'(${id})는 이 강에서 처음 배우는데, 공식 카드나 기호 표(<SymTable ids={['${id}']} />)로 뜻을 보여 주지 않았다`);
    }
    // $ 밖의 평문 공식: "F = ma", "v = fλ" 같은 꼴
    const outside = blank(blank(plainBody, /\$\$[\s\S]*?\$\$|\$[^$\n]*\$/g), /\b(?:id|term|name|icon|kind|from|q|xq|yq|alt|fn)="[^"]*"/g);
    for (const m of outside.matchAll(/(?<![A-Za-z가-힣\-])([A-Za-zλθψΔħν][₀-₉ₙ]?(?:\s?[×·]?\s?[A-Za-zλθψħν][₀-₉²³]?){0,3})\s?=\s?(?=[A-Za-z0-9½λθψΔħν(√−-])/g)) {
      const line = outside.slice(0, m.index).split('\n').length + fmLines;
      err(`${file}:${line}`, `평문 공식 "${outside.slice(m.index, m.index + 14).trim()}…"은 $…$로 쓴다`);
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
