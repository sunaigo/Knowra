"use client"

import { Model } from "@/schemas/model"
import { type ColumnDef } from "@tanstack/react-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from 'react-i18next'

type ColumnsOptions = {
  onDelete: (id: number) => void
}

export const columns = ({
  onDelete,
}: ColumnsOptions): ColumnDef<Model>[] => {

  const { t } = useTranslation()

  return [
    {
      accessorKey: "model_name",
      header: t('model.name'),
    },
    {
      accessorKey: "model_type",
      header: t('model.type'),
      cell: ({ row }) => {
        const modelType = row.getValue("model_type") as string
        const variant = modelType === "llm" ? "default" : "secondary"
        return <Badge variant={variant}>{modelType}</Badge>
      },
    },
    {
      accessorKey: "connection.name",
      header: t('model.connection'),
      cell: ({ row }) => {
        const model = row.original
        return model.connection?.name ?? "N/A"
      },
    },
    {
      accessorKey: "updated_at",
      header: t('model.updatedAt'),
      cell: ({ row }) => {
        const updatedAt = row.getValue("updated_at")
        return updatedAt ? new Date(updatedAt as string).toLocaleString() : "N/A"
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const model = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">{t('common.openMenu')}</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/models/${model.id}/edit`}>{t('common.edit')}</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-500"
                onClick={() => model.id && onDelete(model.id)}
                disabled={!model.id}
              >
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
} 