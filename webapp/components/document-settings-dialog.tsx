"use client"

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Document } from '@/schemas/document';
import { KnowledgeBase } from '@/schemas/knowledge-base';
import { put } from '@/lib/request';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface DocumentSettingsDialogProps {
  document: Document | null;
  knowledgeBase: KnowledgeBase | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DocumentSettingsDialog({
  document,
  knowledgeBase,
  isOpen,
  onClose,
  onSuccess,
}: DocumentSettingsDialogProps) {
  const [chunkSize, setChunkSize] = useState<string>('');
  const [overlap, setOverlap] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (document) {
      // Correctly access nested properties
      setChunkSize(document.parsing_config?.chunk_size?.toString() ?? '');
      setOverlap(document.parsing_config?.overlap?.toString() ?? '');
    }
  }, [document, isOpen]); // Add isOpen to re-initialize on every open

  const handleReset = (field: 'chunkSize' | 'overlap') => {
      if(field === 'chunkSize') setChunkSize('');
      if(field === 'overlap') setOverlap('');
  }

  const handleSubmit = async () => {
    if (!document) return;

    setIsSubmitting(true);
    setError(null);
    
    // Construct the payload exactly as the backend expects
    const payload = {
      parsing_config: {
        // Use null if the string is empty
        chunk_size: chunkSize ? parseInt(chunkSize, 10) : null,
        overlap: overlap ? parseInt(overlap, 10) : null,
      },
    };

    try {
      await put(`/docs/${document.id}`, payload);
      onSuccess();
      onClose();
      toast.success(t('docSettings.saveSuccess'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('docSettings.saveFailed'));
      toast.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const kbChunkSize = knowledgeBase?.chunk_size;
  const kbOverlap = knowledgeBase?.overlap;

  return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('docSettings.title')}</DialogTitle>
            <DialogDescription>{t('docSettings.desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="chunk-size">{t('docSettings.chunkSizeLabel', { kbChunkSize })}</Label>
               <div className="flex items-center gap-2">
                  <Input
                      id="chunk-size"
                      type="number"
                      value={chunkSize}
                      onChange={(e) => setChunkSize(e.target.value)}
                      placeholder={kbChunkSize?.toString() ?? '1000'}
                  />
                   <Button variant="outline" size="sm" onClick={() => handleReset('chunkSize')}>{t('docSettings.reset')}</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="overlap">{t('docSettings.overlapLabel', { kbOverlap })}</Label>
               <div className="flex items-center gap-2">
                  <Input
                      id="overlap"
                      type="number"
                      value={overlap}
                      onChange={(e) => setOverlap(e.target.value)}
                      placeholder={kbOverlap?.toString() ?? '100'}
                  />
                  <Button variant="outline" size="sm" onClick={() => handleReset('overlap')}>{t('docSettings.reset')}</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            {error && <p className="text-sm text-red-600 mr-auto">{error}</p>}
            <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}