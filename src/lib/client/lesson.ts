/**
 * 레슨 화면 넘기기.
 * - 화면은 한 장씩 보인다. "다음"은 화면 안의 단계(data-step)를 먼저 열고, 다 열리면 다음 화면으로 간다.
 * - 진행 위치는 이 기기에 저장되고, 다시 열면 이어서 본다. 주소의 #s5 같은 표시로 특정 화면을 열 수 있다.
 * - 글 속 물리량 용어에 색 밑줄을 긋고, 누르면 정의 카드가 열린다.
 * - 통과 시험: 핵심 문제를 모두 맞히면 강을 건너뛴다.
 * - 단계는 처음부터 자리를 잡아 두고 나타나기만 한다. 그래서 화면이 넘치는지는 처음에 한 번 재면 되고,
 *   넘칠 때만 촘촘한 모양(is-dense, is-denser)을 붙인다.
 * - 부의 마지막 강을 처음 마치면 장 넘김 화면을 한 번 보여 준다.
 */
import { load, save, setLesson, setScreen } from '../progress.ts';
import { buildMatchers, findTerms, type TermEntry } from '../terms.ts';
import { shouldTurn } from '../rewards.ts';
import { loadSymbolData, markSymbols, markUnits, symbolCard, type SymbolData } from './symbols.ts';
import { navigate } from 'astro:transitions/client';

interface Gloss extends TermEntry {
  definition: string;
  unit?: string;
  examples: string[];
  notThis?: string;
  q: string;
  /** 처음 배우는 강의 짧은 제목 */
  where: string;
}

const SKIP =
  'button, input, textarea, select, a, svg, canvas, .katex, .defcard, .term, .check__opt, .label, code, .sim, .sheet__kicker, .sheet__where, dt, .title__h, .title__epigraph, blockquote, [data-no-terms]';

/** 목차에 보일 화면 이름. 글쓴이가 붙인 제목이 없으면 본문 첫 문장을 낱말 단위로 줄인다. */
function tocTitle(screen: HTMLElement): string {
  if (screen.dataset.title) return screen.dataset.title;
  const el = screen.querySelector('.screen__body p, .check__q p, .title__h');
  const text = (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const first = text.match(/^.+?[.?!](?=\s|$)/)?.[0] ?? text;
  if (first.length <= 60) return first;
  const cut = first.slice(0, 58);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 40)) + '…';
}

class QmLesson extends HTMLElement {
  screens: HTMLElement[] = [];
  i = 0;
  step = 0;
  n = 0;
  glossary = new Map<string, Gloss>();
  touchX = 0;
  touchY = 0;
  onKey: ((e: KeyboardEvent) => void) | null = null;
  onResize: (() => void) | null = null;

  connectedCallback() {
    this.n = Number(this.dataset.lesson);
    this.screens = [...this.querySelectorAll<HTMLElement>('.stage .screen')];
    this.loadGlossary();
    this.buildProgress();
    this.buildToc();
    this.highlightTerms();
    this.highlightSymbols();
    this.bind();
    this.restore();
    // 글꼴이 늦게 도착하면 글 높이가 달라지니 한 번 더 잰다.
    document.fonts?.ready.then(() => this.isConnected && this.fit(this.screens[this.i]!));
  }

  disconnectedCallback() {
    if (this.onKey) document.removeEventListener('keydown', this.onKey);
    if (this.onResize) window.removeEventListener('resize', this.onResize);
  }

  /* ── 상태 ── */
  get last() {
    return this.screens.length - 1;
  }

  stepsOf(screen: HTMLElement) {
    const els = [...screen.querySelectorAll<HTMLElement>('[data-step]')];
    const max = els.reduce((m, el) => Math.max(m, Number(el.dataset.step) || 0), 0);
    return { els, max };
  }

