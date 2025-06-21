"use client"

import React from "react"
import { useParams } from "next/navigation"
import dynamic from "next/dynamic"
import useSWR from "swr"
import { get } from "@/lib/request"
import { Skeleton } from "@/components/ui/skeleton"
import TextViewer from "@/components/text-viewer"
import { Button } from "@/components/ui/button"
import { Document } from "@/schemas/document"

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

  const {
    data: documentInfo,
    isLoading,
    error,
  } = useSWR<Document>(doc_id ? `/kb/documents/${doc_id}` : null)

  const fileDownloadUrl = `/api/kb/documents/${doc_id}/download`

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
        <h2 className="text-2xl font-bold mb-2">Error</h2>
        <p>{error.message}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  if (!documentInfo) {
    return <div>No document information found.</div>
  }

  const isPdf =
    documentInfo.filetype.includes("pdf") ||
    documentInfo.filename.toLowerCase().endsWith(".pdf")
  const isImage = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ].includes(documentInfo.filetype)
  const isTxt =
    documentInfo.filetype === "text/plain" ||
    documentInfo.filename.toLowerCase().endsWith(".txt")

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
              不支持预览此文件类型 ({documentInfo.filetype})。
            </p>
            <Button asChild>
              <a href={fileDownloadUrl} download={documentInfo.filename}>
                下载文件
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
} 