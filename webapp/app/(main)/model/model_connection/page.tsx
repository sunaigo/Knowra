"use client"

import { columns } from "@/app/(main)/model/model_connection/columns"
import { ConnectionForm } from "@/app/(main)/model/model_connection/connection-form"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { get } from "@/lib/request"
import { Connection } from "@/schemas/connection"
import { PlusIcon } from "@radix-ui/react-icons"
import { useState, useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { TableHead, TableCell, TableRow } from "@/components/ui/table"

export default function ConnectionsPage() {
  const { t } = useTranslation()
  const API_URL = "/connections"
  const [connections, setConnections] = useState<Connection[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const fetchConnections = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await get(API_URL)
      setConnections(res.data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : t('connections.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [API_URL, t])
  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])
  const mutate = fetchConnections
  const [open, setOpen] = useState(false)
  const [editingConnection, setEditingConnection] = useState<Connection | null>(
    null
  )

  const handleNew = () => {
    setEditingConnection(null)
    setOpen(true)
  }

  const handleEdit = (connection: Connection) => {
    setEditingConnection(connection)
    setOpen(true)
  }

  const handleSuccess = () => {
    setOpen(false)
    mutate()
  }

  const handleDelete = async (id: string, name: string) => {
    try {
      // Implement the delete logic here
      // This is a placeholder and should be replaced with the actual implementation
      console.log(`Deleting connection with id: ${id} and name: ${name}`)
      await mutate()
      toast.success(t('connections.deleteSuccess'))
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : t('connections.deleteFailed'))
    }
  }

  if (error) return <div>{t("messages.error")}</div>
  if (isLoading) return <div>{t("messages.loading")}</div>

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          {t("connections.title")}
        </h2>
        <div className="flex items-center space-x-2">
          <Button onClick={handleNew}>
            <PlusIcon className="mr-2 h-4 w-4" /> {t("connections.new")}
          </Button>
        </div>
      </div>
      <DataTable
        columns={columns({
          onEdit: handleEdit,
          onAfterDelete: mutate,
          t,
        })}
        data={connections}
      />
      <ConnectionForm
        open={open}
        setOpen={setOpen}
        onSuccess={handleSuccess}
        connection={editingConnection}
      />
    </div>
  )
} 