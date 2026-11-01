# 강 추가하기

강 하나는 MDX 파일 하나다. 코드를 건드리지 않고 파일을 더하면 사이트에 나타난다.
쓰기 전에 [STYLE.md](STYLE.md)를 먼저 읽는다. 특히 2장 목소리, 4장 용어 계약, 6장 AI 말투 진단표.

## 1. 순서

1. `src/content/curriculum.yaml`에서 강 번호와 제목을 확인한다.
2. 이 강에서 새로 배우는 용어를 `src/content/glossary.yaml`에 넣는다. 21~137강 용어는 이미 이름과 강 번호가 정해져 있다(`planned: true`). 그 항목을 채우고 `planned` 줄을 지운다. `taughtIn`은 이 강 번호다. 일상 예시는 2개 이상. 앞 강들이 이 말을 이미 일상어로 쓰고 있으면 `previewIn: [강 번호들]`을 적는다(`npm run validate`가 어느 강인지 알려 준다).
3. `src/content/lessons/NN-part/NNN-slug.mdx`를 만든다. 아래 틀을 복사한다.
4. `mechanism`(이 강이 설명할 원리 한 문장)부터 쓰고, 화면을 쓴다.
5. 검사한다.
   ```sh
   npm run validate     # 용어 계약, frontmatter, 문제 ID
   npm run lint:style   # 금지 표현, 명사형 종결, 화면당 글자 수, 그래프 없는 방향어
   npm test
   npm run dev          # http://localhost:4321/lessons/번호/
   npm run check:screens -- 번호   # 휴대폰 화면에서 넘치는지 (build, preview 뒤)
   ```
6. `npm run docs:curriculum`으로 `docs/CURRICULUM.md`를 갱신한다.

## 2. 틀

```mdx
---
number: 9
title: 진동
short: 진동
question: 그네가 한 번 오가는 데 걸리는 시간은 무엇으로 정해질까요
mechanism: (이 강이 단계별로 설명할 원리. 해요체 한두 문장)
part: 1
minutes: 20
assumes: [acceleration, force]        # 앞 강에서 정식으로 배운 용어만
introduces: [vibration, period]       # 이 강에서 정의 카드로 가르치는 용어
sources:
  - "출처"
testout: [q9-a, q9-b, q9-c]           # 통과 시험에 쓸 확인 문제 ID 3개
status: draft                         # 다 쓰면 published
---

<Screen kind="scene" title="그네">
  <Fragment slot="visual">
    <Panels panels={[{ icon: 'swing', title: '그네', caption: '같은 자리를 오가요' }]} />
  </Fragment>

독자가 겪어 본 장면. 2~4문장, 해요체.

</Screen>

<Screen kind="define" title="주기라는 이름">
  <Fragment slot="visual">
    <Define term="period" />
  </Fragment>

왜 이 이름이 필요한지. 카드의 정의를 그대로 되풀이하지 않는다.

<Key>그 화면에서 꼭 가져갈 핵심 문장 하나. 조건과 이유를 다 담아 천천히.</Key>

</Screen>

<Screen kind="check">

<Check id="q9-a" options={[
  { t: '선택지', ok: true, why: '왜 맞는지' },
  { t: '흔한 오해', why: '왜 틀렸는지' },
]}>

질문

</Check>

</Screen>

<Screen kind="recap">

여기까지 온 길을 한 번에 모아 볼게요.

<Recap terms={['vibration', 'period']}>

1. 앞 단계가
2. 뒤 단계의 이유가 되게
3. 3~5단계로

</Recap>

</Screen>

<Screen kind="problem">

<DailyProblem id="p9">

짧은 문제 하나. 계산보다 오늘의 원리로 생각해야 풀리는 것.

<Fragment slot="hint1">힌트 (1~2개)</Fragment>
<Fragment slot="solution">풀이</Fragment>
</DailyProblem>

</Screen>

<Screen kind="one">

오늘 배운 걸 한 문장으로 적어 보세요. 다 쓰면 제 문장과 비교해 볼 수 있어요.

<OneLine>

제 한 문장.

</OneLine>

</Screen>

<Screen kind="next">

오늘 배운 것으로 설명되지 않는 사실 하나와, 다음 강에서 할 일.

</Screen>
```

## 3. 쓸 수 있는 컴포넌트

| 컴포넌트 | 쓰임 |
|---|---|
| `Screen kind from label title` | 화면 한 장. `slot="visual"`에 시각 자료 하나. `title`은 목차에 보일 이름 |
| `S n` | 화면 안에서 "계속"을 누를 때마다 나타나는 단계 |
| `Later n` | 아직 배우지 않은 용어를 일부러 미리 언급할 때. 용어 계약 검사에서 빠진다 |
| `Define term` | 정의 카드 (용어집에서 읽는다) |
| `Check id options` | 객관식. 선택지마다 `why` |
| `Numeric id answer tol unit mode` | 숫자 답. `mode="order"`는 자릿수 어림 |
| `Key` | 핵심 문장 하나 |
| `Note label` | 글쓴이가 잠깐 멈춰 다시 짚는 말. 이름표 기본값은 "잠깐" |
| `Recap terms` | 되짚기. 오늘 나온 말(자동)과 본문의 번호 목록(오늘 온 길) |
| `DailyProblem id` | 마지막 점검. `hint1~3` 가운데 쓴 것만, `solution` 슬롯 |
| `OneLine` | 한 문장으로. 본문에 제 한 문장 |
| `ThreeLines` | (예전 방식) 자기 말로 세 줄 |
| `Reflect id` | 채점 없는 사고 실험. `question` 슬롯, 본문에 여러 입장 |
| `Analogy rows fits breaks` | 비유 대응표와 그 한계 |
| `Plot` | 그래프. `axisSteps`, 요소마다 `step`으로 그래프 읽기 화면을 만든다 |
| `Quote by source` | 화면 하나를 통째로 쓰는 인용. `slot="visual"`에 두고 본문은 짧게. 출처가 확인된 말만 |
| `Panels`, `Icon`, `BigNumber`, `DataTable`, `Flow` | 장면, 비교, 큰 숫자, 표, 흐름도. `BigNumber`는 화면이 열릴 때 숫자가 세어지며 올라간다(숫자가 하나이고 2 이상일 때만, 연도와 식은 세지 않는다. `count={false}`로 끈다) |
| `Sim…` | 시뮬레이션 (`src/components/sims/`) |

