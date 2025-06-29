"use client"

import { useEffect, useState } from "react"
import { get, post, put, del } from "@/lib/request"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Check, X, Loader2 } from "lucide-react"
import { OssConnectionShareDialog } from '@/components/oss-connection-share-dialog'
import { useTeams, useActiveTeamId } from '@/stores/user-store'
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'

interface OSSConnection {
  id: number
  name: string
  endpoint: string
  region?: string
  description?: string
  team_id: number
  maintainer_id: number
  status: string
  created_at: string
  updated_at: string
  shared_team_ids?: number[]
  team_name?: string
}

export function BucketListTable({ buckets, onShare }: { buckets: string[], onShare?: (bucket: string) => void }) {
  type BucketRow = { name: string }
  const columns: ColumnDef<BucketRow>[] = [
    {
      accessorKey: 'name',
      header: '名称',
      cell: ({ row }) => (
        <span className="truncate max-w-[160px]" title={row.original.name}>{row.original.name}</span>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        onShare ? <Button size="sm" variant="secondary" onClick={() => onShare(row.original.name)}>分享</Button> : null
      ),
    },
  ]
  const data = buckets.map(b => ({ name: b }))
  return <DataTable columns={columns} data={data} />
}

export default function FileStoragePage() {
  const [connections, setConnections] = useState<OSSConnection[]>([])
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<OSSConnection | null>(null)
  const [form, setForm] = useState<any>({})
  const [buckets, setBuckets] = useState<string[]>([])
  const [showBuckets, setShowBuckets] = useState<number | null>(null)
  const [testStatus, setTestStatus] = useState<null | 'success' | 'error' | 'loading'>(null)
  const [testError, setTestError] = useState<string>("")
  const [shareDialogOss, setShareDialogOss] = useState<OSSConnection | null>(null)
  const teams = useTeams()
  const activeTeamId = useActiveTeamId()
  const router = useRouter()

  // TODO: 替换为实际团队ID和用户ID
  const teamId = 1
  const maintainerId = 1

  const fetchConnections = async () => {
    setLoading(true)
    try {
      const res = await get(`/oss-connection?team_id=${activeTeamId}`)
      setConnections(res.data || [])
    } catch (e: any) {
      toast.error(e.message || "获取OSS连接失败")
    }
    setLoading(false)
  }

  useEffect(() => {
    if (activeTeamId) {
      fetchConnections()
    }
  }, [activeTeamId])

  useEffect(() => {
    if (showDialog) {
      setTestStatus(null)
      setTestError("")
    }
  }, [showDialog])

  const handleOpenDialog = (conn?: OSSConnection) => {
    setEditing(conn || null)
    setForm(conn ? { ...conn, access_key: "", secret_key: "" } : { team_id: teamId, maintainer_id: maintainerId })
    setShowDialog(true)
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await put(`/oss-connection/${editing.id}`, form)
        toast.success("更新成功")
      } else {
        await post("/oss-connection", form)
        toast.success("新建成功")
      }
      setShowDialog(false)
      fetchConnections()
    } catch (e: any) {
      toast.error(e.message || "保存失败")
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm("确定要删除该连接吗？")) return
    try {
      await del(`/oss-connection/${id}`)
      toast.success("删除成功")
      fetchConnections()
    } catch (e: any) {
      toast.error(e.message || "删除失败")
    }
  }

  const handleTest = async () => {
    setTestStatus('loading')
    setTestError("")
    try {
      const res = await post("/oss-connection/test", {
        endpoint: form.endpoint,
        access_key: form.access_key,
        secret_key: form.secret_key,
        region: form.region,
      })
      if (res.code === 0) {
        setTestStatus('success')
      } else {
        setTestStatus('error')
        setTestError(res.message || "连接失败")
      }
    } catch (e: any) {
      setTestStatus('error')
      setTestError(e.message || "连接失败")
    }
  }

  const handleShowBuckets = async (conn: OSSConnection) => {
    setShowBuckets(conn.id)
    setBuckets([])
    try {
      const res = await get(`/oss-connection/${conn.id}/buckets`)
      setBuckets(res.data || [])
    } catch (e: any) {
      toast.error(e.message || "获取bucket失败")
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">文件存储位置（OSS/S3）管理</h2>
        <Button onClick={() => handleOpenDialog()}>新建OSS连接</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>描述</TableHead>
            <TableHead>拥有者</TableHead>
            <TableHead>创建日期</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {connections.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
          ) : (
            connections.map(conn => {
              const isShared = String(conn.team_id) !== String(activeTeamId) && Array.isArray(conn.shared_team_ids) && conn.shared_team_ids.map(String).includes(String(activeTeamId))
              const currentTeamName = teams.find(t => t.id === Number(activeTeamId))?.name || '-'
              return (
                <TableRow key={conn.id}>
                  <TableCell>
                    <span className="text-primary cursor-pointer hover:underline" onClick={() => router.push(`/documents/bucket/${conn.id}`)}>{conn.name}</span>
                  </TableCell>
                  <TableCell>{conn.description || '-'}</TableCell>
                  <TableCell>{conn.team_id === Number(activeTeamId) ? currentTeamName : conn.team_name}</TableCell>
                  <TableCell>{new Date(conn.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="secondary" onClick={() => router.push(`/documents/bucket/${conn.id}`)}>查看Bucket</Button>
                    {conn.team_id === Number(activeTeamId) && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleOpenDialog(conn)}>编辑</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(conn.id)}>删除</Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
      {/* 新建/编辑弹窗 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "编辑OSS连接" : "新建OSS连接"}</DialogTitle>
          </DialogHeader>
          <DialogDescription>填写 OSS/S3 连接信息，支持测试连通性。</DialogDescription>
          <div className="space-y-4">
            <Input placeholder="名称" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Endpoint" value={form.endpoint || ""} onChange={e => setForm({ ...form, endpoint: e.target.value })} />
            <Input placeholder="Region" value={form.region || ""} onChange={e => setForm({ ...form, region: e.target.value })} />
            <Input placeholder="Access Key" value={form.access_key || ""} onChange={e => setForm({ ...form, access_key: e.target.value })} type="password" autoComplete="new-password" />
            <Input placeholder="Secret Key" value={form.secret_key || ""} onChange={e => setForm({ ...form, secret_key: e.target.value })} type="password" autoComplete="new-password" />
            <Input placeholder="描述" value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} />
            <div className="flex gap-2 items-center">
              <Button type="button" variant="secondary" onClick={handleTest} disabled={testStatus === 'loading'}>
                {testStatus === 'loading' && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
                {testStatus === 'success' && <Check className="text-green-500 w-4 h-4 mr-2" />}
                {testStatus === 'error' && <X className="text-red-500 w-4 h-4 mr-2" />}
                测试连接
              </Button>
              {testError && <span className="text-xs text-red-500 ml-2">{testError}</span>}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave}>{editing ? "保存" : "新建"}</Button>
            <Button variant="secondary" onClick={() => setShowDialog(false)}>取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 分享弹窗 */}
      {shareDialogOss && <OssConnectionShareDialog oss={shareDialogOss} onClose={() => setShareDialogOss(null)} onSuccess={fetchConnections} />}
    </div>
  )
} 