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
import { useTranslation } from "react-i18next"

// 在组件外部重新定义 KnowledgeBaseFormProps 类型
type KnowledgeBaseFormProps = {
  initialData?: Partial<any>; // 这里先用 any，后续在组件内部用正确类型覆盖
  onSubmit: (values: any) => Promise<void>;
  isSubmitting?: boolean;
  submitButtonText?: string;
  editingKbId?: number;
};

export function KnowledgeBaseForm({
  initialData,
  onSubmit,
  isSubmitting = false,
  submitButtonText = "save",
  editingKbId,
}: KnowledgeBaseFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTeamId = useActiveTeamId()
  const userTeams = useTeams()
  const { t } = useTranslation();

  const formSchema = React.useMemo(() => z.object({
    name: z.string().min(2, { message: t('kbForm.nameMin') }),
    description: z.string(),
    team_id: z.coerce.number({ required_error: t('kbForm.teamRequired') }),
    chunk_size: z.coerce.number().min(100, { message: t('kbForm.chunkSizeMin') }),
    overlap: z.coerce.number().min(0, { message: t('kbForm.overlapMin') }),
    auto_process_on_upload: z.boolean(),
    embedding_model_id: z.coerce.number().optional().nullable(),
    icon_name: z.string().optional(),
    collection_id: z.coerce.number({ required_error: t('kbForm.collectionRequired') }).nullable(),
    oss_connection_id: z.coerce.number().optional().nullable(),
    oss_bucket: z.string().optional().nullable(),
  }), [t]);

  type KnowledgeBaseFormValues = z.infer<typeof formSchema>;

  const form = useForm<KnowledgeBaseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      team_id: initialData?.team_id ?? 0,
      chunk_size: initialData?.chunk_size ?? 5000,
      overlap: initialData?.overlap ?? 200,
      auto_process_on_upload: initialData?.auto_process_on_upload ?? true,
      embedding_model_id: initialData?.embedding_model_id ?? null,
      icon_name: initialData?.icon_name ?? "DocumentDuplicateIcon",
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
  const [models, setModels] = React.useState<EmbeddingModel[]>([])
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
  const [vdbs, setVdbs] = React.useState<VDB[]>([])
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
  const [allCollections, setAllCollections] = React.useState<Collection[]>([])
  useEffect(() => {
    async function fetchAllCollections() {
      if (!vdbs || vdbs.length === 0 || !activeTeamId) return
      let all: Collection[] = []
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
  const [ossConnections, setOssConnections] = React.useState<OSSConnection[]>([])
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
          await Promise.all(res.data.map(async (conn: OSSConnection) => {
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

  // ===== 类型定义（建议后续可单独提取到 types 文件） =====
  interface EmbeddingModel {
    id: number
    model_name: string
    model_type: 'embedding'
    description?: string
    // ...其它字段
  }

  interface VDB {
    id: number
    name: string
    type: string
    team_id: number
    description?: string
    connection_config: Record<string, unknown>
    // ...其它字段
  }

  interface Collection {
    id: number
    name: string
    description?: string
    vdb_id: number
    team_id: number
    owner_id: number
    created_at: string
    updated_at: string
    // ...其它字段
  }

  interface OSSConnection {
    id: number
    name: string
    type: string
    config: {
      endpoint: string;
      access_key: string;
      secret_key: string;
      region?: string;
    }
    // ...其它字段
  }
  // ===== END 类型定义 =====

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('knowledgeBase.title')}</CardTitle>
            <CardDescription>{t('kbForm.basicInfoDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="team_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.team')}</FormLabel>
                  <Select
                    value={field.value !== null && field.value !== undefined ? String(field.value) : ""}
                    onValueChange={val => field.onChange(val ? Number(val) : null)}
                    disabled={userTeams.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('kbForm.teamPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {userTeams.length > 0 ? (
                        userTeams.map((team) => (
                          <SelectItem key={team.id} value={String(team.id)}>{team.name}</SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-2 text-muted-foreground">{t('kbForm.noTeam')}</div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>{t('kbForm.teamDesc')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('kbForm.namePlaceholder')} {...field} />
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
                  <FormLabel>{t('common.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('kbForm.descriptionPlaceholder')}
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
                  <FormLabel>{t('kbForm.icon')}</FormLabel>
                  <FormControl>
                    <SvgIconPicker
                      value={field.value || ""}
                      onChange={(value) => {
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>{t('kbForm.iconDesc')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="embedding_model_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('kbForm.embeddingModel')}</FormLabel>
                  <Select
                    value={field.value !== null && field.value !== undefined ? String(field.value) : ""}
                    onValueChange={val => field.onChange(val ? Number(val) : null)}
                    disabled={modelLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={modelLoading ? t('common.loading') : t('kbForm.embeddingModelPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {models && models.length > 0 ? (
                        models.map((m: EmbeddingModel) => (
                          <SelectItem key={m.id} value={String(m.id)}>{m.model_name}</SelectItem>
                        ))
                      ) : modelLoading ? (
                        <div className="flex items-center px-2 py-2 text-muted-foreground">{t('common.loading')}</div>
                      ) : (
                        <div className="px-2 py-2 text-muted-foreground">{t('kbForm.noModel')}</div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>{t('kbForm.embeddingModelDesc')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="collection_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('kbForm.collection')}</FormLabel>
                  <Select
                    value={field.value !== null && field.value !== undefined ? String(field.value) : ""}
                    onValueChange={val => {
                      const selectedCollection = allCollections.find((c: Collection) => String(c.id) === val)
                      if (selectedCollection) {
                        setSelectedVdbId(selectedCollection.vdb_id)
                      }
                      field.onChange(val ? Number(val) : null)
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={vdbs && vdbs.length > 0 ? t('kbForm.collectionPlaceholder') : t('kbForm.noCollection')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vdbs && vdbs.length > 0 ? (
                        vdbs.map((vdb: VDB) => {
                          const groupCollections = allCollections.filter((c: Collection) => c.vdb_id === vdb.id)
                          if (groupCollections.length === 0) return null
                          return (
                            <SelectGroup key={vdb.id}>
                              <SelectLabel>{vdb.name}</SelectLabel>
                              {groupCollections.map((c: Collection) => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                              ))}
                            </SelectGroup>
                          )
                        })
                      ) : (
                        <div className="px-2 py-2 text-muted-foreground">{t('kbForm.noCollection')}</div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>{t('kbForm.collectionDesc')}</FormDescription>
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
                  <FormLabel>{t('kbForm.oss')}</FormLabel>
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
                        <SelectValue placeholder={ossLoading ? t('common.loading') : t('kbForm.ossPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="local">{t('kbForm.ossLocal')}</SelectItem>
                      {ossConnections.length > 0 && Object.keys(ossBucketsMap).length > 0 ? (
                        ossConnections.map((conn: OSSConnection) => (
                          <SelectGroup key={conn.id}>
                            <SelectLabel>{conn.name}</SelectLabel>
                            {(ossBucketsMap[conn.id] || []).map((b: string) => (
                              <SelectItem key={b} value={`${conn.id}::${b}`}>{b}</SelectItem>
                            ))}
                          </SelectGroup>
                        ))
                      ) : (
                        <div className="px-2 py-2 text-muted-foreground">{t('kbForm.noOSS')}</div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>{t('kbForm.ossDesc')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('kbForm.splitParams')}</CardTitle>
            <CardDescription>{t('kbForm.splitParamsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                  control={form.control}
                  name="chunk_size"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>{t('kbForm.chunkSize')}</FormLabel>
                      <FormControl>
                          <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>
                          {t('kbForm.chunkSizeDesc')}
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
                      <FormLabel>{t('kbForm.overlap')}</FormLabel>
                      <FormControl>
                          <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>
                          {t('kbForm.overlapDesc')}
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
                    <FormLabel>{t('kbForm.autoProcess')}</FormLabel>
                    <FormDescription>{t('kbForm.autoProcessDesc')}</FormDescription>
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
                {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t(`common.${submitButtonText}`)}
            </Button>
        </div>
      </form>
    </Form>
  )
} 