'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { connectionCreateSchema, Connection, PROVIDER_SCHEMA } from '@/schemas/connection';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { post, put } from '@/lib/request';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Check, X } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ConnectionFormProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
  connection: Connection | null;
}

type TestStatus = "idle" | "loading" | "success" | "error";

export function ConnectionForm({
  open,
  setOpen,
  onSuccess,
  connection,
}: ConnectionFormProps) {
  const { t } = useTranslation();
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const API_URL = '/connections';

  const form = useForm<z.infer<typeof connectionCreateSchema>>({
    resolver: zodResolver(connectionCreateSchema),
    defaultValues: {
      name: '',
      provider: 'openai',
      api_base: '',
      api_key: '',
      description: '',
    },
  });
  
  const provider = form.watch("provider")
  const apiBase = form.watch("api_base")
  const apiKey = form.watch("api_key")

  useEffect(() => {
    if (connection) {
      form.reset(connection);
    } else {
      form.reset({
        name: '',
        provider: 'openai',
        api_base: '',
        api_key: '',
        description: '',
      });
    }
    setTestStatus("idle");
    setTestError(null);
  }, [connection, form, open]); // also reset on open
  
  useEffect(() => {
    setTestStatus("idle");
    setTestError(null);
  }, [provider, apiBase, apiKey])

  const handleTestConnection = async () => {
    setTestStatus("loading");
    setTestError(null);
    try {
      const values = form.getValues();
      const testPayload = {
        provider: values.provider,
        config: {
          base_url: values.api_base,
          api_key: values.api_key,
        },
      };
      await post("/connections/test", testPayload);
      setTestStatus("success");
      toast.success(t("connections.testSuccess"));
    } catch (error) {
      setTestStatus("error");
      const errorMessage = (error instanceof Error ? error.message : t("connections.testFailed"));
      setTestError(errorMessage);
      toast.error(t("connections.testFailed"));
    }
  };

  const onSubmit = async (values: z.infer<typeof connectionCreateSchema>) => {
    setIsSubmitting(true);
    try {
      if (connection) {
        await put(`${API_URL}/${connection.id}`, values);
        toast.success(t("connections.updateSuccess"));
      } else {
        await post(API_URL, values);
        toast.success(t("connections.createSuccess"));
      }
      onSuccess();
    } catch (error) {
      toast.error(`${t("connections.saveFailed")}: ${(error instanceof Error ? error.message : "")}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const isEditMode = Boolean(connection)
  const isSaveDisabled = isSubmitting || 
    (isEditMode 
      ? testStatus === 'error' 
      : testStatus !== 'success'
    )

  const saveButtonTooltipContent = () => {
    if (!isEditMode && testStatus !== 'success') {
      return t("connections.tooltips.testToSave")
    }
    if (isEditMode && testStatus === 'error') {
      return t("connections.tooltips.fixToSave")
    }
    return null
  }
  const tooltipContent = saveButtonTooltipContent()


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {connection ? t("connections.edit") : t("connections.new")}
          </DialogTitle>
          <DialogDescription>
            {t("connections.formDescription")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("connections.name")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>{t("connections.provider")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROVIDER_SCHEMA.options.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
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
                  <FormLabel>{t("connections.apiBase")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>{t("connections.apiKey")}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormDescription>
                    {t("connections.apiKeyDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("connections.description")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("connections.descriptionPlaceholder")}
                      className="resize-none"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-between items-end pt-4">
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testStatus === "loading"}
                  className="w-[130px] transition-all"
                >
                  {testStatus === "idle" && t("connections.test")}
                  {testStatus === "loading" && (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("connections.testing")}
                    </>
                  )}
                  {testStatus === "success" && (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      {t("connections.testSuccessShort")}
                    </>
                  )}
                  {testStatus === "error" && (
                    <>
                      <X className="mr-2 h-4 w-4 text-red-500" />
                      {t("connections.testFailedShort")}
                    </>
                  )}
                </Button>
                {testStatus === "error" && testError && (
                  <p className="mt-2 text-sm text-red-500">{testError}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>{t("actions.cancel")}</Button>
                <TooltipProvider>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <div className="inline-block">
                        <Button type="submit" disabled={isSaveDisabled}>
                          {isSubmitting ? t("actions.saving") : t("actions.save")}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {tooltipContent && <TooltipContent><p>{tooltipContent}</p></TooltipContent>}
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 