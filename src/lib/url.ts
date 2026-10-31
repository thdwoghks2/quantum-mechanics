/** base 경로(GitHub Pages의 /quantum-mechanics/)를 붙인 내부 링크 */
export function url(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const p = path.replace(/^\//, '');
  return `${base}/${p}`;
}

export const lessonUrl = (n: number) => url(`lessons/${n}/`);
