import * as z from 'zod';

export const PROVIDER_SCHEMA = z.enum([
  'openai',
  'ollama',
  'xinference',
  'other',
]);
export const MODEL_TYPE_SCHEMA = z.enum(['llm', 'embedding', 'vision']);

export const modelSchema = z.object({
  id: z.number().optional(),
  model_name: z.string().min(1, 'Model name is required.'),
  provider: PROVIDER_SCHEMA,
  model_type: MODEL_TYPE_SCHEMA,
  api_base: z.string().url(),
  api_key: z.string().optional(),
  is_default: z.boolean().optional(),
  description: z.string().nullable().optional(),
  maintainer_id: z.number().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Model = z.infer<typeof modelSchema>; 