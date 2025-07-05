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
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()

  const form = useForm<TeamCreate>({
    resolver: zodResolver(TeamCreateSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      icon_name: defaultValues?.icon_name || "UsersIcon",
    },
  })

  async function onSubmit(values: TeamCreate) {
    setIsLoading(true)
    try {
      if (mode === "create") {
        await post("/teams", values)
        toast.success(t('teams.messages.createSuccess'))
        router.push("/teams")
      } else if (mode === "edit" && teamId) {
        await put(`/teams/${teamId}`, values)
        toast.success(t('teams.messages.updateSuccess'))
        if (onSuccess) {
          onSuccess()
        } else {
          router.push(`/teams/${teamId}`)
        }
      }
    } catch (error) {
      toast.error(mode === "create" ? t('teams.messages.createFailed') : t('teams.messages.updateFailed'))
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
              <FormLabel>{t('teams.icon')}</FormLabel>
              <FormControl>
                <SvgIconPicker
                  value={field.value || ""}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormDescription>
                {t('teams.descriptions.iconDesc')}
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
              <FormLabel>{t('teams.teamName')}</FormLabel>
              <FormControl>
                <Input placeholder={t('teams.placeholders.teamName')} {...field} />
              </FormControl>
              <FormDescription>
                {t('teams.descriptions.teamNameDesc')}
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
              <FormLabel>{t('teams.teamDescription')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('teams.placeholders.teamDescription')}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {t('teams.descriptions.teamDescriptionDesc')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t('actions.saving') : mode === "create" ? t('teams.createTeam') : t('teams.editTeam')}
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
              {t('common.cancel')}
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
} 