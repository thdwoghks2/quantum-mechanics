/**
 * 용어 계약을 위한 용어 찾기.
 * 용어마다 정식 도입 강(taughtIn)이 있고, 그 전 강에서는 쓸 수 없다.
 * 이 파일은 빌드 검사(scripts/validate.mjs), 테스트, 브라우저(용어 밑줄)에서 함께 쓴다.
 */

export interface TermEntry {
  id: string;
  term: string;
  aliases?: string[];
  /** 기본 매칭 대신 쓸 정규식 */
  pattern?: string;
  taughtIn: number;
}

export interface TermHit {
  id: string;
  surface: string;
  index: number;
}

interface Matcher {
  id: string;
  re: RegExp;
  len: number;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 한글 낱말 안쪽에서 시작하는 매칭을 막는다: 앞 글자가 한글이면 낱말 중간이다. */
const HANGUL = /[가-힣]/;

export function buildMatchers(entries: TermEntry[]): Matcher[] {
  const out: Matcher[] = [];
  for (const e of entries) {
    if (e.pattern) {
      out.push({ id: e.id, re: new RegExp(e.pattern, 'gu'), len: e.term.length });
      continue;
    }
    for (const s of [e.term, ...(e.aliases ?? [])]) {
      out.push({ id: e.id, re: new RegExp(escapeRe(s), 'gu'), len: s.length });
    }
  }
  // 긴 표현을 먼저 찾아서 "진동수" 안의 "진동"이 따로 잡히지 않게 한다.
  return out.sort((a, b) => b.len - a.len);
}

/**
 * 글에서 용어를 찾는다. 긴 표현부터 찾고, 찾은 자리는 가려서 짧은 표현이 겹쳐 잡히지 않게 한다.
 * 한글 낱말 중간에서 시작하는 매칭은 버린다 ("운동량" 안의 "동량" 같은 것).
 */
export function findTerms(text: string, matchers: Matcher[]): TermHit[] {
  const taken = new Array<boolean>(text.length).fill(false);
  const hits: TermHit[] = [];
  for (const m of matchers) {
    m.re.lastIndex = 0;
    let r: RegExpExecArray | null;
    while ((r = m.re.exec(text))) {
      const start = r.index;
      const end = start + r[0].length;
      if (r[0].length === 0) {
        m.re.lastIndex++;
        continue;
      }
      if (start > 0 && HANGUL.test(text[start - 1]!)) continue;
      let free = true;
      for (let i = start; i < end; i++) if (taken[i]) free = false;
      if (!free) continue;
      for (let i = start; i < end; i++) taken[i] = true;
      hits.push({ id: m.id, surface: r[0], index: start });
    }
  }
  return hits.sort((a, b) => a.index - b.index);
}

/** 이 강(n)에서 아직 정식 도입되지 않은 용어를 쓴 곳을 돌려준다. */
export function contractViolations(
  text: string,
  lessonNumber: number,
  entries: TermEntry[],
): { id: string; surface: string; taughtIn: number; index: number }[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  return findTerms(text, buildMatchers(entries))
    .map((h) => ({ ...h, taughtIn: byId.get(h.id)!.taughtIn }))
    .filter((h) => h.taughtIn > lessonNumber);
}
