import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserSettingsState {
  theme: 'light' | 'dark' | 'system'
  language: 'zh-CN' | 'en'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setLanguage: (lang: 'zh-CN' | 'en') => void
}

export const useUserSettingsStore = create<UserSettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'zh-CN',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'user-settings-storage',
    }
  )
) 