  show(i: number, opts: { allSteps?: boolean; focus?: boolean } = {}) {
    const prev = this.screens[this.i];
    const from = this.i;
    this.i = Math.max(0, Math.min(this.last, i));
    this.dataset.dir = this.i > from ? 'fwd' : this.i < from ? 'back' : '';
    const screen = this.screens[this.i]!;
    if (prev && prev !== screen) {
      prev.classList.remove('is-active');
      prev.dispatchEvent(new CustomEvent('qm:hide'));
    }
    screen.classList.add('is-active');
    // 화면이 바뀔 때 짧은 암전. 같은 화면에서 단계만 열 때는 하지 않는다.
    if (prev && prev !== screen) {
      const stage = this.querySelector<HTMLElement>('.stage')!;
      stage.classList.remove('is-cut');
      void stage.offsetWidth;
      stage.classList.add('is-cut');
    }
    const { max } = this.stepsOf(screen);
    this.step = opts.allSteps ? max : Math.min(1, max);
    this.applySteps();
    screen.dispatchEvent(new CustomEvent('qm:show'));
    this.fit(screen);
    screen.scrollTo({ top: 0 });
    this.updateChrome();
    if (this.i > 0) save(setScreen(load(), this.n, this.i, Date.now()));
    // 다른 강에서 넘어오는 중에는 주소창이 아직 앞 강의 주소라서, 내 주소일 때만 화면 위치(#s5)를 적는다.
    if (this.onOwnPage()) {
      if (this.i > 0) history.replaceState(history.state, '', `#s${this.i}`);
      else if (location.hash) history.replaceState(history.state, '', location.pathname);
    }
    if (opts.focus) screen.querySelector<HTMLElement>('.screen__text')?.focus({ preventScroll: true });
  }

  applySteps() {
    const screen = this.screens[this.i]!;
    for (const el of this.stepsOf(screen).els) {
      el.classList.toggle('step-hidden', Number(el.dataset.step) > this.step);
      el.classList.remove('step-enter', 'step-shown', 'step-next');
    }
    // 다음에 열릴 글 자리에 작은 표시를 둔다.
    screen.querySelector<HTMLElement>(`.screen__body .step[data-step="${this.step + 1}"]`)?.classList.add('step-next');
  }

  /** 화면이 무대보다 길면 한 단계씩(세 단계까지) 촘촘하게 한다. 단계는 자리를 미리 잡고 있으니 다 연 모양과 높이가 같다. */
  fit(screen: HTMLElement) {
    screen.classList.remove('is-dense', 'is-denser', 'is-densest');
    const over = () => screen.scrollHeight - screen.clientHeight > 1;
    for (const cls of ['is-dense', 'is-denser', 'is-densest']) {
      if (!over()) return;
      screen.classList.add(cls);
    }
  }

  next() {
    const screen = this.screens[this.i]!;
    const { max } = this.stepsOf(screen);
    if (this.step < max) {
      this.step++;
      this.applySteps();
      // 새로 열린 단계만 천천히 떠오르게 하고, 화면이 넘치는 경우에만 그 단계가 보이게 내린다.
      // 떠오름이 끝나도 step-enter를 그냥 떼면 화면 전체의 한 줄씩 떠오르기(line-rise)가 다시 걸려
      // 같은 글이 한 번 더 떠오른다. 그래서 애니메이션을 끈 step-shown으로 바꿔 둔다.
      const opened = [...screen.querySelectorAll<HTMLElement>(`[data-step="${this.step}"]`)];
      for (const el of opened) {
        el.classList.add('step-enter');
        const done = (e: AnimationEvent) => {
          if (e.target !== el) return; // 안쪽 요소의 애니메이션이 끝난 것은 무시
          el.removeEventListener('animationend', done);
          el.classList.replace('step-enter', 'step-shown');
        };
        el.addEventListener('animationend', done);
      }
      opened.find((el) => el.closest('.screen__body'))?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      this.updateChrome();
      return;
    }
    if (this.i < this.last) {
      if (this.i === 0) save(setLesson(load(), this.n, 'started', Date.now()));
      this.show(this.i + 1);
    } else {
      this.finish();
    }
  }

  prev() {
    if (this.i > 0) this.show(this.i - 1, { allSteps: true });
    // 페이지를 통째로 다시 불러오면 배경 음악이 끊기므로, 바꿔 끼우기로 나간다.
    else void navigate(this.dataset.course!);
  }

