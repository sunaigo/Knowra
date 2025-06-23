"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import * as HeroIconsSolid from "@heroicons/react/24/solid";
import * as HeroIconsOutline from "@heroicons/react/24/outline";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import type { LucideProps } from "lucide-react";

console.log("SvgIconPicker 组件已加载");

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

  // 拉取自定义svg图标
  useEffect(() => {
    if (customIcons.length === 0) {
      setLoading(true);
      fetch("/api/icons/custom?with_content=true")
        .then(res => res.json())
        .then(res => {
          setIcons(res.data || []);
        })
        .finally(() => setLoading(false));
    } else {
      setIcons(customIcons);
    }
  }, [customIcons]);

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-16 h-16 p-0 flex items-center justify-center">
          {(() => {
            const found = allIcons.find(i => i.name === value);
            if (!found) return <span className="text-gray-400">选择图标</span>;
            if (found.type === "custom") {
              return <span dangerouslySetInnerHTML={{ __html: found.content }} style={{ width: 32, height: 32, display: 'inline-block' }} />;
            }
            return null;
          })()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-96 overflow-auto">
        <Input
          placeholder="搜索图标名..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-2"
        />
        {loading ? (
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: 32 }).map((_, i) => (
              <Skeleton key={i} className="w-8 h-8" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-2 max-h-72 overflow-y-auto">
            {filteredIcons.map(icon => (
              <button
                key={icon.type + ":" + icon.name}
                className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${value === icon.name ? "border-blue-500 bg-blue-50" : "border-transparent"}`}
                title={icon.name}
                type="button"
                onClick={() => {
                  onChange(icon.name);
                  setOpen(false);
                }}
              >
                {icon.type === "custom"
                  ? <span dangerouslySetInnerHTML={{ __html: (icon as any).content }} style={{ width: 20, height: 20, display: 'inline-block' }} />
                  : (() => { const HeroIcon = (icon as any).Icon as React.FC<any>; return <HeroIcon className="w-5 h-5" />; })()
                }
              </button>
            ))}
            {filteredIcons.length === 0 && <div className="col-span-8 text-center text-gray-400 py-4">无匹配图标</div>}
          </div>
        )}
        {/* 自定义SVG上传表单 */}
        <div className="border-t pt-2 mt-2">
          <SvgUploadForm
            allIconNames={allIcons.map(i => i.name)}
            onUploaded={() => {
              setLoading(true);
              fetch("/api/icons/custom?with_content=true")
                .then(res => res.json())
                .then(res => {
                  setIcons(res.data || []);
                })
                .finally(() => setLoading(false));
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};

// 上传表单子组件
const SvgUploadForm: React.FC<{ allIconNames: string[]; onUploaded: () => void }> = ({ allIconNames, onUploaded }) => {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateName = (name: string) => /^[a-zA-Z0-9_-]+$/.test(name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateName(name)) {
      setError("图标名仅支持英文、数字、下划线和-，且不能为空");
      return;
    }
    if (allIconNames.includes(name)) {
      setError("图标名已存在，请更换");
      return;
    }
    if (!file) {
      setError("请选择SVG文件");
      return;
    }
    if (!file.name.endsWith('.svg')) {
      setError("仅支持SVG文件");
      return;
    }
    if (file.size > 16 * 1024) {
      setError("SVG文件大小不能超过16KB");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("name", name);
    formData.append("file", file);
    try {
      const res = await fetch("/api/icons/custom", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.code === 0) {
        setName("");
        setFile(null);
        onUploaded();
      } else {
        setError(data.msg || "上传失败");
      }
    } catch (e) {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
      <Input
        placeholder="图标英文名（唯一，仅支持英文、数字、_、-）"
        value={name}
        onChange={e => setName(e.target.value)}
        disabled={loading}
      />
      <Input
        type="file"
        accept=".svg"
        onChange={e => setFile(e.target.files?.[0] || null)}
        disabled={loading}
      />
      <Button type="submit" disabled={loading}>上传自定义SVG</Button>
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </form>
  );
}; 