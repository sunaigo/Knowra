import { z } from 'zod'

export const TeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  icon_name: z.string().nullable(),
  created_at: z.string(),
})

export const TeamWithRoleSchema = TeamSchema.extend({
  role: z.enum(['owner', 'admin', 'member']),
  member_count: z.number().optional(),
})

export const TeamDetailSchema = TeamSchema.extend({
  member_count: z.number(),
})

export const TeamCreateSchema = z.object({
  name: z.string().min(1, '团队名称不能为空'),
  description: z.string().optional(),
  icon_name: z.string().optional(),
})

export const TeamUpdateSchema = TeamCreateSchema

export const TeamMemberSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().nullable(),
  role: z.enum(['owner', 'admin', 'member']),
})

export const TeamsResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.array(TeamWithRoleSchema),
})

export const TeamMembersResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.array(TeamMemberSchema),
})

export const TeamResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: TeamDetailSchema,
})

export type Team = z.infer<typeof TeamSchema>
export type TeamWithRole = z.infer<typeof TeamWithRoleSchema>
export type TeamDetail = z.infer<typeof TeamDetailSchema>
export type TeamCreate = z.infer<typeof TeamCreateSchema>
export type TeamUpdate = z.infer<typeof TeamUpdateSchema>
export type TeamMember = z.infer<typeof TeamMemberSchema>
export type TeamsResponse = z.infer<typeof TeamsResponseSchema>
export type TeamMembersResponse = z.infer<typeof TeamMembersResponseSchema>
export type TeamResponse = z.infer<typeof TeamResponseSchema> 