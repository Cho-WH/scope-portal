import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { toolSchema, resourceSchema } from './lib/catalog/schema';

const tools = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/tools' }),
  schema: toolSchema,
});
const resources = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/resources' }),
  schema: resourceSchema,
});
export const collections = { tools, resources };
