import { z } from "zod";

export const KnowledgeBaseSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  owner_id: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  chunk_size: z.number(),
  overlap: z.number(),
  auto_process_on_upload: z.boolean(),
  collection_id: z.number().nullable(),
  icon_name: z.string().nullable().optional(),
  doc_count: z.number().optional(),
});

export type KnowledgeBase = z.infer<typeof KnowledgeBaseSchema>; 