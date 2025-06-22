"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { fetcher } from "@/lib/request"

const formSchema = z.object({
  name: z.string().min(2, { message: "名称至少需要2个字符。" }),
  description: z.string(),
  chunk_size: z.coerce.number().min(100, { message: "分块大小至少为100。" }),
  overlap: z.coerce.number().min(0, { message: "重叠部分不能为负数。" }),
  auto_process_on_upload: z.boolean(),
  embedding_model_id: z.coerce.number().optional().nullable(),
})

export type KnowledgeBaseFormValues = z.infer<typeof formSchema>;

interface KnowledgeBaseFormProps {
  initialData?: Partial<KnowledgeBaseFormValues>;
  onSubmit: (values: KnowledgeBaseFormValues) => Promise<void>;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

export function KnowledgeBaseForm({
  initialData,
  onSubmit,
  isSubmitting = false,
  submitButtonText = "保存",
}: KnowledgeBaseFormProps) {
  const router = useRouter();
  const form = useForm<KnowledgeBaseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      chunk_size: initialData?.chunk_size || 5000,
      overlap: initialData?.overlap || 200,
      auto_process_on_upload: initialData?.auto_process_on_upload ?? true,
      embedding_model_id: initialData?.embedding_model_id ?? null,
    },
  })

  // 拉取 embedding 模型列表
  const { data: models, isLoading: modelLoading } = useSWR(
    "/models?model_type=embedding",
    fetcher
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>为您的知识库设置一个清晰的名称和描述。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>知识库名称</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：产品文档" {...field} />
                  </FormControl>
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
                    <Textarea
                      placeholder="简单描述这个知识库的用途"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="embedding_model_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Embedding 模型</FormLabel>
                  <Select
                    value={field.value ? String(field.value) : undefined}
                    onValueChange={val => field.onChange(val ? Number(val) : null)}
                    disabled={modelLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={modelLoading ? "加载中..." : "请选择 Embedding 模型"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {models && models.length > 0 ? (
                        models.map((m: any) => (
                          <SelectItem key={m.id} value={String(m.id)}>{m.model_name}</SelectItem>
                        ))
                      ) : modelLoading ? (
                        <div className="flex items-center px-2 py-2 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />加载中...</div>
                      ) : (
                        <div className="px-2 py-2 text-muted-foreground">暂无可用模型</div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>选择用于文本向量化的 embedding 模型。</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>文本分割参数</CardTitle>
            <CardDescription>
              这些参数将影响文档被处理和分割的方式，以用于RAG检索。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                  control={form.control}
                  name="chunk_size"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>分块大小 (Chunk Size)</FormLabel>
                      <FormControl>
                          <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>
                          每个文本块的最大字符数。
                      </FormDescription>
                      <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="overlap"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>重叠部分 (Overlap)</FormLabel>
                      <FormControl>
                          <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>
                          连续文本块之间的重叠字符数。
                      </FormDescription>
                      <FormMessage />
                      </FormItem>
                  )}
              />
            </div>
            <FormField
              control={form.control}
              name="auto_process_on_upload"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>自动处理</FormLabel>
                    <FormDescription>
                      开启后，上传文档将自动进入处理队列。
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
                取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "处理中..." : submitButtonText}
            </Button>
        </div>
      </form>
    </Form>
  )
} 