"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { post } from "@/lib/request";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useTranslation } from 'react-i18next'

async function createCollection(data: { name: string; description?: string; vdb_id: number; team_id: number }) {
  return post(`/collection`, data);
}

async function testCollectionConnection(vdb_id: number) {
  return post(`/collection/test-connection`, vdb_id);
}

interface CollectionFormProps {
  vdbId: number;
  teamId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export default function CollectionForm({ vdbId, teamId, open, onOpenChange, onCreated }: CollectionFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [testing, setTesting] = useState(false);
  const [testPassed, setTestPassed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { t } = useTranslation()

  const handleTest = async () => {
    setTesting(true);
    setError("");
    try {
      const res: any = await testCollectionConnection(vdbId);
      if (res.code === 200) {
        setTestPassed(true);
      } else {
        setTestPassed(false);
        setError(res.message || t('collection.testFailed'));
      }
    } catch (e) {
      setTestPassed(false);
      setError(e instanceof Error ? e.message : t('collection.testException'));
    } finally {
      setTesting(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setError("");
    try {
      const res: any = await createCollection({ name, description, vdb_id: vdbId, team_id: Number(teamId) });
      if (res.code === 200) {
        onOpenChange(false);
        setName("");
        setDescription("");
        setTestPassed(false);
        onCreated?.();
        router.refresh();
      } else {
        setError(res.message || t('actions.createFailed'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('actions.createException'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('collection.create')}</DialogTitle>
          <DialogDescription>
            {t('collection.createDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder={t('collection.name')} value={name} onChange={e => setName(e.target.value)} />
          <Textarea placeholder={t('collection.descriptionPlaceholder')} value={description} onChange={e => setDescription(e.target.value)} />
          <Button onClick={handleTest} disabled={testing || !name} variant="outline">
            {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {!testing && testPassed && <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />}
            {!testing && !testPassed && error && <XCircle className="w-4 h-4 mr-2 text-red-500" />}
            {testing ? t('actions.testing') : testPassed ? t('collection.testPassed') : t('collection.test')}
          </Button>
          {error && <div className="text-red-500 text-sm">{error}</div>}
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={!testPassed || creating || !name}>
            {creating ? t('actions.creating') : t('actions.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 