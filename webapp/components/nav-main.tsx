"use client"

import * as React from "react"
import { type LucideIcon, ChevronRight, Home, Library, PanelTop, Share, Users } from "lucide-react"
import { useTranslation } from 'react-i18next'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

// 定义菜单项类型
type MenuItem = {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  items?: {
    title: string
    url: string
    isActive?: boolean
  }[]
}

// 使用 sessionStorage 来存储状态
const STORAGE_KEY = "nav_main_open_items"

export function NavMain({ items }: { items: MenuItem[] }) {
  const { t } = useTranslation()
  const pathname = usePathname()
  const [openItems, setOpenItems] = React.useState<string[]>([])

  // 组件挂载时从 sessionStorage 读取状态，并根据当前路径设置展开项
  React.useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      let openItemsFromStorage: string[] = []
      if (saved) {
        openItemsFromStorage = JSON.parse(saved)
      }

      // 找到当前路径匹配的父菜单
      const activeParent = items.find(item =>
        item.items?.some(subItem => pathname.startsWith(subItem.url))
      )
      
      // 合并 sessionStorage 和当前活动菜单
      const newOpenItems = [...openItemsFromStorage]
      if (activeParent && !newOpenItems.includes(activeParent.title)) {
        newOpenItems.push(activeParent.title)
      }
      setOpenItems(newOpenItems)

    } catch (e) {
      console.error("Failed to parse nav_main_open_items:", e)
    }
  }, [pathname, items])

  // 切换菜单项的展开状态
  const toggleItem = React.useCallback((title: string) => {
    setOpenItems((prev) => {
      const newState = prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
      
      // 保存到 sessionStorage
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
      } catch (e) {
        console.error("Failed to save nav_main_open_items:", e)
      }
      return newState
    })
  }, [])

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t('platform')}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isCollapsible = item.items && item.items.length > 0;

          if (isCollapsible) {
            return (
              <Collapsible
                key={item.title}
                asChild
                open={openItems.includes(item.title)}
                onOpenChange={() => toggleItem(item.title)}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} isActive={item.isActive}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={subItem.isActive}>
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          }

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={item.isActive}>
                <Link href={item.url}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
