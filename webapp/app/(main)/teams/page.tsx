"use client"

import { useEffect, useState } from "react"
import { get } from "@/lib/request"
import { TeamsResponse, TeamsResponseSchema } from "@/schemas/team"
import { DataTable } from "./data-table"
import { columns } from "./columns"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default function TeamsPage() {
  const [teamsData, setTeamsData] = useState<TeamsResponse>({
    code: 200,
    message: "success",
    data: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTeams() {
      try {
        setLoading(true)
        const response = await get("/teams/my")
        const validatedData = TeamsResponseSchema.parse(response)
        setTeamsData(validatedData)
      } catch (error) {
        console.error("Failed to fetch teams:", error)
        setError(error instanceof Error ? error.message : "获取团队列表失败")
        setTeamsData({
          code: 500,
          message: "获取团队列表失败",
          data: [],
        })
      } finally {
        setLoading(false)
      }
    }

    fetchTeams()
  }, [])

  if (loading) {
    return (
      <div className="flex h-full flex-1 flex-col space-y-8 p-8">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">我的团队</h2>
            <p className="text-muted-foreground">
              管理您参与的所有团队。
            </p>
          </div>
          <Button asChild>
            <Link href="/teams/create">
              <Plus className="mr-2 h-4 w-4" />
              创建团队
            </Link>
          </Button>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-1 flex-col space-y-8 p-8">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">我的团队</h2>
            <p className="text-muted-foreground">
              管理您参与的所有团队。
            </p>
          </div>
          <Button asChild>
            <Link href="/teams/create">
              <Plus className="mr-2 h-4 w-4" />
              创建团队
            </Link>
          </Button>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-red-500">错误: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">我的团队</h2>
          <p className="text-muted-foreground">
            管理您参与的所有团队。
          </p>
        </div>
        <Button asChild>
          <Link href="/teams/create">
            <Plus className="mr-2 h-4 w-4" />
            创建团队
          </Link>
        </Button>
      </div>
      <DataTable columns={columns} data={teamsData.data} meta={{ refresh: () => window.location.reload() }} />
    </div>
  )
} 