## 4. 화면이 보이는 모양

- 화면 내용은 세로 가운데에 놓인다(조금 위로 치우치게). `<S>` 단계는 처음부터 자리를 잡아 두고 나타나기만 해서, "계속"을 눌러도 글이 밀리지 않는다.
  남은 단계가 있으면 아래 버튼이 테두리만 있는 "계속"이 되고, 가운데에 단계 점이 보인다. 다음에 열릴 자리에는 작은 점 셋이 깜빡인다.
- 화면이 휴대폰(390×844)보다 길면 저절로 촘촘한 모양(`is-dense`, 그래도 넘치면 `is-denser`, 마지막으로 `is-densest`)이 된다. 그래도 넘치면 화면 안에서 스크롤된다.
  `npm run build` 뒤 다른 터미널에서 `npm run preview`를 켜 두고 `npm run check:screens -- 21,22`로 잰다. 넘치는 화면이 있으면 실패한다.
  촘촘한 모양이 자주 붙는 강은 화면을 쪼갠다.
- 화면 종류마다 얼굴이 다르다.
  - `define`: 정의 카드의 용어를 크게, 물리량 색 밑줄
  - `<Key>`: 칠판 바탕에 가운데 정렬, 큰 명조
  - `<Note>`: 칠판 옆에 붙여 둔 쪽지. 이름표는 손글씨, 오른쪽 위 귀퉁이가 접혀 있다
  - `story`: 바탕이 더 어둡고, `BigNumber`와 `Panels`의 `big`(연도)이 크게 별빛 색으로
  - `check`: 문제와 선택지가 카드 안에
  - `recap`: 오늘 온 길이 칠판 위에 번호와 함께 한 줄씩 나타난다
  - 시각 자료 없이 글만 있는 장면·설명·이야기·비교·다음 강 화면: 큰 글씨(20px)
- 그래서 글만 있는 화면은 글이 짧을수록 좋다. 큰 글씨로 3문장이면 한 화면이 꽉 찬다.
- 영화처럼 움직인다(움직임을 줄이는 설정이면 모두 꺼진다).
  - 강 첫 화면: 큰 강 번호, 제목, 질문, `epigraph`가 차례로 떠오르고, 뒤에 먼지가 천천히 떠다닌다. `epigraph`는 큰 따옴표가 먼저 빛나며 떠오르고, 글이 번지듯 나타나고, 말한 사람과 출처가 마지막에 놓인다
  - 화면을 넘기면 짧게 어두워졌다 밝아지고, 글이 한 줄씩 떠오른다
  - `<Key>`는 칠판에 쓰듯 글이 차례로 드러나고, 뒤에 은은한 빛이 번진다
  - `BigNumber`의 숫자는 세어지며 올라간다
  - 부의 마지막 강을 처음 마치면 장 넘김 화면이 다음 시대의 연도를 크게 보여 준다
- `epigraph`(강 첫 화면의 한 줄)는 frontmatter에 적는다. 1강이 본보기다.
  ```yaml
  epigraph:
    text: "인용문"
    by: 말한 사람
    source: 출처 (연도)
  ```
  - `source`에 쌍점(`:`)이 들어가면 따옴표로 감싼다. 예: `source: "『QED: 빛과 물질의 이상한 이론』 (1985)"`. 감싸지 않으면 YAML 오류로 validate와 build가 멈춘다.
  - 강 첫 화면은 epigraph가 길어도 넘치지 않게 촘촘한 모양이 된다. 그래도 세 문장, 100자 안팎이 넘지 않게 고른다.

## 5. 새 시뮬레이션

`src/components/sims/SimXxx.astro`를 만들고 `src/lib/client/sim.ts`의 `Sim`을 상속한다.
슬라이더는 `input[data-param]`, 버튼은 `button[data-set="이름=값"]`으로 매개변수에 묶인다.
`draw()`만 채우면 화면이 보일 때만 움직이고, 움직임을 줄이는 설정이면 자동 재생하지 않는다.
파일 이름이 `Sim`으로 시작하면 저절로 등록된다(`src/components/sims/index.ts`는 고치지 않는다). 입력칸 id에는 `uid`를 붙여 한 화면에 두 번 써도 겹치지 않게 한다.

새 아이콘은 `src/components/figures/icons/` 아래 파일에 더한다(`icons/README.md`).
