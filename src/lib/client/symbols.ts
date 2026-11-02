/**
 * 수식 속 기호와 글 속 단위를 누를 수 있게 하고, 기호 카드를 만든다.
 *
 * - 빌드 때 KaTeX 결과의 글자마다 data-s="h"(기호 열쇠), 단위마다 data-u="J|s"가 붙어 있다(tex.ts).
 * - 그 글자가 무슨 기호인지는 가까운 곳부터 찾는다:
 *     1. [data-symid]  (기호 표의 칸: 그 칸의 기호)
 *     2. [data-symmap] (공식 카드: 그 공식의 글자 → 기호)
 *     3. 강의 frontmatter symbols
 *   아래 첨자가 붙은 열쇠("E_n")가 없으면 바탕 글자("E")로 다시 찾는다.
 * - 기호의 종류(variable, constant, unit, index, operator)를 data-kind로 붙이면 CSS가 모양을 입힌다.
 * - 글 속의 "100 m", "9.8 m/s²" 같은 단위도 찾아서 누르면 단위 카드를 연다.
 */

export interface SymbolEntry {
  id: string;
  name: string;
  read: string;
  kind: 'variable' | 'constant' | 'unit' | 'index' | 'operator';
  q: string;
  meaning: string;
  unit?: string;
  value?: string;
  origin?: string;
  notThis?: string;
  taughtIn: number;
  /** 미리 그린 기호 모양 (KaTeX HTML) */
  html: string;
  /** 글에서 찾을 때 쓰는 평문 모양 (단위: "km", "°C") */
  plain: string;
  /** 처음 배우는 강의 짧은 제목 */
  where: string;
}

export interface SymbolData {
  symbols: Map<string, SymbolEntry>;
  /** 단위 평문 → id */
  units: Map<string, string>;
  /** 이 강의 글자 → 기호 */
  map: Record<string, string>;
  /** 같은 모양(평문)인 기호들 */
  glyphs: Map<string, string[]>;
}

const KIND_LABEL: Record<SymbolEntry['kind'], string> = {
  variable: '변하는 양',
  constant: '상수',
  unit: '단위',
  index: '번호',
  operator: '연산 기호',
};

export function loadSymbolData(): SymbolData | null {
  const raw = document.getElementById('qm-symbols')?.textContent;
  if (!raw) return null;
  const { symbols, map } = JSON.parse(raw) as { symbols: SymbolEntry[]; map: Record<string, string> };
  const data: SymbolData = { symbols: new Map(), units: new Map(), map: map ?? {}, glyphs: new Map() };
  for (const s of symbols) {
    data.symbols.set(s.id, s);
    if (s.kind === 'unit') {
      data.units.set(s.plain, s.id);
      if (s.plain === '°C') data.units.set('℃', s.id);
    } else {
      const list = data.glyphs.get(s.plain) ?? [];
      list.push(s.id);
      data.glyphs.set(s.plain, list);
    }
  }
  return data;
}

const base = (key: string) => key.split('_')[0]!;

/** KaTeX 결과 속 글자와 단위에 기호를 붙인다. */
export function markSymbols(root: ParentNode, data: SymbolData) {
  for (const el of root.querySelectorAll<HTMLElement>('.katex [data-s], .katex [data-u]')) {
    if (el.dataset.sym) continue;
    let id: string | undefined;
    if (el.dataset.u) {
      const ids = el.dataset.u.split('|').map((u) => data.units.get(u)).filter((x): x is string => !!x);
      if (!ids.length) continue;
      el.dataset.sym = ids.join(',');
      decorate(el, data.symbols.get(ids[0]!)!);
      continue;
    }
    const key = el.dataset.s!;
    const own = el.closest<HTMLElement>('[data-symid]')?.dataset.symid;
    if (own) id = own;
    else {
      const local = el.closest<HTMLElement>('[data-symmap]')?.dataset.symmap;
      const lm = local ? (JSON.parse(local) as Record<string, string>) : undefined;
      id = lm?.[key] ?? lm?.[base(key)] ?? data.map[key] ?? data.map[base(key)];
    }
    const sym = id ? data.symbols.get(id) : undefined;
    if (!sym) continue;
    el.dataset.sym = sym.id;
    decorate(el, sym);
  }
}

