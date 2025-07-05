import { z } from "zod";

export const KnowledgeBaseSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  owner_id: z.number(),
  owner: z.object({ username: z.string() }).optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  chunk_size: z.number().optional(),
  overlap: z.number().optional(),
  auto_process_on_upload: z.boolean().optional(),
  collection_id: z.number().nullable(),
  team_id: z.number().optional(),
  oss_connection_id: z.number().nullable().optional(),
  oss_bucket: z.string().nullable().optional(),
  last_file_time: z.string().nullable().optional(),
  embedding_model_id: z.number().nullable().optional(),
  embedding_model: z.any().optional(),
  icon_name: z.string().nullable().optional(),
  doc_count: z.number().optional(),
});

export type KnowledgeBase = z.infer<typeof KnowledgeBaseSchema>; 