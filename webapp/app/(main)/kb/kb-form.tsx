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
import { useRouter, useSearchParams } from "next/navigation"
import { get } from "@/lib/request"
import { useActiveTeamId, useTeams } from "@/stores/user-store"
import { useEffect, useState } from "react"
import { SvgIconPicker } from "@/components/svg-icon-picker"
import React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  name: z.string().min(2, { message: "名称至少需2个字符。" }),
  description: z.string(),
  team_id: z.coerce.number({ required_error: "必须选择一个团队。" }),
  chunk_size: z.coerce.number().min(100, { message: "分块大小至少为100。" }),
  overlap: z.coerce.number().min(0, { message: "重叠部分不能为负数。" }),
  auto_process_on_upload: z.boolean(),
  embedding_model_id: z.coerce.number().optional().nullable(),
  icon_name: z.string().optional(),
  collection_id: z.coerce.number({ required_error: "必须选择一个 Collection" }).nullable(),
  oss_connection_id: z.coerce.number().optional().nullable(),
  oss_bucket: z.string().optional().nullable(),
})

export type KnowledgeBaseFormValues = z.infer<typeof formSchema>;

interface KnowledgeBaseFormProps {
  initialData?: Partial<KnowledgeBaseFormValues>;
  onSubmit: (values: KnowledgeBaseFormValues) => Promise<void>;
  isSubmitting?: boolean;
  submitButtonText?: string;
  editingKbId?: number;
}

