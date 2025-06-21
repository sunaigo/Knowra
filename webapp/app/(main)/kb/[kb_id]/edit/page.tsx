"use client"

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { put } from '@/lib/request';
import { Skeleton } from '@/components/ui/skeleton';

export default function KBEditPage() {
  const router = useRouter();
  const params = useParams();
  const kb_id = params.kb_id as string;

  const { data: kbData, error: kbError } = useSWR(kb_id ? `/kb/${kb_id}` : null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [chunkSize, setChunkSize] = useState(500);
  const [overlap, setOverlap] = useState(100);
  const [autoProcess, setAutoProcess] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (kbData) {
      setName(kbData.name);
      setDescription(kbData.description || '');
      setChunkSize(kbData.chunk_size || 500);
      setOverlap(kbData.overlap || 100);
      setAutoProcess(kbData.auto_process_on_upload);
    }
  }, [kbData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        name,
        description,
        chunk_size: chunkSize,
        overlap: overlap,
        auto_process_on_upload: autoProcess,
      };
      await put(`/kb/${kb_id}`, payload);
      router.push(`/kb/${kb_id}`);
    } catch (err: any) {
      setError(err.message || '更新失败，请稍后再试。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (kbError) return <div className="text-red-500">加载知识库数据失败: {kbError.message}</div>;
  if (!kbData) return (
    <div className="flex justify-center items-center h-full">
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-20 w-full" />
                 <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </CardContent>
            <CardFooter>
                 <Skeleton className="h-10 w-24 ml-auto" />
            </CardFooter>
        </Card>
    </div>
  );

  return (
    <div className="flex justify-center items-center h-full">
      <Card className="w-full max-w-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>编辑知识库</CardTitle>
            <CardDescription>更新您的知识库信息。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：产品文档"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简单描述这个知识库的用途"
              />
            </div>
             <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chunk-size">Chunk Size</Label>
                <Input
                    id="chunk-size"
                    type="number"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(parseInt(e.target.value, 10))}
                    placeholder="例如: 500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overlap">Overlap</Label>
                <Input
                    id="overlap"
                    type="number"
                    value={overlap}
                    onChange={(e) => setOverlap(parseInt(e.target.value, 10))}
                    placeholder="例如: 100"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-process"
                checked={autoProcess}
                onCheckedChange={setAutoProcess}
              />
              <Label htmlFor="auto-process">上传文档后自动处理</Label>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '更新中...' : '保存更改'}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 