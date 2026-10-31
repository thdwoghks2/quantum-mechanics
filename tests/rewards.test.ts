import { describe, expect, it } from 'vitest';
import {
  firstYearOf,
  hasBatchim,
  isLit,
  keySentences,
  partComplete,
  plainText,
  shouldTurn,
  skyLayout,
  standingYear,
  turnLines,
  yearText,
  type SkyPart,
  type Status,
  type YearEvent,
} from '../src/lib/rewards.ts';

/** 실제 커리큘럼과 같은 부별 강 수 */
const SIZES = [8, 12, 16, 10, 5, 3, 5, 4, 7, 6, 7, 12, 10, 5, 10, 10, 7];
function course(): SkyPart[] {
  let n = 1;
  return SIZES.map((size, number) => ({ number, lessons: Array.from({ length: size }, () => n++) }));
}

const EVENTS: YearEvent[] = [
  { year: 1687, title: '『프린키피아』 출간', lessons: [1, 5] },
  { year: 1801, title: '영의 간섭 실험', lessons: [14, 16] },
  { year: 1905, title: '아인슈타인의 1905년', lessons: [22, 35] },
  { year: 1916, title: '광전 효과 식의 확인', lessons: [35] },
];

describe('별 지도', () => {
  it('137강마다 별이 하나씩, 부마다 선이 하나씩 생긴다', () => {
    const sky = skyLayout(course());
    expect(sky.stars).toHaveLength(137);
    expect(new Set(sky.stars.map((s) => s.n)).size).toBe(137);
    expect(sky.links).toHaveLength(17);
    expect(sky.links.find((l) => l.part === 2)!.points).toHaveLength(16);
  });

  it('언제 그려도 같은 자리에 그린다', () => {
    expect(skyLayout(course())).toEqual(skyLayout(course()));
  });

  it('별은 자기 부의 칸 안에 있고, 같은 별자리의 별끼리 겹치지 않는다', () => {
    const cols = 3;
    const sky = skyLayout(course(), { cols, cellW: 120, cellH: 100 });
    expect(sky.width).toBe(360);
    expect(sky.height).toBe(600);
    for (const s of sky.stars) {
      expect(s.x).toBeGreaterThan(0);
      expect(s.x).toBeLessThan(sky.width);
      expect(s.y).toBeGreaterThan(0);
      expect(s.y).toBeLessThan(sky.height);
      const k = s.part;
      const row = Math.floor(k / cols);
      const col = row % 2 === 0 ? k % cols : cols - 1 - (k % cols);
      expect(s.x).toBeGreaterThanOrEqual(col * 120);
      expect(s.x).toBeLessThanOrEqual((col + 1) * 120);
      expect(s.y).toBeGreaterThanOrEqual(row * 100);
      expect(s.y).toBeLessThanOrEqual((row + 1) * 100);
    }
    for (const l of sky.links) {
      for (let i = 0; i < l.points.length; i++) {
        for (let j = i + 1; j < l.points.length; j++) {
          const [ax, ay] = l.points[i]!;
          const [bx, by] = l.points[j]!;
          expect(Math.hypot(ax - bx, ay - by)).toBeGreaterThan(4);
        }
      }
    }
  });

  it('줄마다 방향을 바꿔 이어서, 다음 부의 칸이 바로 옆에 온다', () => {
    const sky = skyLayout(course(), { cols: 3, cellW: 120, cellH: 100 });
    // 2부는 첫 줄 오른쪽 끝, 3부는 둘째 줄 오른쪽 끝
    const x2 = sky.labels.find((l) => l.part === 2)!.x;
    const x3 = sky.labels.find((l) => l.part === 3)!.x;
    expect(Math.floor(x2 / 120)).toBe(2);
    expect(Math.floor(x3 / 120)).toBe(2);
  });

  it('부의 강이 모두 끝나거나 통과해야 별자리가 이어진다', () => {
    const st: Record<number, Status> = { 1: 'done', 2: 'tested-out', 3: 'done' };
    expect(partComplete([1, 2, 3], (n) => st[n])).toBe(true);
    st[3] = 'started';
    expect(partComplete([1, 2, 3], (n) => st[n])).toBe(false);
    expect(partComplete([1, 2], () => 'skipped')).toBe(false);
    expect(partComplete([], () => 'done')).toBe(false);
    expect(isLit('done')).toBe(true);
    expect(isLit('tested-out')).toBe(true);
    expect(isLit('skipped')).toBe(false);
    expect(isLit(undefined)).toBe(false);
  });
});

