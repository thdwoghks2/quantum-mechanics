/**
 * 수식(TeX) 속 기호 찾기와 표시 달기.
 *
 * 강에서는 수식을 $E = hf$처럼 평범하게 쓴다. 빌드할 때 이 파일이 글자마다 표시를 달아
 * KaTeX 결과에 data-s="h" 같은 속성이 붙게 한다. 브라우저는 강의 frontmatter(symbols)를 보고
 * 그 글자가 어떤 기호인지(플랑크 상수인지 높이인지) 정해서 색과 모양을 입히고, 누르면 기호 카드를 연다.
 * 검사 스크립트(validate)도 같은 함수로 수식에 쓴 기호를 모은다.
 *
 * 기호 열쇠(key)
 * - 알파벳 한 글자: "h", "E"
 * - 아래 첨자가 붙으면 함께: "E_n", "k_B", "v_0"
 * - 그리스 문자는 이름으로: "lambda", "hbar", "Delta"
 * - 단위는 \mathrm{…} 안에서 글자 덩어리 하나씩: "J", "eV", "m", "s"
 */

const GREEK: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', Gamma: 'Γ', delta: 'δ', Delta: 'Δ', epsilon: 'ε', varepsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', Theta: 'Θ', iota: 'ι', kappa: 'κ', lambda: 'λ', Lambda: 'Λ',
  mu: 'μ', nu: 'ν', xi: 'ξ', Xi: 'Ξ', pi: 'π', Pi: 'Π', rho: 'ρ', sigma: 'σ', Sigma: 'Σ', tau: 'τ',
  upsilon: 'υ', phi: 'φ', varphi: 'φ', Phi: 'Φ', chi: 'χ', psi: 'ψ', Psi: 'Ψ', omega: 'ω', Omega: 'Ω',
  hbar: 'ħ', ell: 'ℓ',
};
const UNICODE_GREEK = new Map(Object.entries(GREEK).map(([k, v]) => [v, k]));

/** 기호로 보지 않는 명령: 다음 {…} 하나를 통째로 넘기거나(글자 모양), 그냥 넘긴다. */
const TEXT_LIKE = new Set(['text', 'textrm', 'textbf', 'textit', 'mbox', 'operatorname', 'label', 'tag', 'begin', 'end', 'color', 'hspace', 'vspace', 'textcolor']);
const UNIT_LIKE = new Set(['mathrm', 'unit']);

export interface TexKey {
  key: string;
  kind: 'symbol' | 'unit';
}

/** "k_\mathrm{B}" 같은 아래 첨자 내용을 열쇠에 붙일 평문으로 */
function plainSub(s: string): string {
  return s
    .replace(/\\(?:mathrm|text|textrm|mathit|operatorname)\s*/g, '')
    .replace(/\\([A-Za-z]+)/g, (_, name) => name)
    .replace(/[{}\s]/g, '');
}

/** s[i]에서 시작하는 인자 하나(글자 하나, \명령 하나, 또는 {…})를 읽는다. */
function readArg(s: string, i: number): { text: string; end: number } {
  while (s[i] === ' ') i++;
  if (s[i] === '{') {
    let depth = 0;
    for (let j = i; j < s.length; j++) {
      if (s[j] === '{') depth++;
      else if (s[j] === '}' && --depth === 0) return { text: s.slice(i + 1, j), end: j + 1 };
    }
    return { text: s.slice(i + 1), end: s.length };
  }
  if (s[i] === '\\') {
    const m = s.slice(i).match(/^\\([A-Za-z]+|.)/);
    if (m) {
      // \mathrm{B}처럼 인자를 받는 명령이면 그 인자까지
      if (UNIT_LIKE.has(m[1]!) || TEXT_LIKE.has(m[1]!) || m[1] === 'mathit') {
        const inner = readArg(s, i + m[0].length);
        return { text: s.slice(i, inner.end), end: inner.end };
      }
      return { text: m[0], end: i + m[0].length };
    }
  }
  const ch = [...s.slice(i)][0] ?? '';
  return { text: ch, end: i + ch.length };
}

interface Token {
  start: number;
  end: number;
  key: string;
  kind: 'symbol' | 'unit';
}