  /** 주소창이 이 강의 주소인지. 앞 강에서 바꿔 끼우는 중에는 아직 앞 강의 주소다. */
  onOwnPage() {
    return location.pathname.replace(/\/$/, '').endsWith(`/lessons/${this.n}`);
  }

  finish() {
    const before = load().lessons[this.n]?.status;
    save(setLesson(load(), this.n, 'done', Date.now(), this.last));
    const nextUrl = this.dataset.next;
    const btn = this.querySelector<HTMLButtonElement>('.lnav__next')!;
    const done = document.createElement('a');
    done.className = 'btn btn--primary lnav__next';
    if (nextUrl) {
      done.href = nextUrl;
      done.textContent = `${this.dataset.nextTitle ?? '다음 강'} ›`;
    } else {
      done.href = this.dataset.course!;
      done.textContent = '코스로 돌아가기';
      const planned = this.querySelector<HTMLTemplateElement>('#next-planned')?.content.textContent;
      if (planned) this.querySelector('.lnav__count')!.textContent = planned;
    }
    btn.replaceWith(done);
    this.updateChrome(true);
    if (shouldTurn(this.dataset.partEnd === '1', before)) this.openTurn();
  }

  /** 장 넘김: 한 부를 마치면 다음 시대로 넘어간다는 말만 한 번 보여 준다. */
  openTurn() {
    const turn = this.querySelector<HTMLElement>('.turn');
    if (!turn) return;
    turn.hidden = false;
    turn.querySelector<HTMLElement>('.turn__go')?.focus({ preventScroll: true });
  }

