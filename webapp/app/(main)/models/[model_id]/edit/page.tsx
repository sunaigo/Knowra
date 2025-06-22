import EditModelForm from "./edit-form"

export default function EditModelPage({
  params,
}: {
  params: { model_id: string }
}) {
  return <EditModelForm modelId={params.model_id} />
} 