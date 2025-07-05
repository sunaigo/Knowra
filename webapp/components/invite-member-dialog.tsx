"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { post } from "@/lib/request"
import { useTranslation } from 'react-i18next'

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { UserSearchCombobox } from "./user-search-combobox"
import { UserOut } from "@/schemas/user"
import { Input } from "@/components/ui/input"

export function buildInviteSchema(t: (k: string) => string) {
  return z.object({
    username: z.string().min(1, t('inviteMember.usernameRequired')),
    role: z.enum(["admin", "member"]),
  })
}

interface InviteMemberDialogProps {
  teamId: string
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onInviteSuccess: () => void
}

type InviteFormValues = {
  username: string;
  role: "admin" | "member";
}

export function InviteMemberDialog({ teamId, isOpen, onOpenChange, onInviteSuccess }: InviteMemberDialogProps) {
  const { t } = useTranslation()
  const inviteSchema = React.useMemo(() => buildInviteSchema(t), [t])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserOut | null>(null)

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      username: "",
      role: "member",
    },
  })

  const handleUserSelect = (user: UserOut | null) => {
    setSelectedUser(user)
    form.setValue("username", user ? user.username : "")
  }

  async function onSubmit(values: InviteFormValues) {
    setIsSubmitting(true)
    const res: any = await post(`/teams/${teamId}/invite`, values)
    if (res.code === 200) {
      toast.success(t('inviteMember.addSuccess'))
      onInviteSuccess()
      onOpenChange(false)
      form.reset()
      setSelectedUser(null)
    } else if (res.code === 400 && res.message?.includes(t('inviteMember.alreadyInTeamRaw'))) {
      toast.error(t('inviteMember.alreadyInTeam'))
    } else if (res.code === 404 && res.message?.includes(t('inviteMember.userNotExistRaw'))) {
      toast.error(t('inviteMember.userNotExist'))
    } else {
      toast.error(res.message || t('inviteMember.addFailed'))
    }
    setIsSubmitting(false)
  }
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
        form.reset();
        setSelectedUser(null);
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('inviteMember.title')}</DialogTitle>
          <DialogDescription>
            {t('inviteMember.desc')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inviteMember.username')}</FormLabel>
                  <FormControl>
                    <UserSearchCombobox 
                      selectedUser={selectedUser}
                      onUserSelect={handleUserSelect}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inviteMember.role')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('inviteMember.selectRole')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="member">{t('inviteMember.member')}</SelectItem>
                      <SelectItem value="admin">{t('inviteMember.admin')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('inviteMember.adding') : t('inviteMember.add')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 