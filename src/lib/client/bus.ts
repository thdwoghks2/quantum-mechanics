/** 브라우저 쪽 공용 함수: 학습 기록을 읽고 쓴다. */
import { load, recordCheck, save, setNotes, type Notes, type State } from '../progress.ts';

export function getLessonNumber(el: Element): number {
  const host = el.closest<HTMLElement>('[data-lesson]');
  return host ? Number(host.dataset.lesson) : 0;
}

export function update(fn: (s: State) => State): State {
  const next = fn(load());
  save(next);
  return next;
}

export function onCheckAnswered(id: string, lesson: number, payload: unknown, ok: boolean) {
  update((s) => recordCheck(s, id, lesson, payload, ok, Date.now()));
}

export function readNotes(lesson: number): Notes {
  return load().notes[lesson] ?? {};
}

export function writeNotes(lesson: number, patch: Notes) {
  update((s) => setNotes(s, lesson, patch));
}

export function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function cssVar(name: string, el: Element = document.documentElement): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}
