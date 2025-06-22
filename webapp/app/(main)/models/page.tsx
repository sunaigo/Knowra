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
import useSWR, { useSWRConfig } from "swr"
import { fetcher, del } from "@/lib/request"
import { Model } from "@/schemas/model"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "@radix-ui/react-icons"
import Link from "next/link"
import { useState, useCallback } from "react"
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

export default function ModelsPage() {
  const {
    data: models,
    isLoading,
    error,
    mutate,
  } = useSWR<Model[]>("/models", fetcher)

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
      toast.success("模型删除成功！")
      mutate()
    } catch (error: any) {
      toast.error(`模型删除失败: ${error.message}`)
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
            <CardTitle>模型</CardTitle>
            <CardDescription>管理您的 AI 模型。</CardDescription>
          </div>
          <Button asChild>
            <Link href="/models/create">
              <PlusIcon className="mr-2 h-4 w-4" />
              添加模型
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <p>加载失败: {error.message}</p>
        ) : (
          <DataTable
            columns={memoizedColumns()}
            data={models ?? []}
            isLoading={isLoading}
          />
        )}
      </CardContent>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>您确定要删除吗？</AlertDialogTitle>
            <AlertDialogDescription>
              这个操作无法撤销。这将永久删除该模型。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>继续</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
} 