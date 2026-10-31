/**
 * 보상(docs/REWARDS.md)에 쓰는 순수 함수들. 화면을 그리는 쪽은 이 결과만 받아 쓴다.
 *
 * 1. 별 지도: 강마다 별 하나, 부마다 별자리 하나. 별의 자리는 강 번호로 정해져서 언제 그려도 같다.
 * 2. 지금 서 있는 해: 가장 뒤의 끝낸 강과 이어진 사건의 연도.
 * 3. 장 넘김: 부의 마지막 강을 처음 마쳤을 때 한 번.
 * 4. 내 칠판: 강 파일에서 핵심 문장(<Key>)을 뽑는다.
 *
 * 새로 저장하는 값은 없다. 이미 있는 학습 기록(강 상태, notes.one)과 콘텐츠만 쓴다.
 */

export type Status = 'started' | 'done' | 'skipped' | 'tested-out';

/** 별이 켜진 것으로 보는 상태: 끝냄, 통과 시험으로 건너뜀 */
export function isLit(status: Status | undefined): boolean {
  return status === 'done' || status === 'tested-out';
}

/* ── 1. 별 지도 ─────────────────────────── */

export interface SkyPart {
  number: number;
  lessons: number[];
}

export interface Star {
  n: number;
  part: number;
  x: number;
  y: number;
  r: number;
}

export interface Sky {
  width: number;
  height: number;
  stars: Star[];
  /** 부마다 별을 강 순서대로 잇는 선(점 목록). 그 부의 별이 다 켜지면 보인다. */
  links: { part: number; points: [number, number][] }[];
  /** 별자리 이름표 자리(칸의 왼쪽 위) */
  labels: { part: number; x: number; y: number }[];
}

export interface SkyOptions {
  cols?: number;
  cellW?: number;
  cellH?: number;
}

/** 같은 씨앗이면 같은 수열을 내는 작은 난수 생성기(mulberry32). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 부마다 격자 칸 하나를 주고, 칸 안에서 별을 한 걸음씩 이어 찍어 별자리를 만든다.
 * 칸은 뱀이 기어가듯 줄마다 방향을 바꿔 이어지므로, 앞 부의 끝과 다음 부의 시작이 가깝다.
 */
export function skyLayout(parts: SkyPart[], opts: SkyOptions = {}): Sky {
  const cols = opts.cols ?? 3;
  const cellW = opts.cellW ?? 120;
  const cellH = opts.cellH ?? 100;
  const rows = Math.ceil(parts.length / cols);
  const pad = Math.min(cellW, cellH) * 0.16;
  const stars: Star[] = [];
  const links: Sky['links'] = [];
  const labels: Sky['labels'] = [];

  parts.forEach((p, k) => {
    const row = Math.floor(k / cols);
    const col = row % 2 === 0 ? k % cols : cols - 1 - (k % cols);
    const x0 = col * cellW;
    const y0 = row * cellH;
    labels.push({ part: p.number, x: x0 + pad * 0.6, y: y0 + pad * 0.9 });
    const rand = seeded(1000 + p.number * 7919);
    const minX = x0 + pad;
    const maxX = x0 + cellW - pad;
    const minY = y0 + pad * 1.4;
    const maxY = y0 + cellH - pad;
    const count = p.lessons.length;
    // 별이 많은 부일수록 걸음을 줄여 칸 안에 들어가게 한다.
    const stepLen = Math.min(cellW, cellH) * Math.max(0.16, Math.min(0.3, 1.5 / Math.sqrt(count + 1)));
    const minGap = stepLen * 0.55;
    const pts: [number, number][] = [];
    let x = minX + (maxX - minX) * (0.15 + rand() * 0.3);
    let y = minY + (maxY - minY) * (0.3 + rand() * 0.4);
    let angle = rand() * Math.PI * 2;
    p.lessons.forEach((n, i) => {
      if (i > 0) {
        let placed = false;
        for (let tries = 0; tries < 24 && !placed; tries++) {
          const a = angle + (rand() - 0.5) * (tries < 8 ? 1.6 : 6.2);
          const len = stepLen * (0.8 + rand() * 0.45);
          const nx = x + Math.cos(a) * len;
          const ny = y + Math.sin(a) * len;
          if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
          if (pts.some(([px, py]) => Math.hypot(px - nx, py - ny) < minGap)) continue;
          x = nx;
          y = ny;
          angle = a;
          placed = true;
        }
        if (!placed) {
          // 막히면 칸 안의 빈 곳으로 건너뛴다.
          for (let tries = 0; tries < 60; tries++) {
            const nx = minX + rand() * (maxX - minX);
            const ny = minY + rand() * (maxY - minY);
            if (pts.some(([px, py]) => Math.hypot(px - nx, py - ny) < minGap * 0.8)) continue;
            x = nx;
            y = ny;
            break;
          }
        }
      }
      pts.push([round(x), round(y)]);
      const last = i === count - 1;
      stars.push({ n, part: p.number, x: round(x), y: round(y), r: round(last ? 2.4 : 1.2 + rand() * 0.9) });
    });
    links.push({ part: p.number, points: pts });
  });

  return { width: cols * cellW, height: rows * cellH, stars, links, labels };
}

