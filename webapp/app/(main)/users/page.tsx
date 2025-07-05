"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { get } from "@/lib/request"
import { UsersResponse, UsersResponseSchema } from "@/schemas/user"
import { DataTable } from "./data-table"
import { columns } from "./columns"
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"

export default function UsersPage() {
  const searchParams = useSearchParams()
  const [usersData, setUsersData] = useState<UsersResponse>({
    data: [],
    total: 0,
    page: 1,
    limit: 10,
    page_count: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { t } = useTranslation()

  const page = Number(searchParams.get("page") ?? "1")
  const limit = Number(searchParams.get("limit") ?? "10")

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true)
        const response = await get(`/users?page=${page}&limit=${limit}`)
        const validatedData = UsersResponseSchema.parse(response.data)
        setUsersData(validatedData)
      } catch (error) {
        console.error("Failed to fetch users:", error)
        setError(error instanceof Error ? error.message : t('user.loadFailed'))
        setUsersData({
          data: [],
          total: 0,
          page: 1,
          limit: 10,
          page_count: 0,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [page, limit, t])

  if (loading) {
    return (
      <div className="flex h-full flex-1 flex-col space-y-8 p-8">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t('user.title')}</h2>
            <p className="text-muted-foreground">
              {t('user.desc')}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">{t('common.loading')}</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-1 flex-col space-y-8 p-8">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t('user.title')}</h2>
            <p className="text-muted-foreground">
              {t('user.desc')}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-red-500">{t('common.error')}: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('user.title')}</h2>
          <p className="text-muted-foreground">
            {t('user.desc')}
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('user.create')}
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={usersData.data}
        pageCount={usersData.page_count}
      />
      {/* 保持原有骨架屏和卡片渲染逻辑，或用已有的 Skeleton/Card 组件 */}
      {error && <div className="text-center text-red-500">{t('common.loadFailed')}: {error}</div>}
    </div>
  )
} 
