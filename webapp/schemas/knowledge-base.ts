export interface KnowledgeBase {
  id: number
  name: string
  description: string | null
  owner_id: number
  created_at: string
  updated_at: string
  chunk_size: number
  overlap: number
  auto_process_on_upload: boolean
  collection_id: number
} 