describe('지금 서 있는 해', () => {
  it('끝낸 강이 없으면 없다', () => {
    expect(standingYear({}, EVENTS)).toBeNull();
    expect(standingYear({ 3: { status: 'started' }, 4: { status: 'skipped' } }, EVENTS)).toBeNull();
  });

  it('가장 뒤의 끝낸 강에 이어진 사건을 쓴다', () => {
    const s = standingYear({ 1: { status: 'done' }, 16: { status: 'done' } }, EVENTS)!;
    expect(s).toEqual({ lesson: 16, from: 16, year: 1801, title: '영의 간섭 실험' });
  });

  it('사건이 없는 강이면 그 앞의 가장 가까운 사건을 쓴다', () => {
    const s = standingYear({ 9: { status: 'done' }, 13: { status: 'tested-out' } }, EVENTS)!;
    expect(s.lesson).toBe(13);
    expect(s.from).toBe(5);
    expect(s.year).toBe(1687);
  });

  it('한 강에 사건이 여럿이면 가장 늦은 해', () => {
    expect(standingYear({ 35: { status: 'done' } }, EVENTS)!.year).toBe(1916);
  });

  it('앞 강을 다시 끝내도 뒤로 돌아가지 않는다', () => {
    const lessons = { 16: { status: 'done' as Status }, 1: { status: 'done' as Status } };
    expect(standingYear(lessons, EVENTS)!.year).toBe(1801);
  });

  it('연도 글', () => {
    expect(yearText(1801)).toBe('1801년');
    expect(yearText(-400)).toBe('기원전 400년');
  });
});

describe('장 넘김', () => {
  it('다음 부에서 강 순서로 가장 먼저 나오는 사건의 해로 간다', () => {
    // 1부(9~20강)에서 사건이 처음 이어진 강은 14강(1801년)이다. 17강의 1666년보다 앞선다.
    const events = [...EVENTS, { year: 1666, title: '뉴턴의 프리즘 실험', lessons: [17] }];
    expect(firstYearOf([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], events)).toBe(1801);
    expect(firstYearOf([2, 3, 4], events)).toBeNull();
  });

  it('두 줄로 말한다', () => {
    expect(turnLines({ part: 0, partTitle: '기초', nextPart: 1, nextTitle: '파동과 빛', nextYear: 1801 })).toEqual([
      '0부 기초를 마쳤어요.',
      '이제 1801년으로 가요.',
    ]);
    expect(turnLines({ part: 1, partTitle: '파동과 빛', nextPart: 2, nextTitle: '열과 빛', nextYear: null })).toEqual([
      '1부 파동과 빛을 마쳤어요.',
      '이제 2부 열과 빛으로 가요.',
    ]);
    expect(turnLines({ part: 9, partTitle: '원자와 주기율표', nextPart: 10, nextTitle: '상태 벡터', nextYear: null })[1]).toBe(
      '이제 10부 상태 벡터로 가요.',
    );
    expect(turnLines({ part: 16, partTitle: '응용과 마무리' })).toEqual(['16부 응용과 마무리를 마쳤어요.', '이 책의 마지막 장까지 왔어요.']);
  });

  it('부의 마지막 강을 처음 마칠 때만 한 번', () => {
    expect(shouldTurn(true, undefined)).toBe(true);
    expect(shouldTurn(true, 'started')).toBe(true);
    expect(shouldTurn(true, 'tested-out')).toBe(true);
    expect(shouldTurn(true, 'done')).toBe(false);
    expect(shouldTurn(false, 'started')).toBe(false);
  });

  it('받침', () => {
    expect(hasBatchim('초')).toBe(false);
    expect(hasBatchim('빛')).toBe(true);
    expect(hasBatchim('A')).toBe(false);
  });
});

describe('내 칠판', () => {
  it('핵심 문장을 글만 남겨 뽑는다', () => {
    const body = `
<Screen kind="define">
<Key>같은 물도 **높은 산**에서는 더 낮은 온도에서 끓어요.</Key>
</Screen>
<S n={2}>

<Key>
물리학의 법칙은 <Later n={21}>원자</Later>까지 맞아요.
</Key>

</S>`;
    expect(keySentences(body)).toEqual(['같은 물도 높은 산에서는 더 낮은 온도에서 끓어요.', '물리학의 법칙은 원자까지 맞아요.']);
    expect(keySentences('핵심 문장이 없는 강')).toEqual([]);
    expect(plainText('  $E = hf$ 에서  {/* 메모 */} *f*는 진동수  ')).toBe('E = hf 에서 f는 진동수');
  });
});

import { countable } from '../src/lib/count.ts';

describe('큰 숫자 세어 올리기', () => {
  it('숫자 하나만 있는 값을 같은 모양으로 센다', () => {
    const p = countable('약 5,000번')!;
    expect(p.target).toBe(5000);
    expect(p.render(2500)).toBe('약 2,500번');
    expect(p.render(5000)).toBe('약 5,000번');
    expect(countable('2.725 K')!.render(1.5)).toBe('1.500 K');
    expect(countable('299,792,458 m/s')!.render(299792458)).toBe('299,792,458 m/s');
  });

  it('연도, 식, 위 첨자, 숫자가 여럿인 값은 세지 않는다', () => {
    expect(countable('1687')).toBeNull();
    expect(countable('2012년 7월 4일')).toBeNull();
    expect(countable('E = mc²')).toBeNull();
    expect(countable('1.5 × 10¹¹')).toBeNull();
    expect(countable('1 / 137.036')).toBeNull();
    expect(countable('1.001 159 652 18')).toBeNull();
    expect(countable('1')).toBeNull();
    expect(countable('1.00119')).toBeNull();
  });
});
