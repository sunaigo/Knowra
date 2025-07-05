"use client"

import React, { useState, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Upload, FileUp, X, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type FileStatus = "pending" | "uploading" | "success" | "error"

interface UploadableFile {
  file: File
  status: FileStatus
  progress: number
  error?: string
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api"

const uploadFileWithXHR = (
  kb_id: string,
  file: UploadableFile,
  onProgress: (progress: number) => void
): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append("file", file.file)

    xhr.open("POST", `${API_BASE_URL}/kb/${kb_id}/upload`, true)

    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`)
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentCompleted = Math.round((event.loaded * 100) / event.total)
        onProgress(percentCompleted)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch (e) {
          resolve(xhr.responseText)
        }
      } else {
        try {
          const errorResponse = JSON.parse(xhr.responseText)
          reject(new Error(errorResponse.detail || xhr.statusText))
        } catch (e) {
          reject(new Error(xhr.statusText))
        }
      }
    }

    xhr.onerror = () => {
      reject(new Error("Upload failed due to a network error."))
    }

    xhr.send(formData)
  })
}

const FileStatusBadge = ({
  status,
  error,
}: {
  status: FileStatus
  error?: string
}) => {
  switch (status) {
    case "pending":
      return <Badge variant="outline">Pending</Badge>
    case "uploading":
      return <Badge variant="secondary">Uploading</Badge>
    case "success":
      return <Badge className="bg-green-600 text-white hover:bg-green-700">Success</Badge>
    case "error":
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="destructive">Error</Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{error || "An unknown error occurred"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
  }
}

export default function DocumentsUploadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const kb_id = searchParams.get("kb_id")
  const [files, setFiles] = useState<UploadableFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosenFiles = Array.from(event.target.files || [])
    const newFiles: UploadableFile[] = chosenFiles.map(
      (file): UploadableFile => ({
        file,
        status: "pending",
        progress: 0,
      })
    )
    setFiles((prevFiles) => [...prevFiles, ...newFiles])

    if (event.target) {
      event.target.value = ""
    }
  }

  const removeFile = (indexToRemove: number) => {
    setFiles(files.filter((_, index) => index !== indexToRemove))
  }

  const handleUpload = async () => {
    if (!kb_id) {
      alert("Knowledge base ID is missing!")
      return
    }
    setIsUploading(true)

    const uploadPromises = files.map((file, index) => {
      if (file.status === "success" || file.status === "uploading")
        return Promise.resolve()

      setFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, status: "uploading", progress: 0 } : f
        )
      )

      return uploadFileWithXHR(kb_id, file, (progress) => {
        setFiles((prev) =>
          prev.map((f, i) => (i === index ? { ...f, progress } : f))
        )
      })
        .then(() => {
          setFiles((prev) =>
            prev.map((f, i) =>
              i === index ? { ...f, status: "success", progress: 100 } : f
            )
          )
        })
        .catch((error: Error) => {
          setFiles((prev) =>
            prev.map((f, i) =>
              i === index
                ? {
                    ...f,
                    status: "error",
                    error: error.message || "Upload failed",
                  }
                : f
            )
          )
        })
    })

    await Promise.allSettled(uploadPromises)
    setIsUploading(false)
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Upload className="mr-2" />
          Upload Documents
        </CardTitle>
        <CardDescription>
          Select or drop files to upload to your knowledge base. Supports .txt
          and .pdf.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary hover:bg-muted transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileChange}
            accept=".txt,.pdf"
            disabled={isUploading}
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <FileUp className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-semibold text-primary">
              Click to select files
            </p>
            <p className="text-sm text-muted-foreground">
              or drag and drop files here
            </p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Selected Files ({files.length})</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">File</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[30%]">Progress</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((f, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium truncate max-w-sm">
                        {f.file.name}
                      </TableCell>
                      <TableCell>
                        <FileStatusBadge status={f.status} error={f.error} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={f.progress} className="h-2 flex-1" />
                          <span className="text-sm font-semibold w-10 text-right">
                            {f.progress}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(i)}
                          disabled={
                            isUploading && f.status === "uploading"
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4">
          <Button
            onClick={handleUpload}
            disabled={
              isUploading ||
              files.length === 0 ||
              files.every((f) => f.status === "success")
            }
          >
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? "Uploading..." : "Upload All"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={isUploading}
          >
            Done
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 