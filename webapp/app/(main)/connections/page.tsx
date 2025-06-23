"use client"

import { columns } from "@/app/(main)/connections/columns"
import { ConnectionForm } from "@/app/(main)/connections/connection-form"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { fetcher } from "@/lib/request"
import { Connection } from "@/schemas/connection"
import { PlusIcon } from "@radix-ui/react-icons"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import useSWR from "swr"

export default function ConnectionsPage() {
  const { t } = useTranslation()
  const API_URL = "/connections"
  const {
    data: response,
    error,
    isLoading,
    mutate,
  } = useSWR<{ code: number; message: string; data: Connection[] }>(API_URL, fetcher)
  const connections = response?.data || []
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