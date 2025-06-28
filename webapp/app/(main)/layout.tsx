"use client"

import { useEffect, useRef } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { BreadcrumbManager } from "@/components/breadcrumb-manager"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { fetchUser } from "@/stores/user-store"

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  // 使用 a ref 来确保 fetchUser 的引用在重渲染之间保持稳定
  const fetchUserRef = useRef(fetchUser)

  useEffect(() => {
    // 仅在首次挂载时调用，作为应用数据的唯一入口
    fetchUserRef.current()
  }, [])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
            <BreadcrumbManager />
          </header>
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 