"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useRef, useEffect } from "react"
import { post } from "@/lib/request"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { useActiveTeamId } from "@/stores/user-store"
import { useTranslation } from 'react-i18next'
import React from "react"

const vdbTypes = [
  { value: "chroma", labelKey: "vdb.typeChroma" },
  { value: "postgresql", labelKey: "vdb.typePGVector" },
  { value: "milvus", labelKey: "vdb.typeMilvus" },
]

const protocolOptions = [
  { value: "http", label: "http" },
  { value: "https", label: "https" },
]

function buildStrictSchema(t: (k: string) => string) {
  return z.object({
    name: z.string()
      .min(3, { message: t('vdb.nameMin') })
      .max(512, { message: t('vdb.nameMax') })
      .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{1,510}[a-zA-Z0-9])?$/, { message: t('vdb.namePattern') }),
    collection_name: z.string()
      .min(3, { message: t('vdb.collectionNameMin') })
      .max(512, { message: t('vdb.collectionNameMax') })
      .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{1,510}[a-zA-Z0-9])?$/, { message: t('vdb.namePattern') })
      .optional(),
    type: z.string(),
    chroma_path: z.string().optional(),
    pg_host: z.string().optional(),
    pg_port: z.string().optional(),
    pg_user: z.string().optional(),
    pg_password: z.string().optional(),
    pg_database: z.string().optional(),
    milvus_host: z.string().optional(),
    milvus_port: z.string().optional(),
    milvus_user: z.string().optional(),
    milvus_password: z.string().optional(),
    milvus_protocol: z.string().optional(),
    milvus_db: z.string().optional(),
    team_id: z.string(),
  }).superRefine((values, ctx) => {
    if (values.type === "chroma") {
      if (!values.chroma_path || values.chroma_path.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('vdb.chromaPathRequired'),
          path: ["chroma_path"]
        })
      }
      if (!values.collection_name || values.collection_name.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('vdb.collectionNameRequired'),
          path: ["collection_name"]
        })
      }
    } else if (values.type === "postgresql") {
      if (!values.pg_host) ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('vdb.pgHostRequired'), path: ["pg_host"] })
      if (!values.pg_port) ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('vdb.pgPortRequired'), path: ["pg_port"] })
      if (!values.pg_user) ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('vdb.pgUserRequired'), path: ["pg_user"] })
      if (!values.pg_password) ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('vdb.pgPasswordRequired'), path: ["pg_password"] })
      if (!values.pg_database) ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('vdb.pgDatabaseRequired'), path: ["pg_database"] })
    } else if (values.type === "milvus") {
      if (!values.milvus_host) ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('vdb.milvusHostRequired'), path: ["milvus_host"] })
      if (!values.milvus_port) ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('vdb.milvusPortRequired'), path: ["milvus_port"] })
    }
  })
}

export type VDBFormValues = z.infer<ReturnType<typeof buildStrictSchema>>

