import { get } from "@/lib/request"
import { UsersResponse, UsersResponseSchema } from "@/schemas/user"
import { DataTable } from "./data-table"
import { columns } from "./columns"

async function getUsers({
  page,
  limit,
}: {
  page: number
  limit: number
}): Promise<UsersResponse> {
  try {
    const users = await get(`/users?page=${page}&limit=${limit}`)
    return UsersResponseSchema.parse(users.data)
  } catch (error) {
    console.error("Failed to fetch users:", error)
    return {
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      page_count: 0,
    }
  }
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams
  const page = Number(resolvedSearchParams?.page ?? "1")
  const limit = Number(resolvedSearchParams?.limit ?? "10")
  const usersData = await getUsers({ page, limit })

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">
            Here's a list of all users in the system.
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
