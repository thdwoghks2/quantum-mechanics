/**
 * 컴포넌트 속성 문자열 안의 수식을 그린다. 'E = hf' 대신 '$E = hf$'처럼 쓰면
 * 빌드할 때 KaTeX로 그리고(기호 표시 포함), 나머지 글은 HTML로 안전하게 바꾼다.
 * Panels, Flow, DataTable, 공식 카드처럼 글을 속성으로 받는 컴포넌트가 set:html로 쓴다.
 */
import katex from 'katex';
import { instrument, katexOptions } from './tex.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function tex(src: string, display = false): string {
  return katex.renderToString(instrument(src), { ...katexOptions, displayMode: display });
}

/** "글 $수식$ 글" → HTML. $$…$$는 줄을 바꿔 크게 그린다. 수식이 없으면 글만 바꾼다. */
export function renderMath(text: string | undefined | null): string {
  if (!text) return '';
  let out = '';
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let pos = 0;
  for (let m: RegExpExecArray | null; (m = re.exec(text)); ) {
    out += esc(text.slice(pos, m.index));
    out += m[1] !== undefined ? tex(m[1], true) : tex(m[2]!, false);
    pos = m.index + m[0].length;
  }
  return out + esc(text.slice(pos));
}

/** 수식이 들어 있는지 */
export const hasMath = (text: string | undefined | null) => !!text && /\$[^$\n]+\$/.test(text);

const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺', n: 'ⁿ' };
const SUB: Record<string, string> = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', n: 'ₙ' };
const SYMS: Record<string, string> = {
  times: '×', cdot: '·', div: '÷', approx: '≈', le: '≤', ge: '≥', ne: '≠', pm: '±', to: '→', infty: '∞',
  lambda: 'λ', theta: 'θ', pi: 'π', psi: 'ψ', Psi: 'Ψ', Delta: 'Δ', hbar: 'ħ', nu: 'ν', mu: 'μ', alpha: 'α', omega: 'ω', phi: 'φ', sigma: 'σ',
};

/** SVG 글자처럼 KaTeX를 못 쓰는 곳: $…$ 안의 간단한 TeX를 유니코드 글자로 바꾼다. */
export function texToPlain(text: string | undefined | null): string {
  if (!text) return '';
  return text.replace(/\$([^$]+)\$/g, (_, t: string) =>
    t
      .replace(/\\([A-Za-z]+)/g, (m, name: string) => SYMS[name] ?? m)
      .replace(/\{([^{}]*)\}(?=[^{]*\})/g, '$1')
      .replace(/\\mathrm\{([^}]*)\}/g, '$1')
      .replace(/\\text\{([^}]*)\}/g, '$1')
      .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
      .replace(/\^\{([^}]*)\}|\^(.)/g, (_m, a?: string, b?: string) => [...(a ?? b ?? '')].map((c) => SUP[c] ?? c).join(''))
      .replace(/_\{([^}]*)\}|_(.)/g, (_m, a?: string, b?: string) => [...(a ?? b ?? '')].map((c) => SUB[c] ?? c).join(''))
      .replace(/\\([A-Za-z]+)/g, (_m, name: string) => SYMS[name] ?? '')
      .replace(/\\[,;! ]/g, ' ')
      .replace(/[{}]/g, ''),
  );
}
