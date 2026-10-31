# 강 추가하기

강 하나는 MDX 파일 하나다. 코드를 건드리지 않고 파일을 더하면 사이트에 나타난다.
쓰기 전에 [STYLE.md](STYLE.md)를 먼저 읽는다. 특히 3장 용어 계약과 5장 AI 말투 진단표.

## 1. 순서

1. `src/content/curriculum.yaml`에서 강 번호와 제목을 확인한다.
2. 이 강에서 새로 배우는 용어를 `src/content/glossary.yaml`에 넣는다. `taughtIn`은 이 강 번호다. 일상 예시는 2개 이상.
3. `src/content/lessons/NN-part/NNN-slug.mdx`를 만든다. 아래 틀을 복사한다.
4. `mechanism`(이 강이 설명할 원리 한 문장)부터 쓰고, 화면을 쓴다.
5. 검사한다.
   ```sh
   npm run validate     # 용어 계약, frontmatter, 문제 ID
   npm run lint:style   # 금지 표현, 명사형 종결, 화면당 글자 수, 그래프 없는 방향어
   npm test
   npm run dev          # http://localhost:4321/lessons/번호/
   ```
6. `npm run docs:curriculum`으로 `docs/CURRICULUM.md`를 갱신한다.

## 2. 틀

```mdx
---
number: 9
title: 진동
short: 진동
question: 그네가 한 번 오가는 데 걸리는 시간은 무엇으로 정해지는가
mechanism: (이 강이 단계별로 설명할 원리 한 문장)
part: 1
minutes: 20
assumes: [acceleration, force]        # 앞 강에서 정식으로 배운 용어만
introduces: [vibration, period]       # 이 강에서 정의 카드로 가르치는 용어
sources:
  - "출처"
testout: [q9-a, q9-b, q9-c]           # 통과 시험에 쓸 확인 문제 ID 3개
status: draft                         # 다 쓰면 published
---

<Screen kind="scene">
  <Fragment slot="visual">
    <Panels panels={[{ icon: 'swing', title: '그네', caption: '같은 자리를 오간다' }]} />
  </Fragment>

독자가 겪어 본 장면. 2~4문장.

</Screen>

<Screen kind="define">
  <Fragment slot="visual">
    <Define term="period" />
  </Fragment>

왜 이 이름이 필요한지. 카드의 정의를 그대로 되풀이하지 않는다.

</Screen>

<Screen kind="check">

<Check id="q9-a" options={[
  { t: '선택지', ok: true, why: '왜 맞는지' },
  { t: '흔한 오해', why: '왜 틀렸는지' },
]}>

질문

</Check>

</Screen>

<Screen kind="problem">

<DailyProblem id="p9">

문제

<Fragment slot="hint1">힌트 1</Fragment>
<Fragment slot="hint2">힌트 2</Fragment>
<Fragment slot="hint3">힌트 3</Fragment>
<Fragment slot="solution">풀이</Fragment>
</DailyProblem>

</Screen>

<Screen kind="three">

<ThreeLines>

1. …
2. …
3. …

</ThreeLines>

</Screen>

<Screen kind="next">

오늘 배운 것으로 설명되지 않는 사실 하나와, 다음 강에서 할 일.

</Screen>
```

## 3. 쓸 수 있는 컴포넌트

| 컴포넌트 | 쓰임 |
|---|---|
| `Screen kind from label` | 화면 한 장. `slot="visual"`에 시각 자료 하나 |
| `S n` | 화면 안에서 "계속"을 누를 때마다 나타나는 단계 |
| `Later n` | 아직 배우지 않은 용어를 일부러 미리 언급할 때. 용어 계약 검사에서 빠진다 |
| `Define term` | 정의 카드 (용어집에서 읽는다) |
| `Check id options` | 객관식. 선택지마다 `why` |
| `Numeric id answer tol unit mode` | 숫자 답. `mode="order"`는 자릿수 어림 |
| `DailyProblem id` | 오늘의 문제. `hint1~3`, `solution` 슬롯 |
| `ThreeLines` | 자기 말로 세 줄. 본문에 필자의 세 줄 |
| `Reflect id` | 채점 없는 사고 실험. `question` 슬롯, 본문에 여러 입장 |
| `Analogy rows fits breaks` | 비유 대응표와 그 한계 |
| `Plot` | 그래프. `axisSteps`, 요소마다 `step`으로 그래프 읽기 화면을 만든다 |
| `Panels`, `Icon`, `BigNumber`, `DataTable`, `Flow` | 장면, 비교, 큰 숫자, 표, 흐름도 |
| `Sim…` | 시뮬레이션 (`src/components/sims/`) |

## 4. 새 시뮬레이션

`src/components/sims/SimXxx.astro`를 만들고 `src/lib/client/sim.ts`의 `Sim`을 상속한다.
슬라이더는 `input[data-param]`, 버튼은 `button[data-set="이름=값"]`으로 매개변수에 묶인다.
`draw()`만 채우면 화면이 보일 때만 움직이고, 움직임을 줄이는 설정이면 자동 재생하지 않는다.
다 만들면 `src/components/sims/index.ts`에 등록한다. 입력칸 id에는 `uid`를 붙여 한 화면에 두 번 써도 겹치지 않게 한다.
