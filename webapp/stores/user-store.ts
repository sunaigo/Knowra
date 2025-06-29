import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { get as apiGet } from '@/lib/request'
import { TeamWithRole } from '@/schemas/team'
import { KnowledgeBase, KnowledgeBaseSchema } from '@/schemas/knowledge-base'
import { UserOut, UserOutSchema } from '@/schemas/user'
import { BaseResponseSchema } from '@/schemas/response'
import { z } from 'zod'

// --- State and Actions Definition ---

interface UserState {
  user: UserOut | null
  teams: TeamWithRole[]
  knowledgeBases: KnowledgeBase[]
  activeTeamId: string | null
  isLoading: boolean
  actions: {
    fetchUser: () => Promise<void>
    fetchKnowledgeBases: (teamId: string) => Promise<void>
    setActiveTeamId: (teamId: string) => void
  }
}

// --- Store Implementation ---

const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      teams: [],
      knowledgeBases: [],
      activeTeamId: null,
      isLoading: true,
      actions: {
        fetchUser: async () => {
          set({ isLoading: true })
          try {
            const response = await apiGet('/users/me')
            const validatedResponse = BaseResponseSchema.extend({
              data: UserOutSchema.nullable(),
            }).safeParse(response)

            if (!validatedResponse.success || !validatedResponse.data.data) {
              throw new Error(validatedResponse.success ? 'Response data is null' : validatedResponse.error.message)
            }

            const userData = validatedResponse.data.data
            const userTeams = userData.teams ?? []

            set({ user: userData, teams: userTeams })
            
            // Determine active team and fetch its knowledge bases
            const currentActiveTeamId = get().activeTeamId
            let newActiveTeamId = currentActiveTeamId
            if (userTeams.length > 0) {
              const teamExists = userTeams.some(team => team.id.toString() === currentActiveTeamId)
              if (!currentActiveTeamId || !teamExists) {
                newActiveTeamId = userTeams[0].id.toString()
                set({ activeTeamId: newActiveTeamId })
              }
            } else {
              newActiveTeamId = null
              set({ activeTeamId: null })
            }

            if (newActiveTeamId) {
              await get().actions.fetchKnowledgeBases(newActiveTeamId)
            } else {
              set({ knowledgeBases: [] })
            }

          } catch (error) {
            console.error("Failed to fetch and parse user data:", error)
            set({ user: null, teams: [], knowledgeBases: [] })
          } finally {
            set({ isLoading: false })
          }
        },

        fetchKnowledgeBases: async (teamId) => {
          if (!teamId) {
            set({ knowledgeBases: [] })
            return
          }
          try {
            const res = await apiGet(`/kb?team_id=${teamId}`)
            const validatedKbs = z.array(KnowledgeBaseSchema).safeParse(res.data)
            if (res.code === 200 && validatedKbs.success) {
              set({ knowledgeBases: validatedKbs.data })
            } else {
              set({ knowledgeBases: [] })
            }
          } catch (error) {
            console.error("Failed to fetch knowledge bases for store:", error)
            set({ knowledgeBases: [] })
          }
        },

        setActiveTeamId: (teamId: string) => {
          set({ activeTeamId: teamId })
          get().actions.fetchKnowledgeBases(teamId)
        },
      }
    }),
    {
      name: 'user-storage',
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) => !['actions', 'isLoading', 'knowledgeBases'].includes(key))
        ),
    }
  )
)

// --- Public Hooks and Actions ---

export const useUser = () => useUserStore((state) => state.user)
export const useTeams = () => useUserStore((state) => state.teams)
export const useKnowledgeBases = () => useUserStore((state) => state.knowledgeBases)
export const useActiveTeamId = () => useUserStore((state) => state.activeTeamId)
export const useIsUserLoading = () => useUserStore((state) => state.isLoading)

// Direct action exports for cleaner usage in components
export const { fetchUser, setActiveTeamId, fetchKnowledgeBases } = useUserStore.getState().actions 