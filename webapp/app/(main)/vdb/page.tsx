"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import useSWR from "swr"
import { get, del } from "@/lib/request"
import { useRouter } from "next/navigation"
import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { useActiveTeamId, useTeams } from '@/stores/user-store'
import { Badge } from '@/components/ui/badge'
import { VdbShareDialog } from '@/components/vdb-share-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { useTranslation } from 'react-i18next'

interface VDB {
  id: number
  name: string
  type: string
  team_id: number
  allowed_team_ids?: number[]
  description?: string
  created_at: string
  updated_at: string
  status?: string
  team_name?: string
}

export default function VDBPage() {
  const router = useRouter()
  const activeTeamId = useActiveTeamId()
  const teams = useTeams()
  const [data, setData] = useState<{ data: VDB[] } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { t } = useTranslation()

  const fetchVdbs = useCallback(async () => {
    if (!activeTeamId) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await get(`/vdb?team_id=${activeTeamId}`)
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(t('common.unknownError')))
    } finally {
      setIsLoading(false)
    }
  }, [activeTeamId, t])
  useEffect(() => {
    if (activeTeamId) {
      fetchVdbs()
    } else {
      setData(null)
    }
  }, [activeTeamId, fetchVdbs])
  const mutate = fetchVdbs
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [shareDialogVdb, setShareDialogVdb] = useState<VDB | null>(null)

  const handleDelete = useCallback(async (id: number, name: string) => {
    setDeletingId(id)
    try {
      await del(`/vdb/${id}`)
      toast.success(t('vdb.deleteSuccess'))
      mutate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('vdb.deleteFailed'))
    }
    setDeletingId(null)
  }, [mutate, t])

  const isOwner = (vdb: VDB) => String(vdb.team_id) === String(activeTeamId)
  const isShared = (vdb: VDB) => Array.isArray(vdb.allowed_team_ids) && vdb.allowed_team_ids.includes(Number(activeTeamId)) && !isOwner(vdb)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t('vdb.title')}</h2>
        <Button asChild disabled={!activeTeamId}>
          <Link href="/vdb/create">{t('vdb.create')}</Link>
        </Button>
      </div>
      {isLoading ? (
        <div className="text-center text-muted-foreground">{t('common.loading')}</div>
      ) : error ? (
        <div className="text-center text-red-500">{t('common.loadFailed')}: {error.message}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.name')}</TableHead>
              <TableHead>{t('vdb.type')}</TableHead>
              <TableHead>{t('vdb.teamId')}</TableHead>
              <TableHead>{t('vdb.ownerTeam')}</TableHead>
              <TableHead>{t('common.description')}</TableHead>
              <TableHead>{t('common.createdAt')}</TableHead>
              <TableHead>{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>
            ) : (
              data?.data?.map((vdb: VDB) => (
                <TableRow key={vdb.id} className={`border-b`}>
                  <TableCell>
                    <Link href={`/vdb/${vdb.id}/collections`} className="hover:underline">
                      {vdb.name}
                      {vdb.status === 'revoked' && <Badge variant="destructive" className="ml-2">{t('vdb.revoked')}</Badge>}
                    </Link>
                  </TableCell>
                  <TableCell>{vdb.type}</TableCell>
                  <TableCell>{vdb.team_id}</TableCell>
                  <TableCell>{vdb.team_name || '-'}</TableCell>
                  <TableCell>{vdb.description || '-'}</TableCell>
                  <TableCell>{new Date(vdb.created_at).toLocaleString()}</TableCell>
                  <TableCell className="space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button size="sm" variant="outline" onClick={() => router.push(`/vdb/${vdb.id}/edit`)} disabled={vdb.status !== 'owned'}>
                              {t('common.edit')}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {vdb.status !== 'owned' && <TooltipContent>{t('vdb.onlyOwnerTeam')}</TooltipContent>}
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button size="sm" variant="secondary" onClick={() => setShareDialogVdb(vdb)} disabled={vdb.status !== 'owned'}>
                              {t('common.share')}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {vdb.status !== 'owned' && <TooltipContent>{t('vdb.onlyOwnerTeam')}</TooltipContent>}
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" disabled={deletingId === vdb.id || vdb.status !== 'owned'}>
                                  {deletingId === vdb.id ? t('common.deleting') : t('common.delete')}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('vdb.deleteConfirmTitle')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('vdb.deleteConfirmDesc', { name: vdb.name })}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(vdb.id, vdb.name)} disabled={deletingId === vdb.id}>
                                    {t('vdb.deleteConfirmButton')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </span>
                        </TooltipTrigger>
                        {vdb.status !== 'owned' && <TooltipContent>{t('vdb.onlyOwnerTeam')}</TooltipContent>}
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
      {/* 分享弹窗集成位 */}
      {shareDialogVdb && <VdbShareDialog vdb={shareDialogVdb} onClose={() => setShareDialogVdb(null)} onSuccess={mutate} />}
    </div>
  )
} 