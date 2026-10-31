/**
 * 선택지 섞기. 글쓴이가 정답을 늘 첫 번째에 두더라도 화면에서는 자리가 고르게 퍼지게 한다.
 * 같은 문제 ID면 언제나 같은 순서가 나온다(빌드할 때마다, 복습할 때마다 같다).
 */

/** 문자열에서 32비트 시드를 만든다 (FNV-1a). */
export function seedOf(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 시드로 0 이상 1 미만의 수를 차례로 내는 함수 (mulberry32). */
function random(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** key로 정해지는 순서로 섞은 새 배열을 돌려준다 (Fisher–Yates). */
export function shuffled<T>(items: readonly T[], key: string): T[] {
  const out = [...items];
  const rnd = random(seedOf(key));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * 문제 여러 개를 차례로 낼 때 쓴다. 정답 자리(0 ~ n-1)를 고르게 나눠 정한 뒤 섞어서,
 * 문제 수가 적어도 정답이 한 자리에 몰리지 않게 한다.
 */
export function balancedAnswerSlots(count: number, n: number, key: string): number[] {
  const slots = Array.from({ length: count }, (_, i) => i % n);
  return shuffled(slots, key);
}

/** 정답을 slot 자리에 두고, 나머지 선택지는 key로 섞어 채운다. */
export function placeAnswer<T extends { ok?: boolean }>(options: readonly T[], slot: number, key: string): T[] {
  const right = options.find((o) => o.ok)!;
  const rest = shuffled(options.filter((o) => o !== right), key);
  rest.splice(slot, 0, right);
  return rest;
}
