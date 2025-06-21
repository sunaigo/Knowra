"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { post } from '@/lib/request';

export default function KBCreatePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [chunkSize, setChunkSize] = useState(5000);
  const [overlap, setOverlap] = useState(200);
  const [autoProcess, setAutoProcess] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await post('/kb/', payload);
      router.push('/kb');
    } catch (err: any) {
      setError(err.message || '创建失败，请稍后再试。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-full">
      <Card className="w-full max-w-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>新建知识库</CardTitle>
            <CardDescription>创建一个新的知识库来管理您的文档。</CardDescription>
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
                    placeholder="例如: 5000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overlap">Overlap</Label>
                <Input
                    id="overlap"
                    type="number"
                    value={overlap}
                    onChange={(e) => setOverlap(parseInt(e.target.value, 10))}
                    placeholder="例如: 200"
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
                {isSubmitting ? '创建中...' : '创建'}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 