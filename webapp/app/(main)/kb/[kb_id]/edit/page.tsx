"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { put, get } from "@/lib/request"
import { KnowledgeBaseForm } from "@/app/(main)/kb/kb-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchUser } from "@/stores/user-store"
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"

const EditKBSkeleton = () => (
    <div className="w-full max-w-3xl space-y-6">
        <header>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-full max-w-sm" />
        </header>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="mt-2 h-4 w-full max-w-md" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </CardContent>
            </Card>
            <Card>
                 <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="mt-2 h-4 w-full max-w-lg" />
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                     <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
             <div className="flex justify-end gap-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
            </div>
        </div>
    </div>
)

export default function KBEditPage() {
  const router = useRouter()
  const params = useParams()
  const kb_id = params.kb_id as string

  const [kbData, setKbData] = useState<any>({})
  const [isLoading, setIsLoading] = useState(false)
  const [kbError, setKbError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { t } = useTranslation();

  useEffect(() => {
    async function fetchKb() {
      if (!kb_id) return
      setIsLoading(true)
      setKbError(null)
      try {
        const response = await get(`/kb/${kb_id}`)
        if (response && response.code === 200 && response.data) {
          setKbData(response.data)
        } else {
          setKbError(t('kb.loadFailed'))
        }
      } catch (err: unknown) {
        setKbError((err as Error).message || t('kb.loadFailed'))
      } finally {
        setIsLoading(false)
      }
    }
    fetchKb()
  }, [kb_id, t])

  async function onSubmit(values: any) {
    setIsSubmitting(true)
    setError(null)
    try {
      await put(`/kb/${kb_id}`, values)
      toast.success(t('kb.updateSuccess'))
      
      await fetchUser()

      router.push(`/kb/${kb_id}`)
      router.refresh()
    } catch (err: unknown) {
      setError((err as Error).message || t('kb.updateFailed'))
       toast.error(err instanceof Error ? err.message : t('kb.updateFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return (
      <div className="flex justify-center px-4">
        <EditKBSkeleton />
      </div>
  )
  if (kbError) return <div className="text-red-500">{t('kb.loadFailed')}: {kbError}</div>

  return (
    <div className="flex justify-center px-4">
      <div className="w-full max-w-3xl space-y-6 py-8">
        <header>
          <h2 className="text-2xl font-bold">{t('kb.editTitle')}</h2>
          <CardDescription>{t('kb.editDesc', { name: kbData?.name })}</CardDescription>
        </header>

        <KnowledgeBaseForm
          initialData={kbData}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          submitButtonText={t('common.save')}
          editingKbId={Number(kb_id)}
        />
        
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
} 