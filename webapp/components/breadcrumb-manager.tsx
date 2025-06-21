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

        // Manually construct the path to handle the skipped 'documents' segment
        if (prevSegment === "documents") {
          // currentPath is /kb/1, we need to add /documents/[doc_id]
          currentPath += `/documents/${segment}`
        } else {
          currentPath += `/${segment}`
        }

        let label = t(`breadcrumb.${segment}`, { defaultValue: segment })

        if (prevSegment === "kb" && segment !== "create") {
          label = await fetchKnowledgeBaseName(segment)
        } else if (prevSegment === "documents" && segment !== "upload") {
          label = await fetchDocumentName(segment)
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