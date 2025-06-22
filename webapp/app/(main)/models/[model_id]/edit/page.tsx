'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { post, put, fetcher } from '@/lib/request';
import { type Model } from '@/schemas/model';
import useSWR from 'swr';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/components/ui/icon';
import React from 'react';

const formSchema = z.object({
  model_name: z.string().min(1, '模型名称不能为空'),
  provider: z.string().min(1, '请选择一个模型类型'),
  api_base: z.string().url('请输入有效的 URL'),
  api_key: z.string().min(1, 'API 密钥不能为空'),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditModelPage({
  params,
}: {
  params: { model_id: string };
}) {
  const router = useRouter();
  const modelId = params.model_id;

  const {
    data: model,
    isLoading: isLoadingModel,
    error,
  } = useSWR<Model>(modelId ? `/models/${modelId}` : null, fetcher);

  const [isTesting, setIsTesting] = useState(false);
  const [isTestSuccess, setIsTestSuccess] = useState(true); // Default to true for editing
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      model_name: '',
      provider: 'openai',
      api_base: '',
      api_key: '********', // Mask the key
      description: '',
    },
  });

  useEffect(() => {
    if (model) {
      form.reset({
        ...model,
        description: model.description ?? '', // Handle null description
        api_key: '********', // Mask the key
      });
    }
  }, [model, form]);

  async function handleTestConnection() {
    const result = await form.trigger();
    if (!result) return;
    const values = form.getValues();

    setIsTesting(true);
    try {
      // If the API key is not changed, we can't test it
      if (values.api_key === '********') {
        toast.info('如需测试，请输入新的 API 密钥');
        setIsTestSuccess(true); // Assume it's still valid
        return;
      }
      await post('/models/test', values);
      toast.success('连接测试成功！');
      setIsTestSuccess(true);
    } catch (error: any) {
      toast.error(`连接测试失败: ${error.message}`);
      setIsTestSuccess(false);
    } finally {
      setIsTesting(false);
    }
  }

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const payload = { ...values };
      // If api_key is not changed, don't send it to the backend
      if (payload.api_key === '********') {
        delete (payload as Partial<FormValues>).api_key;
      }

      await put(`/models/${modelId}`, payload);
      toast.success('模型更新成功！');
      router.push('/models');
    } catch (error: any) {
      toast.error(`模型更新失败: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingModel) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return <Card>
      <CardHeader>
        <CardTitle>加载失败</CardTitle>
        <CardDescription>{error.message}</CardDescription>
      </CardHeader>
    </Card>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>编辑模型</CardTitle>
        <CardDescription>
          修改模型的详细信息。API 密钥为保护状态，如需修改请直接输入新的密钥。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="model_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>模型名称</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：GPT-4o" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>模型类型</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择一个模型提供商" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="openai">
                        <div className="flex items-center">
                          <Icon name="openai" className="h-4 w-4 mr-2" />
                          OpenAI
                        </div>
                      </SelectItem>
                      <SelectItem value="ollama">
                        <div className="flex items-center">
                          <Icon name="ollama" className="h-4 w-4 mr-2" />
                          Ollama
                        </div>
                      </SelectItem>
                      <SelectItem value="xinference">
                        <div className="flex items-center">
                          <Icon name="xinference" className="h-4 w-4 mr-2" />
                          Xinference
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="api_base"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API 基地址 (Base URL)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例如：https://api.openai.com/v1"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="api_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API 密钥</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="保持不变请留空或输入新密钥"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述</FormLabel>
                  <FormControl>
                    <Input placeholder="（可选）输入模型描述" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? '测试中...' : '测试连接'}
              </Button>
              <Button type="submit" disabled={!isTestSuccess || isSubmitting}>
                {isSubmitting ? '保存中...' : '保存'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 