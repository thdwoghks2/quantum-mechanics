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
    /**
     * 수식 속 글자가 이 강에서 무슨 기호인지: { h: planck-h, f: frequency }.
     * 열쇠는 글자 하나("E"), 아래 첨자를 붙인 꼴("E_n", "k_B"), 그리스 문자 이름("lambda").
     * 값은 symbols.yaml의 id. 단위(\mathrm{J})는 여기 적지 않아도 단위 기호에서 찾는다.
     */
    symbols: z.record(z.string(), z.string()).optional(),
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

/** 기호. 이 코스에서 쓰는 모든 알파벳·그리스 문자 기호와 단위 기호. */
export const SYMBOL_KIND = ['variable', 'constant', 'unit', 'index', 'operator'] as const;
const symbols = defineCollection({
  loader: file('src/content/symbols.yaml'),
  schema: z.object({
    /** 기호 모양 (TeX) */
    sym: z.string(),
    /** 이름: 플랑크 상수 */
    name: z.string(),
    /** 읽는 법: 에이치 */
    read: z.string(),
    kind: z.enum(SYMBOL_KIND),
    q: z.enum(QUANTITY).default('plain'),
    /** 뜻: 한두 문장 */
    meaning: z.string(),
    unit: z.string().optional(),
    /** 상수의 값 */
    value: z.string().optional(),
    /** 글자가 어디서 왔는지 (기억을 돕는 이야기) */
    origin: z.string().optional(),
    notThis: z.string().optional(),
    taughtIn: z.number().int().positive(),
  }),
});

/** 공식 카드. 식, 말로 읽기, 기호 표, 숫자 예, 맞는 범위. */
const formulas = defineCollection({
  loader: file('src/content/formulas.yaml'),
  schema: z.object({
    name: z.string(),
    tex: z.string(),
    /** 말로 읽기: "빛 하나의 에너지 = 플랑크 상수 × 진동수" */
    read: z.string(),
    /** 이 식이 말하는 것 */
    says: z.string(),
    /** 식 속 글자 → 기호 id */
    symbols: z.record(z.string(), z.string()),
    example: z.object({ tex: z.string(), note: z.string().optional() }).optional(),
    /** 맞는 범위 */
    holds: z.string().optional(),
    /** 안 맞는 범위, 흔한 잘못 */
    fails: z.string().optional(),
    /** 단계별로 쌓기: 앞에서부터 한 덩어리씩 */
    build: z.array(z.object({ tex: z.string(), note: z.string() })).optional(),
    taughtIn: z.number().int().positive(),
  }),
});

/** 개념 카드. 핵심 한 문장, 왜 필요한가, 이해 단계, 흔한 오해. */
const concepts = defineCollection({
  loader: file('src/content/concepts.yaml'),
  schema: z.object({
    name: z.string(),
    core: z.string(),
    why: z.string(),
    steps: z.array(z.string()).min(2).max(5),
    wrong: z.array(z.object({ wrong: z.string(), right: z.string() })).default([]),
    terms: z.array(z.string()).default([]),
    formulas: z.array(z.string()).default([]),
    taughtIn: z.number().int().positive(),
  }),
});

export const collections = { lessons, glossary, curriculum, people, events, symbols, formulas, concepts };
