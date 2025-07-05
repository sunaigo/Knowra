"use client"

import { useEffect, useState, useMemo } from "react"
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
import { DataTable } from '@/components/ui/data-table'
import * as z from 'zod'
import { useTranslation } from 'react-i18next'

interface OSSConnection {
  id: number
  name: string
  endpoint: string
  region?: string | null
  description?: string | null
  team_id: number
  maintainer_id: number
  status: string
  created_at: string
  updated_at: string
  shared_team_ids?: number[]
  team_name?: string | null
}

// zod schema 定义
const OSSConnectionSchema = z.object({
  id: z.number(),
  name: z.string(),
  endpoint: z.string(),
  region: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  team_id: z.number(),
  maintainer_id: z.number(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  shared_team_ids: z.array(z.number()).optional().nullable(),
  team_name: z.string().optional().nullable(),
})
const OSSConnectionListSchema = z.array(OSSConnectionSchema)
const BucketsSchema = z.array(z.string())

// 前端表单类型，参考后端 OSSConnectionCreate schema
interface OSSConnectionForm {
  name: string;
  endpoint: string;
  access_key: string;
  secret_key: string;
  region?: string | null;
  description?: string | null;
  team_id: number;
  maintainer_id: number;
  status?: string;
}

export function BucketListTable({ buckets, onShare }: { buckets: string[], onShare?: (bucket: string) => void }) {
  const { t } = useTranslation()
  type BucketRow = { name: string }
  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: t('oss.name'),
      cell: ({ row }: { row: { original: BucketRow } }) => (
        <span className="truncate max-w-[160px]" title={row.original.name}>{row.original.name}</span>
      ),
    },
    {
      id: 'actions',
      header: t('common.action'),
      cell: ({ row }: { row: { original: BucketRow } }) => (
        onShare ? <Button size="sm" variant="secondary" onClick={() => onShare(row.original.name)}>{t('common.share')}</Button> : null
      ),
    },
  ], [t])
  const data = buckets.map(b => ({ name: b }))
  return <DataTable columns={columns} data={data} />
}

