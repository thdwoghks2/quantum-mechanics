# 아이콘 더하기

`Icon.astro`의 기본 아이콘 말고 새 아이콘이 필요하면, 이 폴더의 자기 세션 파일(예: `session-2.ts`)에 더한다.
파일은 이름과 SVG 조각(64×64 칸, `currentColor` 선)을 내보낸다. 이름이 기본 아이콘이나 다른 파일과 겹치면 빌드가 멈춘다.

```ts
export default {
  dice: '<rect x="10" y="10" width="44" height="44" rx="8"/><circle cx="24" cy="24" r="3" fill="currentColor"/>',
};
```
