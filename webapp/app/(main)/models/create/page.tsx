'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/request';
import { Icon } from '@/components/ui/icon';
import {
  Model,
  modelSchema,
  MODEL_TYPE_SCHEMA,
  PROVIDER_SCHEMA,
} from '@/schemas/model';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';

type FormValues = Model;

const PROVIDER_MAP: Record<Model['provider'], string> = {
  openai: 'OpenAI',
  ollama: 'Ollama',
  xinference: 'Xinference',
  other: 'OpenAI-Compatible',
};

const MODEL_TYPE_MAP: Record<Model['model_type'], string> = {
  llm: '大语言模型',
  vision: '视觉大模型',
  embedding: '文本向量模型',
};

export default function CreateModelPage() {
  const router = useRouter();
  const [testStatus, setTestStatus] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(modelSchema),
    defaultValues: {
      model_name: '',
      provider: 'openai',
      model_type: 'llm',
      api_base: '',
      api_key: '',
      description: '',
    },
  });

  async function handleTestConnection() {
    const result = await form.trigger();
    if (!result) return;
    const values = form.getValues();

    setTestStatus('testing');
    try {
      await post('/models/test', values);
      toast.success('连接测试成功！');
      setTestStatus('success');
    } catch (error: any) {
      toast.error(`连接测试失败: ${error.message}`);
      setTestStatus('error');
    }
  }

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      await post('/models', values);
      toast.success('模型添加成功！');
      router.push('/models');
    } catch (error: any) {
      toast.error(`模型添加失败: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>添加新模型</CardTitle>
        <CardDescription>
          填入模型的详细信息。请先测试连接，成功后方可保存。
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
                  <FormLabel>模型提供者</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择一个模型提供商" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROVIDER_SCHEMA.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          <div className="flex items-center">
                            <Icon
                              name={option === 'other' ? 'openai' : option}
                              className="h-4 w-4 mr-2"
                            />
                            {PROVIDER_MAP[option]}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="model_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>模型类型</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择一个模型类型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MODEL_TYPE_SCHEMA.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {MODEL_TYPE_MAP[option]}
                        </SelectItem>
                      ))}
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
                      placeholder="请输入 API Key"
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
                    <Input
                      placeholder="（可选）输入模型描述"
                      {...field}
                      value={field.value ?? ''}
                    />
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
                disabled={testStatus === 'testing'}
              >
                {testStatus === 'testing' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {testStatus === 'success' && (
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                )}
                {testStatus === 'error' && (
                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                )}
                {testStatus === 'testing'
                  ? '测试中...'
                  : testStatus === 'success'
                    ? '测试成功'
                    : testStatus === 'error'
                      ? '测试失败'
                      : '测试连接'}
              </Button>
              <Button
                type="submit"
                disabled={testStatus !== 'success' || isSubmitting}
              >
                {isSubmitting ? '保存中...' : '保存'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 