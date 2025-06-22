"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import useSWR from "swr"
import { put } from "@/lib/request"
import { KnowledgeBaseForm, KnowledgeBaseFormValues } from "@/app/(main)/kb/kb-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

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

  const { data: kbData, error: kbError, isLoading } = useSWR(kb_id ? `/kb/${kb_id}` : null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(values: KnowledgeBaseFormValues) {
    setIsSubmitting(true)
    setError(null)
    try {
      await put(`/kb/${kb_id}`, values)
      toast.success("更新成功", {
        description: `知识库 "${values.name}" 已成功更新。`,
      })
      router.push(`/kb/${kb_id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || "更新失败，请稍后再试。")
       toast.error("更新失败", {
        description: err.message || "未知错误，请检查您的网络或联系管理员。",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return (
      <div className="flex justify-center px-4">
        <EditKBSkeleton />
      </div>
  )
  if (kbError) return <div className="text-red-500">加载知识库数据失败: {kbError.message}</div>

  return (
    <div className="flex justify-center px-4">
      <div className="w-full max-w-3xl space-y-6 py-8">
        <header>
          <CardTitle className="text-2xl">编辑知识库</CardTitle>
          <CardDescription className="mt-2">
            更新您的知识库 "{kbData?.name}" 的详细信息。
          </CardDescription>
        </header>

        <KnowledgeBaseForm
          initialData={kbData}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          submitButtonText="保存更改"
        />
        
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
} 