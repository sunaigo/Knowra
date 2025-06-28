import { useState, useMemo, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTeams, useActiveTeamId } from '@/stores/user-store'
import { post, get } from '@/lib/request'
import { toast } from 'sonner'

interface VdbShareDialogProps {
  vdb: {
    id: number
    shared_team_ids?: number[]
    team_id: number
  }
  onClose: () => void
  onSuccess?: () => void
}

export function VdbShareDialog({ vdb, onClose, onSuccess }: VdbShareDialogProps) {
  const teams = useTeams()
  const activeTeamId = useActiveTeamId()
  // 可选团队（排除自己团队）
  const candidateTeams = useMemo(() => teams.filter(t => String(t.id) !== String(vdb.team_id)), [teams, vdb.team_id])
  // 已分享团队
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [addTeamId, setAddTeamId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // 弹窗打开时拉取最新分享信息
  useEffect(() => {
    async function fetchShare() {
      const res = await get(`/vdb/${vdb.id}`)
      setSelectedIds(res.data?.shared_team_ids || [])
    }
    fetchShare()
  }, [vdb.id])

  const handleAdd = () => {
    if (!addTeamId) return
    const id = Number(addTeamId)
    if (!selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id])
    }
    setAddTeamId('')
  }

  const handleRemove = (id: number) => {
    setSelectedIds(selectedIds.filter(tid => tid !== id))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await post(`/vdb/${vdb.id}/share`, { team_ids: selectedIds })
      toast.success('分享设置已保存')
      onClose()
      onSuccess?.()
    } catch (e: any) {
      toast.error(e?.message || '保存失败')
    }
    setLoading(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>分享向量库到其他团队</DialogTitle>
          <DialogDescription>
            选择要分享的团队，保存后该团队成员可访问此向量库。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-sm font-medium">选择要分享的团队</div>
            <div className="flex gap-2">
              <Select value={addTeamId} onValueChange={setAddTeamId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="选择团队" />
                </SelectTrigger>
                <SelectContent>
                  {candidateTeams.map(team => (
                    <SelectItem key={team.id} value={String(team.id)} disabled={selectedIds.includes(team.id)}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAdd} disabled={!addTeamId || selectedIds.includes(Number(addTeamId))}>添加</Button>
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">已分享团队</div>
            {selectedIds.length === 0 ? (
              <div className="text-muted-foreground text-sm">暂无</div>
            ) : (
              <ul className="space-y-1">
                {selectedIds.map(id => {
                  const team = teams.find(t => t.id === id)
                  return (
                    <li key={id} className="flex items-center gap-2">
                      <span>{team?.name || `ID:${id}`}</span>
                      <Button size="sm" variant="ghost" onClick={() => handleRemove(id)} disabled={loading}>移除</Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>取消</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 