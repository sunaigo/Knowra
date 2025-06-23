"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  Users,
} from "lucide-react"
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "./team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useUser, useFetchUser } from '@/stores/user-store'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation('common')
  const data = React.useMemo(() => ({
    user: {
      name: "shadcn",
      email: "m@example.com",
      avatar: "/avatars/shadcn.jpg",
    },
    teams: [
      {
        name: "Acme Inc",
        logo: GalleryVerticalEnd,
        plan: t('sidebar.enterprise'),
      },
      {
        name: "Acme Corp.",
        logo: AudioWaveform,
        plan: t('sidebar.startup'),
      },
      {
        name: "Evil Corp.",
        logo: Command,
        plan: t('sidebar.free'),
      },
    ],
    navMain: [
      {
        title: t('sidebar.knowledgeBase.title'),
        url: '/kb',
        icon: BookOpen
      },
      {
        title: t('sidebar.model.title'),
        url: '',
        icon: SquareTerminal,
        items: [
          { title: t('sidebar.model.list'), url: '/models' },
          { title: t('sidebar.model.connections'), url: '/connections' },
        ],
      },
      {
        title: t('sidebar.user.title'),
        url: '/users',
        icon: Users,
        isActive: false,
        items: [
          { title: t('sidebar.user.list'), url: '/users' },
          { title: t('sidebar.user.teams'), url: '/teams' },
        ],
      }
    ],
    projects: [
      { name: t('sidebar.design_engineering'), url: "#", icon: Frame },
      { name: t('sidebar.sales_marketing'), url: "#", icon: PieChart },
      { name: t('sidebar.travel'), url: "#", icon: Map },
    ],
  }), [t])

  const user = useUser()
  const fetchUser = useFetchUser()

  useEffect(() => {
    if (!user) fetchUser()
  }, [user, fetchUser])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        {user && (user.name || user.username) ? (
          <NavUser user={user} />
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
