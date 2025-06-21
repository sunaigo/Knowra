"use client"

import { useParams, useRouter } from "next/navigation"
import useSWR from "swr"
import { ColumnDef } from "@tanstack/react-table"
import { File, PlusCircle, MoreHorizontal, Settings, PlayCircle, Eye, Trash2, Edit, Pause } from "lucide-react"
import * as React from "react"
import { useTranslation } from "react-i18next"
import { isEqual } from "lodash"

import { Document } from "@/schemas/document"
import { KnowledgeBase } from "@/schemas/knowledge-base"
import { Button } from "@/components/ui/button"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { del, post, put } from "@/lib/request"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DocumentSettingsDialog } from "@/components/document-settings-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export default function KnowledgeBasePage() {
  const params = useParams()
  const kb_id = params.kb_id as string
  const router = useRouter()
  const { t } = useTranslation()
  const {
    data: kb,
    isLoading: isKbLoading,
  } = useSWR<KnowledgeBase>(kb_id ? `/kb/${kb_id}` : null)
  const {
    data: documents,
    isLoading: isDocLoading,
    mutate: mutateDocuments,
  } = useSWR<Document[]>(kb_id ? `/kb/${kb_id}/documents` : null)

  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isProcessing, setIsProcessing] = React.useState<number | null>(null)
  const [isPausing, setIsPausing] = React.useState<number | null>(null)
  const [selectedDocument, setSelectedDocument] = React.useState<Document | null>(null)
  const [isConfirming, setIsConfirming] = React.useState(false)
  const [docToProcess, setDocToProcess] = React.useState<Document | null>(null)
  const [popoverOpenForDoc, setPopoverOpenForDoc] = React.useState<number | null>(null)

  const handlePause = async (doc: Document) => {
    setIsPausing(doc.id)
    try {
      await put(`/kb/documents/${doc.id}`, { status: "paused" })
      await mutateDocuments()
    } catch (error) {
      console.error("Failed to pause document", error)
    } finally {
      setIsPausing(null)
    }
  }

  const handleReprocessFromScratch = async (doc: Document) => {
    setPopoverOpenForDoc(null)
    // 1. Reset offset to 0
    try {
      await put(`/kb/documents/${doc.id}`, { parse_offset: 0 })
      await mutateDocuments() // Re-fetch to confirm offset is 0
    } catch (error) {
      console.error("Failed to reset document offset", error)
      return // Stop if reset fails
    }
    // 2. Start processing
    await executeProcess(doc)
  }

  const handleResume = (doc: Document) => {
    setPopoverOpenForDoc(null)
    executeProcess(doc)
  }

  const executeProcess = async (doc: Document) => {
    setIsProcessing(doc.id)
    setIsConfirming(false)
    try {
      await post(`/kb/documents/${doc.id}/process`)
      await mutateDocuments()
    } catch (error) {
      console.error("Failed to process document", error)
    } finally {
      setIsProcessing(null)
      setDocToProcess(null)
    }
  }

  const handleProcess = (doc: Document) => {
    const effectiveConfig = {
      chunk_size: doc.parsing_config?.chunk_size ?? kb?.chunk_size,
      overlap: doc.parsing_config?.overlap ?? kb?.overlap
    };

    if (doc.status === 'processed' && isEqual(doc.last_parsed_config, effectiveConfig)) {
      setDocToProcess(doc);
      setIsConfirming(true);
    } else {
      executeProcess(doc);
    }
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(true)
    try {
      await del(`/kb/documents/${id}`)
      await mutateDocuments()
    } catch (error) {
      console.error("Failed to delete document", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: ColumnDef<Document>[] = [
    {
      accessorKey: "filename",
      header: () => t("common.tableName"),
      cell: ({ row }) => {
        const doc = row.original
        const effectiveChunkSize = doc.parsing_config?.chunk_size ?? kb?.chunk_size
        const effectiveOverlap = doc.parsing_config?.overlap ?? kb?.overlap

        return (
          <div>
            <div
              className="cursor-pointer font-medium text-blue-600 hover:underline"
              onClick={() => router.push(`/kb/${kb_id}/documents/${doc.id}`)}
            >
              {doc.filename}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("common.chunk")}: {effectiveChunkSize}, {t("common.overlap")}: {effectiveOverlap}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "chunk_count",
      header: () => t("common.tableChunkCount"),
      cell: ({ row }) => {
        const doc = row.original
        if (doc.status === "processing" || doc.status === "paused") {
          return `${doc.parse_offset} / ${doc.chunk_count}`
        }
        return doc.chunk_count
      },
    },
    {
      accessorKey: "status",
      header: () => t("common.tableStatus"),
    },
    {
      accessorKey: "upload_time",
      header: () => t("common.tableCreatedAt"),
      cell: ({ row }) => new Date(row.original.upload_time).toLocaleDateString(),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const doc = row.original
        const isApiProcessing = isProcessing === doc.id || isPausing === doc.id
        const isDocumentProcessing = doc.status === "processing" || doc.status === "pending"
        const isButtonDisabled = isApiProcessing || isDeleting

        const showPauseButton = doc.status === 'processing' || doc.status === 'pending'
        const showPlayButton = doc.status === 'not_started' || doc.status === 'failed' || doc.status === 'paused' || doc.status === 'processed'

        return (
          <div className="flex items-center justify-end gap-2">
            {doc.status === 'paused' ? (
              <Popover open={popoverOpenForDoc === doc.id} onOpenChange={(isOpen) => setPopoverOpenForDoc(isOpen ? doc.id : null)}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={isButtonDisabled}>
                    <PlayCircle className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleResume(doc)}>
                      {t("documentList.resumeFromBreakpoint")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleReprocessFromScratch(doc)}>
                      {t("documentList.startFromScratch")}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => (showPauseButton ? handlePause(doc) : handleProcess(doc))}
                      disabled={isButtonDisabled || (!showPauseButton && !showPlayButton)}
                    >
                      {showPauseButton ? <Pause className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {showPauseButton
                        ? t("documentList.tooltipPause")
                        : t("documentList.tooltipParse")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedDocument(doc)}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{t("common.actionSettings")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/kb/${kb_id}/documents/${doc.id}/view`)}>
                  <Eye className="mr-2 h-4 w-4" />
                  <span>{t("common.actionPreview")}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDelete(doc.id)}
                  className="text-red-500"
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>{isDeleting ? t("common.actionDeleting") : t("common.actionDelete")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">{kb?.name}</h2>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/kb/${kb_id}/edit`)}
            >
              <Edit className="mr-2 h-4 w-4" />
              {t('documentList.buttonEdit')}
            </Button>
            <Button onClick={() => router.push("/documents/upload?kb_id=" + kb_id)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('documentList.buttonUploadDocument')}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("documentList.documentsTitle")}</CardTitle>
            <CardDescription>{t("documentList.documentsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={documents || []}
              isLoading={isDocLoading || isKbLoading || isDeleting}
            />
          </CardContent>
        </Card>
      </div>
      <DocumentSettingsDialog
        isOpen={!!selectedDocument}
        onClose={() => setSelectedDocument(null)}
        document={selectedDocument}
        knowledgeBase={kb || null}
        onSuccess={() => mutateDocuments()}
      />
      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmReparseTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.confirmReparseDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDocToProcess(null)}>
              {t("common.buttonCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (docToProcess) {
                  executeProcess(docToProcess)
                }
              }}
            >
              {t("common.buttonConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 