"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Connection } from "@/schemas/connection"
import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { del } from "@/lib/request"
import { TFunction } from "i18next"

export const columns = ({
  onEdit,
  onAfterDelete,
  t,
}: {
  onEdit: (connection: Connection) => void
  onAfterDelete: () => void
  t: TFunction
}): ColumnDef<Connection>[] => {
  return [
    {
      accessorKey: "name",
      header: t("connections.name"),
    },
    {
      accessorKey: "provider",
      header: t("connections.provider"),
    },
    {
      accessorKey: "api_base",
      header: t("connections.apiBase"),
    },
    {
      accessorKey: "updated_at",
      header: t("updatedAt"),
      cell: ({ row }) => new Date(row.getValue("updated_at")).toLocaleString(),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const connection = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
              >
                <DotsHorizontalIcon className="h-4 w-4" />
                <span className="sr-only">{t("actions.openMenu")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuItem onSelect={() => onEdit(connection)}>
                {t("actions.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem>{t("actions.copy")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={async () => {
                  await del(`/connections/${connection.id}`)
                  onAfterDelete()
                }}
              >
                {t("actions.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
} 