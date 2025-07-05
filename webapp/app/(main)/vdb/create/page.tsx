"use client"

import { VDBForm } from "../vdb-form"
import { useRouter } from "next/navigation"
import { post } from "@/lib/request"
import { toast } from "sonner"
import type { VDBFormValues } from "../vdb-form"
import { useTranslation } from 'react-i18next'

export default function VDBCreatePage() {
  const router = useRouter()
  const { t } = useTranslation()

  async function handleSubmit(data: Record<string, unknown>) {
    try {
      await post("/vdb", data)
      toast.success(t('vdb.createSuccess'))
      router.push("/vdb")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('vdb.createFailed'))
    }
  }

  return (
    <div className="max-w-xl mx-auto py-8">
      <h2 className="text-2xl font-bold tracking-tight">{t('vdbCreate.title')}</h2>
      <p className="text-muted-foreground">{t('vdbCreate.desc')}</p>
      <VDBForm onSubmit={handleSubmit} submitButtonText={t('actions.create')} />
    </div>
  )
} 