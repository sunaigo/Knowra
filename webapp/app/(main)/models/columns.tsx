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

type ColumnsOptions = {
  onDelete: (id: number) => void
}

export const columns = ({
  onDelete,
}: ColumnsOptions): ColumnDef<Model>[] => {
  return [
    {
      accessorKey: "model_name",
      header: "名称",
    },
    {
      accessorKey: "model_type",
      header: "类型",
      cell: ({ row }) => {
        const modelType = row.getValue("model_type") as string
        const variant = modelType === "llm" ? "default" : "secondary"
        return <Badge variant={variant}>{modelType}</Badge>
      },
    },
    {
      accessorKey: "connection.name",
      header: "连接",
      cell: ({ row }) => {
        const model = row.original
        return model.connection?.name ?? "N/A"
      },
    },
    {
      accessorKey: "updated_at",
      header: "更新时间",
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
                <span className="sr-only">打开菜单</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/models/${model.id}/edit`}>编辑</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-500"
                onClick={() => model.id && onDelete(model.id)}
                disabled={!model.id}
              >
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
} 