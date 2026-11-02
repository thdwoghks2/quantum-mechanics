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

/* ── 다른 기기로 옮기는 글 ─────────────────────
 * 2판(qm137:2:): 기록을 짧은 JSON으로 줄인 뒤 deflate로 압축하고 base64url로 적는다.
 * - 강 상태는 구간으로: "1-43d,44s12,50k" (d 끝냄, k 건너뜀, t 통과, s 보는 중 + 보던 화면)
 * - 복습은 문제 ID, 칸, 다음 복습일(기준일부터 센 날 수)만. 문제 내용(payload)과 풀이 기록은 넣지 않는다.
 *   불러온 기기에서 복습할 때 그 강 페이지에서 문제를 다시 읽어 온다.
 * 1판(qm137: + base64 JSON 전체)도 그대로 불러온다. */

const DAY = 86_400_000;
/** 복습일을 날 수로 적을 때의 기준일 (2026-01-01 UTC) */
const DAY0 = Date.UTC(2026, 0, 1);
const CODE: Record<LessonStatus, string> = { done: 'd', skipped: 'k', 'tested-out': 't', started: 's' };
const UNCODE: Record<string, LessonStatus> = { d: 'done', k: 'skipped', t: 'tested-out', s: 'started' };

interface Packed {
  v: 2;
  /** 강 상태 구간 */
  l: string;
  /** 복습: "44-4to2:1:300,44-absorb:2:302" (q 접두사는 뺀다, 익힌 문제는 날 수 대신 x) */
  r: string;
  n?: Record<string, Notes>;
  /** 진단: [추천 강, 진단한 날] */
  p?: [number, number];
}

/** 기록을 짧은 JSON 문자열로 줄인다(압축 전). */
export function packState(state: State): string {
  const nums = Object.keys(state.lessons).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  const runs: string[] = [];
  let i = 0;
  while (i < nums.length) {
    const n = nums[i]!;
    const rec = state.lessons[n]!;
    const code = CODE[rec.status] ?? 's';
    if (rec.status === 'started') {
      runs.push(`${n}s${rec.screen ?? ''}`);
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j]! + 1 && state.lessons[nums[j + 1]!]!.status === rec.status) j++;
    runs.push(j > i ? `${n}-${nums[j]}${code}` : `${n}${code}`);
    i = j + 1;
  }
  const r = Object.values(state.reviews)
    .map((it) => {
      const id = it.id.startsWith('q') ? it.id.slice(1) : `~${it.id}`;
      const due = Number.isFinite(it.due) ? Math.round((it.due - DAY0) / DAY) : 'x';
      return `${id}:${it.box}:${due}`;
    })
    .join(',');
  const notes: Record<string, Notes> = {};
  for (const [k, v] of Object.entries(state.notes)) {
    const clean = clip(v);
    if (clean) notes[k] = clean;
  }
  const out: Packed = { v: 2, l: runs.join(','), r };
  if (Object.keys(notes).length) out.n = notes;
  if (state.placement) out.p = [state.placement.recommended, Math.round((state.placement.at - DAY0) / DAY)];
  return JSON.stringify(out);
}

/** 빈 메모 칸은 빼서 글을 줄인다. 남는 게 없으면 undefined. */
function clip(n: Notes): Notes | undefined {
  const out: Notes = {};
  if (n.problem?.trim()) out.problem = n.problem;
  if (n.one?.trim()) out.one = n.one;
  if (n.three?.some((t) => t.trim())) out.three = n.three;
  if (n.reflect) {
    const r = Object.fromEntries(Object.entries(n.reflect).filter(([, v]) => v.trim()));
    if (Object.keys(r).length) out.reflect = r;
  }
  return Object.keys(out).length ? out : undefined;
}

export function unpackState(json: string, now = Date.now()): State | null {
  const p = JSON.parse(json) as Packed;
  if (!p || p.v !== 2 || typeof p.l !== 'string') return null;
  const s = emptyState();
  for (const run of p.l.split(',').filter(Boolean)) {
    const m = run.match(/^(\d+)(?:-(\d+))?([dkts])(\d*)$/);
    if (!m) return null;
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    const status = UNCODE[m[3]!]!;
    for (let n = a; n <= b; n++) {
      s.lessons[n] = { status, updatedAt: now, ...(m[4] ? { screen: Number(m[4]) } : {}) };
    }
  }
  for (const item of (p.r ?? '').split(',').filter(Boolean)) {
    const m = item.match(/^(.+):(\d+):(x|-?\d+)$/);
    if (!m) return null;
    const id = m[1]!.startsWith('~') ? m[1]!.slice(1) : `q${m[1]}`;
    const lesson = Number(m[1]!.match(/^(\d+)/)?.[1] ?? 0);
    const due = m[3] === 'x' ? Number.POSITIVE_INFINITY : DAY0 + Number(m[3]) * DAY;
    s.reviews[id] = { id, lesson, box: Number(m[2]), due, history: [], payload: null };
  }
  if (p.n) s.notes = p.n;
  if (p.p) s.placement = { recommended: p.p[0], at: DAY0 + p.p[1] * DAY };
  return s;
}

function toB64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

const canZip = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

/** 다른 기기로 옮길 때 쓰는 글. 압축을 못 하는 브라우저에서는 qm137:2u:(압축 없음)로 적는다. */
export async function exportText(state: State): Promise<string> {
  const bytes = new TextEncoder().encode(packState(state));
  if (canZip()) return 'qm137:2:' + toB64url(await pipe(bytes, new CompressionStream('deflate-raw')));
  return 'qm137:2u:' + toB64url(bytes);
}

export async function importText(text: string): Promise<State | null> {
  try {
    const t = text.trim().replace(/\s+/g, '');
    if (t.startsWith('qm137:2:')) {
      if (!canZip()) return null;
      const bytes = await pipe(fromB64url(t.slice(8)), new DecompressionStream('deflate-raw'));
      return unpackState(new TextDecoder().decode(bytes));
    }
    if (t.startsWith('qm137:2u:')) return unpackState(new TextDecoder().decode(fromB64url(t.slice(9))));
    return importV1(t);
  } catch {
    return null;
  }
}

/** 1판: 'qm137:' + base64(JSON 전체) */
function importV1(text: string): State | null {
  try {
    const body = text.replace(/^qm137:/, '');
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
