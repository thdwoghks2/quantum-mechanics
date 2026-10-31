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
    q: z.enum(QUANTITY).default('plain'),
    /** 글 속에서 색 밑줄을 칠지 */
    highlight: z.boolean().default(false),
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