export function KnowledgeBaseForm({
  initialData,
  onSubmit,
  isSubmitting = false,
  submitButtonText = "保存",
  editingKbId,
}: KnowledgeBaseFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTeamId = useActiveTeamId()
  const userTeams = useTeams()
  
  const form = useForm<KnowledgeBaseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      team_id: initialData?.team_id || (searchParams.get('team_id') ? Number(searchParams.get('team_id')) : (activeTeamId ? Number(activeTeamId) : undefined)),
      chunk_size: initialData?.chunk_size || 5000,
      overlap: initialData?.overlap || 200,
      auto_process_on_upload: initialData?.auto_process_on_upload ?? true,
      embedding_model_id: initialData?.embedding_model_id ?? null,
      icon_name: initialData?.icon_name || "DocumentDuplicateIcon",
      collection_id: initialData?.collection_id ?? null,
      oss_connection_id: initialData?.oss_connection_id ?? null,
      oss_bucket: initialData?.oss_bucket ?? null,
    },
  })

  useEffect(() => {
    const teamIdFromUrl = searchParams.get('team_id')
    if (teamIdFromUrl) {
      form.setValue('team_id', Number(teamIdFromUrl))
    } else if (activeTeamId) {
      form.setValue('team_id', Number(activeTeamId))
    }
  }, [activeTeamId, searchParams, form])

  // 拉取 embedding 模型列表
  const [models, setModels] = React.useState<any[]>([])
  const [modelLoading, setModelLoading] = React.useState(false)
  useEffect(() => {
    async function fetchModels() {
      setModelLoading(true)
      try {
        const response = await get("/models?model_type=embedding")
        if (response && response.code === 200 && Array.isArray(response.data)) {
          setModels(response.data)
        }
      } catch (error) {
        console.error('获取模型列表失败:', error)
      } finally {
        setModelLoading(false)
      }
    }
    fetchModels()
  }, [])

  // 拉取团队下所有 VDB
  const [vdbs, setVdbs] = React.useState<any[]>([])
  useEffect(() => {
    async function fetchVdbs() {
      if (!activeTeamId) return
      try {
        const response = await get(`/vdb?team_id=${activeTeamId}`)
        if (response && response.code === 200 && Array.isArray(response.data)) {
          setVdbs(response.data)
        }
      } catch (error) {
        console.error('获取 VDB 列表失败:', error)
      }
    }
    fetchVdbs()
  }, [activeTeamId])

  const [selectedVdbId, setSelectedVdbId] = React.useState<number | null>(null)

  // 1. 新建时如果有 vdbs，自动选中第一个 vdb
  useEffect(() => {
    if (!initialData?.collection_id && vdbs && vdbs.length > 0 && !selectedVdbId) {
      setSelectedVdbId(vdbs[0].id)
    }
  }, [vdbs, initialData?.collection_id, selectedVdbId])

  // 组装所有 collection（预加载所有 vdb 下的 collection）
  const [allCollections, setAllCollections] = React.useState<any[]>([])
  useEffect(() => {
    async function fetchAllCollections() {
      if (!vdbs || vdbs.length === 0 || !activeTeamId) return
      let all: any[] = []
      for (const vdb of vdbs) {
        try {
          // 构建请求 URL，添加 exclude_bound 参数
          let url = `/collection?vdb_id=${vdb.id}&team_id=${activeTeamId}&exclude_bound=true`
          // 如果是编辑模式，传递 editing_kb_id
          if (editingKbId) {
            url += `&editing_kb_id=${editingKbId}`
          }
          const response = await get(url)
          if (response && response.code === 200 && Array.isArray(response.data)) {
            all = all.concat(response.data)
          }
        } catch (error) {
          // 忽略单个 VDB 的请求失败
        }
      }
      setAllCollections(all)
    }
    fetchAllCollections()
  }, [vdbs, activeTeamId, editingKbId])

  // 2. 编辑时根据 collection_id 反查 vdb_id
  useEffect(() => {
    async function fetchVdbIdByCollection() {
      if (initialData?.collection_id) {
        try {
          const response = await get(`/collection/${initialData.collection_id}`)
          if (response && response.code === 200 && response.data && response.data.vdb_id) {
            setSelectedVdbId(response.data.vdb_id)
          }
        } catch {}
      }
    }
    fetchVdbIdByCollection()
  }, [initialData?.collection_id])

  // 合并 OSS 连接和 bucket 下拉
  const [ossConnections, setOssConnections] = React.useState<any[]>([])
  const [ossBucketsMap, setOssBucketsMap] = React.useState<Record<number, string[]>>({})
  const [ossLoading, setOssLoading] = React.useState(false)
  const [ossSelectValue, setOssSelectValue] = React.useState<string>("")

  // 拉取 OSS 连接及其 bucket
  useEffect(() => {
    async function fetchOssConnectionsAndBuckets() {
      if (!activeTeamId) return
      setOssLoading(true)
      try {
        const res = await get(`/oss-connection?team_id=${activeTeamId}`)
        if (res && Array.isArray(res.data)) {
          setOssConnections(res.data)
          // 拉取每个连接的 bucket
          const bucketsMap: Record<number, string[]> = {}
          await Promise.all(res.data.map(async (conn: any) => {
            try {
              const bRes = await get(`/oss-connection/${conn.id}/buckets`)
              if (bRes && bRes.data) {
                if (Array.isArray(bRes.data)) {
                  bucketsMap[conn.id] = bRes.data
                } else {
                  bucketsMap[conn.id] = bRes.data.buckets || []
                }
              }
            } catch {}
          }))
          setOssBucketsMap(bucketsMap)
        }
      } catch {}
      setOssLoading(false)
    }
    fetchOssConnectionsAndBuckets()
  }, [activeTeamId])

  // OSS 下拉数据加载完后再回显
  useEffect(() => {
    if (ossConnections.length === 0 || Object.keys(ossBucketsMap).length === 0) return;
    if (initialData?.oss_connection_id && initialData?.oss_bucket) {
      setOssSelectValue(`${initialData.oss_connection_id}::${initialData.oss_bucket}`);
    } else {
      setOssSelectValue('local');
    }
  }, [ossConnections, ossBucketsMap, initialData?.oss_connection_id, initialData?.oss_bucket]);

  // 用本地 state 追踪 collection_id，确保 OSS 反显
  const [currentCollectionId, setCurrentCollectionId] = useState<number | null>(initialData?.collection_id ?? null)

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'collection_id') {
        setCurrentCollectionId(value.collection_id ?? null)
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  useEffect(() => {
    if (!currentCollectionId) {
      form.setValue('oss_connection_id', null)
      form.setValue('oss_bucket', null)
      setOssSelectValue('local')
      return
    }
    let ignore = false
    async function fetchCollectionDetailAndSetOSS() {
      const response = await get(`/collection/${currentCollectionId}`)
      if (response && response.code === 200 && response.data) {
        if (response.data.oss_connection_id && response.data.oss_bucket) {
          form.setValue('oss_connection_id', response.data.oss_connection_id)
          form.setValue('oss_bucket', response.data.oss_bucket)
          setOssSelectValue(`${response.data.oss_connection_id}::${response.data.oss_bucket}`)
        } else {
          form.setValue('oss_connection_id', null)
          form.setValue('oss_bucket', null)
          setOssSelectValue('local')
        }
      }
    }
    fetchCollectionDetailAndSetOSS()
    return () => { ignore = true }
  }, [currentCollectionId])

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
              name="team_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>所属团队</FormLabel>
                  <Select
                    value={field.value !== null && field.value !== undefined ? String(field.value) : ""}
                    onValueChange={val => field.onChange(val ? Number(val) : null)}
                    disabled={userTeams.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择一个团队" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {userTeams.length > 0 ? (
                        userTeams.map((team) => (
                          <SelectItem key={team.id} value={String(team.id)}>{team.name}</SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-2 text-muted-foreground">您不属于任何团队</div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>该知识库将属于您选择的团队。</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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
              name="icon_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>知识库图标</FormLabel>
                  <FormControl>
                    <SvgIconPicker
                      value={field.value || ""}
                      onChange={(value) => {
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>为知识库选择一个图标，便于识别。</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="embedding_model_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>向量模型</FormLabel>
                  <Select
                    value={field.value !== null && field.value !== undefined ? String(field.value) : ""}
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
            <FormField
              control={form.control}
              name="collection_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>向量库</FormLabel>
                  <Select
                    value={field.value !== null && field.value !== undefined ? String(field.value) : ""}
                    onValueChange={val => {
                      const selectedCollection = allCollections.find((c: any) => String(c.id) === val)
                      if (selectedCollection) {
                        setSelectedVdbId(selectedCollection.vdb_id)
                      }
                      field.onChange(val ? Number(val) : null)
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={vdbs && vdbs.length > 0 ? "请选择 Collection" : "暂无 Collection"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vdbs && vdbs.length > 0 ? (
                        vdbs.map((vdb: any) => {
                          const groupCollections = allCollections.filter((c: any) => c.vdb_id === vdb.id)
                          if (groupCollections.length === 0) return null
                          return (
                            <SelectGroup key={vdb.id}>
                              <SelectLabel>{vdb.name}</SelectLabel>
                              {groupCollections.map((c: any) => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                              ))}
                            </SelectGroup>
                          )
                        })
                      ) : (
                        <div className="px-2 py-2 text-muted-foreground">暂无可用 Collection</div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>请选择知识库要绑定的 Collection。</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* 合并 OSS 连接和 bucket 下拉 */}
            <FormField
              control={form.control}
              name="oss_connection_id"
              render={() => (
                <FormItem>
                  <FormLabel>OSS 存储位置</FormLabel>
                  <Select
                    value={ossSelectValue}
                    onValueChange={val => {
                      setOssSelectValue(val)
                      if (val === 'local') {
                        form.setValue('oss_connection_id', null)
                        form.setValue('oss_bucket', null)
                      } else {
                        const [cid, bucket] = val.split('::')
                        form.setValue('oss_connection_id', Number(cid))
                        form.setValue('oss_bucket', bucket)
                      }
                    }}
                    disabled={ossLoading || ossConnections.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={ossLoading ? "加载中..." : "请选择 OSS 存储位置（可选）"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="local">本地服务器（默认）</SelectItem>
                      {ossConnections.length > 0 && Object.keys(ossBucketsMap).length > 0 ? (
                        ossConnections.map((conn: any) => (
                          <SelectGroup key={conn.id}>
                            <SelectLabel>{conn.name}</SelectLabel>
                            {(ossBucketsMap[conn.id] || []).map((b: string) => (
                              <SelectItem key={b} value={`${conn.id}::${b}`}>{b}</SelectItem>
                            ))}
                          </SelectGroup>
                        ))
                      ) : (
                        <div className="px-2 py-2 text-muted-foreground">暂无可用 OSS 连接</div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>如未选择，文件将存储在本地服务器。</FormDescription>
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
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitButtonText}
            </Button>
        </div>
      </form>
    </Form>
  )
} 