function round(v: number) {
  return Math.round(v * 10) / 10;
}

/** 그 부의 강이 모두 켜졌는지. 강이 하나도 없으면 아니다. */
export function partComplete(lessons: number[], statusOf: (n: number) => Status | undefined): boolean {
  return lessons.length > 0 && lessons.every((n) => isLit(statusOf(n)));
}

/* ── 2. 지금 서 있는 해 ─────────────────── */

export interface YearEvent {
  year: number;
  title: string;
  lessons: number[];
}

export interface Standing {
  /** 기준이 된 강(가장 뒤의 끝낸 강) */
  lesson: number;
  /** 사건이 이어진 강(그 강이거나 그 앞의 가장 가까운 강) */
  from: number;
  year: number;
  title: string;
}

/**
 * 가장 뒤의 끝낸 강(번호가 가장 큰 강)에 이어진 사건을 찾는다. 없으면 그 앞 강들로 거슬러 올라간다.
 * 한 강에 사건이 여럿이면 가장 늦은 해를 쓴다(그 강을 지나온 끝 자리라서).
 * 앞의 강을 다시 끝내도 해가 뒤로 돌아가지 않는다.
 */
export function standingYear(lessons: Record<string, { status: Status }>, events: YearEvent[]): Standing | null {
  const lit = Object.entries(lessons)
    .filter(([, r]) => isLit(r.status))
    .map(([n]) => Number(n))
    .filter((n) => Number.isFinite(n));
  if (!lit.length) return null;
  const last = Math.max(...lit);
  for (let k = last; k >= 1; k--) {
    const here = events.filter((e) => e.lessons.includes(k));
    if (!here.length) continue;
    const e = here.reduce((a, b) => (b.year > a.year ? b : a));
    return { lesson: last, from: k, year: e.year, title: e.title };
  }
  return null;
}

/** 연도를 읽기 좋게: 기원전은 "기원전 400년", 나머지는 "1801년" */
export function yearText(year: number): string {
  return year < 0 ? `기원전 ${-year}년` : `${year}년`;
}

/* ── 3. 장 넘김 ─────────────────────────── */

/** 한 부의 사건 가운데 강 순서로 가장 먼저 나오는 것의 해. 같은 강에 여럿이면 가장 이른 해. */
export function firstYearOf(lessons: number[], events: YearEvent[]): number | null {
  for (const n of [...lessons].sort((a, b) => a - b)) {
    const here = events.filter((e) => e.lessons.includes(n));
    if (here.length) return Math.min(...here.map((e) => e.year));
  }
  return null;
}

export interface Turn {
  part: number;
  partTitle: string;
  nextPart?: number;
  nextTitle?: string;
  nextYear?: number | null;
}

/** 장 넘김 화면의 두 줄. 다음 시대로 넘어간다는 말만 한다. 예: "0부 기초를 마쳤어요." / "이제 1801년으로 가요." */
export function turnLines(t: Turn): [string, string] {
  const first = `${t.part}부 ${t.partTitle}${hasBatchim(t.partTitle.slice(-1)) ? '을' : '를'} 마쳤어요.`;
  if (t.nextPart === undefined) return [first, '이 책의 마지막 장까지 왔어요.'];
  if (t.nextYear != null) return [first, `이제 ${yearText(t.nextYear)}으로 가요.`];
  const title = t.nextTitle ?? '';
  return [first, `이제 ${t.nextPart}부 ${title}${josaRo(title.slice(-1))} 가요.`];
}

/** 이 강을 마치면 장 넘김을 보여 줄지: 부의 마지막 강이고, 전에 끝낸 적이 없을 때만 */
export function shouldTurn(isPartEnd: boolean, before: Status | undefined): boolean {
  return isPartEnd && before !== 'done';
}

/** 받침이 있는 글자인지 (을/를, 이/가를 고를 때) */
export function hasBatchim(ch: string): boolean {
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return false;
  return code % 28 !== 0;
}

/** 으로/로: 받침이 없거나 ㄹ 받침이면 "로" */
function josaRo(ch: string): string {
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return '로';
  const jong = code % 28;
  return jong === 0 || jong === 8 ? '로' : '으로';
}

/* ── 4. 내 칠판 ─────────────────────────── */

/** 강 파일 본문에서 핵심 문장(<Key>…</Key>)을 뽑아 글만 남긴다. */
export function keySentences(body: string): string[] {
  return [...body.matchAll(/<Key>([\s\S]*?)<\/Key>/g)].map((m) => plainText(m[1]!)).filter(Boolean);
}

/** MDX 조각을 읽을 글로: 태그와 굵게 표시를 지우고, 수식은 그대로 둔다. */
export function plainText(mdx: string): string {
  return mdx
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
