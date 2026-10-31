/**
 * 배경 음악. 앨범 하나가 긴 파일 하나이고, 곡마다 시작 시각이 있다(src/content/bgm.yaml).
 * - 소리를 내는 Audio 객체는 화면 밖, 이 모듈 안에 하나만 둔다. 사이트가 페이지를 새로 불러오지 않고
 *   내용만 바꿔 끼우므로, 페이지를 옮겨도 이 모듈과 재생은 그대로 이어진다.
 * - 화면(qm-music 패널, data-music-toggle 버튼)은 언제든 다시 그려질 수 있어서, 상태는 늘 여기서 읽는다.
 * - 자동 재생은 하지 않는다. 앨범, 위치, 볼륨만 이 기기에 기억한다.
 */

export interface Track {
  at: number;
  title: string;
}
export interface Album {
  id: string;
  title: string;
  by: string;
  url: string;
  tracks: Track[];
}

const KEY = 'qm137-bgm';

interface Saved {
  album?: string;
  t?: number;
  vol?: number;
}

function readSaved(): Saved {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Saved;
  } catch {
    return {};
  }
}

function writeSaved(s: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 저장이 막혀 있어도 재생은 된다 */
  }
}

/** 시작 시각 목록에서 t초가 속한 곡의 번호 */
export function trackIndexAt(tracks: Track[], t: number): number {
  let i = 0;
  for (let k = 0; k < tracks.length; k++) if (tracks[k]!.at <= t + 0.25) i = k;
  return i;
}

/** 곡의 길이. 마지막 곡은 파일 길이를 알아야 정해진다. */
export function trackLength(tracks: Track[], i: number, duration: number): number {
  const next = tracks[i + 1]?.at ?? (Number.isFinite(duration) && duration > 0 ? duration : NaN);
  return next - tracks[i]!.at;
}

export function clock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '–:––';
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

type Listener = () => void;

class Player {
  albums: Album[] = [];
  album: Album | null = null;
  audio: HTMLAudioElement | null = null;
  error = '';
  private listeners = new Set<Listener>();
  private pendingSeek: number | null = null;
  private lastSave = 0;

  setAlbums(albums: Album[]) {
    if (this.albums.length) return;
    this.albums = albums;
    const saved = readSaved();
    this.album = albums.find((a) => a.id === saved.album) ?? albums[0] ?? null;
    this.pendingSeek = saved.album === this.album?.id ? saved.t ?? 0 : 0;
  }

  get playing() {
    return !!this.audio && !this.audio.paused;
  }

  get time() {
    if (this.audio && this.audio.src) return this.audio.currentTime;
    return this.pendingSeek ?? 0;
  }

  get duration() {
    return this.audio?.duration ?? NaN;
  }

  get volume() {
    return this.audio?.volume ?? readSaved().vol ?? 0.6;
  }

