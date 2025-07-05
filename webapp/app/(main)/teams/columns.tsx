"use client"

import { ColumnDef, TableMeta, Row, Table } from "@tanstack/react-table"
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
import { useTranslation } from 'react-i18next'

// Augment the TanStack Table's Meta type to include our custom refresh function
declare module "@tanstack/react-table" {
  interface TableMeta<TData extends unknown> {
    refresh?: () => void
  }
}

export function columns({ t }: { t: any }): ColumnDef<TeamWithRole>[] {
  return [
    {
      accessorKey: "name",
      header: t('teams.teamName'),
      cell: ({ row }: { row: Row<TeamWithRole> }) => {
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
      header: t('common.description'),
      cell: ({ row }: { row: Row<TeamWithRole> }) => {
        const description = row.getValue("description") as string
        return (
          <div className="max-w-[300px] truncate">
            {description || t('teams.messages.noDescription')}
          </div>
        )
      },
    },
    {
      accessorKey: "role",
      header: t('teams.myRole'),
      cell: ({ row }: { row: Row<TeamWithRole> }) => {
        const role = row.getValue("role") as string
        const roleMap = {
          owner: { label: t('teams.roles.owner'), variant: "default" as const },
          admin: { label: t('teams.roles.admin'), variant: "secondary" as const },
          member: { label: t('teams.roles.member'), variant: "outline" as const },
        }
        const roleInfo = roleMap[role as keyof typeof roleMap] || { label: role, variant: "outline" as const }
        
        return <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>
      },
    },
    {
      accessorKey: "member_count",
      header: t('teams.memberCount'),
      cell: ({ row }: { row: Row<TeamWithRole> }) => {
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
      header: t('common.createdAt'),
      cell: ({ row }: { row: Row<TeamWithRole> }) => {
        const date = row.getValue("created_at") as string
        return new Date(date).toLocaleDateString("zh-CN")
      },
    },
    {
      id: "actions",
      header: t('actions.actions'),
      cell: ({ row, table }: { row: Row<TeamWithRole>, table: Table<TeamWithRole> }) => {
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
              toast.success(t('teams.messages.deleteSuccess'))
              setDeleteDialogOpen(false)
              if (table.options.meta?.refresh) table.options.meta.refresh()
            } else {
              toast.error(res.message || t('teams.messages.deleteFailed'))
            }
          } catch {
            toast.error(t('teams.messages.deleteFailed'))
          }
          setDeleting(false)
        }

        return (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">{t('actions.openMenu')}</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('actions.actions')}</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href={`/teams/${team.id}`}>
                    <Users className="mr-2 h-4 w-4" />
                    {t('teams.viewDetails')}
                  </Link>
                </DropdownMenuItem>
                {canManage && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/teams/${team.id}/edit`}>
                        <Settings className="mr-2 h-4 w-4" />
                        {t('teams.editTeam')}
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={handleDeleteClick}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('teams.deleteTeam')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('teams.deleteConfirmTitle')}</DialogTitle>
                  <DialogDescription>{t('teams.deleteConfirmDesc')}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
                  <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>{deleting ? t('actions.deleting') : t('actions.buttonConfirm')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )
      },
    },
  ]
} 