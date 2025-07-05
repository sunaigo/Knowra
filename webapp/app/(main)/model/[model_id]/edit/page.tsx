import EditModelForm from "./edit-form"
import { useTranslation } from 'react-i18next';

export default function EditModelPage({
  params,
}: {
  params: { model_id: string }
}) {
  const { t } = useTranslation();

  return <EditModelForm modelId={params.model_id} />
} 