/**
 * 학습 기록. 브라우저 localStorage에 한 덩어리로 저장한다.
 * localStorage가 없거나 막혀 있어도 사이트는 동작해야 하므로 모든 접근을 try/catch로 감싼다.
 */
import { answerReview, firstAnswer, type ReviewItem } from './review.ts';

export const STORAGE_KEY = 'qm137:v1';

export type LessonStatus = 'started' | 'done' | 'skipped' | 'tested-out';

export interface LessonRecord {
  status: LessonStatus;
  screen?: number;
  updatedAt: number;
}

export interface Notes {
  problem?: string;
  three?: [string, string, string];
  one?: string;
  reflect?: Record<string, string>;
}

export interface State {
  version: 1;
  lessons: Record<string, LessonRecord>;
  reviews: Record<string, ReviewItem>;
  notes: Record<string, Notes>;
  placement?: { at: number; recommended: number };
}

export function emptyState(): State {
  return { version: 1, lessons: {}, reviews: {}, notes: {} };
}

function isState(x: unknown): x is State {
  return !!x && typeof x === 'object' && (x as State).version === 1 && typeof (x as State).lessons === 'object';
}

export function load(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): State {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return isState(parsed) ? { ...emptyState(), ...parsed } : emptyState();
  } catch {
    return emptyState();
  }
}

export function save(state: State, storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage): boolean {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** 완료나 통과를 "시작함"으로 되돌리지 않는다. */
const RANK: Record<LessonStatus, number> = { started: 0, skipped: 1, 'tested-out': 2, done: 3 };

export function setLesson(state: State, n: number, status: LessonStatus, now: number, screen?: number): State {
  const prev = state.lessons[n];
  const keep = prev && RANK[prev.status] > RANK[status] ? prev.status : status;
  return {
    ...state,
    lessons: { ...state.lessons, [n]: { status: keep, screen: screen ?? prev?.screen, updatedAt: now } },
  };
}

export function setScreen(state: State, n: number, screen: number, now: number): State {
  const prev = state.lessons[n];
  return {
    ...state,
    lessons: { ...state.lessons, [n]: { status: prev?.status ?? 'started', screen, updatedAt: now } },
  };
}

/** 확인 문제를 풀었을 때. 처음 푼 문제만 복습 목록에 넣고, 이미 있는 문제는 건드리지 않는다. */
export function recordCheck(state: State, id: string, lesson: number, payload: unknown, ok: boolean, now: number): State {
  if (state.reviews[id]) return state;
  return { ...state, reviews: { ...state.reviews, [id]: firstAnswer(id, lesson, payload, ok, now) } };
}

export function recordReview(state: State, id: string, ok: boolean, now: number): State {
  const item = state.reviews[id];
  if (!item) return state;
  return { ...state, reviews: { ...state.reviews, [id]: answerReview(item, ok, now) } };
}

export function setNotes(state: State, n: number, patch: Notes): State {
  return { ...state, notes: { ...state.notes, [n]: { ...state.notes[n], ...patch } } };
}

/** 진단 결과: 추천 강 앞의 강들을 "건너뜀"으로 표시한다(이미 끝낸 강은 그대로). */
export function applyPlacement(state: State, recommended: number, now: number): State {
  let s: State = { ...state, placement: { at: now, recommended } };
  for (let n = 1; n < recommended; n++) {
    if (!s.lessons[n]) s = setLesson(s, n, 'skipped', now);
  }
  return s;
}

/** 다음에 볼 강: 끝내지도 건너뛰지도 않은 가장 앞 강. */
export function nextLesson(state: State, published: number[]): number | undefined {
  const sorted = [...published].sort((a, b) => a - b);
  return sorted.find((n) => {
    const st = state.lessons[n]?.status;
    return st !== 'done' && st !== 'skipped' && st !== 'tested-out';
  });
}

/** 다른 기기로 옮길 때 쓰는 텍스트. */
export function exportText(state: State): string {
  const json = JSON.stringify(state);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return 'qm137:' + btoa(bin);
}

export function importText(text: string): State | null {
  try {
    const body = text.trim().replace(/^qm137:/, '');
    const bin = atob(body);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!isState(parsed)) return null;
    // 복습 목록의 Infinity는 JSON에서 null이 되므로 되살린다.
    for (const r of Object.values(parsed.reviews ?? {})) {
      if ((r as ReviewItem).due === null) (r as ReviewItem).due = Number.POSITIVE_INFINITY;
    }
    return { ...emptyState(), ...parsed };
  } catch {
    return null;
  }
}
