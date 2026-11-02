/** 커리큘럼과 공개된 레슨을 합쳐 페이지에서 쓰기 좋은 모양으로 만든다. */
import { getCollection } from 'astro:content';

export interface CourseLesson {
  n: number;
  title: string;
  note: string;
  part: number;
  published: boolean;
  minutes?: number;
  /** 강 제목의 짧은 꼴 */
  short?: string;
  /** 이 강이 답하는 질문 */
  question?: string;
}

export interface CoursePart {
  number: number;
  title: string;
  summary: string;
  lessons: CourseLesson[];
}

export async function getCourse(): Promise<CoursePart[]> {
  const parts = (await getCollection('curriculum')).map((p) => p.data).sort((a, b) => a.number - b.number);
  const lessons = await getCollection('lessons', (l) => import.meta.env.DEV || l.data.status === 'published');
  const byN = new Map(lessons.map((l) => [l.data.number, l.data]));
  return parts.map((p) => ({
    number: p.number,
    title: p.title,
    summary: p.summary,
    lessons: p.lessons.map((l) => {
      const real = byN.get(l.n);
      return {
        n: l.n,
        title: real?.title ?? l.title,
        note: l.note,
        part: p.number,
        published: !!real,
        minutes: real?.minutes,
        short: real?.short,
        question: real?.question,
      };
    }),
  }));
}

export async function publishedNumbers(): Promise<number[]> {
  const lessons = await getCollection('lessons', (l) => import.meta.env.DEV || l.data.status === 'published');
  return lessons.map((l) => l.data.number).sort((a, b) => a - b);
}
