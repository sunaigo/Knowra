"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { post } from "@/lib/request"
import { KnowledgeBaseForm } from "../kb-form"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { useTranslation } from 'react-i18next'

export default function KBCreatePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useTranslation()

  async function onSubmit(values: any) {
    setIsSubmitting(true)
    setError(null)
    try {
      await post("/kb/", values)
      toast.success(t('kb.createSuccess'), {
        description: t('kb.createSuccessDesc', { name: values.name }),
      })
      router.push("/kb")
      router.refresh() // 刷新页面以获取最新列表
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('kb.createFailed')
      setError(msg)
      toast.error(t('kb.createFailed'), {
        description: msg || t('kb.unknownError'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex justify-center px-4">
      <div className="w-full max-w-3xl space-y-6 py-8">
        <header>
          <CardTitle className="text-2xl">{t('kbCreate.title')}</CardTitle>
          <CardDescription>{t('kbCreate.desc')}</CardDescription>
        </header>

        <KnowledgeBaseForm
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          submitButtonText={t('kb.createButton')}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
} 