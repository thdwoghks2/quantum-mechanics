import { describe, expect, it } from 'vitest';
import { balancedAnswerSlots, placeAnswer, shuffled } from '../src/lib/shuffle.ts';
import { answerReview, dueItems, firstAnswer, INTERVAL_DAYS, isLearned } from '../src/lib/review.ts';
import {
  applyPlacement,
  emptyState,
  exportText,
  importText,
  load,
  nextLesson,
  recordCheck,
  recordReview,
  save,
  setLesson,
} from '../src/lib/progress.ts';
import { QUESTIONS, recommend, shouldStop } from '../src/lib/placement.ts';
import { buildMatchers, contractViolations, findTerms } from '../src/lib/terms.ts';

const DAY = 86_400_000;

describe('review intervals', () => {
  it('맞히면 1 → 3 → 7 → 21일, 그다음 익힘', () => {
    let item = firstAnswer('q', 1, {}, true, 0);
    expect(item.due).toBe(1 * DAY);
    item = answerReview(item, true, item.due);
    expect(item.due - 1 * DAY).toBe(INTERVAL_DAYS[2] * DAY);
    item = answerReview(item, true, item.due);
    expect(item.box).toBe(3);
    item = answerReview(item, true, item.due);
    expect(isLearned(item)).toBe(true);
    expect(dueItems([item], Number.MAX_SAFE_INTEGER)).toHaveLength(0);
  });

  it('틀리면 첫 간격으로 돌아간다', () => {
    let item = firstAnswer('q', 1, {}, true, 0);
    item = answerReview(item, true, DAY);
    item = answerReview(item, false, 5 * DAY);
    expect(item.box).toBe(0);
    expect(item.due).toBe(6 * DAY);
  });

  it('기한이 지난 것만 기한 순서로 낸다', () => {
    const a = { ...firstAnswer('a', 1, {}, true, 0), due: 5 };
    const b = { ...firstAnswer('b', 1, {}, true, 0), due: 2 };
    const c = { ...firstAnswer('c', 1, {}, true, 0), due: 50 };
    expect(dueItems([a, b, c], 10).map((i) => i.id)).toEqual(['b', 'a']);
  });
});

describe('progress', () => {
  it('완료한 강을 시작함으로 되돌리지 않는다', () => {
    let s = setLesson(emptyState(), 3, 'done', 1);
    s = setLesson(s, 3, 'started', 2);
    expect(s.lessons[3]!.status).toBe('done');
  });

  it('같은 문제는 처음 푼 결과만 복습 목록에 넣는다', () => {
    let s = recordCheck(emptyState(), 'q1', 1, { q: 'x' }, false, 0);
    s = recordCheck(s, 'q1', 1, { q: 'x' }, true, 10);
    expect(s.reviews.q1!.history).toHaveLength(1);
    s = recordReview(s, 'q1', true, DAY);
    expect(s.reviews.q1!.box).toBe(1);
  });

  it('진단 결과는 추천 강 앞을 건너뜀으로 표시하고, 끝낸 강은 그대로 둔다', () => {
    let s = setLesson(emptyState(), 2, 'done', 0);
    s = applyPlacement(s, 5, 1);
    expect(s.lessons[1]!.status).toBe('skipped');
    expect(s.lessons[2]!.status).toBe('done');
    expect(s.lessons[5]).toBeUndefined();
    expect(nextLesson(s, [1, 2, 3, 4, 5, 6])).toBe(5);
  });

  it('내보내기와 불러오기는 한글 메모와 익힘 상태를 보존한다', () => {
    let s = setLesson(emptyState(), 1, 'done', 0);
    s = { ...s, notes: { 1: { three: ['관찰', '규칙', '예측'] } } };
    s = recordCheck(s, 'q', 1, {}, true, 0);
    s.reviews.q!.box = INTERVAL_DAYS.length;
    s.reviews.q!.due = Number.POSITIVE_INFINITY;
    const back = importText(exportText(s))!;
    expect(back.notes[1]!.three).toEqual(['관찰', '규칙', '예측']);
    expect(back.reviews.q!.due).toBe(Number.POSITIVE_INFINITY);
    expect(importText('엉뚱한 글')).toBeNull();
  });

  it('저장소가 막혀 있어도 멈추지 않는다', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(load(broken)).toEqual(emptyState());
    expect(save(emptyState(), broken)).toBe(false);
  });
});