  restore() {
    const st = load().lessons[this.n];
    const status = this.querySelector<HTMLElement>('.title__status')!;
    if (st?.status === 'done') {
      status.hidden = false;
      status.textContent = '끝낸 강이에요. 처음부터 다시 봐도 되고, 목차에서 원하는 화면으로 바로 가도 돼요.';
    } else if (st?.status === 'tested-out') {
      status.hidden = false;
      status.textContent = '통과 시험으로 건너뛴 강이에요.';
    } else if (st?.status === 'started' && st.screen) {
      status.hidden = false;
      status.innerHTML = '';
      status.append(`지난번에 ${st.screen + 1}번째 화면까지 봤어요. `);
      const resume = document.createElement('button');
      resume.type = 'button';
      resume.className = 'btn';
      resume.textContent = '이어서 보기';
      resume.addEventListener('click', () => this.show(st.screen!, { allSteps: true }));
      status.append(resume);
    }
    // #s5 같은 화면 위치는 주소창이 이 강일 때만 따른다(앞 강의 위치를 물려받지 않게).
    const m = this.onOwnPage() ? location.hash.match(/^#s(\d+)$/) : null;
    this.show(m ? Number(m[1]) : 0, { allSteps: !!m });
  }

  /* ── 위 막대, 목차, 숫자 ── */
  buildProgress() {
    const bar = this.querySelector('.lbar__progress')!;
    this.screens.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lbar__seg';
      b.setAttribute('aria-label', `${i + 1}번째 화면: ${s.dataset.label}`);
      b.addEventListener('click', () => this.show(i, { allSteps: true }));
      bar.append(b);
    });
  }

  buildToc() {
    const ol = this.querySelector('.toc')!;
    this.screens.forEach((s, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      const num = document.createElement('span');
      num.className = 'mono';
      num.textContent = String(i + 1);
      const kind = document.createElement('span');
      kind.className = 'toc__kind';
      kind.textContent = s.dataset.label ?? '';
      const snip = document.createElement('span');
      snip.className = 'toc__snip';
      snip.textContent = tocTitle(s);
      const text = document.createElement('span');
      text.className = 'toc__text';
      text.append(kind, snip);
      b.append(num, text);
      b.addEventListener('click', () => {
        this.show(i, { allSteps: true });
        this.closeRails();
      });
      li.append(b);
      ol.append(li);
    });
  }

  updateChrome(finished = false) {
    this.querySelectorAll('.lbar__seg').forEach((el, j) => {
      el.classList.toggle('is-past', j < this.i);
      el.classList.toggle('is-now', j === this.i);
    });
    this.querySelectorAll('.toc li').forEach((el, j) => el.classList.toggle('is-now', j === this.i));
    const count = this.querySelector('.lnav__count')!;
    if (!finished) count.textContent = `${this.i + 1} / ${this.screens.length}`;
    // 이 화면의 단계를 점으로: 연 단계는 채우고, 남은 단계는 비운다. 단계가 없으면 점도 없다.
    const pips = this.querySelector<HTMLElement>('.lnav__steps');
    if (pips) {
      const { max } = this.stepsOf(this.screens[this.i]!);
      pips.innerHTML = '';
      if (max > 1 && !finished) {
        for (let k = 1; k <= max; k++) {
          const dot = document.createElement('i');
          if (k <= this.step) dot.className = 'is-on';
          pips.append(dot);
        }
      }
    }
    // 첫 화면에서는 '이전' 자리가 코스로 나가는 버튼이 된다.
    const prev = this.querySelector<HTMLButtonElement>('.lnav__prev')!;
    prev.textContent = this.i === 0 ? '‹ 나가기' : '‹ 이전';
    const next = this.querySelector<HTMLButtonElement>('button.lnav__next');
    if (next) {
      const { max } = this.stepsOf(this.screens[this.i]!);
      let mode = 'next';
      if (this.i === 0) {
        next.textContent = '시작 ›';
        mode = 'start';
      } else if (this.step < max) {
        next.textContent = '계속';
        mode = 'continue';
      } else if (this.i === this.last) {
        next.textContent = '강 마치기';
        mode = 'finish';
      } else next.textContent = '다음 ›';
      next.dataset.mode = mode;
      next.setAttribute('aria-label', mode === 'continue' ? '이 화면의 다음 글 보기' : next.textContent);
    }
  }

  /* ── 입력 ── */
  bind() {
    this.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const action = t.closest<HTMLElement>('[data-action]')?.dataset.action;
      if (action === 'next' || action === 'start') this.next();
      else if (action === 'prev') this.prev();
      else if (action === 'testout') this.openTestout();
      else if (action === 'testout-close') this.closeTestout();
      else if (action === 'turn-close') this.querySelector<HTMLElement>('.turn')!.hidden = true;
      const open = t.closest<HTMLElement>('[data-open]')?.dataset.open;
      if (open) this.toggleRail(open);
      if (t.closest('[data-close]')) this.closeRails();
      if (t.closest('[data-sheet-close]')) this.closeSheet();
      else if (t.closest('[data-sheet-back]')) this.sheetBack();
      const hit = this.sheetTarget(t);
      if (hit) {
        e.preventDefault();
        this.openSheet(hit.key, hit.el, !!hit.el.closest('.sheet'));
      }
    });
    // 밑줄 용어와 기호는 키보드로도 연다.
    this.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const hit = this.sheetTarget(e.target as HTMLElement);
      if (hit) {
        e.preventDefault();
        this.openSheet(hit.key, hit.el, !!hit.el.closest('.sheet'));
      }
    });
    // 시트를 아래로 밀면 닫힌다.
    const panel = this.querySelector<HTMLElement>('.sheet__panel');
    let sy = 0;
    panel?.addEventListener('touchstart', (e) => (sy = e.touches[0]!.clientY), { passive: true });
    panel?.addEventListener('touchend', (e) => {
      const body = panel.querySelector<HTMLElement>('.sheet__body')!;
      if (e.changedTouches[0]!.clientY - sy > 80 && body.scrollTop <= 0) this.closeSheet();
    }, { passive: true });

    // 페이지를 바꿔 끼워도 문서는 그대로라, 문서에 건 키보드 처리는 강을 떠날 때 떼어 낸다.
    this.onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, [contenteditable]')) return;
      if (this.sheetOpen()) {
        // 시트가 열려 있으면 화면을 넘기지 않는다. Esc는 시트만 닫는다.
        if (e.key === 'Escape') this.closeSheet();
        return;
      }
      if (e.key === 'Escape') {
        this.closeRails();
        const turn = this.querySelector<HTMLElement>('.turn');
        if (turn) turn.hidden = true;
        return;
      }
      if (!this.querySelector<HTMLElement>('.testout')!.hidden) return;
      if (e.key === 'ArrowRight') this.next();
      if (e.key === 'ArrowLeft') this.prev();
    };
    document.addEventListener('keydown', this.onKey);

    let raf = 0;
    this.onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => this.fit(this.screens[this.i]!));
    };
    window.addEventListener('resize', this.onResize);

    const stage = this.querySelector<HTMLElement>('.stage')!;
    stage.addEventListener('touchstart', (e) => {
      this.touchX = e.touches[0]!.clientX;
      this.touchY = e.touches[0]!.clientY;
    }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('canvas, input, textarea, .sim')) return;
      const dx = e.changedTouches[0]!.clientX - this.touchX;
      const dy = e.changedTouches[0]!.clientY - this.touchY;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) {
        if (dx < 0) this.next();
        else this.prev();
      }
    }, { passive: true });
  }

  toggleRail(which: string) {
    const rail = this.querySelector<HTMLElement>(`#rail-${which}`)!;
    const open = !rail.classList.contains('is-open');
    this.closeRails();
    rail.classList.toggle('is-open', open);
    this.querySelector(`[data-open="${which}"]`)?.setAttribute('aria-expanded', String(open));
  }

  closeRails() {
    this.querySelectorAll('.rail').forEach((r) => r.classList.remove('is-open'));
    this.querySelectorAll('[data-open]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }

  /* ── 용어 ── */
  loadGlossary() {
    const raw = document.getElementById('qm-glossary')?.textContent;
    if (!raw) return;
    for (const g of JSON.parse(raw) as Gloss[]) this.glossary.set(g.id, g);
  }

  /**
   * 글 속 용어에 모두 밑줄을 긋는다. 화면마다 나오는 곳 전부에.
   * 본문, 그림 설명(Panels, Flow, 표), 문제 지문과 해설까지. 선택지 버튼 안은 누르면 답이 골라지니 뺀다.
   * 물리량 용어는 그 물리량 색 밑줄, 나머지는 흐린 점선 밑줄(CSS가 data-q로 나눈다).
   */
  highlightTerms() {
    if (!this.glossary.size) return;
    this.matchers = buildMatchers([...this.glossary.values()]);
    for (const screen of this.screens) this.markTerms(screen);
  }

  matchers: ReturnType<typeof buildMatchers> = [];

  /** root 안의 글에서 용어를 찾아 누를 수 있는 밑줄로 바꾼다. except 용어는 건너뛴다(시트 속 자기 자신). */
  markTerms(root: Element, except?: string) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        !node.nodeValue?.trim() || node.parentElement?.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const node of nodes) {
      const text = node.data;
      const hits = findTerms(text, this.matchers).filter((h) => h.id !== except);
      if (!hits.length) continue;
      const frag = document.createDocumentFragment();
      let pos = 0;
      for (const h of hits) {
        if (h.index < pos) continue;
        frag.append(text.slice(pos, h.index));
        frag.append(this.termEl(h.id, h.surface));
        pos = h.index + h.surface.length;
      }
      frag.append(text.slice(pos));
      node.replaceWith(frag);
    }
  }

  termEl(id: string, surface: string) {
    // <button> 대신 span을 쓴다. 문제 지문이나 다른 버튼 근처에서도 문서 구조가 깨지지 않게.
    const b = document.createElement('span');
    b.className = 'term';
    b.setAttribute('role', 'button');
    b.tabIndex = 0;
    b.dataset.term = id;
    b.dataset.q = this.glossary.get(id)!.q;
    b.textContent = surface;
    return b;
  }

  /* ── 기호 ── */
  syms: SymbolData | null = null;

  /** 수식 속 기호와 글 속 단위를 누를 수 있게 한다(symbols.ts). */
  highlightSymbols() {
    this.syms = loadSymbolData();
    if (!this.syms) return;
    for (const screen of this.screens) {
      markSymbols(screen, this.syms);
      markUnits(screen, this.syms, `${SKIP}, .katex`);
    }
  }

  /** 누른 곳이 용어나 기호면 시트에 열 열쇠("term:id", "sym:id")를 돌려준다. */
  sheetTarget(t: HTMLElement): { key: string; el: HTMLElement } | null {
    const term = t.closest?.<HTMLElement>('.term[data-term]');
    if (term) return { key: `term:${term.dataset.term}`, el: term };
    const sym = t.closest?.<HTMLElement>('.katex [data-sym], .unit[data-sym]');
    if (sym) return { key: `sym:${sym.dataset.sym}`, el: sym };
    return null;
  }

  /* ── 용어·기호 시트 ──
   * 아래에서 올라오는 시트. 강의 화면 위치는 그대로 두고, 다른 강으로 넘어가지 않는다.
   * 시트 안의 글에 나온 용어나 기호를 누르면 시트 안에서 다음 장으로 넘어가고, "‹ 앞 장"으로 돌아온다. */
  sheetStack: string[] = [];
  sheetOpener: HTMLElement | null = null;

  get sheet() {
    return this.querySelector<HTMLElement>('.sheet')!;
  }

  sheetOpen() {
    return !this.sheet.hidden;
  }

  openTerm(id: string, from?: HTMLElement, push = false) {
    this.openSheet(`term:${id}`, from, push);
  }

  openSheet(key: string, from?: HTMLElement, push = false) {
    const [kind, id] = key.split(':') as [string, string];
    if (kind === 'term' && !this.glossary.has(id)) return;
    if (kind === 'sym' && !id.split(',').every((x) => this.syms?.symbols.has(x))) return;
    if (!push) {
      this.sheetStack = [];
      this.sheetOpener = from ?? null;
    }
    if (this.sheetStack.at(-1) !== key) this.sheetStack.push(key);
    this.renderSheet();
  }

  sheetBack() {
    this.sheetStack.pop();
    if (this.sheetStack.length) this.renderSheet();
    else this.closeSheet();
  }

  /** 시트 한 장의 이름 (‹ 앞 장 단추에 쓴다) */
  sheetLabel(key: string): string {
    const [kind, id] = key.split(':') as [string, string];
    if (kind === 'term') return this.glossary.get(id)?.term ?? '';
    const list = id.split(',').map((x) => this.syms?.symbols.get(x));
    return list.length > 1 ? list.map((s) => s?.plain).join('·') : (list[0]?.name ?? '');
  }

  renderSheet() {
    const key = this.sheetStack.at(-1)!;
    const [kind, id] = key.split(':') as [string, string];
    const sheet = this.sheet;
    const panel = sheet.querySelector<HTMLElement>('.sheet__panel')!;
    const body = sheet.querySelector<HTMLElement>('.sheet__body')!;
    body.innerHTML = '';
    let title: HTMLElement;
    if (kind === 'sym') {
      const card = symbolCard(id.split(','), this.syms!, this.n);
      panel.dataset.q = card.q;
      body.append(...card.nodes);
      title = card.title;
      this.markTerms(body);
    } else {
      const g = this.glossary.get(id)!;
      panel.dataset.q = g.q;
      const kicker = el('p', 'label sheet__kicker', g.taughtIn > this.n ? '용어 · 미리 보기' : '용어');
      title = el('h3', 'sheet__title', g.term);
      const def = el('p', 'sheet__def', g.definition);
      const dl = document.createElement('dl');
      dl.className = 'sheet__dl';
      if (g.unit) dl.append(el('dt', '', '단위'), el('dd', 'mono', g.unit));
      const ex = document.createElement('dd');
      const ul = document.createElement('ul');
      for (const e of g.examples) ul.append(el('li', '', e));
      ex.append(ul);
      dl.append(el('dt', '', '예'), ex);
      if (g.notThis) dl.append(el('dt', '', '헷갈림 주의'), el('dd', '', g.notThis));
      // 처음 배운 곳은 글로만 알려 준다. 링크로 넘어가면 지금 보던 화면으로 돌아오기 어렵다.
      const where =
        g.taughtIn === this.n
          ? '이 강에서 배워요'
          : g.taughtIn < this.n
            ? `처음 배운 곳: ${g.taughtIn}강 「${g.where}」`
            : `${g.taughtIn}강 「${g.where}」에서 자세히 배워요`;
      body.append(kicker, title, def, dl, el('p', 'sheet__where', where));
      this.markTerms(body, id);
    }
    if (this.syms) markUnits(body, this.syms, `${SKIP}, .katex`);
    title.id = 'sheet-title';
    const back = sheet.querySelector<HTMLButtonElement>('[data-sheet-back]')!;
    const prevKey = this.sheetStack.at(-2);
    back.hidden = !prevKey;
    if (prevKey) back.textContent = `‹ ${this.sheetLabel(prevKey)}`;
    sheet.querySelector('.sheet__trail')!.textContent = this.sheetStack.length > 1 ? `${this.sheetStack.length}번째 장` : '';
    const wasHidden = sheet.hidden;
    sheet.hidden = false;
    body.scrollTop = 0;
    if (wasHidden) requestAnimationFrame(() => sheet.classList.add('is-open'));
    title.tabIndex = -1;
    title.focus({ preventScroll: true });
  }

  closeSheet() {
    const sheet = this.sheet;
    if (sheet.hidden) return;
    sheet.classList.remove('is-open');
    sheet.hidden = true;
    this.sheetStack = [];
    this.sheetOpener?.focus({ preventScroll: true });
    this.sheetOpener = null;
  }

  /* ── 통과 시험 ── */
  openTestout() {
    const ids: string[] = JSON.parse(this.dataset.testout || '[]');
    const box = this.querySelector<HTMLElement>('.testout')!;
    const items = box.querySelector('.testout__items')!;
    const result = box.querySelector('.testout__result')!;
    items.innerHTML = '';
    result.textContent = '';
    const answers = new Map<string, boolean>();
    for (const id of ids) {
      const src = this.querySelector<HTMLElement>(`.stage [data-id="${CSS.escape(id)}"]`);
      if (!src) continue;
      const clone = fresh(src);
      const wrap = el('div', 'testout__item', '');
      wrap.dataset.noRecord = '';
      wrap.append(clone);
      items.append(wrap);
    }
    const onAnswer = (e: Event) => {
      const { id, ok } = (e as CustomEvent<{ id: string; ok: boolean }>).detail;
      answers.set(id, ok);
      if (answers.size < ids.length) return;
      const all = [...answers.values()].every(Boolean);
      if (all) {
        save(setLesson(load(), this.n, 'tested-out', Date.now()));
        result.textContent = '모두 맞혔어요. 이 강은 건너뛴 것으로 표시해 둘게요.';
        const go = document.createElement('a');
        go.className = 'btn btn--primary';
        go.href = this.dataset.next || this.dataset.course!;
        go.textContent = this.dataset.next ? `${this.dataset.nextTitle} ›` : '코스로';
        result.append(' ', go);
      } else {
        result.textContent = '틀린 문제가 있어요. 해설을 읽어 보고, 이 강을 처음부터 같이 보는 걸 권해요.';
      }
      items.removeEventListener('qm:answered', onAnswer);
    };
    items.addEventListener('qm:answered', onAnswer);
    box.hidden = false;
    box.querySelector<HTMLElement>('[data-action="testout-close"]')!.focus();
  }

  closeTestout() {
    this.querySelector<HTMLElement>('.testout')!.hidden = true;
  }
}

function el(tag: string, cls: string, text: string) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/** 이미 푼 문제를 복제해도 처음 상태로 돌린다. */
function fresh(src: HTMLElement): HTMLElement {
  const c = src.cloneNode(true) as HTMLElement;
  for (const node of [c, ...c.querySelectorAll<HTMLElement>('*')]) {
    delete node.dataset.bound;
    delete node.dataset.answered;
    node.classList.remove('is-ok', 'is-no', 'is-answer');
    if (node instanceof HTMLButtonElement) node.disabled = false;
    if (node.matches('.check__why, .numeric__verdict, .numeric__solution')) node.hidden = true;
    if (node instanceof HTMLInputElement) node.value = '';
    if (node.id) node.id = `${node.id}-t`;
    if (node instanceof HTMLLabelElement && node.htmlFor) node.htmlFor = `${node.htmlFor}-t`;
  }
  return c;
}

if (!customElements.get('qm-lesson')) customElements.define('qm-lesson', QmLesson);
