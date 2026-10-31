// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// GitHub Pages 프로젝트 사이트: https://thdwoghks2.github.io/quantum-mechanics/
// 다른 곳에 배포할 때는 SITE, BASE 환경 변수로 바꾼다 (예: BASE=/ ).
const site = process.env.SITE ?? 'https://thdwoghks2.github.io';
const base = process.env.BASE ?? '/quantum-mechanics';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  integrations: [mdx()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
