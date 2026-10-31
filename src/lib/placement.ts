/**
 * 진단. 강 순서대로 문제를 내고, 연달아 두 번 틀리면 멈춘다.
 * 추천 시작 강은 처음 틀린 문제를 가르치는 강이다. 다 맞히면 마지막 문제 다음 강.
 */
export interface PlacementQuestion {
  id: string;
  /** 이 문제의 내용을 가르치는 강 */
  lesson: number;
  q: string;
  options: { t: string; ok?: boolean }[];
  why: string;
}

export interface PlacementAnswer {
  id: string;
  ok: boolean;
}

export const QUESTIONS: PlacementQuestion[] = [
  {
    id: 'p2a', lesson: 2,
    q: '(3 × 10⁴) × (2 × 10³)은 얼마인가?',
    options: [{ t: '6 × 10⁷', ok: true }, { t: '6 × 10¹²' }, { t: '5 × 10⁷' }, { t: '6 × 10¹' }],
    why: '앞의 수끼리 곱하고(3 × 2 = 6), 10의 지수끼리 더한다(4 + 3 = 7).',
  },
  {
    id: 'p2b', lesson: 2,
    q: '0.00052를 a × 10ⁿ 꼴로 쓰면?',
    options: [{ t: '5.2 × 10⁻⁴', ok: true }, { t: '5.2 × 10⁴' }, { t: '52 × 10⁻³' }, { t: '5.2 × 10⁻³' }],
    why: '소수점을 오른쪽으로 네 칸 옮겨야 5.2가 되므로 10⁻⁴를 곱한 꼴이다.',
  },
  {
    id: 'p3', lesson: 3,
    q: '1시간에 72 km를 가는 빠르기는 1초에 몇 m를 가는 빠르기인가?',
    options: [{ t: '20 m', ok: true }, { t: '72 m' }, { t: '7.2 m' }, { t: '1.2 m' }],
    why: '72 km = 72,000 m, 1시간 = 3,600초. 72,000 ÷ 3,600 = 20.',
  },
  {
    id: 'p4', lesson: 4,
    q: '멈춰 있던 자동차가 4초 만에 1초에 20 m를 가는 빠르기가 됐다. 이 동안의 평균 가속도는?',
    options: [{ t: '5 m/s²', ok: true }, { t: '80 m/s²' }, { t: '20 m/s²' }, { t: '0.2 m/s²' }],
    why: '가속도는 1초 동안 속도가 바뀐 양이다. 4초 동안 20 m/s가 바뀌었으니 1초에 5 m/s씩.',
  },
  {
    id: 'p5a', lesson: 5,
    q: '질량 2 kg인 물체에 6 N의 힘을 주면 가속도는?',
    options: [{ t: '3 m/s²', ok: true }, { t: '12 m/s²' }, { t: '8 m/s²' }, { t: '0.33 m/s²' }],
    why: 'F = ma에서 a = F ÷ m = 6 ÷ 2 = 3.',
  },
  {
    id: 'p5b', lesson: 5,
    q: '우주 정거장 밖, 공기도 중력도 거의 없는 곳에서 공을 던졌다. 손을 떠난 공은?',
    options: [{ t: '같은 빠르기로 같은 방향으로 계속 간다', ok: true }, { t: '점점 느려지다 멈춘다' }, { t: '던진 사람에게 돌아온다' }, { t: '점점 빨라진다' }],
    why: '속도를 바꾸는 힘이 없으면 속도는 그대로다(관성).',
  },
  {
    id: 'p6', lesson: 6,
    q: '마찰이 없는 높이 5 m 미끄럼틀 꼭대기에서 출발했다. 바닥에서의 빠르기는? (중력 가속도는 10 m/s²로 계산)',
    options: [{ t: '10 m/s', ok: true }, { t: '50 m/s' }, { t: '5 m/s' }, { t: '100 m/s' }],
    why: '위치 에너지 mgh가 운동 에너지 ½mv²로 바뀐다. v² = 2gh = 100, v = 10.',
  },
  {
    id: 'p7', lesson: 7,
    q: '날아오는 공을 받을 때 손을 뒤로 당기면 손이 덜 아프다. 가장 정확한 이유는?',
    options: [{ t: '공의 운동량이 바뀌는 데 걸리는 시간이 길어져서', ok: true }, { t: '공의 운동량이 줄어들어서' }, { t: '공의 질량이 줄어들어서' }, { t: '손이 공보다 빨라져서' }],
    why: '공을 멈추려면 같은 양의 운동량을 없애야 한다. 그 시간을 길게 늘이면 필요한 힘이 작아진다.',
  },
  {
    id: 'p9', lesson: 9,
    q: '1분에 120번 왕복하는 진동이 있다. 진동수와 주기는?',
    options: [{ t: '2 Hz, 0.5초', ok: true }, { t: '120 Hz, 1분' }, { t: '0.5 Hz, 2초' }, { t: '2 Hz, 2초' }],
    why: '1초에 2번이므로 진동수는 2 Hz. 한 번에 0.5초 걸린다.',
  },
  {
    id: 'p11', lesson: 11,
    q: '1초에 170번 진동하는 소리가 1초에 340 m를 간다. 이 소리의 파장은?',
    options: [{ t: '2 m', ok: true }, { t: '0.5 m' }, { t: '57,800 m' }, { t: '170 m' }],
    why: '속력 = 진동수 × 파장이므로 파장 = 340 ÷ 170 = 2 m.',
  },
  {
    id: 'p12', lesson: 12,
    q: 'sin 30°의 값은?',
    options: [{ t: '0.5', ok: true }, { t: '1' }, { t: '0' }, { t: '0.87' }],
    why: '반지름 1인 원 위에서 30°만큼 돈 점의 높이는 0.5다.',
  },
  {
    id: 'p14', lesson: 14,
    q: '두 스피커가 같은 소리를 같은 박자로 낸다. 두 스피커까지 거리의 차이가 소리 파장의 절반인 곳에서는?',
    options: [{ t: '소리가 작아진다', ok: true }, { t: '소리가 두 배로 커진다' }, { t: '소리의 높낮이가 바뀐다' }, { t: '아무 변화도 없다' }],
    why: '반 파장 차이가 나면 한쪽이 올라갈 때 다른 쪽이 내려가서 서로 지운다(상쇄 간섭).',
  },
  {
    id: 'p16', lesson: 16,
    q: '이중 슬릿 실험에서 두 슬릿 사이 간격을 좁히면 화면의 무늬 간격은?',
    options: [{ t: '넓어진다', ok: true }, { t: '좁아진다' }, { t: '그대로다' }, { t: '무늬가 사라진다' }],
    why: '무늬 간격은 파장 × 화면까지 거리 ÷ 슬릿 간격이다. 슬릿 간격이 작아지면 무늬 간격이 커진다.',
  },
  {
    id: 'p17', lesson: 17,
    q: '빛이 공기에서 물로 들어갈 때 바뀌지 않는 것은?',
    options: [{ t: '진동수', ok: true }, { t: '속력' }, { t: '파장' }, { t: '셋 다 바뀐다' }],
    why: '물속에서 빛은 느려지고 파장도 짧아지지만, 1초에 진동하는 횟수는 그대로다. 그래서 색도 그대로다.',
  },
  {
    id: 'p18', lesson: 18,
    q: '두 전하 사이의 거리를 3배로 늘리면 둘 사이의 전기력은?',
    options: [{ t: '9분의 1', ok: true }, { t: '3분의 1' }, { t: '3배' }, { t: '그대로' }],
    why: '전기력은 거리의 제곱에 반비례한다. 3² = 9.',
  },
  {
    id: 'p20', lesson: 20,
    q: '기타 줄의 떨리는 부분 길이를 절반으로 줄이면 기본 진동수는?',
    options: [{ t: '2배가 된다', ok: true }, { t: '절반이 된다' }, { t: '4배가 된다' }, { t: '그대로다' }],
    why: '기본 진동의 파장은 줄 길이의 2배다. 길이가 절반이면 파장도 절반, 같은 줄에서 파동의 속력은 그대로이므로 진동수는 2배.',
  },
];

/** 연달아 두 번 틀렸거나 문제가 끝났으면 멈춘다. */
export function shouldStop(answers: PlacementAnswer[], total = QUESTIONS.length): boolean {
  if (answers.length >= total) return true;
  const n = answers.length;
  return n >= 2 && !answers[n - 1]!.ok && !answers[n - 2]!.ok;
}

/**
 * 추천 시작 강. 처음 틀린 문제를 가르치는 강.
 * 다 맞혔으면 마지막으로 푼 문제의 강 다음 강.
 */
export function recommend(answers: PlacementAnswer[], questions: PlacementQuestion[] = QUESTIONS): number {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const firstWrong = answers.find((a) => !a.ok);
  // 첫 문제부터 틀렸으면 1강부터 시작한다.
  if (firstWrong === answers[0] && firstWrong) return 1;
  if (firstWrong) return byId.get(firstWrong.id)!.lesson;
  const last = answers.at(-1);
  if (!last) return 1;
  return byId.get(last.id)!.lesson + 1;
}
