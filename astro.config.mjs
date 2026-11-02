// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkSymbols from './src/lib/remark-symbols.ts';
import { katexOptions } from './src/lib/tex.ts';

// Firebase Hosting: https://quantummechanics-9ad00.web.app/
// 다른 곳에 배포할 때는 SITE, BASE 환경 변수로 바꾼다.
// 예: GitHub Pages라면 SITE=https://thdwoghks2.github.io BASE=/quantum-mechanics
const site = process.env.SITE ?? 'https://quantummechanics-9ad00.web.app';
const base = process.env.BASE ?? '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  integrations: [mdx()],
  markdown: {
    // 수식의 글자마다 기호 표시를 달고(remarkSymbols), KaTeX가 그 표시를 data-s 속성으로 남기게 한다.
    remarkPlugins: [remarkMath, remarkSymbols],
    rehypePlugins: [[rehypeKatex, katexOptions]],
  },
});