export default function FileStoragePage() {
  // TODO: 替换为实际团队ID和用户ID
  const teamId = 1
  const maintainerId = 1
  const [connections, setConnections] = useState<OSSConnection[]>([])
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<OSSConnection | null>(null)
  const [form, setForm] = useState<OSSConnectionForm>({
    name: '',
    endpoint: '',
    access_key: '',
    secret_key: '',
    region: '',
    description: '',
    team_id: teamId,
    maintainer_id: maintainerId,
    status: 'enabled',
  })
  const [buckets, setBuckets] = useState<string[]>([])
  const [showBuckets, setShowBuckets] = useState<number | null>(null)
  const [testStatus, setTestStatus] = useState<null | 'success' | 'error' | 'loading'>(null)
  const [testError, setTestError] = useState<string>("")
  const [shareDialogOss, setShareDialogOss] = useState<OSSConnection | null>(null)
  const teams = useTeams()
  const activeTeamId = useActiveTeamId()
  const router = useRouter()
  const { t } = useTranslation()

  const fetchConnections = async () => {
    setLoading(true)
    try {
      const res = await get(`/oss-connection?team_id=${activeTeamId}`)
      const parsed = OSSConnectionListSchema.safeParse(res.data)
      if (parsed.success) {
        setConnections(parsed.data.map(conn => ({
          ...conn,
          shared_team_ids: conn.shared_team_ids ?? [],
        })))
      } else {
        toast.error(t('oss.ossConnectionDataFormatIncorrect'))
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.getOSSConnectionFailed'))
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
    if (conn) {
      setForm({
        name: conn.name,
        endpoint: conn.endpoint,
        access_key: '',
        secret_key: '',
        region: conn.region ?? '',
        description: conn.description ?? '',
        team_id: conn.team_id,
        maintainer_id: conn.maintainer_id,
        status: conn.status ?? 'enabled',
      })
    } else {
      setForm({
        name: '',
        endpoint: '',
        access_key: '',
        secret_key: '',
        region: '',
        description: '',
        team_id: teamId,
        maintainer_id: maintainerId,
        status: 'enabled',
      })
    }
    setShowDialog(true)
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await put(`/oss-connection/${editing.id}`, form)
        toast.success(t('oss.updateSuccess'))
      } else {
        await post("/oss-connection", form)
        toast.success(t('oss.newSuccess'))
      }
      setShowDialog(false)
      fetchConnections()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.saveFailed'))
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('oss.deleteConfirmTitle'))) return
    try {
      await del(`/oss-connection/${id}`)
      toast.success(t('oss.deleteSuccess'))
      fetchConnections()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('oss.deleteFailed'))
    }
  }

  const handleTest = async () => {
    setTestStatus('loading')
    setTestError("")
    try {
      const res = await post<{ code: number; message?: string }>("/oss-connection/test", {
        endpoint: form.endpoint,
        access_key: form.access_key,
        secret_key: form.secret_key,
        region: form.region,
      })
      if (res.code === 0) {
        setTestStatus('success')
      } else {
        setTestStatus('error')
        setTestError(res.message || t('common.connectionFailed'))
      }
    } catch (e) {
      setTestStatus('error')
      setTestError(e instanceof Error ? e.message : t('common.connectionFailed'))
    }
  }

  const handleShowBuckets = async (conn: OSSConnection) => {
    setShowBuckets(conn.id)
    setBuckets([])
    try {
      const res = await get(`/oss-connection/${conn.id}/buckets`)
      const parsed = BucketsSchema.safeParse(res.data)
      if (parsed.success) {
        setBuckets(parsed.data)
      } else {
        toast.error(t('common.bucketDataFormatIncorrect'))
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.getBucketFailed'))
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t('oss.title')}</h2>
        <Button onClick={() => handleOpenDialog()}>{t('oss.newOSSConnection')}</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('common.name')}</TableHead>
            <TableHead>{t('oss.type')}</TableHead>
            <TableHead>{t('oss.size')}</TableHead>
            <TableHead>{t('oss.status')}</TableHead>
            <TableHead>{t('common.createdAt')}</TableHead>
            <TableHead>{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {connections.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>
          ) : (
            connections.map(conn => {
              const isShared = String(conn.team_id) !== String(activeTeamId) && Array.isArray(conn.shared_team_ids) && (conn.shared_team_ids ?? []).map(String).includes(String(activeTeamId))
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
                    <Button size="sm" variant="secondary" onClick={() => router.push(`/oss/bucket/${conn.id}`)}>{t('actions.view')}</Button>
                    {conn.team_id === Number(activeTeamId) && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleOpenDialog(conn)}>{t('actions.edit')}</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(conn.id)}>{t('actions.delete')}</Button>
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
            <DialogTitle>{t('oss.editTitle')}</DialogTitle>
          </DialogHeader>
          <DialogDescription>{t('oss.fillOSSS3ConnectionInfo')}</DialogDescription>
          <div className="space-y-4">
            <Input placeholder={t('common.name')} value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input placeholder={t('common.endpoint')} value={form.endpoint || ""} onChange={e => setForm({ ...form, endpoint: e.target.value })} />
            <Input placeholder={t('common.region')} value={form.region || ""} onChange={e => setForm({ ...form, region: e.target.value })} />
            <Input placeholder={t('common.accessKey')} value={form.access_key || ""} onChange={e => setForm({ ...form, access_key: e.target.value })} type="password" autoComplete="new-password" />
            <Input placeholder={t('common.secretKey')} value={form.secret_key || ""} onChange={e => setForm({ ...form, secret_key: e.target.value })} type="password" autoComplete="new-password" />
            <Input placeholder={t('common.description')} value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} />
            <div className="flex gap-2 items-center">
              <Button type="button" variant="secondary" onClick={handleTest} disabled={testStatus === 'loading'}>
                {testStatus === 'loading' && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
                {testStatus === 'success' && <Check className="text-green-500 w-4 h-4 mr-2" />}
                {testStatus === 'error' && <X className="text-red-500 w-4 h-4 mr-2" />}
                {t('common.testConnection')}
              </Button>
              {testError && <span className="text-xs text-red-500 ml-2">{testError}</span>}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave}>{t('common.save')}</Button>
            <Button variant="secondary" onClick={() => setShowDialog(false)}>{t('common.cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 分享弹窗 */}
      {shareDialogOss && <OssConnectionShareDialog oss={shareDialogOss} onClose={() => setShareDialogOss(null)} onSuccess={fetchConnections} />}
    </div>
  )
} 