"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useRouter, useParams, usePathname } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useTeams,
  useActiveTeamId,
  useIsUserLoading,
  setActiveTeamId,
} from "@/stores/user-store"
import { TeamWithRole } from "@/schemas/team"
import { TeamIcon } from "@/components/team-icon"
import { useTranslation } from "react-i18next"

function TeamSwitcherSkeleton() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" disabled className="cursor-wait">
          <Skeleton className="flex aspect-square size-8 items-center justify-center rounded-lg" />
          <div className="grid flex-1 gap-1 text-left text-sm leading-tight">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function TeamSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const { isMobile } = useSidebar()
  const { t } = useTranslation()
  
  // Zustand store state and actions
  const teams = useTeams()
  const activeTeamId = useActiveTeamId()
  const isLoading = useIsUserLoading()

  const handleTeamSelect = (teamId: string) => {
    setActiveTeamId(teamId)
    router.push(`/kb`)
  }
  
  const handleCreateTeam = () => {
    router.push("/teams/create")
  }
  
  const selectedTeam = React.useMemo(() => {
    // On pages without a team_id in URL, `activeTeamId` from store is the source of truth.
    // On pages with a team_id (like /teams/[team_id]), the URL param takes precedence for display.
    const currentId = params.team_id as string || activeTeamId
    return teams.find((team) => team.id.toString() === currentId) || null
  }, [teams, activeTeamId, params.team_id])

  if (isLoading) {
    return <TeamSwitcherSkeleton />
  }
  
  if (!selectedTeam) {
    return (
       <SidebarMenu>
        <SidebarMenuItem>
           <SidebarMenuButton size="lg" onClick={handleCreateTeam}>
              <div className="flex size-8 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground">
                <Plus className="size-4 text-muted-foreground" />
              </div>
              <div className="text-left text-sm font-medium leading-tight text-muted-foreground">
                {t('teamSwitcher.createTeam')}
              </div>
            </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <TeamIcon team={selectedTeam} size="md" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{selectedTeam.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {t('teamSwitcher.memberCount', { count: selectedTeam.member_count })}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto h-4 w-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {t('teamSwitcher.switchTeam')}
            </DropdownMenuLabel>
            {teams.map((team: TeamWithRole) => (
              <DropdownMenuItem
                key={team.id}
                onSelect={() => handleTeamSelect(team.id.toString())}
                className="gap-2 p-2"
              >
                <TeamIcon team={team} size="sm" />
                <span className="truncate">{team.name}</span>
                 <Check
                  className={cn(
                    "ml-auto h-4 w-4",
                    selectedTeam.id.toString() === team.id.toString() ? "opacity-100" : "opacity-0"
                  )}
                />
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleCreateTeam} className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="font-medium">{t('teamSwitcher.createNewTeam')}</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
