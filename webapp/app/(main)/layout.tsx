"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Settings, Image } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { BreadcrumbManager } from "@/components/breadcrumb-manager"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

interface MainLayoutProps {
  children: React.ReactNode
}

const navItems = [
  {
    title: "系统设置",
    url: "#",
    icon: Settings,
    items: [
      {
        title: "图标管理",
        url: "/settings/icons",
      },
    ]
  },
]

export default function MainLayout({ children }: MainLayoutProps) {
  const router = useRouter()
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      router.replace("/login")
    }
  }, [router])

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