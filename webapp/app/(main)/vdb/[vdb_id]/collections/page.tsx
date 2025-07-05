"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import CollectionForm from "./collection-form";
import { get, del } from "@/lib/request";
import { useUser, useActiveTeamId } from "@/stores/user-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import dayjs from "dayjs";
import { useTranslation } from 'react-i18next';

// 后端 CollectionOut 类型
interface CollectionOut {
  id: number;
  name: string;
  description?: string | null;
  vdb_id: number;
  owner_id: number;
  owner?: { id: number; username: string; email?: string | null } | null;
  created_at: string;
  updated_at: string;
  team_id?: number;
  team_name?: string;
  status?: string;
}

export default function CollectionsPage() {
  const params = useParams();
  const vdbId = Number(params.vdb_id);
  const [collections, setCollections] = useState<CollectionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const user = useUser();
  const activeTeamId = useActiveTeamId();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { t } = useTranslation();

  const fetchCollections = async () => {
    if (!activeTeamId) return;
    setLoading(true);
    try {
      const res = await get(`/collection?vdb_id=${vdbId}&team_id=${activeTeamId}`);
      setCollections(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      const res = await del(`/collection/${id}?team_id=${activeTeamId}`);
      if (res.code === 200) {
        setDeleteId(null);
        fetchCollections();
      } else {
        alert(res.message || t('actions.deleteFailed'));
      }
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (vdbId && activeTeamId) fetchCollections();
    // eslint-disable-next-line
  }, [vdbId, activeTeamId]);

  // 判断是否本团队创建
  const isOwnTeam = (c: CollectionOut) => String(c.team_id) === String(activeTeamId);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{t('collection.listTitle')}</h2>
        <Button onClick={() => setOpen(true)} disabled={!activeTeamId}>{t('collection.create')}</Button>
      </div>
      <CollectionForm vdbId={vdbId} teamId={activeTeamId} open={open} onOpenChange={setOpen} onCreated={fetchCollections} />
      {loading ? (
        <div>{t('common.loading')}</div>
      ) : (
        <div className="space-y-2">
          {collections.length === 0 ? (
            <div className="text-gray-500">{t('collection.empty')}</div>
          ) : (
            collections.map(c => (
              <div key={c.id} className="border rounded p-4 flex flex-col gap-1 relative">
                <div className="font-semibold flex items-center gap-2">
                  {c.name}
                  {(!isOwnTeam(c) && c.team_name) && (
                    <Badge>{t('collection.createdByTeam', { team: c.team_name })}</Badge>
                  )}
                  {c.status === "revoked" && (
                    <Badge variant="destructive">{t('collection.revoked')}</Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600">{c.description || t('common.noData')}</div>
                <div className="text-xs text-gray-400">{t('collection.id')}: {c.id}，{t('collection.ownerId')}: {c.owner_id}</div>
                <div className="text-xs text-gray-400">{t('collection.createdAt')}: {dayjs(c.created_at).format("YYYY-MM-DD HH:mm:ss")}</div>
                <TooltipProvider>
                  <div className="absolute right-4 top-4 flex gap-2">
                    {isOwnTeam(c) && c.status === "normal" ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">⋯</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => setDeleteId(c.id)}
                          >
                            {t('actions.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button variant="ghost" size="sm" disabled>⋯</Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {c.status === "revoked"
                            ? t('collection.revokedTip')
                            : t('collection.onlyOwnerTeamTip')}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TooltipProvider>
              </div>
            ))
          )}
        </div>
      )}
      <Dialog open={!!deleteId} onOpenChange={v => !deleting && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('collection.deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('collection.deleteConfirmDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)} disabled={deleting}>
              {deleting ? t('actions.deleting') : t('actions.buttonConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 