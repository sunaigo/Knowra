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

interface VDB {
  id: number
  name: string
  type: string
  team_id: number
  description?: string
  created_at: string
  updated_at: string
}

export default function VDBPage() {
  const router = useRouter()
  const { data, isLoading, error, mutate } = useSWR("/vdb", get)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ id: number; name: string } | null>(null)

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
    setDeleteDialog(null)
  }, [mutate])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">向量数据库管理</h2>
        <Button asChild>
          <Link href="/vdb/create">新建向量数据库</Link>
        </Button>
      </div>
      {isLoading ? (
        <div className="text-center text-muted-foreground">加载中...</div>
      ) : error ? (
        <div className="text-center text-red-500">加载失败: {error.message}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border bg-card rounded-lg">
            <thead>
              <tr className="bg-muted">
                <th className="px-4 py-2 text-left">名称</th>
                <th className="px-4 py-2 text-left">类型</th>
                <th className="px-4 py-2 text-left">团队ID</th>
                <th className="px-4 py-2 text-left">描述</th>
                <th className="px-4 py-2 text-left">创建时间</th>
                <th className="px-4 py-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">暂无数据</td></tr>
              ) : (
                data?.data?.map((vdb: VDB) => (
                  <tr key={vdb.id} className="border-b">
                    <td className="px-4 py-2">{vdb.name}</td>
                    <td className="px-4 py-2">{vdb.type}</td>
                    <td className="px-4 py-2">{vdb.team_id}</td>
                    <td className="px-4 py-2">{vdb.description || '-'}</td>
                    <td className="px-4 py-2">{new Date(vdb.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2 space-x-2">
                      <Button size="sm" variant="outline" onClick={() => router.push(`/vdb/${vdb.id}/edit`)}>编辑</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" disabled={deletingId === vdb.id}>
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
} 