import { z } from 'zod'

export const UserOutSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  is_active: z.boolean(),
  created_at: z.string(),
})

export const UsersResponseSchema = z.object({
  data: z.array(UserOutSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  page_count: z.number(),
})

export type UserOut = z.infer<typeof UserOutSchema>
export type User = UserOut
export type UsersResponse = z.infer<typeof UsersResponseSchema> 