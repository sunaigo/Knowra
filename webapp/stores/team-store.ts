import { create } from 'zustand'
import { TeamWithRole } from '@/schemas/team'
import { get as apiGet } from '@/lib/request'

interface TeamState {
  teams: TeamWithRole[];
  activeTeamId: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  actions: {
    fetchTeams: () => Promise<void>;
    setActiveTeamId: (teamId: string) => void;
  };
}

const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  activeTeamId: null,
  isLoading: false,
  isInitialized: false,
  actions: {
    fetchTeams: async () => {
      if (get().isLoading || get().isInitialized) {
        return;
      }

      set({ isLoading: true });
      try {
        const response = await apiGet("/teams/my");
        const userTeams: TeamWithRole[] = response.data || [];
        
        set({ teams: userTeams, isInitialized: true });

        if (userTeams.length > 0) {
          // Try to get from localStorage first, otherwise default to the first team
          const storedTeamId = localStorage.getItem('activeTeamId');
          const teamExists = userTeams.some(team => team.id.toString() === storedTeamId);

          if (storedTeamId && teamExists) {
            set({ activeTeamId: storedTeamId });
          } else {
            const firstTeamId = userTeams[0].id.toString();
            set({ activeTeamId: firstTeamId });
            localStorage.setItem('activeTeamId', firstTeamId);
          }
        }
      } catch (error) {
        console.error("Failed to fetch teams:", error);
        set({ isInitialized: true }); // Mark as initialized even on error to avoid retries
      } finally {
        set({ isLoading: false });
      }
    },
    setActiveTeamId: (teamId: string) => {
      set({ activeTeamId: teamId });
      try {
        localStorage.setItem('activeTeamId', teamId);
      } catch (error) {
        console.error("Failed to save active team to localStorage", error);
      }
    },
  },
}));

export const useTeams = () => useTeamStore((state) => state.teams);
export const useActiveTeamId = () => useTeamStore((state) => state.activeTeamId);
export const useTeamStoreIsLoading = () => useTeamStore((state) => state.isLoading);
export const useTeamStoreIsInitialized = () => useTeamStore((state) => state.isInitialized);
export const useTeamStoreActions = () => useTeamStore((state) => state.actions); 