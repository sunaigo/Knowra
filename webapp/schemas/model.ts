import * as z from 'zod';
import { connectionSchema } from './connection';

export const MODEL_TYPE_SCHEMA = z.enum(['llm', 'embedding', 'vision']);

export const modelSchema = z.object({
  id: z.number().optional(),
  model_name: z.string().min(1, 'Model name is required.'),
  model_type: MODEL_TYPE_SCHEMA,
  connection_id: z.number({ required_error: 'Please select a connection.' }),
  connection: connectionSchema.optional(),
  is_default: z.boolean().optional(),
  description: z.string().nullable().optional(),
  maintainer_id: z.number().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Model = z.infer<typeof modelSchema>; 