"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { get } from '@/lib/request';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TextViewerProps {
  docId: string;
}

export default function TextViewer({ docId }: TextViewerProps) {
  const [content, setContent] = useState('');
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(false);
  
  const observer = useRef<IntersectionObserver>();

  const fetchContent = useCallback(async (offset: number) => {
    if (isFetching.current) return;
    isFetching.current = true;

    if (offset === 0) {
      setInitialLoading(true);
    }
    setLoading(true);
    setError(null);
    try {
      const response = await get(`/docs/${docId}/preview?offset=${offset}`);
      setContent(prev => (offset === 0 ? response.content : prev + response.content));
      setNextOffset(response.next_offset);
    } catch (err) {
      setError("An error occurred while fetching content.");
      console.error(err);
      setNextOffset(null);
    } finally {
      setLoading(false);
      setInitialLoading(false);
      isFetching.current = false;
    }
  }, [docId]);

  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loading || isFetching.current) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && nextOffset !== null) {
        fetchContent(nextOffset);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, nextOffset, fetchContent]);
  
  useEffect(() => {
    // Reset and fetch initial content when docId changes
    setContent('');
    setNextOffset(0);
    fetchContent(0);
  }, [docId, fetchContent]);

  if (initialLoading) {
      return (
        <Card className="w-full max-w-4xl h-full max-h-[85vh] p-6">
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
            </div>
        </Card>
      )
  }

  return (
    <Card className="w-full max-w-4xl h-full max-h-[85vh]">
        <CardContent className="p-2 sm:p-6">
            <ScrollArea className="h-[75vh] w-full pr-4">
                <pre className="text-sm whitespace-pre-wrap font-sans">
                    {content}
                </pre>
                {loading && (
                     <div className="space-y-2 mt-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                    </div>
                )}
                <div ref={lastElementRef} style={{ height: '1px' }} />
                {error && <div className="text-red-500 mt-4 text-center">{error}</div>}
                {nextOffset === null && content && <div className="text-center text-muted-foreground mt-4 py-2 text-sm">文档末尾</div>}
            </ScrollArea>
        </CardContent>
    </Card>
  );
} 