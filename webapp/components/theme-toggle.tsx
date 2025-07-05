"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Sun, Moon } from "lucide-react"
import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { useUserSettingsStore } from '@/stores/user-settings-store'

export function ThemeToggle() {
  const { theme, setTheme: setNextTheme } = useTheme()
  const userTheme = useUserSettingsStore(state => state.theme)
  const setUserTheme = useUserSettingsStore(state => state.setTheme)
  const { t } = useTranslation()

  // 保证store和next-themes同步
  useEffect(() => {
    if (userTheme !== theme) {
      setNextTheme(userTheme)
    }
  }, [userTheme, theme, setNextTheme])

  const toggleTheme = () => {
    const next = userTheme === 'dark' ? 'light' : 'dark'
    setUserTheme(next)
    setNextTheme(next)
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t('themeToggle.nightMode')}>
      {userTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </Button>
  )
} 