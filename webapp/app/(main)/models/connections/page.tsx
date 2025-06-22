import { Connection } from "@/schemas/connection"

export function ConnectionsPage() {
  const { data, error, isLoading, mutate } = useSWR<Connection[]>(
    "/connections",
    fetcher
  )

  if (error) {
    <div className="hidden h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">连接管理</h2>
          <p className="text-muted-foreground">
            在这里管理你的语言模型（LLM）供应商连接。
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <ConnectionForm onSave={mutate} />
        </div>
      </div>
      <DataTable data={data ?? []} columns={columns({ onSave: mutate })} />
    </div>
  }

  return (
    <>
      <div className="hidden h-full flex-1 flex-col space-y-8 p-8 md:flex">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">连接管理</h2>
            <p className="text-muted-foreground">
              在这里管理你的语言模型（LLM）供应商连接。
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <ConnectionForm onSave={mutate} />
          </div>
        </div>
        <DataTable data={data ?? []} columns={columns({ onSave: mutate })} />
      </div>
    </>
  )
} 