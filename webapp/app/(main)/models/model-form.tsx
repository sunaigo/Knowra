"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { put, fetcher, post } from "@/lib/request"
import { modelSchema, Model, MODEL_TYPE_SCHEMA } from "@/schemas/model"
import { Connection } from "@/schemas/connection"
import useSWR from "swr"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, Check, X } from "lucide-react"

const formSchema = modelSchema.pick({
  model_name: true,
  model_type: true,
  connection_id: true,
  description: true,
})

type FormValues = z.infer<typeof formSchema>

interface ModelFormProps {
  initialData?: Model | null
}

type TestStatus = "idle" | "loading" | "success" | "error"

export default function ModelForm({ initialData }: ModelFormProps) {
  const router = useRouter()
  const {
    data: connections,
    isLoading: isLoadingConnections,
    error: connectionsError,
  } = useSWR<Connection[]>("/connections", fetcher)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [testStatus, setTestStatus] = useState<TestStatus>("idle")
  const [testError, setTestError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      model_name: "",
      model_type: "llm",
      connection_id: undefined,
      description: "",
    },
  })

  const selectedConnectionId = form.watch("connection_id")
  const modelName = form.watch("model_name")

  useEffect(() => {
    if (initialData) {
      form.reset({
        model_name: initialData.model_name,
        model_type: initialData.model_type,
        connection_id: initialData.connection?.id,
        description: initialData.description ?? "",
      })
    }
  }, [initialData, form])

  useEffect(() => {
    setTestStatus("idle")
    setTestError(null)
  }, [selectedConnectionId, modelName])

  const handleTestConnection = async () => {
    if (!selectedConnectionId) {
      toast.error("请先选择一个连接")
      return
    }

    const currentModelName = form.getValues("model_name")
    if (!currentModelName) {
      toast.error("请输入模型名称以进行测试")
      return
    }

    setTestStatus("loading")
    setTestError(null)

    const url = `/connections/${selectedConnectionId}/test?model_name=${encodeURIComponent(
      currentModelName
    )}`

    try {
      await post(url, {})
      setTestStatus("success")
      toast.success("连接测试成功！")
    } catch (err: any) {
      setTestStatus("error")
      const errorMessage =
        err.detail || err.message || "An unexpected error occurred."
      setTestError(errorMessage)
      toast.error(`连接测试失败`)
    }
  }

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      if (initialData) {
        await put(`/models/${initialData.id}`, values)
        toast.success("模型更新成功！")
      } else {
        await post("/models", values)
        toast.success("模型创建成功！")
      }
      router.push("/models")
      router.refresh() // To ensure the list is updated
    } catch (error: any) {
      const errorMessage =
        error.detail || error.message || "An unexpected error occurred."
      toast.error(
        `${initialData ? "更新" : "创建"}失败: ${errorMessage}`
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = initialData ? "编辑模型" : "新建模型"
  const description = initialData
    ? "修改模型的详细信息。"
    : "创建一个新的 AI 模型。"

  if (isLoadingConnections) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (connectionsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>加载失败</CardTitle>
          <CardDescription>{connectionsError.message}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="model_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>模型名称</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：GPT-4o" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="model_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>模型用途</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择一个模型用途" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MODEL_TYPE_SCHEMA.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="connection_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>连接</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择一个连接" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {connections?.map((conn) => (
                        <SelectItem key={conn.id} value={conn.id.toString()}>
                          {conn.name} ({conn.provider})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="关于这个模型的一些描述"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={
                      isSubmitting ||
                      !selectedConnectionId ||
                      testStatus === "loading"
                    }
                    className="w-[120px] transition-all"
                  >
                    {testStatus === "idle" && "测试连接"}
                    {testStatus === "loading" && (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>测试中...</span>
                      </>
                    )}
                    {testStatus === "success" && (
                      <>
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        <span>测试成功</span>
                      </>
                    )}
                    {testStatus === "error" && (
                      <>
                        <X className="mr-2 h-4 w-4 text-red-500" />
                        <span>测试失败</span>
                      </>
                    )}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "保存中..." : "保存"}
                  </Button>
                </div>
                {testStatus === "error" && testError && (
                  <p className="text-sm text-red-500">{testError}</p>
                )}
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
} 