describe('placement', () => {
  it('연달아 두 번 틀리면 멈춘다', () => {
    expect(shouldStop([{ id: 'p2a', ok: true }, { id: 'p2b', ok: false }])).toBe(false);
    expect(shouldStop([{ id: 'p2a', ok: true }, { id: 'p2b', ok: false }, { id: 'p3', ok: false }])).toBe(true);
  });

  it('처음 틀린 문제의 강을 추천한다', () => {
    const answers = [
      { id: 'p2a', ok: true },
      { id: 'p2b', ok: true },
      { id: 'p3', ok: true },
      { id: 'p4', ok: false },
      { id: 'p5a', ok: false },
    ];
    expect(recommend(answers)).toBe(4);
  });

  it('첫 문제부터 틀리면 1강, 다 맞히면 마지막 문제 다음 강', () => {
    expect(recommend([{ id: 'p2a', ok: false }])).toBe(1);
    const all = QUESTIONS.map((q) => ({ id: q.id, ok: true }));
    expect(recommend(all)).toBe(QUESTIONS.at(-1)!.lesson + 1);
  });

  it('문제는 강 순서대로 놓여 있다', () => {
    const lessons = QUESTIONS.map((q) => q.lesson);
    expect([...lessons].sort((a, b) => a - b)).toEqual(lessons);
  });
});

describe('term contract', () => {
  const entries = [
    { id: 'vibration', term: '진동', taughtIn: 9 },
    { id: 'frequency', term: '진동수', taughtIn: 9 },
    { id: 'mode', term: '진동 모드', taughtIn: 20 },
    { id: 'momentum', term: '운동량', taughtIn: 7 },
    { id: 'force', term: '힘', pattern: '힘(?![들쓸겹])', taughtIn: 5 },
    { id: 'charge', term: '전하', pattern: '전하(?![다고며면여해했지게기자는])', taughtIn: 18 },
  ];

  it('긴 표현을 먼저 잡는다', () => {
    const hits = findTerms('진동 모드마다 진동수가 다르다', buildMatchers(entries));
    expect(hits.map((h) => h.id)).toEqual(['mode', 'frequency']);
  });

  it('한글 낱말 중간에서는 잡지 않는다', () => {
    expect(findTerms('각운동량', buildMatchers(entries))).toHaveLength(0);
  });

  it('정식 도입 전에 쓴 용어를 찾는다', () => {
    const v = contractViolations('줄의 진동 모드를 센다', 11, entries);
    expect(v).toEqual([{ id: 'mode', surface: '진동 모드', taughtIn: 20, index: 3 }]);
  });

  it('비슷한 일상어는 잡지 않는다', () => {
    expect(contractViolations('흔들림이 전해진다. 소식을 전하다. 힘들다', 3, entries)).toHaveLength(0);
    expect(contractViolations('힘이 세다', 3, entries)).toHaveLength(1);
  });
});

import { isCorrect, parseNumber } from '../src/lib/numbers.ts';

describe('numeric answers', () => {
  it('여러 표기를 읽는다', () => {
    expect(parseNumber('3e5')).toBe(300000);
    expect(parseNumber('3 × 10⁵')).toBe(300000);
    expect(parseNumber('3x10^-2')).toBeCloseTo(0.03);
    expect(parseNumber('300,000')).toBe(300000);
    expect(parseNumber('10^9')).toBe(1e9);
    expect(parseNumber('')).toBeNaN();
  });

  it('값 문제는 오차 비율, 어림 문제는 3배 안', () => {
    expect(isCorrect(10.4, 10.44, 'value', 0.02)).toBe(true);
    expect(isCorrect(12, 10.44, 'value', 0.02)).toBe(false);
    expect(isCorrect(2e14, 6e14, 'order')).toBe(true);
    expect(isCorrect(1e14, 6e14, 'order')).toBe(false);
  });
});

describe('선택지 섞기', () => {
  it('같은 ID면 같은 순서, 원소는 그대로', () => {
    const a = shuffled(['A', 'B', 'C', 'D'], 'q1-a');
    expect(shuffled(['A', 'B', 'C', 'D'], 'q1-a')).toEqual(a);
    expect([...a].sort()).toEqual(['A', 'B', 'C', 'D']);
  });
  it('첫 번째에 둔 정답이 네 자리에 고르게 퍼진다', () => {
    const count = [0, 0, 0, 0];
    for (let i = 0; i < 400; i++) count[shuffled(['정답', 'b', 'c', 'd'], `q${i}-x`).indexOf('정답')]!++;
    for (const c of count) expect(c).toBeGreaterThan(60);
  });
});

describe('진단 문제 정답 자리', () => {
  it('문제 수가 적어도 네 자리에 고르게 나뉜다', () => {
    const slots = balancedAnswerSlots(16, 4, 'placement');
    expect([0, 1, 2, 3].map((k) => slots.filter((x) => x === k).length)).toEqual([4, 4, 4, 4]);
  });
  it('정답을 정한 자리에 둔다', () => {
    const opts = [{ t: 'a', ok: true }, { t: 'b' }, { t: 'c' }, { t: 'd' }];
    for (const slot of [0, 1, 2, 3]) expect(placeAnswer(opts, slot, 'k').findIndex((o) => o.ok)).toBe(slot);
  });
});
