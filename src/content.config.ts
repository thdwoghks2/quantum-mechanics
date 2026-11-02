import { defineCollection, z } from 'astro:content';
import { file, glob } from 'astro/loaders';

/** 물리량 묶음. 같은 묶음은 사이트 전체에서 같은 색을 쓴다. */
export const QUANTITY = ['time', 'space', 'motion', 'force', 'energy', 'charge', 'heat', 'plain'] as const;

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }),
  schema: z.object({
    number: z.number().int().positive(),
    title: z.string(),
    short: z.string(),
    question: z.string(),
    mechanism: z.string(),
    part: z.number().int().min(0),
    year: z.union([z.string(), z.number()]).optional(),
    place: z.string().optional(),
    /** 강 첫 화면에 새기는 한 줄. 누구나 아는 사람의 실제 말이나 영화의 유명한 대사. 출처를 꼭 적는다. */
    epigraph: z
      .object({
        text: z.string(),
        by: z.string(),
        source: z.string().optional(),
      })
      .optional(),
    minutes: z.number().int().positive(),
    assumes: z.array(z.string()).default([]),
    introduces: z.array(z.string()).default([]),
    sources: z.array(z.string()).default([]),
    testout: z.array(z.string()).default([]),
    status: z.enum(['published', 'draft']).default('draft'),
  }),
});

const glossary = defineCollection({
  loader: file('src/content/glossary.yaml'),
  schema: z.object({
    term: z.string(),
    aliases: z.array(z.string()).default([]),
    /** 본문에서 이 용어를 찾을 때 쓸 정규식 (기본은 term과 aliases 그대로) */
    pattern: z.string().optional(),
    definition: z.string(),
    unit: z.string().optional(),
    examples: z.array(z.string()).min(1),
    notThis: z.string().optional(),
    taughtIn: z.number().int().positive(),
    /** 정식 도입 전에도 이 말을 일상어로 쓰는 앞 강들 (예: 원자는 21강에서 배우지만 1, 2강에서도 쓴다) */
    previewIn: z.array(z.number().int().positive()).default([]),
    /** 아직 그 강을 쓰지 않아 이름과 강 번호만 정해 둔 용어. 그 강을 공개할 때 내용을 채우고 지운다. */
    planned: z.boolean().default(false),
    /** 물리량 묶음. plain이 아니면 글 속 밑줄이 그 물리량 색 실선이 된다(나머지는 흐린 점선). */
    q: z.enum(QUANTITY).default('plain'),
  }),
});

const curriculum = defineCollection({
  loader: file('src/content/curriculum.yaml'),
  schema: z.object({
    number: z.number().int().min(0),
    title: z.string(),
    summary: z.string(),
    lessons: z.array(
      z.object({
        n: z.number().int().positive(),
        title: z.string(),
        note: z.string().default(''),
      }),
    ),
  }),
});

const people = defineCollection({
  loader: file('src/content/people.yaml'),
  schema: z.object({
    name: z.string(),
    original: z.string(),
    born: z.number().int(),
    died: z.number().int().optional(),
    role: z.string(),
    summary: z.string(),
    lessons: z.array(z.number().int()).default([]),
    sources: z.array(z.string()).default([]),
  }),
});

const events = defineCollection({
  loader: file('src/content/events.yaml'),
  schema: z.object({
    year: z.number().int(),
    date: z.string().optional(),
    title: z.string(),
    summary: z.string(),
    lessons: z.array(z.number().int()).default([]),
    people: z.array(z.string()).default([]),
    sources: z.array(z.string()).default([]),
  }),
});

export const collections = { lessons, glossary, curriculum, people, events };
