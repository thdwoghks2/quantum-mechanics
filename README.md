# 137 · 양자역학을 기초부터

던진 공이 떨어지는 법칙에서 출발해 빛과 원자를 지나 양자역학까지, 137강으로 이어지는 하루 한 강 코스.
수학 기초가 있는 중학생을 독자로 쓴다. 게임 장치 없이, 개념 하나를 그림과 시뮬레이션과 문제로 끝까지 따라간다.

- 한 강은 20분 안팎, 화면 18~25장. 화면마다 시각 자료 하나와 글 2~4문장
- 용어는 정식으로 가르친 강 이후에만 쓴다 (빌드 때 검사)
- 강마다 오늘의 문제(힌트 세 단계), 자기 말로 세 줄
- 진단으로 시작 강을 찾고, 강마다 "이미 안다면" 통과 시험
- 푼 문제는 1·3·7·21일 간격으로 복습
- 학습 기록은 브라우저에 저장, 텍스트로 내보내고 불러오기

## 실행

```sh
npm install
npm run dev        # http://localhost:4321/
npm run check      # 콘텐츠 검사 + 문체 검사 + 테스트 + 빌드
```

## 배포

Firebase Hosting(`quantummechanics-9ad00` 프로젝트)에 올린다. 주소는 `https://quantummechanics-9ad00.web.app/`이다.

직접 올릴 때는 검사와 빌드를 거쳐 배포한다.

```sh
npx firebase-tools@15.34.2 login
npm run deploy
```

자동 배포(`.github/workflows/deploy.yml`): `main`에 푸시하면 실제 사이트에, PR을 열면 7일 동안 열리는 미리보기 주소에 올린다.
처음 한 번, 배포용 서비스 계정 키를 저장소 **Settings → Secrets and variables → Actions**에
`FIREBASE_SERVICE_ACCOUNT_QUANTUMMECHANICS_9AD00`이라는 이름으로 넣는다. 키가 없으면 배포 단계는 건너뛴다.

다른 곳(GitHub Pages, 자기 도메인)에 올릴 때는 `SITE`, `BASE` 환경 변수로 주소를 바꾼다.
예: `SITE=https://thdwoghks2.github.io BASE=/quantum-mechanics npm run build`.

## 구조

```
src/content/
  curriculum.yaml     137강 목록 (원본)
  lessons/            강 하나 = MDX 파일 하나
  glossary.yaml       용어와 정식 도입 강(taughtIn)
  people.yaml         인물
  events.yaml         연대기
src/components/
  screen/             화면, 단계
  kinds/              정의 카드, 확인 문제, 오늘의 문제 …
  figures/            그래프, 표, 아이콘, 비교 그림
  sims/               시뮬레이션
src/lib/              기록, 복습 간격, 진단, 용어 찾기
scripts/              validate (용어 계약), lint-style (문체), curriculum-md
docs/                 STYLE.md, ADDING_CONTENT.md, CURRICULUM.md
```

## 강 추가

[docs/ADDING_CONTENT.md](docs/ADDING_CONTENT.md)와 [docs/STYLE.md](docs/STYLE.md)를 본다. 진행 상황은 [docs/CURRICULUM.md](docs/CURRICULUM.md).
