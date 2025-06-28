import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { get as apiGet } from '@/lib/request'
import { TeamWithRole } from '@/schemas/team'
import { UserOut, UserOutSchema } from '@/schemas/user'
import { BaseResponseSchema } from '@/schemas/response'

// --- State and Actions Definition ---

interface UserState {
  user: UserOut | null
  teams: TeamWithRole[]
  activeTeamId: string | null
  isLoading: boolean
  actions: {
    fetchUser: () => Promise<void>
    setActiveTeamId: (teamId: string) => void
  }
}

// --- Store Implementation ---

const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      teams: [],
      activeTeamId: null,
      isLoading: false,
      actions: {
        fetchUser: async () => {
          if (get().isLoading) return
          set({ isLoading: true })
          try {
            const response = await apiGet('/users/me')
            if (!response) {
              set({ isLoading: false });
              return;
            }

            const validatedResponse = BaseResponseSchema.extend({
              data: UserOutSchema.nullable(),
            }).safeParse(response)

            if (!validatedResponse.success || !validatedResponse.data.data) {
              throw new Error(validatedResponse.success ? 'Response data is null' : validatedResponse.error.message)
            }

            const userData = validatedResponse.data.data
            const userTeams = userData.teams ?? []

            set({ user: userData, teams: userTeams })
            
            // Separate logic for syncing active team
            syncActiveTeam(userTeams, get().activeTeamId)

          } catch (error) {
            console.error("Failed to fetch and parse user data:", error)
            set({ user: null, teams: [] })
          } finally {
            set({ isLoading: false })
          }
        },
        setActiveTeamId: (teamId: string) => {
          set({ activeTeamId: teamId })
        },
      }
    }),
    {
      name: 'user-storage', // name of the item in the storage (must be unique)
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) => ['user', 'teams', 'activeTeamId'].includes(key))
        ),
    }
  )
)

// --- Helper Functions ---

function syncActiveTeam(teams: TeamWithRole[], currentActiveTeamId: string | null) {
  const { setActiveTeamId } = useUserStore.getState().actions
  if (teams.length === 0) {
    if (currentActiveTeamId) {
      setActiveTeamId("") // No teams, so clear active team
    }
    return
  }

  const teamExists = teams.some((team) => team.id.toString() === currentActiveTeamId)

  if (!currentActiveTeamId || !teamExists) {
    setActiveTeamId(teams[0].id.toString())
  }
}

// --- Public Hooks and Actions ---

export const useUser = () => useUserStore((state) => state.user)
export const useTeams = () => useUserStore((state) => state.teams)
export const useActiveTeamId = () => useUserStore((state) => state.activeTeamId)
export const useIsUserLoading = () => useUserStore((state) => state.isLoading)

// Direct action exports for cleaner usage in components
export const { fetchUser, setActiveTeamId } = useUserStore.getState().actions 