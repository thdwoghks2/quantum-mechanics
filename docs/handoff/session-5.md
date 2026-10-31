# 세션 5: 21~24강 새로 쓰기, 인물·연대기·커리큘럼 자료 정리

먼저 `docs/handoff/README.md`를 읽는다. 거기 적힌 규칙(서브에이전트·Workflow 금지, 브랜치, 검사, 보고)을 그대로 따른다.

## 고치는 파일

- 새 강 파일: `src/content/lessons/02-heat-light/021-*.mdx` ~ `024-*.mdx` (`part: 2`)
- `src/content/glossary.yaml`: **파일 맨 끝에 새 구역만 더한다**(`# ── 21강` ~ `# ── 24강`). 기존 줄은 고치지 않는다. 세션 1, 2, 3이 앞 구역을 고치고 있다.
- 새 시뮬레이션 `src/components/sims/Sim*.astro`(새 파일)와 등록 `src/components/sims/index.ts`
- 새 아이콘: `src/components/figures/Icon.astro`에 항목만 더한다
- `src/content/people.yaml`, `src/content/events.yaml`, `src/content/curriculum.yaml`, `docs/CURRICULUM.md`(`npm run docs:curriculum`으로 만든다)

1~20강 파일, 다른 컴포넌트, 스크립트, 스타일은 고치지 않는다.

## 1. 21~24강 쓰기

본보기는 1강이다. STYLE 전체를 지킨다: 말투(2장), 속도와 밀도(2-3), 용어 계약(4장), 강 끝 구성(1장).
`docs/ADDING_CONTENT.md`의 순서와 틀을 따른다. 화면은 22~30장, 강마다 시뮬레이션 하나 이상, 확인 문제 3개 이상(`testout` 3개).

| 강 | 제목 | 다룰 것 | 새 용어 (`taughtIn`) |
|---|---|---|---|
| 21 | 물질은 알갱이다 | 원자와 분자. 설탕이 물에 녹으면 어디로 가나(작은 알갱이로 흩어져 사이사이로 퍼진다) | `atom` 원자, `molecule` 분자 |
| 22 | 원자는 정말 있을까 | 브라운 운동(1827년 로버트 브라운의 관찰), 아인슈타인의 설명(1905), 페랭의 측정(1908) | `brownian-motion` 브라운 운동 |
| 23 | 온도의 정체 | 온도가 높을수록 원자와 분자가 더 빠르게 마구 움직인다(평균 운동 에너지). 더 내려갈 수 없는 온도와 절대온도(켈빈) | `absolute-temperature` 절대온도 (`q: heat`, 단위 K) |
| 24 | 확률과 평균 | 주사위 두 개의 합. 많이 던질수록 평균이 어디로 모이는지. 기댓값 | `probability` 확률, `expectation` 기댓값 |

- **용어 결정**:
  - "온도"와 "평균"은 아주 흔한 일상어라 용어로 올리지 않는다(1~20강이 이미 쓰고 있다). 대신 더 정확한 "절대온도"와 "기댓값"을 용어로 둔다.
  - "원자", "분자"는 21강에서 정식 용어가 된다. 앞 강들이 이미 쓰고 있으니 용어집 항목에 `previewIn`을 적는다. 지금 쓰고 있는 강은 이렇다. 합칠 때 원래 세션이 다시 맞춘다.
    - `atom`: `previewIn: [1, 2, 3, 8, 18, 20]`
    - `molecule`: `previewIn: [11]`
  - "전자"는 37강 용어라 21~24강에서는 쓰지 않는다.
- **시뮬레이션**(새 파일, `src/lib/client/sim.ts`의 `Sim` 상속, `ADDING_CONTENT.md` 4장):
  - 21강: 설탕 알갱이가 물 분자 사이로 퍼지는 모습
  - 22강: 큰 알갱이가 보이지 않는 작은 알갱이들에 치여 흔들리는 모습
  - 23강: 온도 슬라이더에 따라 기체 알갱이가 빨라지고 느려지는 모습
  - 24강: 주사위 두 개를 여러 번 던져 합의 막대그래프가 쌓이는 모습
  - 움직임을 줄이는 설정이면 자동 재생하지 않는다.
- **사실 확인**: 연도, 이름, 숫자는 기록으로 확인한 것만 쓰고 `sources`에 실제 문헌을 적는다. 예:
  - Brown, R. (1828) *A brief account of microscopical observations…*
  - Einstein, A. (1905) *Über die von der molekularkinetischen Theorie der Wärme geforderte Bewegung…*
  - Perrin, J. (1913) *Les Atomes*
  - Thomson, W. (Kelvin) (1848) *On an Absolute Thermometric Scale*
- **20강과 이어지게**: 20강의 다음 강으로 화면은 "설탕이 물에 녹아 보이지 않게 되면 어디로 가는지"로 21강을 예고한다. 21강 첫 화면이 그걸 받는다. 20강 파일은 고치지 않는다.

## 2. 자료 정리 (새 말투)

- `people.yaml`의 `role`, `summary`와 `events.yaml`의 `title`, `summary`를 해요체로 바꾼다. 사실은 그대로 정확하게.
  - 21~24강에 필요한 인물과 사건을 더한다. 예: 로버트 브라운(1827 관찰), 켈빈의 절대온도(1848). 이미 있는 `einstein-1905`, `perrin-1908`, `boltzmann`, `kelvin`은 연결(`lessons`)만 맞춘다.
- `curriculum.yaml`:
  - 부의 `summary`와 모든 강의 `note`를 해요체로 바꾼다.
  - 17강 `title`을 "빛의 색과 진동수"로 바꾼다(세션 3이 강 파일도 같은 이름으로 바꾼다).
  - 21~137강의 `title`이 "~는가/~인가"로 끝나면 "~일까요"나 짧은 이름으로 바꾼다. 예: 22강은 "원자는 정말 있을까".
  - `n`, `id`, `number`는 바꾸지 않는다.
- 끝나면 `npm run docs:curriculum`.

## 끝내는 기준

- README의 검사 네 가지 통과. 새 강 네 개는 `npm run lint:style` 경고 0건
- 강 하나마다 커밋, 자료 정리 커밋, 다 끝나면 지정된 작업 브랜치로 푸시
- README의 끝 보고 형식으로 보고. 사실 확인이 더 필요한 곳은 따로 적는다
