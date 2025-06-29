"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CustomSvgIcon } from "@/components/custom-svg-icon"
import { TeamWithRole } from "@/schemas/team"

interface TeamIconProps {
  team: TeamWithRole
  size?: "sm" | "md" | "lg"
  className?: string
  showBackground?: boolean
}

const sizeMap = {
  sm: { containerClass: "size-6", iconSize: 16 },
  md: { containerClass: "size-8", iconSize: 20 },
  lg: { containerClass: "size-10", iconSize: 24 },
}

export function TeamIcon({ team, size = "md", className = "", showBackground = true }: TeamIconProps) {
  const { containerClass, iconSize } = sizeMap[size]

  if (!team.icon_name) {
    // 没有图标时使用默认的首字母Avatar
    return (
      <Avatar className={`flex aspect-square ${containerClass} items-center justify-center rounded-lg ${className}`}>
        <AvatarFallback>{team.name.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
    )
  }

  // 有图标时使用 CustomSvgIcon 组件
  const backgroundClass = showBackground ? "bg-primary/10" : ""
  
  return (
    <div className={`flex ${containerClass} items-center justify-center rounded-lg ${backgroundClass} ${className}`}>
      <CustomSvgIcon 
        name={team.icon_name} 
        width={iconSize} 
        height={iconSize} 
        className="text-primary" 
      />
    </div>
  )
} 