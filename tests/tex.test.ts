import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { instrument, katexOptions, texKeys } from '../src/lib/tex.ts';

const keys = (t: string) => texKeys(t).map((k) => (k.kind === 'unit' ? `[${k.key}]` : k.key));

describe('수식 속 기호 찾기', () => {
  it('글자, 아래 첨자, 그리스 문자, 단위를 나눈다', () => {
    expect(keys('E = hf')).toEqual(['E', 'h', 'f']);
    expect(keys('E_n = -\\frac{13.6\\,\\mathrm{eV}}{n^2}')).toEqual(['E_n', '[eV]', 'n']);
    expect(keys('k_\\mathrm{B} T')).toEqual(['k_B', 'T']);
    expect(keys('\\lambda = \\frac{h}{p}')).toEqual(['lambda', 'h', 'p']);
    expect(keys('h \\approx 6.63 \\times 10^{-34}\\,\\mathrm{J{\\cdot}s}')).toEqual(['h', '[J]', '[s]']);
    expect(keys('e^{i\\theta} = \\cos\\theta + i\\sin\\theta')).toEqual(['e', 'i', 'theta']);
    expect(keys('\\Delta x\\,\\Delta p_x \\ge \\frac{\\hbar}{2}')).toEqual(['Delta', 'x', 'p_x', 'hbar']);
    expect(keys('v = f\\lambda \\text{ (파동의 속력)}')).toEqual(['v', 'f', 'lambda']);
    expect(keys('λ = v ÷ f')).toEqual(['lambda', 'v', 'f']);
    expect(keys('\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('표시를 단 수식도 KaTeX가 그리고, data-s와 data-u가 남는다', () => {
    const html = katex.renderToString(instrument('E_n = h f + 2\\,\\mathrm{J{\\cdot}s} + e^{i\\theta}'), katexOptions);
    expect(html).toContain('data-s="E_n"');
    expect(html).toContain('data-s="h"');
    expect(html).toContain('data-u="J|s"');
    expect(html).toContain('data-s="theta"');
    expect(html).not.toContain('katex-error');
  });

  it('^ 바로 뒤의 글자(10^n)도 깨지지 않는다', () => {
    for (const t of ['10^n \\times 10^k = 10^{n+k}', 'x^2 + y_n^2', 'e^\\theta']) {
      const html = katex.renderToString(instrument(t), katexOptions);
      expect(html, t).not.toContain('katex-error');
      expect(html, t).not.toContain('color:#cc0000');
    }
  });
});
