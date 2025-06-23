"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { get } from "@/lib/request"
import { UsersResponse, UsersResponseSchema } from "@/schemas/user"
import { DataTable } from "./data-table"
import { columns } from "./columns"

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
        setError(error instanceof Error ? error.message : "获取用户列表失败")
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
  }, [page, limit])

  if (loading) {
    return (
      <div className="flex h-full flex-1 flex-col space-y-8 p-8">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">用户管理</h2>
            <p className="text-muted-foreground">
              系统中所有用户的列表。
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-1 flex-col space-y-8 p-8">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">用户管理</h2>
            <p className="text-muted-foreground">
              系统中所有用户的列表。
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-red-500">错误: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">用户管理</h2>
          <p className="text-muted-foreground">
            系统中所有用户的列表。
          </p>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={usersData.data}
        pageCount={usersData.page_count}
      />
    </div>
  )
} 