  get index() {
    return this.album ? trackIndexAt(this.album.tracks, this.time) : 0;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  /** 처음 재생할 때 Audio를 만든다. 그 전에는 아무것도 내려받지 않는다. */
  private ensureAudio(): HTMLAudioElement {
    if (this.audio) return this.audio;
    const a = new Audio();
    a.preload = 'none';
    a.volume = readSaved().vol ?? 0.6;
    for (const ev of ['play', 'pause', 'loadedmetadata', 'durationchange', 'seeked', 'waiting', 'playing']) {
      a.addEventListener(ev, () => {
        if (ev === 'loadedmetadata' && this.pendingSeek !== null) {
          a.currentTime = this.pendingSeek;
          this.pendingSeek = null;
        }
        if (ev === 'playing') this.error = '';
        this.emit();
        this.updateSession();
      });
    }
    a.addEventListener('timeupdate', () => {
      const now = Date.now();
      if (now - this.lastSave > 4000) this.save();
      this.emit();
    });
    a.addEventListener('ended', () => {
      // 앨범이 끝나면 처음부터 다시 튼다.
      a.currentTime = 0;
      void a.play().catch(() => {});
    });
    a.addEventListener('error', () => {
      this.error = '음악을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 눌러 보세요.';
      this.emit();
    });
    this.audio = a;
    this.setupSession();
    return a;
  }

  private load() {
    const a = this.ensureAudio();
    if (!this.album) return a;
    // a.src는 늘 절대 주소라서, 비교할 때 앨범 주소도 절대 주소로 바꾼다.
    const want = new URL(this.album.url, location.href).href;
    if (a.src !== want) {
      if (this.pendingSeek === null) this.pendingSeek = 0;
      a.src = want;
      a.load();
    }
    return a;
  }

  async play() {
    const a = this.load();
    try {
      await a.play();
    } catch {
      this.error = '재생을 시작하지 못했어요. 한 번 더 눌러 보세요.';
      this.emit();
    }
  }

  pause() {
    this.audio?.pause();
    this.save();
  }

  toggle() {
    if (this.playing) this.pause();
    else void this.play();
  }

  seek(t: number) {
    const a = this.audio;
    if (a && a.src && a.readyState >= 1) a.currentTime = t;
    else this.pendingSeek = t;
    this.save(t);
    this.emit();
  }

  playTrack(i: number) {
    if (!this.album) return;
    const t = this.album.tracks[i]?.at ?? 0;
    this.seek(t);
    void this.play();
  }

  next() {
    if (!this.album) return;
    const i = this.index + 1;
    this.playTrack(i < this.album.tracks.length ? i : 0);
  }

  prev() {
    if (!this.album) return;
    const i = this.index;
    const into = this.time - this.album.tracks[i]!.at;
    // 곡을 3초 넘게 들었으면 그 곡 처음으로, 아니면 앞 곡으로 간다.
    this.playTrack(into > 3 || i === 0 ? i : i - 1);
  }

  selectAlbum(id: string) {
    const album = this.albums.find((a) => a.id === id);
    if (!album || album === this.album) return;
    const wasPlaying = this.playing;
    this.audio?.pause();
    this.album = album;
    this.pendingSeek = 0;
    if (this.audio) {
      this.audio.removeAttribute('src');
      this.audio.load();
    }
    this.save(0);
    this.emit();
    if (wasPlaying) void this.play();
  }

  setVolume(v: number) {
    const a = this.ensureAudio();
    a.volume = Math.min(1, Math.max(0, v));
    this.save();
    this.emit();
  }

  private save(t = this.time) {
    this.lastSave = Date.now();
    writeSaved({ album: this.album?.id, t, vol: this.audio?.volume ?? readSaved().vol });
  }

  /* 휴대폰 잠금 화면과 이어폰 버튼 */
  private setupSession() {
    const ms = navigator.mediaSession;
    if (!ms) return;
    ms.setActionHandler('play', () => void this.play());
    ms.setActionHandler('pause', () => this.pause());
    ms.setActionHandler('previoustrack', () => this.prev());
    ms.setActionHandler('nexttrack', () => this.next());
  }

  private updateSession() {
    const ms = navigator.mediaSession;
    if (!ms || !this.album || typeof MediaMetadata === 'undefined') return;
    const tr = this.album.tracks[this.index];
    ms.metadata = new MediaMetadata({ title: tr?.title ?? this.album.title, artist: this.album.by, album: this.album.title });
    ms.playbackState = this.playing ? 'playing' : 'paused';
  }
}

export const player = new Player();

// 곡이 바뀌면 잠금 화면의 곡 이름도 바꾼다.
let lastIndex = -1;
player.subscribe(() => {
  if (player.index !== lastIndex) {
    lastIndex = player.index;
    const ms = navigator.mediaSession;
    if (ms && player.album && typeof MediaMetadata !== 'undefined') {
      const tr = player.album.tracks[player.index];
      ms.metadata = new MediaMetadata({ title: tr?.title ?? player.album.title, artist: player.album.by, album: player.album.title });
    }
  }
});
