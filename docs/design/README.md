# 디자인 캡처

휴대폰 화면(390×844, 2배 밀도)에서 Playwright로 찍었어요.

- `before/`: 바꾸기 전. 1강의 모든 화면(단계를 다 연 상태)과 다른 페이지들, `report.json`(화면마다 넘친 픽셀)
- `after/`: 바꾼 뒤. 같은 화면들과 `report.json`
  - `with-record-*.jpg`: 1~8강을 끝내고(3강은 통과 시험) 9강을 보는 중인 기록으로 찍은 코스, 홈의 별 지도, 칠판
  - `with-record-part-turn.jpg`: 8강(0부의 마지막 강)을 처음 마쳤을 때의 장 넘김
  - `l001-s02-continue.jpg`: 단계가 남은 화면. 아래 버튼이 "계속"이 되고 단계 점이 보여요

바꾸기 전에는 1강 「모형이라는 이름」 화면의 글 영역이 37px 넘쳤어요(`before/report.json`). 바꾼 뒤에는 1강 모든 화면이 넘치지 않아요.

## 영화처럼 (handoff 6-4)

- `after/cinematic-title.jpg`: 강 첫 화면. 큰 강 번호, 제목, 질문, 한 줄(epigraph)이 차례로 떠오르고 뒤에 먼지가 떠다녀요
- `after/cinematic-key.jpg`: 칠판에 새기듯 써지는 핵심 문장
- `after/cinematic-part-turn.jpg`: 장 넘김. 다음 시대의 연도를 크게
- `after/signature-epigraph.jpg`: 122강 첫 화면. 큰 따옴표가 빛나며 떠오르는 한 줄, 말한 사람과 출처
- `after/signature-note.jpg`: 손글씨 이름표와 접힌 귀퉁이가 있는 `<Note>` 쪽지
- `after/signature-key.jpg`: `<Key>` 뒤의 빛이 상자 모서리에서 잘리지 않게 고친 뒤
- `after/signature-part-turn.jpg`: 130강(15부의 마지막 강)을 마쳤을 때의 장 넘김. 16부가 시작되는 1931년
- `after/signature-constellations.jpg`: 0~1부를 마치고 21강을 보는 기록으로 찍은 코스의 별 지도. 다 마친 부는 별자리 선이 이어져요

마지막 점검(2026-11-01): 1~137강 가운데 공개된 강 전부를 390×844에서 단계를 다 열고 재 봤어요(`npm run check:screens -- 1-137`). 넘치는 화면은 없어요.
