/**
 * 큰 숫자를 세어 올릴지, 어떻게 쓸지 정한다(BigNumber).
 * 숫자가 하나뿐이고 2 이상일 때만 센다. 연도처럼 보이는 네 자리 정수, 위 첨자, 식이 든 값은 세지 않는다.
 */
export interface CountPlan {
  target: number;
  text: string;
  render: (v: number) => string;
}

const TOKEN = /\d[\d,]*(?:\.\d+)?/g;

export function countable(text: string): CountPlan | null {
  const t = text.trim();
  if (/[⁰-⁹⁻₀-₉=÷×⟩|√±²³]/.test(t)) return null;
  const tokens = [...t.matchAll(TOKEN)];
  if (tokens.length !== 1) return null;
  const m = tokens[0]!;
  const raw = m[0];
  const comma = raw.includes(',');
  const value = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(value) || value < 2) return null;
  if (!comma && /^\d{4}$/.test(raw) && value >= 1000 && value <= 2100) return null;
  const decimals = raw.includes('.') ? raw.split('.')[1]!.length : 0;
  const before = t.slice(0, m.index);
  const after = t.slice(m.index! + raw.length);
  const fmt = (v: number) =>
    v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: comma });
  return { target: value, text: t, render: (v) => `${before}${fmt(v)}${after}` };
}
