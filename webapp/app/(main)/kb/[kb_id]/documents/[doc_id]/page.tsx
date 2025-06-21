"use client"

import useSWR, { useSWRConfig } from "swr"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import React from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import isEqual from "lodash/isEqual"
import { Settings } from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { get, post, put } from "@/lib/request"
import { buttonVariants } from "@/components/ui/button"
import { DocumentSettingsDialog } from "@/components/document-settings-dialog"
import { KnowledgeBase } from "@/schemas/knowledge-base"
import { Document as Doc } from "@/schemas/document"

interface Chunk {
  chunk_id: number
  text: string
  total_lines: number
  truncated: boolean
  length: number
}

interface ChunksResponse {
  items: Chunk[]
  total: number
  page: number
  limit: number
}

const fetchFullChunk = async (
  doc_id: string,
  chunk_id: number
): Promise<Chunk> => {
  const response = await get(
    `/kb/documents/${doc_id}/chunks?page=${chunk_id + 1}&limit=1&full_text=true`
  )
  if (response.data && response.data.items && response.data.items.length > 0) {
    return response.data.items[0]
  }
  throw new Error("Chunk not found")
}

export default function DocumentChunksPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const { mutate } = useSWRConfig()

  const doc_id = params.doc_id as string
  const kb_id = params.kb_id as string

  const page = Number(searchParams.get("page")) || 1
  const limit = Number(searchParams.get("limit")) || 10

  const chunksUrl = doc_id
    ? `/kb/documents/${doc_id}/chunks?page=${page}&limit=${limit}`
    : null
  const documentUrl = doc_id ? `/kb/documents/${doc_id}` : null
  const kbUrl = kb_id ? `/kb/${kb_id}` : null

  const { data: chunksData, isLoading: isLoadingChunks } =
    useSWR<ChunksResponse>(chunksUrl)
  const { data: documentData, isLoading: isLoadingDocument } =
    useSWR<Doc>(documentUrl)
  const { data: kbData, isLoading: isLoadingKb } =
    useSWR<KnowledgeBase>(kbUrl)

  const totalPages = chunksData ? Math.ceil(chunksData.total / chunksData.limit) : 0

  const [expandedChunks, setExpandedChunks] = React.useState<
    Record<number, string>
  >({})
  const [loadingChunks, setLoadingChunks] = React.useState<Set<number>>(
    new Set()
  )
  const [isReprocessAlertOpen, setIsReprocessAlertOpen] = React.useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)
  const [openChunks, setOpenChunks] = React.useState<string[]>([])

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      router.push(
        `/kb/${kb_id}/documents/${doc_id}?page=${newPage}&limit=${limit}`
      )
    }
  }

  const handlePageSizeChange = (value: string) => {
    const newPageSize = parseInt(value, 10)
    router.push(
      `/kb/${kb_id}/documents/${doc_id}?page=1&limit=${newPageSize}`
    )
  }

  const handleLoadFullChunk = async (chunkId: number) => {
    setLoadingChunks((prev) => new Set(prev).add(chunkId))
    try {
      const fullChunk = await fetchFullChunk(doc_id, chunkId)
      setExpandedChunks((prev) => ({
        ...prev,
        [chunkId]: fullChunk.text,
      }))
    } catch (error) {
      toast.error("Failed to load full chunk content.")
      console.error("Failed to load full chunk:", error)
    } finally {
      setLoadingChunks((prev) => {
        const newSet = new Set(prev)
        newSet.delete(chunkId)
        return newSet
      })
    }
  }

  const processDocument = async () => {
    try {
      await post(`/kb/documents/${doc_id}/process`)
      toast.success(t("documentChunks.reprocessStart", "Reprocessing started..."))
      mutate(documentUrl)
      mutate(chunksUrl)
    } catch (error) {
      toast.error(t("documentChunks.reprocessFail", "Failed to start reprocessing."))
      console.error("Failed to process document:", error)
    }
  }

  const handleProcessClick = () => {
    if (!documentData) return

    const currentConfig = documentData.parsing_config || {}
    const lastConfig = documentData.last_parsed_config || {}

    if (isEqual(currentConfig, lastConfig)) {
      setIsReprocessAlertOpen(true)
    } else {
      processDocument()
    }
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null
    const pageNumbers = []
    const displayRange = 2
    if (page > displayRange + 1) {
      pageNumbers.push(
        <PaginationItem key="page-1">
          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(1) }}>1</PaginationLink>
        </PaginationItem>
      )
      if (page > displayRange + 2) {
        pageNumbers.push(<PaginationItem key="start-ellipsis"><PaginationEllipsis /></PaginationItem>)
      }
    }
    for (let i = Math.max(1, page - displayRange); i <= Math.min(totalPages, page + displayRange); i++) {
      pageNumbers.push(
        <PaginationItem key={`page-${i}`}>
          <PaginationLink href="#" isActive={i === page} onClick={(e) => { e.preventDefault(); handlePageChange(i) }}>{i}</PaginationLink>
        </PaginationItem>
      )
    }
    if (page < totalPages - displayRange) {
      if (page < totalPages - displayRange - 1) {
        pageNumbers.push(<PaginationItem key="end-ellipsis"><PaginationEllipsis /></PaginationItem>)
      }
      pageNumbers.push(
        <PaginationItem key={`page-${totalPages}`}>
          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(totalPages) }}>{totalPages}</PaginationLink>
        </PaginationItem>
      )
    }
    return pageNumbers
  }

  const isLoading = isLoadingChunks || isLoadingDocument || isLoadingKb
  const docStatus = documentData?.status

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    )
  }

  if (!chunksData || !documentData) {
    return <div className="text-red-500">{t("documentChunks.error")}</div>
  }

  const allChunkIds = chunksData.items.map((chunk) => `item-${chunk.chunk_id}`)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="truncate text-2xl font-bold">
          {documentData.filename} - {t("documentChunks.title")}
        </h1>
        <div className="flex gap-2">
          {docStatus === 'paused' && (
            <Button onClick={processDocument}>
              {t("documentChunks.resumeProcessing")}
            </Button>
          )}
          <Button onClick={handleProcessClick}>
            {t("documentChunks.reprocess")}
          </Button>
          <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            {t("documentChunks.settings")}
          </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenChunks(allChunkIds)}
            >
              {t("common.expandAll")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenChunks([])}
            >
              {t("common.collapseAll")}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {(docStatus === 'processing' || docStatus === 'paused') ? (
              t('documentChunks.progress', {
                done: documentData.parse_offset,
                total: documentData.chunk_count
              })
            ) : (
              t("documentChunks.totalChunks", { count: chunksData.total })
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={isReprocessAlertOpen} onOpenChange={setIsReprocessAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("documentChunks.reprocessConfirm.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("documentChunks.reprocessConfirm.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("documentChunks.reprocessConfirm.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={processDocument}>
              {t("documentChunks.reprocessConfirm.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <DocumentSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        document={documentData}
        knowledgeBase={kbData || null}
        onSuccess={() => {
          mutate(documentUrl)
          setIsSettingsOpen(false)
          toast.success("Settings updated successfully.")
        }}
      />

      {chunksData.total > 0 ? (
        <>
          <Accordion
            type="multiple"
            value={openChunks}
            onValueChange={setOpenChunks}
            className="w-full"
          >
            {chunksData.items.map((chunk, index) => (
              <AccordionItem key={index} value={`item-${chunk.chunk_id}`}>
                <AccordionTrigger>
                  <div className="flex w-full items-center justify-between pr-4">
                    <span>
                      {t("documentChunks.chunkLabel", { id: chunk.chunk_id })}{" "}
                      ({chunk.length} {t("documentChunks.chars")})
                    </span>
                    {chunk.truncated && (
                      <span
                        className="text-sm hover:underline"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (expandedChunks[chunk.chunk_id]) {
                          } else {
                            handleLoadFullChunk(chunk.chunk_id)
                          }
                        }}
                      >
                        {loadingChunks.has(chunk.chunk_id)
                          ? t("documentChunks.loading")
                          : t("documentChunks.loadMore")}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="whitespace-pre-wrap break-words p-4">
                    {expandedChunks[chunk.chunk_id] || chunk.text}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-end gap-4">
               <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">{t("common.pageSize")}</p>
                <Select
                  value={limit.toString()}
                  onValueChange={handlePageSizeChange}
                >
                  <SelectTrigger className="h-9 w-[70px]">
                    <SelectValue placeholder={limit} />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        handlePageChange(page - 1)
                      }}
                    />
                  </PaginationItem>
                  {renderPagination()}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        handlePageChange(page + 1)
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-gray-500">
          {t("documentChunks.noChunks")}
        </div>
      )}
    </div>
  )
} 