function decorate(el: HTMLElement, sym: SymbolEntry) {
  el.dataset.kind = sym.kind;
  el.dataset.q = sym.q;
  el.setAttribute('role', 'button');
  el.tabIndex = 0;
  el.setAttribute('aria-label', `${sym.name}: 기호 설명 보기`);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** 글 속 "숫자 + 단위"의 단위를 누를 수 있게 한다. */
export function markUnits(root: Element, data: SymbolData, skip: string) {
  const list = [...data.units.keys()].sort((a, b) => b.length - a.length).map(escapeRe).join('|');
  if (!list) return;
  const re = new RegExp(
    `(?<=\\d(?:[\\d,.]*\\d)?(?:\\s?×\\s?10[⁻⁰-⁹]+)?\\s?)((?:${list})(?:[/·](?:${list}))*[²³]?)(?![A-Za-z가-힣])`,
    'g',
  );
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      !node.nodeValue || !/\d/.test(node.nodeValue) || node.parentElement?.closest(`${skip}, .unit`)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    const text = node.data;
    re.lastIndex = 0;
    if (!re.test(text)) continue;
    re.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let pos = 0;
    for (const m of text.matchAll(re)) {
      const ids = m[1]!
        .replace(/[²³]$/, '')
        .split(/[/·]/)
        .map((u) => data.units.get(u))
        .filter((x): x is string => !!x);
      if (!ids.length) continue;
      frag.append(text.slice(pos, m.index));
      const span = document.createElement('span');
      span.className = 'unit';
      span.dataset.sym = [...new Set(ids)].join(',');
      span.setAttribute('role', 'button');
      span.tabIndex = 0;
      span.textContent = m[1]!;
      frag.append(span);
      pos = m.index! + m[1]!.length;
    }
    frag.append(text.slice(pos));
    node.replaceWith(frag);
  }
}

function el(tag: string, cls: string, text = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/**
 * 기호 카드(시트 안에 넣을 내용). ids가 여럿이면(m/s) 단위 묶음 카드.
 * 돌려주는 title은 시트의 제목(포커스를 받는 곳), q는 시트 테두리 색.
 */
export function symbolCard(ids: string[], data: SymbolData, n: number): { nodes: HTMLElement[]; title: HTMLElement; q: string; label: string } {
  const list = ids.map((id) => data.symbols.get(id)).filter((x): x is SymbolEntry => !!x);
  if (list.length > 1) {
    const title = el('h3', 'sheet__title', list.map((s) => s.plain).join(' · '));
    const kicker = el('p', 'label sheet__kicker', '단위 묶음');
    const lead = el('p', 'sheet__def', '여러 단위를 곱하거나(·) 나눈(/) 단위예요. 하나씩 누르면 자세히 볼 수 있어요.');
    const ul = el('ul', 'sheet__units');
    for (const s of list) {
      const li = el('li', '');
      const b = el('span', 'unit');
      b.dataset.sym = s.id;
      b.setAttribute('role', 'button');
      b.tabIndex = 0;
      b.textContent = s.plain;
      li.append(b, ` ${s.name}: ${s.meaning}`);
      ul.append(li);
    }
    return { nodes: [kicker, title, lead, ul], title, q: list[0]!.q, label: list.map((s) => s.plain).join('·') };
  }
  const s = list[0]!;
  const kicker = el('p', 'label sheet__kicker', `기호 · ${KIND_LABEL[s.kind]}${s.taughtIn > n ? ' · 미리 보기' : ''}`);
  const head = el('div', 'sheet__symhead');
  const glyph = el('span', 'sheet__glyph');
  glyph.innerHTML = s.html;
  glyph.dataset.kind = s.kind;
  glyph.dataset.q = s.q;
  const title = el('h3', 'sheet__title', s.name);
  const read = el('p', 'sheet__read', `읽는 법: ${s.read}`);
  const names = el('div', '');
  names.append(title, read);
  head.append(glyph, names);
  const def = el('p', 'sheet__def', s.meaning);
  const dl = el('dl', 'sheet__dl');
  if (s.unit) dl.append(el('dt', '', '단위'), el('dd', '', s.unit));
  if (s.value) dl.append(el('dt', '', '값'), el('dd', '', s.value));
  if (s.origin) dl.append(el('dt', '', '글자가 온 곳'), el('dd', '', s.origin));
  // 같은 모양의 다른 기호
  const same = (data.glyphs.get(s.plain) ?? []).filter((id) => id !== s.id).map((id) => data.symbols.get(id)!);
  if (s.notThis || same.length) {
    const dd = el('dd', '');
    if (s.notThis) dd.append(el('p', '', s.notThis));
    if (same.length) {
      const p = el('p', 'sheet__same', '같은 모양, 다른 뜻: ');
      same.forEach((o, i) => {
        if (i) p.append(', ');
        const b = el('span', 'unit');
        b.dataset.sym = o.id;
        b.setAttribute('role', 'button');
        b.tabIndex = 0;
        b.textContent = `${o.name} (${o.taughtIn}강)`;
        p.append(b);
      });
      dd.append(p);
    }
    dl.append(el('dt', '', '헷갈리지 마세요'), dd);
  }
  const where =
    s.taughtIn === n ? '이 강에서 배워요' : s.taughtIn < n ? `처음 배운 곳: ${s.taughtIn}강 「${s.where}」` : `${s.taughtIn}강 「${s.where}」에서 자세히 배워요`;
  return { nodes: [kicker, head, def, dl, el('p', 'sheet__where', where)], title, q: s.q, label: s.name };
}
