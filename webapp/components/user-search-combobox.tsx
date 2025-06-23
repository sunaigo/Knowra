"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { get } from "@/lib/request"
import { UserOut } from "@/schemas/user"
import { useDebounce } from "use-debounce"

interface UserSearchComboboxProps {
  selectedUser: UserOut | null
  onUserSelect: (user: UserOut | null) => void
}

export function UserSearchCombobox({ selectedUser, onUserSelect }: UserSearchComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300)
  const [users, setUsers] = React.useState<UserOut[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    async function searchUsers() {
      if (debouncedSearchTerm.length < 1) {
        setUsers([])
        return
      }
      setIsLoading(true)
      try {
        const response = await get(`/users/search?keyword=${debouncedSearchTerm}`)
        setUsers(response.data || [])
      } catch (error) {
        console.error("Failed to search users:", error)
        setUsers([])
      } finally {
        setIsLoading(false)
      }
    }

    searchUsers()
  }, [debouncedSearchTerm])

  const handleSelect = (user: UserOut) => {
    onUserSelect(user)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedUser
            ? selectedUser.username
            : "搜索并选择一个用户..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder="输入用户名进行搜索..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            
          />
          <CommandList>
            {isLoading && <CommandItem>加载中...</CommandItem>}
            <CommandEmpty>{!isLoading && "未找到用户。"}</CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.username}
                  onSelect={() => handleSelect(user)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedUser?.id === user.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {user.username}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 