"use client";
import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import { Card, CardContent } from "@/components/ui/card";
import { get } from "@/lib/request";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

interface PDFViewerProps {
  docId: string;
  filename: string;
}

export default function PDFViewer({ docId, filename }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [file, setFile] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchPdf = async () => {
      setLoading(true);
      setError(null);
      try {
        const fileBlob = await get(
          `/kb/documents/${docId}/download`,
          { responseType: 'blob' }
        );
        setFile(fileBlob);
      } catch (e) {
        if (e instanceof Error) {
          setError(e.message || t('pdf.loadError'));
        } else {
          setError(t('pdf.loadError'));
        }
      } finally {
        setLoading(false);
      }
    };
    if (docId) {
      fetchPdf();
    }
  }, [docId, t]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function onDocumentLoadError(error: Error) {
    setError(t('pdf.parseError'));
    console.error(error);
  }

  const loadingSkeleton = (
    <div className="p-4">
        <Skeleton className="h-8 w-1/2 mb-4" />
        <Skeleton className="w-full h-[60vh]" />
    </div>
  )

  return (
    <Card className="bg-muted rounded-md p-4">
      <CardContent>
        <div className="flex flex-col items-center">
          <div className="mb-2 text-sm text-muted-foreground">{filename}</div>
          {loading && loadingSkeleton}
          {error && <div className="text-red-500">{error}</div>}
          {file && !error && (
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={loadingSkeleton}
            >
              <Page pageNumber={pageNumber} width={600} />
            </Document>
          )}
          {numPages && numPages > 1 && (
            <div className="flex gap-2 mt-4 items-center">
              <Button
                className="px-2 py-1 text-xs border rounded disabled:opacity-50"
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
              >
                {t('pdf.prevPage')}
              </Button>
              <span className="text-xs">
                {t('pdf.pageInfo', { pageNumber, numPages })}
              </span>
              <Button
                className="px-2 py-1 text-xs border rounded disabled:opacity-50"
                onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                disabled={pageNumber >= numPages}
              >
                {t('pdf.nextPage')}
              </Button>
            </div>
          )}
          <span>{t('pdf.loading')}</span>
          <span>{t('pdf.loadFailed')}</span>
          <span>{t('pdf.noPage')}</span>
          <Button>{t('pdf.prev')}</Button>
          <Button>{t('pdf.next')}</Button>
        </div>
      </CardContent>
    </Card>
  );
} 