/** TeX에서 기호 자리를 찾는다. 위 첨자 안의 글자도 찾지만, 아래 첨자는 앞 글자의 열쇠에 붙인다. */
function scan(s: string, offset = 0, out: Token[] = []): Token[] {
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (c === '\\') {
      const m = s.slice(i).match(/^\\([A-Za-z]+|.)/)!;
      const name = m[1]!;
      if (GREEK[name]) {
        const start = i;
        i += m[0].length;
        let key = name;
        if (s[i] === '_') {
          const a = readArg(s, i + 1);
          key += '_' + plainSub(a.text);
          i = a.end;
        }
        out.push({ start: start + offset, end: i + offset, key, kind: 'symbol' });
        continue;
      }
      if (UNIT_LIKE.has(name)) {
        const a = readArg(s, i + m[0].length);
        // \mathrm{J{\cdot}s} → J, s
        for (const u of a.text.replace(/\\[A-Za-z]+/g, ' ').match(/[A-Za-zΩμ°Å]+/g) ?? []) {
          out.push({ start: i + offset, end: a.end + offset, key: u, kind: 'unit' });
        }
        i = a.end;
        continue;
      }
      if (TEXT_LIKE.has(name)) {
        i = readArg(s, i + m[0].length).end;
        continue;
      }
      i += m[0].length;
      continue;
    }
    if (c === '^') {
      let j = i + 1;
      while (s[j] === ' ') j++;
      const a = readArg(s, j);
      scan(a.text, offset + (s[j] === '{' ? j + 1 : j), out);
      i = a.end;
      continue;
    }
    const greekName = UNICODE_GREEK.get(c);
    if (/[A-Za-z]/.test(c) || greekName) {
      const start = i;
      i += c.length;
      let key = greekName ?? c;
      if (s[i] === '_') {
        const a = readArg(s, i + 1);
        key += '_' + plainSub(a.text);
        i = a.end;
      }
      out.push({ start: start + offset, end: i + offset, key, kind: 'symbol' });
      continue;
    }
    i += c.length;
  }
  return out;
}

/** 수식에 쓴 기호 열쇠 목록 (겹침 없이, 나온 순서대로) */
export function texKeys(tex: string): TexKey[] {
  const seen = new Set<string>();
  const out: TexKey[] = [];
  for (const t of scan(tex)) {
    const id = `${t.kind}:${t.key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ key: t.key, kind: t.kind });
  }
  return out;
}

/**
 * 기호마다 \htmlData 표시를 단다. KaTeX를 trust 옵션으로 돌려야 data-s, data-u 속성이 남는다.
 * 단위 \mathrm{…}은 통째로 data-u="J|s"처럼 감싼다.
 */
export function instrument(tex: string): string {
  const tokens = scan(tex).sort((a, b) => a.start - b.start);
  let out = '';
  let pos = 0;
  const merged: Token[] = [];
  for (const t of tokens) {
    const last = merged.at(-1);
    if (last && last.start === t.start && last.end === t.end) {
      last.key += '|' + t.key; // 같은 \mathrm{…} 안의 여러 단위
      continue;
    }
    if (last && t.start < last.end) continue; // 위 첨자 안을 이미 다른 토큰이 덮은 경우
    merged.push({ ...t });
  }
  for (const t of merged) {
    out += tex.slice(pos, t.start);
    const body = tex.slice(t.start, t.end);
    // 중괄호로 한 번 감싼다. 10^n처럼 ^ 바로 뒤의 글자를 감쌀 때 {}가 없으면 KaTeX가 위 첨자를 읽지 못한다.
    out += t.kind === 'unit' ? `{\\htmlData{u=${t.key}}{${body}}}` : `{\\htmlData{s=${t.key}}{${body}}}`;
    pos = t.end;
  }
  return out + tex.slice(pos);
}

/** 기호 열쇠의 바탕 글자: "E_n" → "E", "lambda_0" → "lambda" */
export function baseKey(key: string): string {
  return key.split('_')[0]!;
}

/** KaTeX 옵션. \htmlData만 허락한다. */
export const katexOptions = {
  strict: false as const,
  throwOnError: false,
  trust: (ctx: { command: string }) => ctx.command === '\\htmlData',
};
