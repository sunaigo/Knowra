"use client"

import { ThemeProvider } from "next-themes"
import { SWRConfig } from "swr"
import { I18nProvider } from "@/components/i18n-provider"
import { fetcher } from "@/lib/request"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <SWRConfig
        value={{
          fetcher,
          revalidateOnFocus: false,
        }}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </SWRConfig>
    </I18nProvider>
  )
} 