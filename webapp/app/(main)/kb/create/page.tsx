"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { post } from "@/lib/request"
import { KnowledgeBaseForm, KnowledgeBaseFormValues } from "../kb-form"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export default function KBCreatePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(values: KnowledgeBaseFormValues) {
    setIsSubmitting(true)
    setError(null)
    try {
      await post("/kb/", values)
      toast.success("创建成功", {
        description: `知识库 "${values.name}" 已成功创建。`,
      })
      router.push("/kb")
      router.refresh() // 刷新页面以获取最新列表
    } catch (err: any) {
      setError(err.message || "创建失败，请稍后再试。")
      toast.error("创建失败", {
        description: err.message || "未知错误，请检查您的网络或联系管理员。",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex justify-center px-4">
      <div className="w-full max-w-3xl space-y-6 py-8">
        <header>
          <CardTitle className="text-2xl">新建知识库</CardTitle>
          <CardDescription className="mt-2">
            创建一个新的知识库来管理您的文档集合。
          </CardDescription>
        </header>

        <KnowledgeBaseForm
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          submitButtonText="创建知识库"
        />

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
} 