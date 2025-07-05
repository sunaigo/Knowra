import { z } from "zod"

export const DocumentSchema = z.object({
  id: z.number(),
  filename: z.string(),
  filetype: z.string().optional(),
  status: z.string(),
  upload_time: z.string(),
  uploader_id: z.number(),
  fail_reason: z.string().nullable(),
  progress: z.number().optional(),
  parsing_config: z.record(z.unknown()).optional().nullable(),
  last_parsed_config: z.record(z.unknown()).optional().nullable(),
  chunk_count: z.number().optional().default(0),
  parse_offset: z.number().optional().default(0),
  meta: z.record(z.unknown()).optional().nullable(),
})

export type Document = z.infer<typeof DocumentSchema> 