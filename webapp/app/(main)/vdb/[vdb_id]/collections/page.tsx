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

export default function CollectionsPage() {
  const params = useParams();
  const vdbId = Number(params.vdb_id);
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const user = useUser();
  const activeTeamId = useActiveTeamId();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        alert(res.message || "删除失败");
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
  const isOwnTeam = (c: any) => String(c.team_id) === String(activeTeamId);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Collection 列表</h2>
        <Button onClick={() => setOpen(true)} disabled={!activeTeamId}>新建 Collection</Button>
      </div>
      <CollectionForm vdbId={vdbId} teamId={activeTeamId} open={open} onOpenChange={setOpen} onCreated={fetchCollections} />
      {loading ? (
        <div>加载中...</div>
      ) : (
        <div className="space-y-2">
          {collections.length === 0 ? (
            <div className="text-gray-500">暂无 Collection</div>
          ) : (
            collections.map(c => (
              <div key={c.id} className="border rounded p-4 flex flex-col gap-1 relative">
                <div className="font-semibold flex items-center gap-2">
                  {c.name}
                  {(!isOwnTeam(c) && c.team_name) && (
                    <Badge>由「{c.team_name}」创建</Badge>
                  )}
                  {c.status === "revoked" && (
                    <Badge variant="destructive">已被取消分享</Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600">{c.description || "-"}</div>
                <div className="text-xs text-gray-400">ID: {c.id}，创建人ID: {c.owner_id}</div>
                <div className="text-xs text-gray-400">创建时间: {dayjs(c.created_at).format("YYYY-MM-DD HH:mm:ss")}</div>
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
                            删除
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
                            ? "该向量库已被拥有者取消分享，无法操作"
                            : "仅本团队创建的 Collection 可操作"}
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
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除该 Collection 吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>取消</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)} disabled={deleting}>
              {deleting ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 