"use client"

import { useTeams, useIsUserLoading, fetchUser } from "@/stores/user-store"
import { DataTable } from "./data-table"
import { columns } from "./columns"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { useTranslation } from 'react-i18next'

export default function TeamsPage() {
  const teams = useTeams()
  const isLoading = useIsUserLoading()
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex h-full flex-1 flex-col space-y-8 p-8">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t('team.myTeams')}</h2>
            <p className="text-muted-foreground">
              {t('team.manageDesc')}
            </p>
          </div>
          <Button asChild>
            <Link href="/teams/create">
              <Plus className="mr-2 h-4 w-4" />
              {t('team.create')}
            </Link>
          </Button>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">{t('common.loading')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('team.myTeams')}</h2>
          <p className="text-muted-foreground">
            {t('team.manageDesc')}
          </p>
        </div>
        <Button asChild>
          <Link href="/teams/create">
            <Plus className="mr-2 h-4 w-4" />
            {t('team.create')}
          </Link>
        </Button>
      </div>
      <DataTable columns={columns({ t })} data={teams} meta={{ refresh: fetchUser }} />
    </div>
  )
} 