import { create } from 'zustand'
import { get } from '@/lib/request'

interface UserState {
  user: any | null
  fetchUser: () => Promise<void>
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  fetchUser: async () => {
    try {
      const res = await get('/users/me')
      set({ user: res.data })
    } catch (e) {
      set({ user: null })
    }
  }
}))

export const useUser = () => useUserStore((state) => state.user)
export const useFetchUser = () => useUserStore((state) => state.fetchUser) 