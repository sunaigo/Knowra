"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, PlusCircle, FileText, Share2, Trash2, Edit } from 'lucide-react';
import { get } from '@/lib/request';
import useSWR from 'swr';
import { Skeleton } from '@/components/ui/skeleton';

// 定义知识库数据类型
interface KnowledgeBase {
  id: number;
  name: string;
  description: string | null;
  doc_count: number;
  created_at: string;
  owner: {
    username: string;
  };
}

const KnowledgeBaseCard = ({ kb }: { kb: KnowledgeBase }) => {
  const router = useRouter();

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop propagation to prevent link navigation
    e.preventDefault();
    router.push(`/kb/${kb.id}/edit`);
  };

  return (
    <Link href={`/kb/${kb.id}`} className="block hover:bg-muted/50 rounded-lg">
        <Card className="h-full">
            <CardHeader className="flex flex-row items-start justify-between">
            <div>
                <CardTitle>{kb.name}</CardTitle>
                <CardDescription>{kb.description || '暂无描述'}</CardDescription>
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
                    <span>详情</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>编辑</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                    <Share2 className="mr-2 h-4 w-4" />
                    <span>分享</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>删除</span>
                </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            </CardHeader>
            <CardContent>
            <div className="text-sm text-muted-foreground">
                <p>文档数: {kb.doc_count}</p>
                <p>创建者: {kb.owner.username}</p>
            </div>
            </CardContent>
            <CardFooter>
            <p className="text-xs text-muted-foreground">
                创建于 {new Date(kb.created_at).toLocaleDateString()}
            </p>
            </CardFooter>
        </Card>
    </Link>
  );
};


const KBSkeleton = () => (
    <Card>
        <CardHeader className="flex flex-row items-start justify-between">
            <div>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
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
  const { data: knowledgeBases, error, isLoading } = useSWR<KnowledgeBase[]>('/kb/');
  
  if (error) return <div>加载失败: {error.message}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Link href="/kb/create">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            新建知识库
          </Button>
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <KBSkeleton key={i} />)
        ) : (
            knowledgeBases?.map((kb) => (
                <KnowledgeBaseCard kb={kb} key={kb.id} />
            ))
        )}
      </div>
    </div>
  );
} 