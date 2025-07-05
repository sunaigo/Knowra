"use client"

import { useEffect, useState, useMemo } from "react"
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslation } from 'react-i18next'

function BucketShareDialog({ open, onClose, bucket, ossId, onSuccess }: { open: boolean, onClose: () => void, bucket: string, ossId: string, onSuccess: () => void }) {
  const teams = useTeams()
  const activeTeamId = useActiveTeamId()
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [sharedTeams, setSharedTeams] = useState<number[]>([])
  const [sharedTeamsMap, setSharedTeamsMap] = useState<Record<string, number[]>>({})
  const { t } = useTranslation()

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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('bucket.shareFailed'))
    }
    setLoading(false)
  }

  // 撤销分享
  const handleRevoke = async (teamId: number) => {
    setLoading(true)
    try {
      await post(`/oss-connection/${ossId}/revoke?team_id=${teamId}&bucket=${bucket}`, {})
      toast.success(t('bucket.revokeSuccess'))
      onSuccess()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('bucket.revokeFailed'))
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('bucket.shareTitle', { bucket })}</DialogTitle>
          <DialogDescription>{t('bucket.shareDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-sm font-medium">{t('bucket.selectTeam')}</div>
            <div className="flex gap-2 items-center">
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder={t('bucket.selectTeamPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {candidateTeams.map(team => (
                    <SelectItem key={team.id} value={String(team.id)}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleShare} disabled={!selectedTeamId || loading}>{t('common.share')}</Button>
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">{t('bucket.sharedTeams')}</div>
            {sharedTeams.length === 0 ? <div className="text-muted-foreground text-sm">{t('common.none')}</div> : (
              <ul className="space-y-1">
                {sharedTeams.map(id => {
                  const team = teams.find(t => t.id === id)
                  return (
                    <li key={id} className="flex items-center gap-2">
                      <span>{team?.name || `ID:${id}`}</span>
                      <Button size="sm" variant="ghost" onClick={() => handleRevoke(id)} disabled={loading}>{t('bucket.revoke')}</Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} disabled={loading}>{t('common.close')}</Button>
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
  const { t } = useTranslation()

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
    }).catch((e: Error) => {
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
    }).catch((e: Error) => {
      toast.error(e.message || "获取bucket失败")
    }).finally(() => setLoading(false))
  }

  const isSharedTeam = ownerTeamId !== null && String(activeTeamId) !== String(ownerTeamId)

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">{t('bucket.listTitle')}</h2>
      {loading ? <div>{t('common.loading')}</div> : (
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
  const { t } = useTranslation()
  const columns: ColumnDef<BucketRow>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: t('bucket.name'),
      cell: ({ row }) => (
        <span className="truncate max-w-[160px]" title={row.original.name}>{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'shared',
      header: t('bucket.shareStatus'),
      cell: ({ row }) => (
        isSharedTeam && row.original.revoked
          ? <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-400">{t('bucket.revoked')}</span>
          : isSharedTeam
            ? <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">{t('bucket.shared')}</span>
            : row.original.shared
              ? <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">{t('bucket.activeShared')}</span>
              : <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">{t('bucket.private')}</span>
      ),
    },
    {
      id: 'actions',
      header: t('common.action'),
      cell: ({ row }) => (
        isSharedTeam
          ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} style={{ display: 'inline-block' }}>
                  <Button size="sm" variant="secondary" disabled>
                    {t('common.share')}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{t('bucket.cannotShareAgain')}</TooltipContent>
            </Tooltip>
          )
          : (onShare ? <Button size="sm" variant="secondary" onClick={() => onShare(row.original.name)}>{t('common.share')}</Button> : null)
      ),
    },
  ], [t, isSharedTeam, onShare])
  const data = buckets.map(b => ({ name: b, shared: sharedBuckets.includes(b), revoked: revokedBuckets.includes(b) }))
  return <DataTable columns={columns} data={data} />
} 