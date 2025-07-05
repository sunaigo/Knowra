"use client"

import { useState, useEffect } from "react"
import { get } from "@/lib/request"
import { Model } from "@/schemas/model"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import ModelForm from "../../model-form"
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"

export default function EditModelForm({ modelId }: { modelId: string }) {
  const [model, setModel] = useState<Model | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const { t } = useTranslation()

  useEffect(() => {
    if (!modelId) return
    setIsLoading(true)
    setError(null)
    get(`/models/${modelId}`)
      .then(res => setModel(res.data))
      .catch(e => setError(e))
      .finally(() => setIsLoading(false))
  }, [modelId])

  if (isLoading) {
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

  if (error) {
    const msg = typeof error === 'object' && error !== null && 'message' in error
      ? (error as { message: string }).message
      : (typeof error === 'string' ? error : t('model.updateFailed'))
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('modelEdit.loadFailed')}</CardTitle>
          <CardDescription>{msg}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return <ModelForm initialData={model} />
} 