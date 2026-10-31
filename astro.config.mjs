// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

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
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
