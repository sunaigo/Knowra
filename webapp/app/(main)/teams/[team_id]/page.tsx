"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { get, post, del } from "@/lib/request"
import { TeamMember, TeamWithRole } from "@/schemas/team"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { InviteMemberDialog } from "@/components/invite-member-dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TeamIcon } from "@/components/team-icon"

export default function TeamDetailPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = params.team_id as string

  const [team, setTeam] = useState<TeamWithRole | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [removingMember, setRemovingMember] = useState<TeamMember | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [editRole, setEditRole] = useState<string>("")

  const fetchTeamData = async () => {
    try {
      const teamRes = await get(`/teams/${teamId}`)
      if (teamRes.code === 200) {
        setTeam(teamRes.data)
      } else {
        throw new Error(teamRes.message || "获取团队信息失败")
      }

      const membersRes = await get(`/teams/${teamId}/members`)
      if (membersRes.code === 200) {
        setMembers(membersRes.data)
      } else {
        throw new Error(membersRes.message || "获取团队成员失败")
      }
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (teamId) {
      fetchTeamData()
    }
  }, [teamId])

  const handleRemoveClick = (member: TeamMember) => {
    setRemovingMember(member)
    setRemoveDialogOpen(true)
  }

  const handleRemoveConfirm = async () => {
    if (!removingMember) return
    try {
      const res = await del(`/teams/${teamId}/members/${removingMember.id}`)
      if (res.code === 200) {
        toast.success("成员移除成功！")
        setRemoveDialogOpen(false)
        setRemovingMember(null)
        fetchTeamData()
      } else {
        toast.error(res.message || "成员移除失败")
      }
    } catch {
      toast.error("成员移除失败")
    }
  }

  const handleRemoveCancel = () => {
    setRemoveDialogOpen(false)
    setRemovingMember(null)
  }

  const handleEditClick = (member: TeamMember) => {
    setEditingMember(member)
    setEditRole(member.role)
    setEditDialogOpen(true)
  }

  const handleEditConfirm = async () => {
    if (!editingMember) return
    if (editRole === editingMember.role) {
      setEditDialogOpen(false)
      setEditingMember(null)
      return
    }
    try {
      const res = await post(`/teams/${teamId}/set_role`, { user_id: editingMember.id, role: editRole })
      if (res.code === 200) {
        toast.success("角色修改成功！")
        setEditDialogOpen(false)
        setEditingMember(null)
        fetchTeamData()
      } else {
        toast.error(res.message || "角色修改失败")
      }
    } catch {
      toast.error("角色修改失败")
    }
  }

  const handleEditCancel = () => {
    setEditDialogOpen(false)
    setEditingMember(null)
  }

  const handleEditTeamClick = () => {
    router.push(`/teams/${teamId}/edit`)
  }

  if (loading) {
    return <div className="p-8">加载中...</div>
  }

  if (error) {
    return <div className="p-8 text-red-500">错误: {error}</div>
  }
  
  if (!team) {
    return <div className="p-8">未找到团队信息。</div>
  }

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-8">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-4">
          <TeamIcon team={team} size="lg" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{team.name}</h2>
            <p className="text-muted-foreground">
              {team.description || "该团队暂无描述。"}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleEditTeamClick}>
          <Pencil className="mr-2 h-4 w-4" />编辑
        </Button>
      </div>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>团队概览</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">成员数量</span>
              <span>{team.member_count} 人</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">创建时间</span>
              <span>{new Date(team.created_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
          
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>团队成员</CardTitle>
              <CardDescription>团队内的所有成员列表。</CardDescription>
            </div>
            <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              添加成员
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`https://avatars.githubusercontent.com/u/${member.id}?v=4`} alt={member.username} />
                      <AvatarFallback>{member.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{member.username}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                      {member.role}
                    </Badge>
                    {member.role !== 'owner' && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => handleEditClick(member)} title="编辑成员角色">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleRemoveClick(member)} title="移除成员">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <InviteMemberDialog
        teamId={teamId}
        isOpen={isInviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInviteSuccess={fetchTeamData}
      />

      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认移除成员</DialogTitle>
            <DialogDescription>成员被移除后将无法访问本团队。</DialogDescription>
          </DialogHeader>
          <div>
            确定要将成员 <span className="font-bold">{removingMember?.username}</span> 移出团队吗？
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={handleRemoveCancel}>取消</Button>
            <Button variant="destructive" onClick={handleRemoveConfirm}>确认移除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑成员角色</DialogTitle>
            <DialogDescription>可将成员设置为"成员"或"管理员"。</DialogDescription>
          </DialogHeader>
          <div className="mb-4">
            <div>成员：<span className="font-bold">{editingMember?.username}</span></div>
          </div>
          <Select value={editRole} onValueChange={setEditRole}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择角色" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">成员 (Member)</SelectItem>
              <SelectItem value="admin">管理员 (Admin)</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={handleEditCancel}>取消</Button>
            <Button onClick={handleEditConfirm} disabled={editRole === editingMember?.role}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 