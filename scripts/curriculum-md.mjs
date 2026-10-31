#!/usr/bin/env node
/** docs/CURRICULUM.md를 curriculum.yaml과 레슨 파일에서 만든다. npm run docs:curriculum */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const root = new URL('..', import.meta.url).pathname;
const curriculum = parse(readFileSync(join(root, 'src/content/curriculum.yaml'), 'utf8'));
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith('.mdx') ? [join(d, f)] : []));
const status = new Map();
for (const f of walk(join(root, 'src/content/lessons'))) {
  const fm = parse(readFileSync(f, 'utf8').match(/^---\n([\s\S]*?)\n---/)[1]);
  status.set(fm.number, { status: fm.status, file: f.replace(root, '') });
}
const total = curriculum.reduce((s, p) => s + p.lessons.length, 0);
const done = [...status.values()].filter((s) => s.status === 'published').length;
let out = `# 커리큘럼\n\n이 파일은 \`npm run docs:curriculum\`이 만든다. 원본은 \`src/content/curriculum.yaml\`이다.\n\n공개 ${done} / ${total}강\n`;
for (const p of curriculum) {
  out += `\n## ${p.number}부 · ${p.title}\n\n${p.summary}\n\n| 강 | 제목 | 내용 | 상태 |\n|---|---|---|---|\n`;
  for (const l of p.lessons) {
    const s = status.get(l.n);
    const st = !s ? '준비 중' : s.status === 'published' ? `공개 (\`${s.file}\`)` : '초안';
    out += `| ${l.n} | ${l.title} | ${l.note} | ${st} |\n`;
  }
}
writeFileSync(join(root, 'docs/CURRICULUM.md'), out);
console.log(`docs/CURRICULUM.md: 공개 ${done} / ${total}강`);
