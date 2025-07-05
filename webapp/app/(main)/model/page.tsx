"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { get, del } from "@/lib/request"
import { Model } from "@/schemas/model"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "@radix-ui/react-icons"
import Link from "next/link"
import { useState, useCallback, useEffect } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { useTranslation } from 'react-i18next'
import { PlusCircle } from "lucide-react"

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useTranslation()

  const fetchModels = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await get("/models")
      setModels(res.data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : t('model.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [t])
  useEffect(() => {
    fetchModels()
  }, [fetchModels])
  const mutate = fetchModels

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingModelId, setDeletingModelId] = useState<number | null>(null)

  const handleDelete = useCallback((id: number) => {
    setDeletingModelId(id)
    setShowDeleteDialog(true)
  }, [])

  const confirmDelete = async () => {
    if (!deletingModelId) return
    try {
      await del(`/models/${deletingModelId}`)
      toast.success(t('model.deleteSuccess'))
      mutate()
    } catch (error) {
      toast.error(t('model.deleteFailed', { error: error instanceof Error ? error.message : '' }))
    } finally {
      setShowDeleteDialog(false)
      setDeletingModelId(null)
    }
  }

  const memoizedColumns = useCallback(
    () => columns({ onDelete: handleDelete }),
    [handleDelete]
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('model.title')}</CardTitle>
            <CardDescription>{t('model.desc')}</CardDescription>
          </div>
          <Button asChild>
            <Link href="/models/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('model.add')}
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center text-red-500">{t('common.loadFailed')}: {error}</div>
        ) : (
          <DataTable
            columns={memoizedColumns()}
            data={models}
            isLoading={isLoading}
          />
        )}
      </CardContent>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('model.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('model.deleteConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>{t('common.continue')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
} 