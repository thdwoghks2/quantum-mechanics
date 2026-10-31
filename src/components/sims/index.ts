/**
 * 레슨 MDX에서 쓰는 시뮬레이션 목록. 이 폴더에 `Sim이름.astro` 파일을 만들면 저절로 등록된다.
 * (여러 세션이 동시에 시뮬레이션을 더해도 이 파일은 고칠 필요가 없다.)
 */
const modules = import.meta.glob<{ default: unknown }>('./Sim*.astro', { eager: true });

export const sims: Record<string, any> = Object.fromEntries(
  Object.entries(modules).map(([path, mod]) => [path.match(/(Sim\w+)\.astro$/)![1]!, mod.default]),
);
