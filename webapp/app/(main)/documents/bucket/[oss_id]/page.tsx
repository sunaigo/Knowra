"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { get, post } from "@/lib/request"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { useTeams, useActiveTeamId } from '@/stores/user-store'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import React from "react"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

function BucketShareDialog({ open, onClose, bucket, ossId, onSuccess }: { open: boolean, onClose: () => void, bucket: string, ossId: string, onSuccess: () => void }) {
  const teams = useTeams()
  const activeTeamId = useActiveTeamId()
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [sharedTeams, setSharedTeams] = useState<number[]>([])
  const [sharedTeamsMap, setSharedTeamsMap] = useState<Record<string, number[]>>({})

  // 获取已分享团队（按 bucket 粒度）
  useEffect(() => {
    if (!ossId) return
    get(`/oss-connection/${ossId}/buckets`).then(res => {
      setSharedTeamsMap(res.data?.shared_teams_map || {})
      setSharedTeams(res.data?.shared_teams_map?.[bucket] || [])
    })
  }, [ossId, bucket])

  // 过滤掉自己团队和已分享团队（按 bucket 粒度）
  const candidateTeams = React.useMemo(
    () => teams.filter(t => String(t.id) !== String(activeTeamId) && !(sharedTeamsMap[bucket] || []).includes(Number(t.id))),
    [teams, activeTeamId, sharedTeamsMap, bucket]
  )

  const handleShare = async () => {
    if (!selectedTeamId) return
    setLoading(true)
    try {
      await post(`/oss-connection/${ossId}/share`, {
        team_buckets: [{ team_id: Number(selectedTeamId), buckets: [bucket] }]
      })
      setSelectedTeamId("")
      onSuccess()
    } catch (e: any) {
      toast.error(e?.message || '分享失败')
    }
    setLoading(false)
  }

  // 撤销分享
  const handleRevoke = async (teamId: number) => {
    setLoading(true)
    try {
      await post(`/oss-connection/${ossId}/revoke?team_id=${teamId}&bucket=${bucket}`, {})
      toast.success('撤销成功')
      onSuccess()
    } catch (e: any) {
      toast.error(e?.message || '撤销失败')
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>分享 Bucket: {bucket}</DialogTitle>
          <DialogDescription>请选择要分享的团队</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-sm font-medium">选择要分享的团队</div>
            <div className="flex gap-2 items-center">
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="请选择团队" />
                </SelectTrigger>
                <SelectContent>
                  {candidateTeams.map(team => (
                    <SelectItem key={team.id} value={String(team.id)}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleShare} disabled={!selectedTeamId || loading}>分享</Button>
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">已分享团队</div>
            {sharedTeams.length === 0 ? <div className="text-muted-foreground text-sm">暂无</div> : (
              <ul className="space-y-1">
                {sharedTeams.map(id => {
                  const team = teams.find(t => t.id === id)
                  return (
                    <li key={id} className="flex items-center gap-2">
                      <span>{team?.name || `ID:${id}`}</span>
                      <Button size="sm" variant="ghost" onClick={() => handleRevoke(id)} disabled={loading}>撤销</Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} disabled={loading}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function BucketPage() {
  const params = useParams()
  const ossId = params.oss_id as string
  const [buckets, setBuckets] = useState<string[]>([])
  const [sharedBuckets, setSharedBuckets] = useState<string[]>([])
  const [revokedBuckets, setRevokedBuckets] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [shareBucket, setShareBucket] = useState<string | null>(null)
  const [ownerTeamId, setOwnerTeamId] = useState<number | null>(null)
  const activeTeamId = useActiveTeamId()

  // 获取 OSS 连接详情，拿到 owner team_id
  useEffect(() => {
    if (!ossId) return
    get(`/oss-connection/${ossId}`).then(res => {
      setOwnerTeamId(res.data?.team_id ?? null)
    })
  }, [ossId])

  useEffect(() => {
    if (!ossId) return
    setLoading(true)
    get(`/oss-connection/${ossId}/buckets`).then(res => {
      if (Array.isArray(res.data)) {
        setBuckets(res.data || [])
        setSharedBuckets([])
        setRevokedBuckets([])
      } else {
        setBuckets(res.data?.buckets || [])
        setSharedBuckets(res.data?.shared_buckets || [])
        setRevokedBuckets(res.data?.revoked_buckets || [])
      }
    }).catch(e => {
      toast.error(e.message || "获取bucket失败")
    }).finally(() => setLoading(false))
  }, [ossId])

  const handleShare = (bucket: string) => {
    setShareBucket(bucket)
  }

  // 刷新 buckets
  const refreshBuckets = () => {
    setLoading(true)
    get(`/oss-connection/${ossId}/buckets`).then(res => {
      if (Array.isArray(res.data)) {
        setBuckets(res.data || [])
        setSharedBuckets([])
        setRevokedBuckets([])
      } else {
        setBuckets(res.data?.buckets || [])
        setSharedBuckets(res.data?.shared_buckets || [])
        setRevokedBuckets(res.data?.revoked_buckets || [])
      }
    }).catch(e => {
      toast.error(e.message || "获取bucket失败")
    }).finally(() => setLoading(false))
  }

  const isSharedTeam = ownerTeamId !== null && String(activeTeamId) !== String(ownerTeamId)

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Bucket 列表</h2>
      {loading ? <div>加载中...</div> : (
        <BucketListTable buckets={buckets} sharedBuckets={sharedBuckets} revokedBuckets={revokedBuckets} onShare={handleShare} isSharedTeam={isSharedTeam} />
      )}
      {shareBucket && (
        <BucketShareDialog open={!!shareBucket} onClose={() => setShareBucket(null)} bucket={shareBucket} ossId={ossId} onSuccess={refreshBuckets} />
      )}
    </div>
  )
}

export function BucketListTable({ buckets, sharedBuckets = [], revokedBuckets = [], onShare, isSharedTeam }: { buckets: string[], sharedBuckets?: string[], revokedBuckets?: string[], onShare?: (bucket: string) => void, isSharedTeam?: boolean }) {
  type BucketRow = { name: string, shared: boolean, revoked: boolean }
  const columns: ColumnDef<BucketRow>[] = [
    {
      accessorKey: 'name',
      header: '名称',
      cell: ({ row }) => (
        <span className="truncate max-w-[160px]" title={row.original.name}>{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'shared',
      header: '共享状态',
      cell: ({ row }) => (
        isSharedTeam && row.original.revoked
          ? <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-400">已撤销</span>
          : isSharedTeam
            ? <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">被分享</span>
            : row.original.shared
              ? <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">已共享</span>
              : <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">私有</span>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        isSharedTeam
          ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} style={{ display: 'inline-block' }}>
                    <Button size="sm" variant="secondary" disabled>
                      分享
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>被分享团队无法再次分享</TooltipContent>
              </Tooltip>
          )
          : (onShare ? <Button size="sm" variant="secondary" onClick={() => onShare(row.original.name)}>分享</Button> : null)
      ),
    },
  ]
  const data = buckets.map(b => ({ name: b, shared: sharedBuckets.includes(b), revoked: revokedBuckets.includes(b) }))
  return <DataTable columns={columns} data={data} />
} 