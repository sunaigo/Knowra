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
import { useTranslation } from 'react-i18next'

// 后端 TeamMemberOut 类型
interface TeamMemberOut {
  id: number;
  username: string;
  email?: string | null;
  role: string;
}

export default function TeamDetailPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = params.team_id as string
  const { t } = useTranslation()

  const [team, setTeam] = useState<TeamWithRole | null>(null)
  const [members, setMembers] = useState<TeamMemberOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [removingMember, setRemovingMember] = useState<TeamMemberOut | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMemberOut | null>(null)
  const [editRole, setEditRole] = useState<string>("")

  const fetchTeamData = async () => {
    try {
      const teamRes = await get(`/teams/${teamId}`)
      if (teamRes.code === 200) {
        setTeam(teamRes.data)
      } else {
        throw new Error(teamRes.message || t('team.loadFailed'))
      }

      const membersRes = await get(`/teams/${teamId}/members`)
      if (membersRes.code === 200) {
        setMembers(membersRes.data)
      } else {
        throw new Error(membersRes.message || t('team.membersLoadFailed'))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (teamId) {
      fetchTeamData()
    }
  }, [teamId])

  const handleRemoveClick = (member: TeamMemberOut) => {
    setRemovingMember(member)
    setRemoveDialogOpen(true)
  }

  const handleRemoveConfirm = async () => {
    if (!removingMember) return
    try {
      const res: any = await del(`/teams/${teamId}/members/${removingMember.id}`)
      if (res.code === 200) {
        toast.success(t('team.removeMemberSuccess'))
        setRemoveDialogOpen(false)
        setRemovingMember(null)
        fetchTeamData()
      } else {
        toast.error(res.message || t('team.removeMemberFailed'))
      }
    } catch {
      toast.error(t('team.removeMemberFailed'))
    }
  }

  const handleRemoveCancel = () => {
    setRemoveDialogOpen(false)
    setRemovingMember(null)
  }

  const handleEditClick = (member: TeamMemberOut) => {
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
      const res: any = await post(`/teams/${teamId}/set_role`, { user_id: editingMember.id, role: editRole })
      if (res.code === 200) {
        toast.success(t('team.roleUpdateSuccess'))
        setEditDialogOpen(false)
        setEditingMember(null)
        fetchTeamData()
      } else {
        toast.error(res.message || t('team.roleUpdateFailed'))
      }
    } catch {
      toast.error(t('team.roleUpdateFailed'))
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
    return <div className="p-8">{t('common.loading')}</div>
  }

  if (error) {
    return <div className="p-8 text-red-500">{t('common.error')}: {error}</div>
  }
  
  if (!team) {
    return <div className="p-8">{t('team.notFound')}</div>
  }

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-8">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-4">
          <TeamIcon team={team} size="lg" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{team.name}</h2>
            <p className="text-muted-foreground">
              {team.description || t('team.noDescription')}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleEditTeamClick}>
          <Pencil className="mr-2 h-4 w-4" />{t('common.edit')}
        </Button>
      </div>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('team.overview')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('team.memberCount')}</span>
              <span>{team.member_count} {t('team.people')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('team.createdAt')}</span>
              <span>{new Date(team.created_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
          
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('team.members')}</CardTitle>
              <CardDescription>{t('team.membersDesc')}</CardDescription>
            </div>
            <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('team.addMember')}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {members.map((member: TeamMemberOut) => (
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
                        <Button size="icon" variant="ghost" onClick={() => handleEditClick(member)} title={t('team.editMemberRole')}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleRemoveClick(member)} title={t('team.removeMember')}>
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
            <DialogTitle>{t('team.removeMemberConfirm')}</DialogTitle>
            <DialogDescription>{t('team.removeMemberDesc')}</DialogDescription>
          </DialogHeader>
          <div>
            {t('team.removeMemberConfirmText', { username: removingMember?.username })}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={handleRemoveCancel}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleRemoveConfirm}>{t('team.confirmRemove')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('team.editMemberRole')}</DialogTitle>
            <DialogDescription>{t('team.editMemberRoleDesc')}</DialogDescription>
          </DialogHeader>
          <div className="mb-4">
            <div>{t('team.member')}:<span className="font-bold">{editingMember?.username}</span></div>
          </div>
          <Select value={editRole} onValueChange={setEditRole}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('team.selectRole')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">{t('team.roleMember')}</SelectItem>
              <SelectItem value="admin">{t('team.roleAdmin')}</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={handleEditCancel}>{t('common.cancel')}</Button>
            <Button onClick={handleEditConfirm} disabled={editRole === editingMember?.role}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 