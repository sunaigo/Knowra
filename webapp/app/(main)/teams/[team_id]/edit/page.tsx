"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { get } from "@/lib/request"
import { TeamForm } from "@/app/(main)/teams/team-form"
import { toast } from "sonner"
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchUser } from "@/stores/user-store"

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

  const [teamData, setTeamData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!team_id) return
    async function fetchTeam() {
      try {
        const response = await get(`/teams/${team_id}`)
        if (response.code === 200 && response.data) {
          setTeamData(response.data)
        } else {
          setError('获取团队信息失败')
          toast.error('获取团队信息失败', { description: response.message })
        }
      } catch (err: any) {
        setError(err.message || '获取团队信息失败')
        toast.error('获取团队信息失败', { description: err.message })
      } finally {
        setIsLoading(false)
      }
    }
    fetchTeam()
  }, [team_id])

  if (isLoading) return (
    <div className="flex justify-center px-4">
      <EditTeamSkeleton />
    </div>
  )
  if (error) return <div className="text-red-500 p-8">加载团队数据失败: {error}</div>

  return (
    <div className="flex justify-center px-4">
      <div className="w-full max-w-2xl space-y-6 py-8">
        <header>
          <h1 className="text-2xl font-bold">编辑团队</h1>
          <p className="text-muted-foreground mt-2">
            更新您的团队 "{teamData?.name}" 的详细信息。
          </p>
        </header>

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
        
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
} 