'use client'
import { TeamForm } from "../team-form"
import { useTranslation } from 'react-i18next'

export default function CreateTeamPage() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('teamCreate.title')}</h2>
          <p className="text-muted-foreground">{t('teamCreate.desc')}</p>
        </div>
      </div>
      <div className="max-w-2xl">
        <TeamForm mode="create" />
      </div>
    </div>
  )
} 