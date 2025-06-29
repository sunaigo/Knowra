"use client"

import { ColumnDef, TableMeta } from "@tanstack/react-table"
import { MoreHorizontal, Settings, Users, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TeamWithRole } from "@/schemas/team"
import Link from "next/link"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { del } from "@/lib/request"
import { toast } from "sonner"
import { TeamIcon } from "@/components/team-icon"

// Augment the TanStack Table's Meta type to include our custom refresh function
declare module "@tanstack/react-table" {
  interface TableMeta<TData extends unknown> {
    refresh?: () => void
  }
}

export const columns: ColumnDef<TeamWithRole>[] = [
  {
    accessorKey: "name",
    header: "团队名称",
    cell: ({ row }) => {
      const team = row.original
      
      return (
        <Link 
          href={`/teams/${team.id}`}
          className="font-medium hover:underline flex items-center"
        >
          <TeamIcon team={team} size="sm" />
          <span className="ml-2">{team.name}</span>
        </Link>
      )
    },
  },
  {
    accessorKey: "description",
    header: "描述",
    cell: ({ row }) => {
      const description = row.getValue("description") as string
      return (
        <div className="max-w-[300px] truncate">
          {description || "无描述"}
        </div>
      )
    },
  },
  {
    accessorKey: "role",
    header: "我的角色",
    cell: ({ row }) => {
      const role = row.getValue("role") as string
      const roleMap = {
        owner: { label: "拥有者", variant: "default" as const },
        admin: { label: "管理员", variant: "secondary" as const },
        member: { label: "成员", variant: "outline" as const },
      }
      const roleInfo = roleMap[role as keyof typeof roleMap] || { label: role, variant: "outline" as const }
      
      return <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>
    },
  },
  {
    accessorKey: "member_count",
    header: "成员数量",
    cell: ({ row }) => {
      const count = row.getValue("member_count") as number
      return (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{count || 0}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: "创建时间",
    cell: ({ row }) => {
      const date = row.getValue("created_at") as string
      return new Date(date).toLocaleDateString("zh-CN")
    },
  },
  {
    id: "actions",
    header: "操作",
    cell: ({ row, table }) => {
      const team = row.original
      const canManage = team.role === 'owner' || team.role === 'admin'
      const canDelete = team.role === 'owner'
      const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
      const [deleting, setDeleting] = useState(false)

      const handleDeleteClick = () => {
        setDeleteDialogOpen(true)
      }

      const handleDeleteConfirm = async () => {
        setDeleting(true)
        try {
          const res = await del(`/teams/${team.id}`)
          if (res.code === 200) {
            toast.success("团队删除成功！")
            setDeleteDialogOpen(false)
            if (table.options.meta?.refresh) table.options.meta.refresh()
          } else {
            toast.error(res.message || "团队删除失败")
          }
        } catch {
          toast.error("团队删除失败")
        }
        setDeleting(false)
      }

      return (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">打开菜单</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>操作</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={`/teams/${team.id}`}>
                  <Users className="mr-2 h-4 w-4" />
                  查看详情
                </Link>
              </DropdownMenuItem>
              {canManage && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/teams/${team.id}/edit`}>
                      <Settings className="mr-2 h-4 w-4" />
                      编辑团队
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={handleDeleteClick}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    删除团队
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>确认删除团队</DialogTitle>
                <DialogDescription>删除团队后将无法恢复，且需先删除团队下所有知识库。确定要删除吗？</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
                <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>{deleting ? "删除中..." : "确认删除"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )
    },
  },
] 