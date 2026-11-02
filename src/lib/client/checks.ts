/**
 * 확인 문제를 복습 화면에서 다시 그릴 수 있게 읽어 내는 곳.
 * 강 화면(문제를 처음 풀 때)과 복습 화면(다른 기기에서 불러와 문제 내용이 없을 때)이 함께 쓴다.
 */

export interface ChoicePayload {
  kind: 'choice';
  q: string;
  /** 선택지 글과 해설은 HTML이다(수식이 들어 있을 수 있다). */
  options: { t: string; ok: boolean; why: string }[];
}

export interface NumericPayload {
  kind: 'numeric';
  q: string;
  answer: number;
  unit?: string;
  tol: number;
  mode: 'value' | 'order';
  solution: string;
}

export type CheckPayload = ChoicePayload | NumericPayload;

/** 글 속 용어 밑줄(span.term)과 단위(span.unit)는 강 화면에서만 의미가 있으니 글자만 남긴다. */
function plainHtml(el: Element | null): string {
  if (!el) return '';
  const copy = el.cloneNode(true) as Element;
  copy.querySelectorAll('.term, .unit').forEach((t) => t.replaceWith(t.textContent ?? ''));
  return copy.innerHTML;
}

/** qm-check 또는 qm-numeric 요소에서 문제를 읽는다. */
export function readCheck(el: Element): CheckPayload | null {
  const tag = el.tagName.toLowerCase();
  if (tag === 'qm-check') {
    return {
      kind: 'choice',
      q: plainHtml(el.querySelector('.check__q')),
      options: [...el.querySelectorAll('.check__item')].map((li) => ({
        t: plainHtml(li.querySelector('.check__t')),
        ok: li.querySelector<HTMLElement>('.check__opt')?.dataset.ok === '1',
        why: plainHtml(li.querySelector('.check__why')),
      })),
    };
  }
  if (tag === 'qm-numeric') {
    const d = (el as HTMLElement).dataset;
    return {
      kind: 'numeric',
      q: plainHtml(el.querySelector('.numeric__q')),
      answer: Number(d.answer),
      unit: d.unit || undefined,
      tol: Number(d.tol),
      mode: d.mode === 'order' ? 'order' : 'value',
      solution: plainHtml(el.querySelector('.numeric__solution')),
    };
  }
  return null;
}

/** 강 페이지를 받아 와서 그 안의 문제를 찾는다. 인터넷이 없고 저장해 둔 페이지도 없으면 null. */
export async function fetchCheck(lessonUrl: string, id: string): Promise<CheckPayload | null> {
  try {
    const res = await fetch(lessonUrl);
    if (!res.ok) return null;
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const el = doc.querySelector(`qm-check[data-id="${CSS.escape(id)}"], qm-numeric[data-id="${CSS.escape(id)}"]`);
    return el ? readCheck(el) : null;
  } catch {
    return null;
  }
}
