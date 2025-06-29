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
            // If a fetch is already in progress, don't start a new one.
            // if (get().isLoading) return 
            // We set isLoading to true unconditionally to handle re-fetches.
            // ... existing code ...
          } catch (error) {
            // ... existing code ...
          }
        }
      }
    })
  )
) 