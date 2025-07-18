"use client"

import * as React from "react"
import {
  BookOpen,
  SquareTerminal,
  Users,
  Settings,
  Image,
  Database,
} from "lucide-react"
import { useTranslation } from 'react-i18next'
import { usePathname } from 'next/navigation'

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "./team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useUser, useKnowledgeBases } from '@/stores/user-store'
import { KnowledgeBase } from "@/schemas/knowledge-base"
import { TeamIcon } from "./team-icon"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation('common')
  const user = useUser()
  const knowledgeBases = useKnowledgeBases()
  const pathname = usePathname()

  const navMenuItems = React.useMemo(() => {

    return [
      {
        title: t('sidebar.knowledgeBase.title'),
        url: '/kb',
        icon: BookOpen,
        isActive: pathname.startsWith('/kb'),
        // items: kbItems,
      },
      {
        title: t('sidebar.model.title'),
        url: '/models',
        icon: SquareTerminal,
        isActive: pathname.startsWith('/models') || pathname.startsWith('/connections'),
        items: [
          { title: t('sidebar.model.list'), url: '/model', isActive: pathname.startsWith('/models') },
          { title: t('sidebar.model.connections'), url: '/model/model_connection', isActive: pathname.startsWith('/model/model_connection') },
        ],
      },
      {
        title: t('sidebar.user.title'),
        url: '/users',
        icon: Users,
        isActive: pathname.startsWith('/users') || pathname.startsWith('/teams'),
        items: [
          { title: t('sidebar.user.list'), url: '/users', isActive: pathname.startsWith('/users') },
          { title: t('sidebar.user.teams'), url: '/teams', isActive: pathname.startsWith('/teams') },
        ],
      },
      {
        title: t('sidebar.dataStorage'),
        url: '/vdb',
        icon: Database,
        isActive: pathname.startsWith('/vdb') || pathname.startsWith('/documents'),
        items: [
          { title: t('sidebar.vectorDB'), url: '/vdb', isActive: pathname.startsWith('/vdb') },
          { title: t('sidebar.fileStorage'), url: '/documents', isActive: pathname.startsWith('/documents') },
        ],
      },
      {
        title: t('sidebar.settings'),
        url: '/settings/icons',
        icon: Settings,
        isActive: pathname.startsWith('/settings'),
        items: [
          {
            title: t('sidebar.iconManager'),
            url: '/settings/icons',
            isActive: pathname.startsWith('/settings/icons'),
          },
        ],
      },
    ]
  }, [t, knowledgeBases, pathname])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMenuItems} />
      </SidebarContent>
      <SidebarFooter>
        {user ? (
          <NavUser user={{ name: user.username, email: user.email || "N/A", avatar: "", username: user.username }} />
        ) : (
          <div className="flex items-center gap-2 p-2">
            <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
            <div className="flex flex-col gap-1">
              <div className="h-4 w-20 rounded bg-muted animate-pulse" />
              <div className="h-3 w-28 rounded bg-muted animate-pulse" />
            </div>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
