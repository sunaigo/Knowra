import { TeamForm } from "../team-form"

export default function CreateTeamPage() {
  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">创建新团队</h2>
          <p className="text-muted-foreground">
            创建一个新团队来协作管理知识库和项目。
          </p>
        </div>
      </div>
      <div className="max-w-2xl">
        <TeamForm mode="create" />
      </div>
    </div>
  )
} 