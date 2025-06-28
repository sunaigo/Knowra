"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import useSWR from "swr"
import { get, del } from "@/lib/request"
import { useRouter } from "next/navigation"
import { useState, useCallback } from "react"
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
  const { data, isLoading, error, mutate } = useSWR(activeTeamId ? `/vdb?team_id=${activeTeamId}` : null, get)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [shareDialogVdb, setShareDialogVdb] = useState<VDB | null>(null)

  const handleDelete = useCallback(async (id: number, name: string) => {
    setDeletingId(id)
    try {
      await del(`/vdb/${id}`)
      toast.success("删除成功！")
      mutate()
    } catch (e: any) {
      toast.error(e?.message || "删除失败")
    }
    setDeletingId(null)
  }, [mutate])

  const isOwner = (vdb: VDB) => String(vdb.team_id) === String(activeTeamId)
  const isShared = (vdb: VDB) => Array.isArray(vdb.allowed_team_ids) && vdb.allowed_team_ids.includes(Number(activeTeamId)) && !isOwner(vdb)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">向量数据库管理</h2>
        <Button asChild disabled={!activeTeamId}>
          <Link href="/vdb/create">新建向量数据库</Link>
        </Button>
      </div>
      {isLoading ? (
        <div className="text-center text-muted-foreground">加载中...</div>
      ) : error ? (
        <div className="text-center text-red-500">加载失败: {error.message}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>团队ID</TableHead>
              <TableHead>归属</TableHead>
              <TableHead>描述</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
            ) : (
              data?.data?.map((vdb: VDB) => (
                <TableRow key={vdb.id} className={`border-b`}>
                  <TableCell>
                    <Link href={`/vdb/${vdb.id}/collections`} className="hover:underline">
                      {vdb.name}
                      {vdb.status === 'revoked' && <Badge variant="destructive" className="ml-2">已被取消分享</Badge>}
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
                              编辑
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {vdb.status !== 'owned' && <TooltipContent>仅拥有者团队可操作</TooltipContent>}
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button size="sm" variant="secondary" onClick={() => setShareDialogVdb(vdb)} disabled={vdb.status !== 'owned'}>
                              分享
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {vdb.status !== 'owned' && <TooltipContent>仅拥有者团队可操作</TooltipContent>}
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" disabled={deletingId === vdb.id || vdb.status !== 'owned'}>
                                  {deletingId === vdb.id ? "删除中..." : "删除"}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认删除？</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    确定要删除向量数据库「{vdb.name}」吗？此操作不可恢复。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(vdb.id, vdb.name)} disabled={deletingId === vdb.id}>
                                    确认删除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </span>
                        </TooltipTrigger>
                        {vdb.status !== 'owned' && <TooltipContent>仅拥有者团队可操作</TooltipContent>}
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