"use client"

import { VDBForm } from "../vdb-form"
import { useRouter } from "next/navigation"
import { post } from "@/lib/request"
import { toast } from "sonner"

export default function VDBCreatePage() {
  const router = useRouter()

  async function handleSubmit(values: any) {
    try {
      await post("/vdb", values)
      toast.success("创建成功！")
      router.push("/vdb")
    } catch (e: any) {
      toast.error(e?.message || "创建失败")
    }
  }

  return (
    <div className="max-w-xl mx-auto py-8">
      <h2 className="text-xl font-bold mb-6">新建向量数据库</h2>
      <VDBForm onSubmit={handleSubmit} />
    </div>
  )
} 