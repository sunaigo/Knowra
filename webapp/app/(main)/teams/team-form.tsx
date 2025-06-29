"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { TeamCreate, TeamCreateSchema, TeamUpdate } from "@/schemas/team"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { post, put } from "@/lib/request"
import { toast } from "sonner"
import { SvgIconPicker } from "@/components/svg-icon-picker"

interface TeamFormProps {
  mode: "create" | "edit"
  defaultValues?: Partial<TeamCreate>
  teamId?: number
  onSuccess?: () => void
  onCancel?: () => void
  showCancelButton?: boolean
}

export function TeamForm({ mode, defaultValues, teamId, onSuccess, onCancel, showCancelButton = true }: TeamFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const form = useForm<TeamCreate>({
    resolver: zodResolver(TeamCreateSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      icon_name: defaultValues?.icon_name || "",
    },
  })

  async function onSubmit(values: TeamCreate) {
    setIsLoading(true)
    try {
      if (mode === "create") {
        await post("/teams", values)
        toast.success("团队创建成功")
        router.push("/teams")
      } else if (mode === "edit" && teamId) {
        await put(`/teams/${teamId}`, values)
        toast.success("团队更新成功")
        if (onSuccess) {
          onSuccess()
        } else {
          router.push(`/teams/${teamId}`)
        }
      }
    } catch (error) {
      toast.error(mode === "create" ? "创建团队失败" : "更新团队失败")
      console.error("Team operation failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="icon_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>团队图标</FormLabel>
              <FormControl>
                <SvgIconPicker
                  value={field.value || ""}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormDescription>
                为团队选择一个图标，将在团队列表和侧边栏中显示。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>团队名称</FormLabel>
              <FormControl>
                <Input placeholder="输入团队名称" {...field} />
              </FormControl>
              <FormDescription>
                团队名称将在整个系统中显示。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>团队描述</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="输入团队描述（可选）"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                简要描述团队的目标和职责。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "保存中..." : mode === "create" ? "创建团队" : "更新团队"}
          </Button>
          {showCancelButton && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (onCancel) {
                  onCancel()
                } else {
                  router.back()
                }
              }}
            >
              取消
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
} 