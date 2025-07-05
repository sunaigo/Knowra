"use client"

import { VDBForm } from "@/app/(main)/vdb/vdb-form"
import type { VDBFormProps, VDBFormValues } from "@/app/(main)/vdb/vdb-form"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { get, put } from "@/lib/request"
import { toast } from "sonner"
import { useTranslation } from 'react-i18next'

export default function VDBEditPage() {
  const router = useRouter()
  const params = useParams()
  const vdb_id = params?.vdb_id as string
  const [initialData, setInitialData] = useState<VDBFormProps['initialData']>()
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await get(`/vdb/${vdb_id}`)
        setInitialData({
          name: res.data?.name ?? '',
          type: res.data?.type ?? '',
          team_id: res.data?.team_id ?? '',
          ...res.data
        })
      } catch {
        toast.error(t('vdb.loadFailed'))
      }
      setLoading(false)
    }
    if (vdb_id) fetchData()
  }, [vdb_id, t])

  async function handleSubmit(data: Record<string, unknown>) {
    try {
      await put(`/vdb/${vdb_id}`, data)
      toast.success(t('vdb.updateSuccess'))
      router.push("/vdb")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('vdb.updateFailed'))
    }
  }

  if (loading) return <div className="p-8 text-center">{t('common.loading')}</div>

  return (
    <div className="max-w-xl mx-auto py-8">
      <h2 className="text-2xl font-bold tracking-tight">{t('vdbEdit.title')}</h2>
      <p className="text-muted-foreground">{t('vdbEdit.desc')}</p>
      <VDBForm initialData={initialData} onSubmit={handleSubmit} submitButtonText={t('common.save')} />
    </div>
  )
} 