import { get } from "@/lib/request"
import { TeamsResponse, TeamsResponseSchema } from "@/schemas/team"
import { DataTable } from "./data-table"
import { columns } from "./columns"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

async function getMyTeams(): Promise<TeamsResponse> {
  try {
    const response = await get("/teams/my")
    return TeamsResponseSchema.parse(response)
  } catch (error) {
    console.error("Failed to fetch teams:", error)
    return {
      code: 500,
      message: "获取团队列表失败",
      data: [],
    }
  }
}

export default async function TeamsPage() {
  const teamsData = await getMyTeams()

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
      <DataTable columns={columns} data={teamsData.data} />
    </div>
  )
} 