import { z } from 'astro/zod';
import { activityIds, topicIds } from './taxonomy.ts';

export const contentId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const text = z.string().trim().min(1);
const secureUrl = z.url().refine(value => new URL(value).protocol === 'https:', '공개 링크는 https 주소여야 합니다.');
const poster = z.object({
  src: z.string().regex(/^\/images\/[a-zA-Z0-9/_-]+\.(?:svg|png|jpe?g|webp)$/),
  alt: text,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fit: z.enum(['contain', 'cover']).default('cover'),
});

export const toolSchema = z.object({
  name: text,
  summary: text.max(100),
  description: text,
  topics: z.array(z.enum(topicIds)).min(1),
  activity: z.enum(activityIds),
  equipment: z.array(text).min(1),
  environment: text,
  launchUrl: secureUrl,
  sourceUrl: secureUrl.optional(),
  keywords: z.array(text).default([]),
  capabilities: z.array(text).default([]),
  notes: z.array(text).default([]),
  order: z.number().int().nonnegative().default(100),
  draft: z.boolean().default(true),
  // Catalog photography is independent of the banner's optional dummy preview.
  thumbnail: poster.optional(),
  featured: z.object({
    order: z.number().int().nonnegative(),
    shortLabel: text.max(12),
    headline: text.max(70),
    description: text.max(160),
  }).optional(),
  // A static poster is the entire preview contract for this prototype.
  // Interactive previews can later add a discriminated union without changing cards/pages.
  preview: z.object({ kind: z.literal('placeholder'), poster: poster.optional() }).optional(),
}).strict();

export const resourceSchema = z.object({
  title: text,
  description: text,
  kind: z.enum(['worksheet', 'teacher-guide', 'setup-guide', 'language-version']),
  url: secureUrl,
  toolIds: z.array(contentId).min(1),
  order: z.number().int().nonnegative().default(100),
  draft: z.boolean().default(true),
  showOnHome: z.boolean().default(false),
}).strict();

export type ToolData = z.infer<typeof toolSchema>;
export type ResourceData = z.infer<typeof resourceSchema>;
export type Tool = ToolData & { id: string };
export type Resource = ResourceData & { id: string };
