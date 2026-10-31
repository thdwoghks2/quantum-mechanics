/** "3e5", "3×10^5", "3 × 10⁵", "300,000" 같은 입력을 숫자로 바꾼다. 읽을 수 없으면 NaN. */
export function parseNumber(raw: string): number {
  const sup: Record<string, string> = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-',
  };
  let s = raw.trim().replace(/,/g, '').replace(/\s+/g, '');
  if (!s) return Number.NaN;
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => '^' + [...m].map((c) => sup[c]).join(''));
  const sci = s.match(/^([+-]?\d*\.?\d+)(?:[x×*]10\^?([+-]?\d+))$/i);
  if (sci) return Number(sci[1]) * 10 ** Number(sci[2]);
  const pow = s.match(/^10\^?([+-]?\d+)$/);
  if (pow) return 10 ** Number(pow[1]);
  return Number(s);
}

/** value: 상대 오차 tol 안이면 맞음. order: 정답의 1/3배~3배면 맞음(자릿수가 맞음). */
export function isCorrect(value: number, answer: number, mode: 'value' | 'order', tol = 0.05): boolean {
  if (!Number.isFinite(value)) return false;
  if (mode === 'order') {
    if (value === 0 || answer === 0 || Math.sign(value) !== Math.sign(answer)) return false;
    return Math.abs(Math.log10(value / answer)) <= Math.log10(3) + 1e-9;
  }
  if (answer === 0) return Math.abs(value) <= tol;
  return Math.abs(value - answer) <= Math.abs(answer) * tol + 1e-12;
}
