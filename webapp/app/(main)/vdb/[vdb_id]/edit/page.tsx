"use client"

import { VDBForm } from "@/app/(main)/vdb/vdb-form"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { get, put } from "@/lib/request"
import { toast } from "sonner"

export default function VDBEditPage() {
  const router = useRouter()
  const params = useParams()
  const vdb_id = params?.vdb_id as string
  const [initialData, setInitialData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await get(`/vdb/${vdb_id}`)
        setInitialData(res.data)
      } catch {
        toast.error("加载失败")
      }
      setLoading(false)
    }
    if (vdb_id) fetchData()
  }, [vdb_id])

  async function handleSubmit(values: any) {
    try {
      await put(`/vdb/${vdb_id}`, values)
      toast.success("保存成功！")
      router.push("/vdb")
    } catch (e: any) {
      toast.error(e?.message || "保存失败")
    }
  }

  if (loading) return <div className="p-8 text-center">加载中...</div>

  return (
    <div className="max-w-xl mx-auto py-8">
      <h2 className="text-xl font-bold mb-6">编辑向量数据库</h2>
      <VDBForm initialData={initialData} onSubmit={handleSubmit} submitButtonText="保存" />
    </div>
  )
} 