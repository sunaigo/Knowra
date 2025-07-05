"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { get } from "@/lib/request"
import { TeamForm } from "@/app/(main)/teams/team-form"
import { toast } from "sonner"
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchUser } from "@/stores/user-store"
import { useTranslation } from "react-i18next"

// 后端 TeamDetail 类型
interface TeamDetail {
  id: number;
  name: string;
  description?: string | null;
  icon_name?: string | null;
  created_at: string;
  member_count: number;
}

function EditTeamSkeleton() {
  return (
    <div className="w-full max-w-3xl space-y-6">
      <header>
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-3/4 mt-2" />
      </header>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-4 w-1/2 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}

export default function TeamEditPage() {
  const router = useRouter()
  const params = useParams()
  const team_id = params.team_id as string

  const [teamData, setTeamData] = useState<TeamDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { t } = useTranslation();

  useEffect(() => {
    if (!team_id) return
    async function fetchTeam() {
      try {
        const response = await get(`/teams/${team_id}`)
        if (response.code === 200 && response.data) {
          setTeamData(response.data)
        } else {
          setError(t('teamEdit.fetchFailed'))
          toast.error(t('teamEdit.fetchFailed'), { description: response.message })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('teamEdit.fetchFailed'))
        toast.error(t('teamEdit.fetchFailed'), { description: err instanceof Error ? err.message : '' })
      } finally {
        setIsLoading(false)
      }
    }
    fetchTeam()
  }, [team_id, t])

  if (isLoading) return (
    <div className="flex justify-center px-4">
      <EditTeamSkeleton />
    </div>
  )
  if (error) return <div className="text-red-500 p-8">{t('teamEdit.loadFailed')}: {error}</div>

  return (
    <div className="flex justify-center px-4">
      <div className="w-full max-w-2xl space-y-6 py-8">
        <header>
          <h1 className="text-2xl font-bold">{t('teamEdit.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('teamEdit.desc', { name: teamData?.name })}
          </p>
        </header>

        {teamData && (
          <TeamForm
            mode="edit"
            teamId={parseInt(team_id)}
            defaultValues={{
              name: teamData.name,
              description: teamData.description || "",
              icon_name: teamData.icon_name || "",
            }}
            onSuccess={async () => {
              await fetchUser()
              router.push(`/teams/${team_id}`)
              router.refresh()
            }}
            onCancel={() => router.back()}
            showCancelButton={true}
          />
        )}
        
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
} 