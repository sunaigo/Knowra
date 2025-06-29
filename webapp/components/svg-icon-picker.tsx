"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import * as HeroIconsSolid from "@heroicons/react/24/solid";
import * as HeroIconsOutline from "@heroicons/react/24/outline";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import type { LucideProps } from "lucide-react";
import { get, post } from "@/lib/request";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { SvgUploadDialog } from "@/components/svg-upload-dialog";
import { CustomSvgIcon } from "@/components/custom-svg-icon";
import * as PopoverPrimitive from "@radix-ui/react-popover";

interface CustomIcon {
  name: string;
  content: string;
}

interface SvgIconPickerProps {
  value: string;
  onChange: (name: string) => void;
  customIcons?: CustomIcon[];
}

export const SvgIconPicker: React.FC<SvgIconPickerProps> = ({ value, onChange, customIcons = [] }) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [icons, setIcons] = useState<CustomIcon[]>(customIcons);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // 拉取自定义svg图标
  const fetchCustomIcons = useCallback(async () => {
    if (hasLoaded) return;
    
    setLoading(true);
    try {
      const res = await get("/icons/custom?with_content=true");
      setIcons(res.data || []);
      setHasLoaded(true);
    } catch (err) {
      console.error('获取自定义图标失败:', err);
      setIcons([]);
    } finally {
      setLoading(false);
    }
  }, [hasLoaded]);

  useEffect(() => {
    if (customIcons.length === 0 && !hasLoaded) {
      fetchCustomIcons();
    } else if (customIcons.length > 0) {
      setIcons(customIcons);
      setHasLoaded(true);
    }
  }, [customIcons, hasLoaded]);

  // 全量 Heroicons
  const heroIconList = useMemo(() => {
    const solid = Object.entries(HeroIconsSolid).map(([name, Icon]) => ({
      name,
      Icon,
      type: "solid" as const
    }));
    const outline = Object.entries(HeroIconsOutline).map(([name, Icon]) => ({
      name,
      Icon,
      type: "outline" as const
    }));
    return [...solid, ...outline];
  }, []);

  // 合并所有图标
  const allIcons = useMemo(() => {
    const hero = heroIconList.map(i => ({
      name: i.name,
      type: i.type,
      Icon: i.Icon,
    }));
    const custom = icons.map(i => ({
      name: i.name,
      type: "custom" as const,
      content: i.content,
    }));
    return [...hero, ...custom];
  }, [heroIconList, icons]);

  // 搜索过滤
  const filteredIcons = useMemo(() => {
    if (!search) return allIcons;
    return allIcons.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  }, [search, allIcons]);

  // 刷新图标列表
  const refreshIcons = useCallback(async () => {
    setHasLoaded(false);
    await fetchCustomIcons();
  }, [fetchCustomIcons]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-16 h-16 p-0 flex items-center justify-center">
          {(() => {
            const found = allIcons.find(i => i.name === value);
            if (!found) return <span className="text-gray-400">选择图标</span>;
            if (found.type === "custom") {
              return (
                <CustomSvgIcon content={found.content} width={48} height={48} className="text-primary" />
              );
            } else if (found.type === "solid" || found.type === "outline") {
              const HeroIcon = found.Icon as React.FC<any>;
              return <HeroIcon style={{ width: 48, height: 48, display: 'block' }} />;
            }
            return <span className="text-gray-400">选择图标</span>;
          })()}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        sideOffset={5}
        className="z-[100] w-96 p-4"
        data-radix-popper-strategy="fixed"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center mb-2 gap-2">
          <Input
            placeholder="搜索图标名..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button size="icon" variant="outline" onClick={() => setUploadDialogOpen(true)} title="上传自定义SVG图标">
            +
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-8 gap-2">
              {Array.from({ length: 32 }).map((_, i) => (
                <Skeleton key={i} className="w-8 h-8" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-2">
              {filteredIcons.map(icon => (
                <button
                  key={icon.type + ":" + icon.name}
                  className={`min-h-[48px] w-16 flex flex-col items-center justify-center rounded border transition-all ${value === icon.name ? "border-blue-500 bg-blue-50" : "border-transparent"}`}
                  title={icon.name}
                  type="button"
                  onClick={() => {
                    onChange(icon.name);
                    setOpen(false);
                  }}
                >
                  {icon.type === "custom"
                    ? <CustomSvgIcon content={(icon as any).content} width={36} height={36} className="text-primary" />
                    : (() => { const HeroIcon = (icon as any).Icon as React.FC<any>; return <HeroIcon className="w-8 h-8" />; })()
                  }
                </button>
              ))}
              {filteredIcons.length === 0 && <div className="col-span-8 text-center text-gray-400 py-4">无匹配图标</div>}
            </div>
          )}
        </div>
        <SvgUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          allIconNames={allIcons.map(i => i.name)}
          onUploaded={refreshIcons}
        />
      </PopoverContent>
    </Popover>
  );
}; 