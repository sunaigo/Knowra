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
import { useActiveTeamId } from "@/stores/team-store"

const vdbTypes = [
  { value: "chroma", label: "Chroma (本地路径)" },
  { value: "postgresql", label: "PGVector (PostgreSQL)" },
  { value: "milvus", label: "Milvus" },
]

const protocolOptions = [
  { value: "http", label: "http" },
  { value: "https", label: "https" },
]

const relaxedSchema = z.object({
  name: z.string().optional(),
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
}).superRefine((values, ctx) => {
  if (values.type === "chroma") {
    if (!values.chroma_path || values.chroma_path.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Chroma 路径为必填项",
        path: ["chroma_path"]
      })
    }
  } else if (values.type === "postgresql") {
    if (!values.pg_host) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "主机为必填项", path: ["pg_host"] })
    if (!values.pg_port) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "端口为必填项", path: ["pg_port"] })
    if (!values.pg_user) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "用户名为必填项", path: ["pg_user"] })
    if (!values.pg_password) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "密码为必填项", path: ["pg_password"] })
    if (!values.pg_database) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "数据库名为必填项", path: ["pg_database"] })
  } else if (values.type === "milvus") {
    if (!values.milvus_host) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Milvus 主机为必填项", path: ["milvus_host"] })
    if (!values.milvus_port) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Milvus 端口为必填项", path: ["milvus_port"] })
  }
})

const strictSchema = z.object({
  name: z.string()
    .min(3, { message: "名称至少3个字符" })
    .max(512, { message: "名称不能超过512个字符" })
    .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{1,510}[a-zA-Z0-9])?$/, { message: "仅支持字母、数字、点、下划线、短横线，且必须以字母或数字开头和结尾" }),
  collection_name: z.string()
    .min(3, { message: "Collection名称至少3个字符" })
    .max(512, { message: "Collection名称不能超过512个字符" })
    .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{1,510}[a-zA-Z0-9])?$/, { message: "仅支持字母、数字、点、下划线、短横线，且必须以字母或数字开头和结尾" })
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
        message: "Chroma 路径为必填项",
        path: ["chroma_path"]
      })
    }
    if (!values.collection_name || values.collection_name.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Collection名称为必填项",
        path: ["collection_name"]
      })
    }
  } else if (values.type === "postgresql") {
    if (!values.pg_host) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "主机为必填项", path: ["pg_host"] })
    if (!values.pg_port) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "端口为必填项", path: ["pg_port"] })
    if (!values.pg_user) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "用户名为必填项", path: ["pg_user"] })
    if (!values.pg_password) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "密码为必填项", path: ["pg_password"] })
    if (!values.pg_database) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "数据库名为必填项", path: ["pg_database"] })
  } else if (values.type === "milvus") {
    if (!values.milvus_host) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Milvus 主机为必填项", path: ["milvus_host"] })
    if (!values.milvus_port) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Milvus 端口为必填项", path: ["milvus_port"] })
  }
})

type VDBFormValues = z.infer<typeof strictSchema>

export function VDBForm({ initialData, onSubmit, isSubmitting = false, submitButtonText = "保存" }: any) {
  const activeTeamId = useActiveTeamId() || ""

  // 平铺connection_config到表单字段，便于反显
  const flatInitialData = initialData
    ? {
        ...initialData,
        chroma_path: initialData.connection_config?.persist_directory ?? "",
        collection_name: initialData.connection_config?.collection_name ?? "",
        pg_host: initialData.connection_config?.host ?? "",
        pg_port: initialData.connection_config?.port ?? "",
        pg_user: initialData.connection_config?.user ?? "",
        pg_password: initialData.connection_config?.password ?? "",
        pg_database: initialData.connection_config?.database ?? "",
        milvus_host: initialData.connection_config?.host ?? "",
        milvus_port: initialData.connection_config?.port ?? "",
        milvus_user: initialData.connection_config?.user ?? "",
        milvus_password: initialData.connection_config?.password ?? "",
        milvus_protocol: initialData.connection_config?.protocol ?? "",
        milvus_db: initialData.connection_config?.db_name ?? "",
      }
    : undefined;

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
    let connection_config: any = {}
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
      const res = await post("/vdb/test-connection", payload)
      if (res.code === 200) {
        setTestResult("success")
        setTestMsg("")
      } else {
        setTestResult("fail")
        setTestMsg(res.message || "连接失败")
      }
    } catch (e: any) {
      setTestResult("fail")
      setTestMsg(e?.message || "连接异常")
    }
    setTesting(false)
  }

  function handleSubmit(values: VDBFormValues) {
    let connection_config: any = {}
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
              <FormLabel>名称</FormLabel>
              <FormControl>
                <Input placeholder="请输入名称" {...field} />
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
              <FormLabel>类型</FormLabel>
              {isEdit ? (
                <Input value={field.value} disabled readOnly />
              ) : (
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择类型" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vdbTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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
                <FormLabel>Chroma 路径</FormLabel>
                <FormControl>
                  <Input placeholder="如 /data/chroma 或 ./chroma_data" {...field} />
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
                  <FormLabel>主机</FormLabel>
                  <FormControl>
                    <Input placeholder="如 127.0.0.1" {...field} />
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
                  <FormLabel>端口</FormLabel>
                  <FormControl>
                    <Input placeholder="如 5432" {...field} />
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
                  <FormLabel>用户名</FormLabel>
                  <FormControl>
                    <Input placeholder="数据库用户名" {...field} />
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
                  <FormLabel>密码</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="数据库密码" {...field} />
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
                  <FormLabel>数据库名</FormLabel>
                  <FormControl>
                    <Input placeholder="数据库名" {...field} />
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
                  <FormLabel>Milvus 主机</FormLabel>
                  <FormControl>
                    <Input placeholder="如 127.0.0.1" {...field} />
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
                  <FormLabel>Milvus 端口</FormLabel>
                  <FormControl>
                    <Input placeholder="如 19530" {...field} />
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
                  <FormLabel>用户名（可选）</FormLabel>
                  <FormControl>
                    <Input placeholder="Milvus 用户名（如启用鉴权）" {...field} />
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
                  <FormLabel>密码（可选）</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Milvus 密码（如启用鉴权）" {...field} />
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
                  <FormLabel>协议</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择协议" />
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
                  <FormLabel>数据库名（可选）</FormLabel>
                  <FormControl>
                    <Input placeholder="Milvus 数据库名（如有多租户）" {...field} />
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
                <FormLabel>Collection名称</FormLabel>
                <FormControl>
                  <Input placeholder="请输入Collection名称（如 my_collection）" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="flex items-center gap-4">
          <Button type="button" variant="outline" onClick={handleTestConnection} disabled={testing}>
            {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            测试连接
          </Button>
          {testResult === "success" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
          {testResult === "fail" && <XCircle className="w-5 h-5 text-red-500" />}
        </div>
        {testResult === "fail" && testMsg && (
          <div className="text-sm text-red-500 mt-1">{testMsg}</div>
        )}
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "处理中..." : submitButtonText}</Button>
      </form>
    </Form>
  )
} 