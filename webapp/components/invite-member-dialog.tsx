"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { post } from "@/lib/request"

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

const inviteSchema = z.object({
  username: z.string().min(1, "用户名不能为空"),
  role: z.enum(["admin", "member"]),
})

interface InviteMemberDialogProps {
  teamId: string
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onInviteSuccess: () => void
}

type InviteFormValues = z.infer<typeof inviteSchema>

export function InviteMemberDialog({ teamId, isOpen, onOpenChange, onInviteSuccess }: InviteMemberDialogProps) {
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
    const res = await post(`/teams/${teamId}/invite`, values)
    if (res.code === 200) {
      toast.success("添加成功！")
      onInviteSuccess()
      onOpenChange(false)
      form.reset()
      setSelectedUser(null)
    } else if (res.code === 400 && res.message?.includes('用户已在团队中')) {
      toast.error('该用户已是团队成员，无需重复邀请')
    } else if (res.code === 404 && res.message?.includes('用户不存在')) {
      toast.error('用户不存在，请检查用户名')
    } else {
      toast.error(res.message || '添加失败，请重试')
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
          <DialogTitle>添加新成员</DialogTitle>
          <DialogDescription>
            搜索并选择一个系统内已注册的用户，并为其分配角色。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>用户名</FormLabel>
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
                  <FormLabel>角色</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择一个角色" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="member">成员 (Member)</SelectItem>
                      <SelectItem value="admin">管理员 (Admin)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "添加中..." : "添加成员"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 