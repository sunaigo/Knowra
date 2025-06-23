import { get } from "@/lib/request"
import { TeamResponse, TeamResponseSchema, TeamMembersResponse, TeamMembersResponseSchema } from "@/schemas/team"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Settings, UserPlus } from "lucide-react"
import Link from "next/link"

async function getTeam(teamId: string): Promise<TeamResponse> {
  try {
    const response = await get(`/teams/${teamId}`)
    return TeamResponseSchema.parse(response)
  } catch (error) {
    console.error("Failed to fetch team:", error)
    return {
      code: 500,
      message: "获取团队信息失败",
      data: {
        id: 0,
        name: "",
        description: null,
        created_at: "",
        member_count: 0,
      },
    }
  }
}

async function getTeamMembers(teamId: string): Promise<TeamMembersResponse> {
  try {
    const response = await get(`/teams/${teamId}/members`)
    return TeamMembersResponseSchema.parse(response)
  } catch (error) {
    console.error("Failed to fetch team members:", error)
    return {
      code: 500,
      message: "获取团队成员失败",
      data: [],
    }
  }
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ team_id: string }>
}) {
  const resolvedParams = await params
  const teamId = resolvedParams.team_id
  
  const [teamData, membersData] = await Promise.all([
    getTeam(teamId),
    getTeamMembers(teamId),
  ])

  const team = teamData.data
  const members = membersData.data

  // 获取当前用户在团队中的角色（这里简化处理，实际应该从API获取）
  const currentUserRole = members.find(m => m.id === 1)?.role || 'member' // 临时处理
  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{team.name}</h2>
          <p className="text-muted-foreground">
            {team.description || "暂无描述"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/teams/${teamId}/members`}>
              <Users className="mr-2 h-4 w-4" />
              管理成员
            </Link>
          </Button>
          {canManage && (
            <Button asChild>
              <Link href={`/teams/${teamId}/edit`}>
                <Settings className="mr-2 h-4 w-4" />
                编辑团队
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>团队信息</CardTitle>
            <CardDescription>基本团队信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">团队名称</label>
              <p className="text-sm text-muted-foreground">{team.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium">描述</label>
              <p className="text-sm text-muted-foreground">
                {team.description || "暂无描述"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">创建时间</label>
              <p className="text-sm text-muted-foreground">
                {new Date(team.created_at).toLocaleDateString("zh-CN")}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">成员数量</label>
              <p className="text-sm text-muted-foreground">{team.member_count} 人</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>团队成员</CardTitle>
              <CardDescription>最近加入的成员</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" variant="outline">
                <UserPlus className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.slice(0, 5).map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.username}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <Badge variant={member.role === 'owner' ? 'default' : member.role === 'admin' ? 'secondary' : 'outline'}>
                    {member.role === 'owner' ? '拥有者' : member.role === 'admin' ? '管理员' : '成员'}
                  </Badge>
                </div>
              ))}
              {members.length > 5 && (
                <Button variant="ghost" size="sm" asChild className="w-full">
                  <Link href={`/teams/${teamId}/members`}>
                    查看全部 {members.length} 名成员
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 