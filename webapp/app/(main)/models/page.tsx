'use client';

import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { DataTable } from '@/components/ui/data-table';
import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import useSWR, { useSWRConfig } from 'swr';
import { fetcher, post, del } from '@/lib/request';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { type Model } from '@/schemas/model';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import React from 'react';

export default function ModelsPage() {
  const { data, error, isLoading } = useSWR<Model[]>('/models', fetcher);
  const { mutate } = useSWRConfig();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingModelId, setDeletingModelId] = useState<number | null>(null);

  const handleTestConnection = async (modelId: number) => {
    try {
      await post(`/models/${modelId}/test`);
      toast.success('连接测试成功！');
    } catch (error: any) {
      toast.error(`连接测试失败: ${error.message}`);
    }
  };

  const handleDelete = async () => {
    if (!deletingModelId) return;
    try {
      await del(`/models/${deletingModelId}`);
      toast.success('模型删除成功！');
      mutate('/models');
    } catch (error: any) {
      toast.error(`模型删除失败: ${error.message}`);
    } finally {
      setDeletingModelId(null);
      setShowDeleteDialog(false);
    }
  };

  const openDeleteDialog = (modelId: number) => {
    setDeletingModelId(modelId);
    setShowDeleteDialog(true);
  };

  const columns: ColumnDef<Model>[] = useMemo(
    () => [
      {
        accessorKey: 'model_name',
        header: '模型名称',
      },
      {
        accessorKey: 'provider',
        header: '模型类型',
        cell: ({ row }) => {
          const provider = row.original.provider;
          return (
            <Badge variant="outline" className="flex items-center w-fit">
              <Icon name={provider} className="h-4 w-4 mr-2" />
              {provider}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'api_base',
        header: 'API Base',
      },
      {
        accessorKey: 'is_default',
        header: '是否默认',
        cell: ({ row }) => (row.original.is_default ? '是' : '否'),
      },
      {
        accessorKey: 'created_at',
        header: '创建时间',
        cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const model = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <Link href={`/models/${model.id}/edit`} passHref>
                  <DropdownMenuItem>编辑</DropdownMenuItem>
                </Link>
                <DropdownMenuItem onClick={() => handleTestConnection(model.id)}>
                  测试连接
                </DropdownMenuItem>
                {!model.is_default && (
                  <DropdownMenuItem>设为默认</DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => openDeleteDialog(model.id)}
                >
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [mutate]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">模型管理</h1>
        <Link href="/models/create" passHref>
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            添加模型
          </Button>
        </Link>
      </div>
      <div className="border rounded-md">
        <DataTable columns={columns} data={data ?? []} isLoading={isLoading} />
      </div>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除该模型。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 