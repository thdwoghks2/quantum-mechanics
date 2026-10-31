# 배경 음악 올리기

배경 음악 파일은 이 저장소에 넣지 않고, Firebase에 음악만 담는 사이트를 따로 만들어 올립니다.
이 문서는 음원 파일이 있는 컴퓨터(로컬 세션)에서 그대로 따라 하면 되도록 썼습니다.

## 왜 따로 두나요

- GitHub는 100MB가 넘는 파일을 받지 않고, 50MB가 넘으면 경고합니다. 음원은 한 파일에 80~100MB입니다.
- 이 저장소는 공개 저장소라, 여기에 넣으면 누구나 내려받을 수 있습니다. 영화 음악은 저작권이 있는 음원입니다.
- 강의 사이트를 새로 배포할 때마다 그 사이트에 없는 파일은 지워집니다. 음악을 다른 사이트에 두면, 강을 몇 번 다시 올려도 음악은 그대로 남습니다.

`bgm/public/` 안의 파일은 `.gitignore`에 들어 있어서 커밋되지 않습니다.

## 자리

| 무엇 | 어디 |
|---|---|
| 음원 파일 | `bgm/public/oppenheimer.mp3`, `bgm/public/interstellar.mp3` |
| 곡 목록과 시작 시각 | `src/content/bgm.yaml` |
| 음악 사이트 주소 | `https://quantummechanics-9ad00-bgm.web.app/` |
| Firebase 설정 | `firebase.json`의 `bgm` 대상, `.firebaserc`의 `targets` |

파일 이름이나 형식이 다르면 파일 이름을 위처럼 바꾸거나, `src/content/bgm.yaml`의 `file`을 실제 이름으로 고칩니다.

## 순서

### 1. 파일 넣기

음원 두 개를 `bgm/public/`에 넣고 이름을 맞춥니다.

### 2. 용량 줄이기 (권장)

Firebase 무료 요금제는 하루 전송량이 약 360MB이고, 강의 사이트와 음악 사이트가 이 한도를 나눠 씁니다.
128kbps 음악은 1시간에 약 58MB라서, 여럿이 몇 시간씩 틀어 두면 한도를 넘을 수 있습니다. 한도를 넘으면 그날은 강의 사이트도 열리지 않습니다.
배경 음악으로는 96kbps면 충분합니다. `ffmpeg`가 있으면 이렇게 줄입니다.

```sh
ffmpeg -i 원본.mp3 -vn -c:a libmp3lame -b:a 96k bgm/public/oppenheimer.mp3
```

한도가 걱정되면 Firebase 요금제를 Blaze(쓴 만큼 내는 요금제)로 바꾸는 방법도 있습니다. 한 달 10GB까지는 무료이고, 그 뒤로 1GB에 약 0.15달러입니다.

### 3. 시작 시각 확인

곡 목록의 마지막 곡 시작 시각이 파일 길이보다 짧아야 합니다.

```sh
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 bgm/public/oppenheimer.mp3
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 bgm/public/interstellar.mp3
```

오펜하이머는 마지막 곡이 1:32:38(5558초), 인터스텔라는 2:17:43(8263초)에 시작합니다.
가지고 있는 파일이 다른 판이라 시각이 어긋나면 `src/content/bgm.yaml`을 고칩니다.

### 4. Firebase 로그인

```sh
npx firebase-tools@15.34.2 login
```

### 5. 음악 사이트 만들기 (처음 한 번)

```sh
npx firebase-tools@15.34.2 hosting:sites:create quantummechanics-9ad00-bgm
```

이 이름이 이미 쓰이고 있으면 다른 이름으로 만들고, 그 이름으로 두 곳을 고칩니다.

- `.firebaserc`의 `"bgm": ["…"]`
- `src/content/bgm.yaml`의 `base`

### 6. 올리기

```sh
npx firebase-tools@15.34.2 deploy --only hosting:bgm
```

강의 사이트는 `--only hosting:app`으로 따로 올리므로, 음악을 올려도 강의 사이트는 바뀌지 않습니다.

### 7. 확인

```sh
curl -sI https://quantummechanics-9ad00-bgm.web.app/oppenheimer.mp3 | head -5
```

`200`과 `content-type: audio/mpeg`가 나오면 됩니다.

### 8. 커밋

음원은 커밋되지 않습니다. `.firebaserc`나 `src/content/bgm.yaml`을 고쳤다면 그 두 파일만 커밋합니다.

## 알아 둘 점

음악 사이트 주소를 아는 사람은 누구나 파일을 받을 수 있습니다. 주소는 가족끼리만 씁니다.
