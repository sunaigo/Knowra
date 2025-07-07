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
import { put, post, get } from "@/lib/request"
import { modelSchema, Model, MODEL_TYPE_SCHEMA } from "@/schemas/model"
import { Connection } from "@/schemas/connection"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, Check, X } from "lucide-react"
import { useTranslation } from 'react-i18next'
import React from "react"

export function buildModelFormSchema(t: (k: string) => string) {
  return modelSchema.pick({
    model_name: true,
    model_type: true,
    connection_id: true,
    description: true,
  }).extend({
    model_name: z.string().min(1, { message: t('model.nameRequired') }),
    model_type: z.string().min(1, { message: t('model.typeRequired') }),
    connection_id: z.number({ required_error: t('model.connectionRequired') }),
    description: z.string().optional(),
  })
}

type FormValues = z.infer<ReturnType<typeof buildModelFormSchema>>

interface ModelFormProps {
  initialData?: Model | null
}

type TestStatus = "idle" | "loading" | "success" | "error"

export default function ModelForm({ initialData }: ModelFormProps) {
  const { t } = useTranslation()
  const formSchema = React.useMemo(() => buildModelFormSchema(t), [t])
  const router = useRouter()
  const [connections, setConnections] = useState<Connection[] | null>(null)
  const [isLoadingConnections, setIsLoadingConnections] = useState(false)
  const [connectionsError, setConnectionsError] = useState<unknown>(null)
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

  useEffect(() => {
    setIsLoadingConnections(true)
    setConnectionsError(null)
    get("/connections")
      .then(res => setConnections(res.data))
      .catch((e) => setConnectionsError(e))
      .finally(() => setIsLoadingConnections(false))
  }, [])

  const handleTestConnection = async () => {
    if (!selectedConnectionId) {
      toast.error(t('model.selectConnection'))
      return
    }

    const currentModelName = form.getValues("model_name")
    if (!currentModelName) {
      toast.error(t('model.inputNameForTest'))
      return
    }

    const selectedConnection = connections?.find(conn => conn.id === selectedConnectionId)
    if (!selectedConnection) {
      toast.error(t('model.selectConnection'))
      return
    }

    setTestStatus("loading")
    setTestError(null)

    const url = `/connections/${selectedConnectionId}/test`

    try {
      await post(url, { model_name: currentModelName })
      setTestStatus("success")
      toast.success(t('model.testSuccess'))
    } catch (err) {
      setTestStatus("error")
      let msg = "An unexpected error occurred.";
      if (err instanceof Error) {
        msg = err.message;
      } else if (err && typeof err === 'object' && 'detail' in err) {
        msg = (err as { detail?: string }).detail || msg;
      }
      setTestError(msg)
      toast.error(t('model.testFailed'))
    }
  }

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      if (initialData) {
        await put(`/models/${initialData.id}`, values)
        toast.success(t('model.updateSuccess'))
      } else {
        await post("/models", values)
        toast.success(t('model.createSuccess'))
      }
      router.push("/model")
      router.refresh() // To ensure the list is updated
    } catch (error) {
      let msg = "An unexpected error occurred.";
      if (error instanceof Error) {
        msg = error.message;
      } else if (error && typeof error === 'object' && 'detail' in error) {
        msg = (error as { detail?: string }).detail || msg;
      }
      toast.error(
        `${initialData ? t('model.updateFailed') : t('model.createFailed')}: ${msg}`
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = initialData ? t('model.editTitle') : t('model.createTitle')
  const description = initialData ? t('model.editDesc') : t('model.createDesc')

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
    const msg = typeof connectionsError === 'object' && connectionsError !== null && 'message' in connectionsError
      ? (connectionsError as { message: string }).message
      : (typeof connectionsError === 'string' ? connectionsError : t('model.loadFailed'))
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('model.loadFailed')}</CardTitle>
          <CardDescription>{msg}</CardDescription>
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
                  <FormLabel>{t('model.name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('model.namePlaceholder')} {...field} />
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
                  <FormLabel>{t('model.type')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('model.typePlaceholder')} />
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
                  <FormLabel>{t('model.connection')}</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('model.connectionPlaceholder')} />
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
                  <FormLabel>{t('model.description')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('model.descriptionPlaceholder')}
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
                    {testStatus === "idle" && t('model.test')}
                    {testStatus === "loading" && (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>{t('model.testing')}</span>
                      </>
                    )}
                    {testStatus === "success" && (
                      <>
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        <span>{t('model.testSuccessShort')}</span>
                      </>
                    )}
                    {testStatus === "error" && (
                      <>
                        <X className="mr-2 h-4 w-4 text-red-500" />
                        <span>{t('model.testFailedShort')}</span>
                      </>
                    )}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? t('common.saving') : t('common.save')}
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