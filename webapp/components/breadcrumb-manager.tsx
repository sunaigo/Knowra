"use client"

import { useEffect, useState, useMemo } from "react"
import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { get } from "@/lib/request"
import { useTranslation } from "react-i18next"
import React from "react"

interface Breadcrumb {
  href: string
  label: string
}

// A simple in-memory cache
const cache = new Map<string, string>()

async function fetchKnowledgeBaseName(id: string): Promise<string> {
  if (cache.has(id)) {
    return cache.get(id)!
  }
  try {
    const response = await get(`/kb/${id}`)
    const name = response.data.name
    cache.set(id, name)
    return name
  } catch (error) {
    console.error("Failed to fetch knowledge base name:", error)
    return `Knowledge Base ${id}`
  }
}

async function fetchDocumentName(id: string): Promise<string> {
  if (cache.has(id)) {
    return cache.get(id)!
  }
  try {
    const response = await get(`/kb/documents/${id}`)
    const name = response.data.name
    cache.set(id, name)
    return name
  } catch (error) {
    console.error("Failed to fetch document name:", error)
    return `Document ${id}`
  }
}

export function BreadcrumbManager() {
  const pathname = usePathname()
  const { t } = useTranslation()
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([])

  const pathSegments = useMemo(() => {
    return pathname.split("/").filter(Boolean)
  }, [pathname])

  useEffect(() => {
    const generateBreadcrumbs = async () => {
      const newBreadcrumbs: Breadcrumb[] = [
        { href: "/", label: t("breadcrumb.home") },
      ]
      if (pathSegments.length === 0) {
        setBreadcrumbs([])
        return
      }

      let currentPath = ""
      for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i]
        const prevSegment = pathSegments[i - 1]

        // Skip adding 'documents' as its own breadcrumb link
        if (segment === "documents") {
          continue
        }

        // Bucket 路径特殊处理：/documents/bucket/[oss_id]
        if (pathSegments[i - 2] === "documents" && pathSegments[i - 1] === "bucket") {
          currentPath += `/${segment}`
          newBreadcrumbs.push({ href: currentPath, label: "Bucket 列表" })
          break // bucket 路径后面不再有更深层级，直接结束
        }

        // Manually construct the path to handle the skipped 'documents' segment
        if (prevSegment === "documents") {
          currentPath += `/documents/${segment}`
        } else {
          currentPath += `/${segment}`
        }

        let label = t(`breadcrumb.${segment}`, { defaultValue: segment })

        if (prevSegment === "kb" && segment !== "create") {
          label = await fetchKnowledgeBaseName(segment)
        } else if (prevSegment === "documents" && segment !== "upload") {
          // 只在不是 bucket 路径且 segment 是数字时才请求文档名
          if (pathSegments[i - 1] === "bucket") {
            // 不请求文档名
          } else if (/^\d+$/.test(segment)) {
            label = await fetchDocumentName(segment)
          }
        }

        newBreadcrumbs.push({ href: currentPath, label })
      }
      setBreadcrumbs(newBreadcrumbs)
    }

    generateBreadcrumbs()
  }, [pathSegments, t])

  if (breadcrumbs.length === 0) {
    return null
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            <BreadcrumbItem>
              {index < breadcrumbs.length - 1 ? (
                <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
} 