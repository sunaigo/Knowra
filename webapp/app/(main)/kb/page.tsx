"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, PlusCircle, FileText, Share2, Trash2, Edit, LogOut } from 'lucide-react';
import { get, del } from '@/lib/request';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveTeamId, useTeams } from '@/stores/user-store';
import { useUser } from '@/stores/user-store';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { CustomSvgIcon } from '@/components/custom-svg-icon';
import * as HeroIconsSolid from "@heroicons/react/24/solid";
import * as HeroIconsOutline from "@heroicons/react/24/outline";
import { useTranslation } from 'react-i18next';

// 定义知识库数据类型
interface KnowledgeBase {
  id: number;
  name: string;
  description: string | null;
  doc_count: number;
  created_at: string;
  icon_name: string | null;
  owner: {
    username: string;
  };
}

// 图标渲染组件
const IconRenderer = ({ iconName }: { iconName: string }) => {
  const [iconContent, setIconContent] = useState<string | null>(null);
  const [isHeroIcon, setIsHeroIcon] = useState(false);
  const [HeroIcon, setHeroIcon] = useState<React.ComponentType<{ className?: string }> | null>(null);
  const [hasRequested, setHasRequested] = useState(false);

  useEffect(() => {
    if (!iconName || hasRequested) return;

    // 检查是否是Heroicons
    const solidIcon = (HeroIconsSolid as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
    const outlineIcon = (HeroIconsOutline as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
    
    if (solidIcon || outlineIcon) {
      setIsHeroIcon(true);
      setHeroIcon(solidIcon || outlineIcon);
      setHasRequested(true);
    } else {
      // 获取自定义图标内容
      setHasRequested(true);
      get(`/icons/custom?names=${iconName}`)
        .then(data => {
          if (data.data && data.data.length > 0) {
            setIconContent(data.data[0].content);
          }
        })
        .catch(err => {
          console.error('获取图标内容失败:', err);
        });
    }
  }, [iconName, hasRequested]);

  if (!iconName) return null;

  if (isHeroIcon && HeroIcon) {
    return <HeroIcon className="w-8 h-8 text-primary" />;
  }

  if (iconContent) {
    return (
      <CustomSvgIcon 
        content={iconContent} 
        width={32} 
        height={32} 
        className="text-primary" 
      />
    );
  }

  return null;
};

const KnowledgeBaseCard = ({ kb, t }: { kb: KnowledgeBase, t: any }) => {
  const router = useRouter();
  const user = useUser();
  const teams = useTeams();
  const activeTeamId = useActiveTeamId();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isOwner = user && (user.username === kb.owner.username);
  // 判断当前团队角色
  const team = teams.find(t => t.id.toString() === activeTeamId);
  const isAdmin = team && (team.role === 'admin' || team.role === 'owner');

  const canDelete = isOwner || isAdmin;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    router.push(`/kb/${kb.id}/edit`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      const res = await del(`/kb/${kb.id}`);
      if (res.code === 200) {
        toast.success(t('kb.deleteSuccess'));
        setDeleteDialogOpen(false);
        // 重新获取知识库列表而不是刷新整个页面
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      } else {
        toast.error(res.message || t('kb.deleteFailed'));
      }
    } catch {
      toast.error(t('kb.deleteFailed'));
    }
    setDeleting(false);
  };

  return (
    <>
      <Link href={`/kb/${kb.id}`} className="block hover:bg-muted/50 rounded-lg">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="flex items-center gap-3">
              {kb.icon_name && (
                <div className="w-8 h-8 flex items-center justify-center">
                  <IconRenderer iconName={kb.icon_name} />
                </div>
              )}
              <div>
                <CardTitle>{kb.name}</CardTitle>
                <CardDescription>{kb.description || t('kb.noDesc')}</CardDescription>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/kb/${kb.id}`)}>
                  <FileText className="mr-2 h-4 w-4" />
                  <span>{t('common.detail')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>{t('common.edit')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="mr-2 h-4 w-4" />
                  <span>{t('common.share')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={canDelete ? "text-red-600" : "text-red-600 opacity-50 cursor-not-allowed"}
                  onClick={canDelete ? handleDeleteClick : (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    toast.info(t('kb.deleteNoPermission'));
                  }}
                  disabled={!canDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>{t('common.delete')}</span>
                </DropdownMenuItem>
                {!canDelete && (
                  <DropdownMenuItem className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('common.exit')}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>{t('kb.docCount', { count: kb.doc_count })}</p>
              <p>{t('kb.owner', { owner: kb.owner.username })}</p>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              {t('kb.createdAt', { date: new Date(kb.created_at).toLocaleDateString() })}
            </p>
          </CardFooter>
        </Card>
      </Link>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('kb.deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>{t('kb.deleteConfirmDesc')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>{deleting ? t('common.deleting') : t('kb.deleteConfirmButton')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};


const KBSkeleton = () => (
    <Card>
        <CardHeader className="flex flex-row items-start justify-between">
            <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div>
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                </div>
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
        </CardHeader>
        <CardContent className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
        </CardContent>
        <CardFooter>
            <Skeleton className="h-4 w-28" />
        </CardFooter>
    </Card>
)

export default function KBPage() {
  const teamId = useActiveTeamId();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    async function fetchKnowledgeBases() {
      if (!teamId) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await get(`/kb?team_id=${teamId}`);
        if (response && response.code === 200 && Array.isArray(response.data)) {
          setKnowledgeBases(response.data);
        } else {
          setError(t('kb.loadFailed'));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('kb.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    }
    fetchKnowledgeBases();
  }, [teamId, t]);
  
  if (error) return <div className="text-center text-red-500">{t('common.loadFailed')}: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Link href="/kb/create">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('kb.create')}
          </Button>
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <KBSkeleton key={i} />)
        ) : (
            knowledgeBases?.map((kb) => (
                <KnowledgeBaseCard kb={kb} t={t} key={kb.id} />
            ))
        )}
      </div>
    </div>
  );
} 