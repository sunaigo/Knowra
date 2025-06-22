import * as z from 'zod';

export const PROVIDER_SCHEMA = z.enum([
  'openai',
  'ollama',
  'xinference',
  'other',
]);

export const connectionSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'Connection name is required.'),
  provider: PROVIDER_SCHEMA,
  api_base: z.string().url('Please enter a valid URL.'),
  api_key: z.string().optional().nullable(),
  status: z.string().optional(),
  description: z.string().nullable().optional(),
  maintainer_id: z.number().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Connection = z.infer<typeof connectionSchema>;

export const connectionCreateSchema = connectionSchema.omit({ 
  id: true,
  created_at: true,
  updated_at: true,
  maintainer_id: true,
});

export type ConnectionCreate = z.infer<typeof connectionCreateSchema>; 