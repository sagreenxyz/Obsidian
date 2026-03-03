import { defineCollection, z } from 'astro:content';

const vault = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    tags: z.array(z.string()).optional().default([]),
    created: z.coerce.date().optional(),
    modified: z.coerce.date().optional(),
    aliases: z.array(z.string()).optional().default([]),
    description: z.string().optional(),
  })
});

export const collections = { vault };