// 后端 VDBIn/VectorDBCollectionConfig 结构参考
export interface VDBFormProps {
  initialData?: {
    id?: number;
    name: string;
    type: string;
    team_id: string;
    description?: string;
    connection_config?: Record<string, unknown>;
    is_private?: boolean;
    embedding_dimension?: number;
    index_type?: string;
    [key: string]: unknown;
  };
  onSubmit: (data: Record<string, unknown>) => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

export function VDBForm({ initialData, onSubmit, isSubmitting = false, submitButtonText }: VDBFormProps) {
  const { t } = useTranslation()
  const activeTeamId = useActiveTeamId() || ""

  // 平铺connection_config到表单字段，便于反显
  const flatInitialData = initialData
    ? {
        ...initialData,
        chroma_path: typeof initialData.connection_config === 'object' && initialData.connection_config ? String(initialData.connection_config["persist_directory"] ?? "") : "",
        collection_name: typeof initialData.connection_config === 'object' && initialData.connection_config ? String(initialData.connection_config["collection_name"] ?? "") : "",
        pg_host: typeof initialData.connection_config === 'object' && initialData.connection_config ? String(initialData.connection_config["host"] ?? "") : "",
        pg_port: typeof initialData.connection_config === 'object' && initialData.connection_config ? String(initialData.connection_config["port"] ?? "") : "",
        pg_user: typeof initialData.connection_config === 'object' && initialData.connection_config ? String(initialData.connection_config["user"] ?? "") : "",
        pg_password: typeof initialData.connection_config === 'object' && initialData.connection_config ? String(initialData.connection_config["password"] ?? "") : "",
        pg_database: typeof initialData.connection_config === 'object' && initialData.connection_config ? String(initialData.connection_config["database"] ?? "") : "",
        milvus_host: typeof initialData.connection_config === 'object' && initialData.connection_config ? String(initialData.connection_config["host"] ?? "") : "",
        milvus_port: typeof initialData.connection_config === 'object' && initialData.connection_config ? String(initialData.connection_config["port"] ?? "") : "",
        milvus_user: typeof initialData.connection_config === 'object' && initialData.connection_config ? String(initialData.connection_config["user"] ?? "") : "",
        milvus_password: typeof initialData.connection_config === 'object' && initialData.connection_config ? String(initialData.connection_config["password"] ?? "") : "",
        milvus_protocol: typeof initialData.connection_config === 'object' && initialData.connection_config ? String(initialData.connection_config["protocol"] ?? "") : "",
        milvus_db: typeof initialData.connection_config === 'object' && initialData.connection_config ? String(initialData.connection_config["db_name"] ?? "") : "",
      }
    : undefined;

  const strictSchema = React.useMemo(() => buildStrictSchema(t), [t])

  const form = useForm<VDBFormValues>({
    resolver: zodResolver(strictSchema),
    defaultValues: {
      name: "",
      type: "chroma",
      chroma_path: "",
      collection_name: "",
      pg_host: "",
      pg_port: "",
      pg_user: "",
      pg_password: "",
      pg_database: "",
      milvus_host: "",
      milvus_port: "",
      milvus_user: "",
      milvus_password: "",
      milvus_protocol: "",
      milvus_db: "",
      team_id: activeTeamId,
      ...flatInitialData,
    },
  })
  const type = form.watch("type")

  // 测试连接相关状态
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<null | 'success' | 'fail'>(null)
  const [testMsg, setTestMsg] = useState("")

  // 判断是否编辑模式
  const isEdit = !!initialData && Object.keys(initialData).length > 0;

  // 保证team_id始终为最新
  if (form.getValues("team_id") !== activeTeamId) {
    form.setValue("team_id", activeTeamId)
  }

  useEffect(() => {
    if (isEdit && flatInitialData) {
      form.reset({
        ...form.getValues(),
        ...flatInitialData,
      })
    }
  }, [isEdit, initialData])

  async function handleTestConnection() {
    // 校验连接相关字段+collection_name
    type FieldKeys = keyof VDBFormValues
    let fields: FieldKeys[] = []
    if (type === "chroma") {
      fields = ["chroma_path", "collection_name", "name"]
    } else if (type === "postgresql") {
      fields = ["pg_host", "pg_port", "pg_user", "pg_password", "pg_database", "name"]
    } else if (type === "milvus") {
      fields = ["milvus_host", "milvus_port", "name"]
    }
    const valid = await form.trigger(fields)
    if (!valid) return
    setTesting(true)
    setTestResult(null)
    setTestMsg("")
    // 组装参数
    const values = form.getValues()
    const connection_config: Record<string, unknown> = {}
    if (type === "chroma") {
      connection_config.persist_directory = values.chroma_path
      connection_config.collection_name = values.collection_name
    } else if (type === "postgresql") {
      connection_config.host = values.pg_host
      connection_config.port = values.pg_port
      connection_config.user = values.pg_user
      connection_config.password = values.pg_password
      connection_config.database = values.pg_database
      connection_config.connection_string = `postgresql://${values.pg_user}:${values.pg_password}@${values.pg_host}:${values.pg_port}/${values.pg_database}`
    } else if (type === "milvus") {
      connection_config.host = values.milvus_host
      connection_config.port = values.milvus_port
      connection_config.user = values.milvus_user
      connection_config.password = values.milvus_password
      connection_config.protocol = values.milvus_protocol
      connection_config.db_name = values.milvus_db
    }
    const payload = {
      ...values,
      connection_config,
    }
    try {
      const res = await post<{ code: number; message?: string }>("/vdb/test-connection", payload);
      if (res.code === 200) {
        setTestResult("success");
        setTestMsg("");
      } else {
        setTestResult("fail");
        setTestMsg(res.message || t('vdbForm.testFailed'));
      }
    } catch (e) {
      setTestResult("fail")
      if (e instanceof Error) {
        setTestMsg(e.message || t('vdbForm.testError'))
      } else {
        setTestMsg(t('vdbForm.testError'))
      }
    }
    setTesting(false)
  }

  function handleSubmit(values: VDBFormValues) {
    const connection_config: Record<string, unknown> = {}
    if (type === "chroma") {
      connection_config.persist_directory = values.chroma_path
      connection_config.collection_name = values.collection_name
    } else if (type === "postgresql") {
      connection_config.host = values.pg_host
      connection_config.port = values.pg_port
      connection_config.user = values.pg_user
      connection_config.password = values.pg_password
      connection_config.database = values.pg_database
      connection_config.connection_string = `postgresql://${values.pg_user}:${values.pg_password}@${values.pg_host}:${values.pg_port}/${values.pg_database}`
    } else if (type === "milvus") {
      connection_config.host = values.milvus_host
      connection_config.port = values.milvus_port
      connection_config.user = values.milvus_user
      connection_config.password = values.milvus_password
      connection_config.protocol = values.milvus_protocol
      connection_config.db_name = values.milvus_db
    }
    const submitData = {
      ...values,
      connection_config,
    }
    onSubmit(submitData)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* 隐藏team_id字段 */}
        <input type="hidden" {...form.register("team_id")} />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('vdb.name')}</FormLabel>
              <FormControl>
                <Input placeholder={t('vdb.namePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('vdb.type')}</FormLabel>
              {isEdit ? (
                <Input value={field.value} disabled readOnly />
              ) : (
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('vdb.typePlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vdbTypes.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        {/* 动态渲染连接参数字段 */}
        {type === "chroma" && (
          <FormField
            control={form.control}
            name="chroma_path"
            rules={{ required: true }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('vdbForm.chromaPath')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('vdbForm.chromaPathPlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {type === "postgresql" && (
          <>
            <FormField
              control={form.control}
              name="pg_host"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('vdbForm.host')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('vdbForm.hostPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pg_port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('vdbForm.port')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('vdbForm.portPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pg_user"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('vdbForm.username')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('vdbForm.usernamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pg_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('vdbForm.password')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={t('vdbForm.passwordPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pg_database"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('vdbForm.dbName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('vdbForm.dbNamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        {type === "milvus" && (
          <>
            <FormField
              control={form.control}
              name="milvus_host"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('vdbForm.milvusHost')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('vdbForm.milvusHostPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="milvus_port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('vdbForm.milvusPort')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('vdbForm.milvusPortPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="milvus_user"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('vdbForm.optionalUsername')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('vdbForm.optionalUsernamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="milvus_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('vdbForm.optionalPassword')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={t('vdbForm.optionalPasswordPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="milvus_protocol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('vdbForm.protocol')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('vdbForm.protocolPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {protocolOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="milvus_db"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('vdbForm.optionalDbName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('vdbForm.optionalDbNamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        {/* 动态渲染collection_name，仅chroma类型显示 */}
        {type === "chroma" && (
          <FormField
            control={form.control}
            name="collection_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('vdbForm.collectionName')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('vdbForm.collectionNamePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="flex items-center gap-4">
          <Button type="button" variant="outline" onClick={handleTestConnection} disabled={testing}>
            {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {t('vdbForm.testConnection')}
          </Button>
          {testResult === "success" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
          {testResult === "fail" && <XCircle className="w-5 h-5 text-red-500" />}
          <Button type="submit" disabled={isSubmitting || testResult !== "success"}>{isSubmitting ? t('common.processing') : submitButtonText}</Button>
        </div>
        {testResult === "fail" && testMsg && (
          <div className="text-sm text-red-500 mt-1">{testMsg}</div>
        )}
      </form>
    </Form>
  )
} 