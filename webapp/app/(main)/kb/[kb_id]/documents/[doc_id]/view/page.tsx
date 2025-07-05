"use client"

import React, { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import dynamic from "next/dynamic"
import { get } from "@/lib/request"
import { Skeleton } from "@/components/ui/skeleton"
import TextViewer from "@/components/text-viewer"
import { Button } from "@/components/ui/button"
import { Document } from "@/schemas/document"
import { useTranslation } from "react-i18next"

const PDFViewer = dynamic(() => import("@/components/pdf-viewer"), {
  ssr: false,
  loading: () => (
    <div className="p-4">
      <Skeleton className="h-8 w-1/2 mb-4" />
      <Skeleton className="w-full h-[60vh]" />
    </div>
  ),
})

export default function DocumentPreviewPage() {
  const params = useParams()
  const doc_id = params.doc_id as string

  const [documentInfo, setDocumentInfo] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { t } = useTranslation();

  useEffect(() => {
    async function fetchDocument() {
      if (!doc_id) return
      setIsLoading(true)
      setError(null)
      try {
        const response = await get(`/docs/${doc_id}`)
        if (response && response.code === 200 && response.data) {
          setDocumentInfo(response.data)
        } else {
          setError(t('documentView.fetchFailed'))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('documentView.fetchFailed'))
      } finally {
        setIsLoading(false)
      }
    }
    fetchDocument()
  }, [doc_id, t])

  const fileDownloadUrl = `/docs/${doc_id}/download`

  if (isLoading) {
    return (
      <div className="p-4">
        <Skeleton className="h-12 w-1/4 mb-4" />
        <Skeleton className="w-full h-[80vh]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-red-500">
        <h2 className="text-2xl font-bold mb-2">{t('common.error')}</h2>
        <p>{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  if (!documentInfo) {
    return <div>{t('documentView.noInfo')}</div>
  }

  const isPdf =
    documentInfo?.filetype?.includes("pdf") ||
    documentInfo?.filename?.toLowerCase().endsWith(".pdf")
  const isImage = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ].includes(documentInfo?.filetype || "")
  const isTxt =
    documentInfo?.filetype === "text/plain" ||
    documentInfo?.filename?.toLowerCase().endsWith(".txt")

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold">{documentInfo.filename}</h1>
      </div>
      <div className="flex-grow flex items-center justify-center p-4 bg-secondary/40">
        {isTxt ? (
          <TextViewer docId={doc_id} />
        ) : isPdf ? (
          <PDFViewer docId={doc_id} filename={documentInfo.filename} />
        ) : isImage ? (
          <div className="p-4 flex justify-center">
            <img
              src={fileDownloadUrl}
              alt={documentInfo.filename}
              className="max-w-full max-h-[80vh] object-contain rounded-md shadow-md"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-4 bg-white rounded-lg shadow-sm">
            <p className="mb-4 text-muted-foreground">
              {t('documentView.unsupportedType', { type: documentInfo.filetype })}
            </p>
            <Button asChild>
              <a href={fileDownloadUrl} download={documentInfo.filename}>
                {t('documentView.download')}
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
} 