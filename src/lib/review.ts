/**
 * 복습 간격. 맞히면 다음 칸으로(1일 → 3일 → 7일 → 21일), 틀리면 첫 칸으로 돌아간다.
 * 21일 칸을 맞히면 "익힘"으로 보고 더는 내지 않는다.
 */
export const INTERVAL_DAYS = [1, 3, 7, 21] as const;
const DAY = 24 * 60 * 60 * 1000;

export interface ReviewItem {
  id: string;
  lesson: number;
  /** 다음에 낼 칸. INTERVAL_DAYS.length이면 익힘 */
  box: number;
  due: number;
  history: { at: number; ok: boolean }[];
  /** 문제를 다시 그릴 때 쓰는 내용 (질문, 선택지, 해설) */
  payload: unknown;
}

export function firstAnswer(id: string, lesson: number, payload: unknown, ok: boolean, now: number): ReviewItem {
  // 레슨 안에서 처음 푼 문제는 맞혔든 틀렸든 하루 뒤에 처음 복습한다.
  return { id, lesson, box: ok ? 1 : 0, due: now + INTERVAL_DAYS[0] * DAY, history: [{ at: now, ok }], payload };
}

export function answerReview(item: ReviewItem, ok: boolean, now: number): ReviewItem {
  const history = [...item.history, { at: now, ok }];
  if (!ok) return { ...item, box: 0, due: now + INTERVAL_DAYS[0] * DAY, history };
  const box = item.box + 1;
  if (box >= INTERVAL_DAYS.length) return { ...item, box: INTERVAL_DAYS.length, due: Number.POSITIVE_INFINITY, history };
  return { ...item, box, due: now + INTERVAL_DAYS[box]! * DAY, history };
}

export function isLearned(item: ReviewItem): boolean {
  return item.box >= INTERVAL_DAYS.length;
}

export function dueItems(items: ReviewItem[], now: number): ReviewItem[] {
  return items.filter((i) => !isLearned(i) && i.due <= now).sort((a, b) => a.due - b.due);
}
