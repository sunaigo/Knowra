"use client";
import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import { Card, CardContent } from "@/components/ui/card";
import { get } from "@/lib/request";
import { Skeleton } from "@/components/ui/skeleton";

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
      } catch (e: any) {
        setError(e.message || "PDF 加载失败");
      } finally {
        setLoading(false);
      }
    };
    if (docId) {
      fetchPdf();
    }
  }, [docId]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function onDocumentLoadError(error: any) {
    setError("PDF 文件解析失败，可能已损坏");
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
              <button
                className="px-2 py-1 text-xs border rounded disabled:opacity-50"
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
              >
                上一页
              </button>
              <span className="text-xs">
                第 {pageNumber} / {numPages} 页
              </span>
              <button
                className="px-2 py-1 text-xs border rounded disabled:opacity-50"
                onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                disabled={pageNumber >= numPages}
              >
                下一页
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 