# 세션 1: 2~7강 다시 쓰기

먼저 `docs/handoff/README.md`를 읽는다. 거기 적힌 규칙(서브에이전트·Workflow 금지, 브랜치, 검사, 보고)을 그대로 따른다.

## 맡은 일

2강, 3강, 4강, 5강, 6강, 7강을 1강과 같은 수준으로 다시 쓴다. 1강(`src/content/lessons/00-basics/001-what-physics-does.mdx`)이 본보기다.

## 고치는 파일

- 강 파일: `src/content/lessons/00-basics/002-big-and-small-numbers.mdx`, `src/content/lessons/00-basics/003-units-and-measurement.mdx`, `src/content/lessons/00-basics/004-speed-and-acceleration.mdx`, `src/content/lessons/00-basics/005-force-and-motion.mdx`, `src/content/lessons/00-basics/006-energy.mdx`, `src/content/lessons/00-basics/007-momentum.mdx`
- `src/content/glossary.yaml`에서 **2~7강 구역만**(`# ── 2강`부터 `# ── 7강` 구역 끝까지). 다른 구역은 고치지 않는다. 다른 세션이 같은 파일의 다른 구역을 고친다.

이 밖의 파일(다른 강, curriculum.yaml, 컴포넌트, 스크립트, 문서)은 고치지 않는다.

## 강마다 할 일

1. **말투**: STYLE 2장. 글쓴이 "저"가 옆에서 차근차근 가르치는 해요체. 말을 거는 한마디나 혼잣말은 한 강에 두세 번만.
2. **속도와 밀도**: STYLE 2-3. 한 번에 보이는 글은 3문장까지, 화면 전체는 5문장까지. 넘으면 `<S n={2}>`로 나누거나 화면을 쪼갠다. 한 문장 60자 안팎(75자 넘으면 안 됨, `<Key>`만 예외). 같은 끝맺음 네 번 연속 금지. 화면이 22~30장으로 늘어나도 괜찮다.
3. **구성**:
   - 모든 화면에 목차용 `title`(10자 안팎)을 붙인다.
   - 꼭 가져갈 말이 있는 화면에서는 그 말 하나만 **굵게** 쓴다(모든 화면에 쓰지는 않는다).
   - 정의 화면은 카드 문장을 되풀이하지 않고, 왜 이 이름이 필요한지 말한다.
   - 강의 핵심 원리마다 `<Key>` 하나(조건과 이유를 담은 한 문장)를 둔다. 한 강에 두세 개.
   - 아이들이 실제로 헷갈리는 곳 한두 군데에 `<Note>`를 둔다. 덧붙이는 사실에는 쓰지 않는다.
4. **강 끝**: 되짚기(`<Recap terms={[이 강 introduces]}>`, 번호 목록 3~5단계) → 마지막 점검(기존 `<DailyProblem>`의 id는 그대로, 오늘의 원리로 생각하는 짧은 문제 하나, 힌트 한두 개) → 한 문장으로(`<Screen kind="one">` + `<OneLine>`, 50자 안팎) → 다음 강으로. `<ThreeLines>`는 없앤다.
5. **확인 문제**: 선택지와 해설도 해요체. 문제 글 안에 풀 때 필요한 조건을 다 담는다. id와 정답(`ok`)은 바꾸지 않는다. 정답 위치는 신경 쓰지 않아도 된다(화면에서 섞인다).
6. **frontmatter**: `question`은 "~까요?"(물음표까지), `mechanism`은 해요체. 숫자, 시뮬레이션, 그림, 문제 id, `testout`, `sources`, `assumes`, `introduces`는 그대로 둔다.
7. **용어 계약**: 그 강보다 뒤에서 배우는 용어는 쓰지 않는다(`npm run validate`가 잡는다). "원자", "분자"는 21강에서 정식 용어가 된다. 이미 쓰고 있는 자리는 둬도 되지만, 새로 쓰는 문장에는 넣지 않는다.
8. **용어집 구역**: 내 강의 용어마다 `examples`와 `notThis`를 해요체로 바꾼다. `definition`은 명사로 끝나는 사전식 한 줄로 두되 어려운 말을 쉽게 푼다. `id`, `term`, `aliases`, `pattern`, `q`, `highlight`, `unit`, `taughtIn`은 바꾸지 않는다. 값이 따옴표로 시작하면 전체를 큰따옴표로 감싼다.

## 끝내는 기준

- 맡은 강마다 `npm run lint:style` 경고 0건, `npm run validate` 통과
- `npm test`, `npm run build` 통과
- 강 하나 끝날 때마다 커밋, 다 끝나면 지정된 작업 브랜치로 푸시
- README의 끝 보고 형식으로 보고
