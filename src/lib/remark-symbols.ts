/**
 * MDX의 $…$, $$…$$ 수식에 기호 표시(\htmlData)를 단다. remark-math 다음, rehype-katex 전에 돈다.
 * 자세한 규칙은 tex.ts.
 */
import { instrument } from './tex.ts';

interface Node {
  type: string;
  value?: string;
  children?: Node[];
  /** remark-math는 HTML로 바꿀 글을 data.hChildren에 따로 들고 있다. 둘 다 바꿔야 KaTeX가 표시를 본다. */
  data?: { hChildren?: { type: string; value?: string }[] };
}

export default function remarkSymbols() {
  return (tree: Node) => {
    const walk = (n: Node) => {
      if ((n.type === 'inlineMath' || n.type === 'math') && typeof n.value === 'string') {
        const marked = instrument(n.value);
        n.value = marked;
        const h = n.data?.hChildren?.[0];
        if (h && h.type === 'text') h.value = marked;
      }
      n.children?.forEach(walk);
    };
    walk(tree);
  };
}
