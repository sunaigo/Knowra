"use client";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import * as HeroIconsSolid from "@heroicons/react/24/solid";
import * as HeroIconsOutline from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { get, request } from "@/lib/request";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import type { LucideProps } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { CustomSvgIcon } from "@/components/custom-svg-icon";
import { useTranslation } from 'react-i18next'

interface CustomIcon {
  name: string;
  content: string;
}

export default function IconManagerPage() {
  const [search, setSearch] = useState("");
  const [customIcons, setCustomIcons] = useState<CustomIcon[]>([]);
  const [loading, setLoading] = useState(false);
  const [iconType, setIconType] = useState<'all' | 'solid' | 'outline'>('all');
  const { t } = useTranslation()

  // 拉取自定义svg图标
  useEffect(() => {
    setLoading(true);
    get("/icons/custom?with_content=true")
      .then((res: { data: CustomIcon[] }) => {
        setCustomIcons(res.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  // 全量lucide图标
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
    let list: { name: string; Icon: React.FC<{ className?: string }>; type: 'solid' | 'outline' }[] = [];
    if (iconType === 'solid') list = solid;
    else if (iconType === 'outline') list = outline;
    else list = [...solid, ...outline];
    return list;
  }, [iconType]);

  // 合并所有图标
  const customIconsList = useMemo(() => customIcons.map(i => ({
    name: i.name,
    type: "custom" as const,
    content: i.content,
  })), [customIcons]);
  const builtInIconsList = useMemo(() => heroIconList.map(i => ({
    name: i.name,
    type: i.type,
    Icon: i.Icon,
  })), [heroIconList]);

  // 搜索过滤（分组）
  const filteredCustomIcons = useMemo(() => {
    if (!search) return customIconsList;
    return customIconsList.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  }, [search, customIconsList]);

  const filteredBuiltInIcons = useMemo(() => {
    if (!search) return builtInIconsList;
    return builtInIconsList.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  }, [search, builtInIconsList]);

  // 上传后刷新自定义图标
  const handleUploaded = useCallback(() => {
    setLoading(true);
    get("/icons/custom?with_content=true").then((res) => {
      setCustomIcons(res.data || []);
    }).finally(() => setLoading(false));
  }, []);

  // 简单内容hash函数
  function simpleHash(str: string) {
    if (!str) return 0;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  return (
    <div className="w-full flex justify-center bg-background min-h-[100vh]">
      <div className="w-full max-w-7xl px-4 sm:px-8 pt-8 pb-16">
        <div className="sticky top-0 z-20 bg-background pb-4 mb-4 flex flex-col gap-4">
          <h1 className="text-3xl font-bold mb-2 text-foreground">{t('icon.manage')}</h1>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <div className="flex gap-2">
              <Button variant={iconType === 'all' ? 'default' : 'outline'} onClick={() => setIconType('all')}>{t('icon.all')}</Button>
              <Button variant={iconType === 'solid' ? 'default' : 'outline'} onClick={() => setIconType('solid')}>{t('icon.solid')}</Button>
              <Button variant={iconType === 'outline' ? 'default' : 'outline'} onClick={() => setIconType('outline')}>{t('icon.outline')}</Button>
            </div>
            <Input
              placeholder={t('icon.searchPlaceholder', { count: filteredCustomIcons.length + filteredBuiltInIcons.length })}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="rounded-full max-w-lg flex-1 border-border shadow-sm focus:ring-2 focus:ring-primary-100"
            />
            <div className="flex-0">
              {(() => {
                const [open, setOpen] = useState(false);
                return (
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                      <Button variant="default" className="h-10 px-6 text-base font-semibold shadow-md">{t('icon.uploadCustom')}</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>{t('icon.uploadTitle')}</DialogTitle>
                        <DialogDescription className="text-muted-foreground text-xs mt-1">
                          {t('icon.uploadDesc')}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-1">
                        <SvgUploadForm
                          allIconNames={[...heroIconList.map(i => i.name), ...customIcons.map(i => i.name)]}
                          onUploaded={() => { handleUploaded(); setOpen(false); }}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                );
              })()}
            </div>
          </div>
        </div>
        {loading ? (
          <div className="grid gap-5 grid-cols-[repeat(auto-fit,minmax(112px,1fr))] justify-center mt-8">
            {Array.from({ length: 48 }).map((_, i) => (
              <Skeleton key={i} className="w-16 h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* 自定义图标区 */}
            <div className="mb-4 mt-12 text-xl font-bold text-foreground">
              {t('icon.custom')}
            </div>
            <div className="flex flex-wrap justify-start gap-x-8 gap-y-10 mb-14">
              {filteredCustomIcons.length === 0 && <div className="w-full text-center text-muted-foreground py-10 text-base">{t('icon.noCustom')}</div>}
              {filteredCustomIcons.filter((icon): icon is CustomIcon & { type: 'custom'; content: string } => !!icon.content && (icon as { type?: string }).type === 'custom').map((icon, idx) => (
                <div
                  key={`custom:${icon.name}:${icon.content ? simpleHash(icon.content) : idx}`}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card shadow hover:shadow-md hover:bg-accent transition p-5 group cursor-pointer min-h-[110px] w-28"
                  title={icon.name}
                >
                  <CustomSvgIcon content={icon.content} width={36} height={36} className="mb-1 text-foreground" />
                  <span className="block w-full text-center truncate text-xs font-medium text-card-foreground group-hover:text-primary-700 select-all" title={icon.name}>{icon.name}</span>
                </div>
              ))}
            </div>
            {/* 内置图标区 */}
            <div className="mb-4 mt-16 text-xl font-bold text-foreground">
              {t('icon.builtIn')}
            </div>
            <div className="grid gap-5 grid-cols-[repeat(auto-fit,minmax(112px,1fr))] justify-center">
              {filteredBuiltInIcons.length === 0 && <div className="col-span-full text-center text-muted-foreground py-10 text-base">{t('icon.noBuiltIn')}</div>}
              {filteredBuiltInIcons.map((icon) => (
                <div
                  key={`${icon.type}:${icon.name}`}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card shadow hover:shadow-md hover:bg-accent transition p-5 group cursor-pointer min-h-[110px] w-28"
                  title={icon.name}
                >
                  {(() => { const HeroIcon = (icon as { Icon: React.FC<{ className?: string }> }).Icon; return <HeroIcon className="w-9 h-9 mb-1" />; })()}
                  <span className="block w-full text-center truncate text-xs font-medium text-card-foreground group-hover:text-green-700 select-all" title={icon.name}>{icon.name}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// 上传表单子组件
const SvgUploadForm: React.FC<{ allIconNames: string[]; onUploaded: () => void }> = ({ allIconNames, onUploaded }) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [svgContent, setSvgContent] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateName = (name: string) => /^[a-zA-Z0-9_-]+$/.test(name);

  // 精简SVG，移除硬编码颜色，使其适配主题
  function cleanSvg(svgString: string): string {
    try {
      const parser = new window.DOMParser();
      const doc = parser.parseFromString(svgString, "image/svg+xml");
      const svg = doc.querySelector("svg");
      if (!svg) return '';

      // 移除 width 和 height 属性，以便通过css控制
      svg.removeAttribute('width');
      svg.removeAttribute('height');

      // 遍历所有元素，如果没设置fill和stroke，则添加 fill="currentColor"
      svg.querySelectorAll('*').forEach(el => {
        const fill = el.getAttribute('fill');
        const stroke = el.getAttribute('stroke');
        if (fill && fill !== 'none') {
           // 可选：移除硬编码的颜色，或者替换为currentColor
           // el.setAttribute('fill', 'currentColor');
        } else if (!fill && !stroke) {
          el.setAttribute('fill', 'currentColor');
        }
      });
      
      return svg.outerHTML;
    } catch {
      return svgString; // 解析失败则返回原始内容
    }
  }

  // 选择文件后自动填充图标名，并精简SVG内容
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) {
      const rawName = f.name.replace(/\.svg$/i, "");
      const validName = rawName.replace(/[^a-zA-Z0-9_-]/g, "");
      setName(validName);

      const reader = new FileReader();
      reader.onload = evt => {
        const raw = evt.target?.result as string || "";
        const cleaned = cleanSvg(raw);
        setSvgContent(cleaned || "");
      };
      reader.readAsText(f);
    } else {
      setSvgContent("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateName(name)) {
      setError(t('icon.invalidName'));
      return;
    }
    if (allIconNames.includes(name)) {
      setError(t('icon.nameExists'));
      return;
    }
    if (!file) {
      setError(t('icon.selectFile'));
      return;
    }
    if (file.size > 16 * 1024) {
      setError(t('icon.fileTooLarge'));
      return;
    }
    if (!svgContent) {
      setError(t('icon.invalidFile'));
      return;
    }

    setLoading(true);
    try {
      await request("/icons/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content: svgContent }),
      });
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('icon.uploadFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="icon-name" className="text-sm font-medium text-foreground">{t('icon.nameLabel')}</label>
        <Input
          id="icon-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. my-awesome-icon"
          required
          className="bg-input border-border"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">{t('icon.fileLabel')}</label>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Button type="button" variant="outline" className="w-full justify-start text-muted-foreground font-normal" onClick={() => fileInputRef.current?.click()}>
              {file ? file.name : t('icon.selectFile')}
            </Button>
            <Input
              ref={fileInputRef}
              id="svg-file"
              type="file"
              onChange={handleFileChange}
              accept=".svg"
              required
              className="hidden"
            />
          </div>
          {svgContent && (
            <div className="p-2 border border-border rounded-md bg-background">
              <CustomSvgIcon content={svgContent} width={40} height={40} className="text-foreground" />
            </div>
          )}
        </div>
        {file && <p className="text-xs text-muted-foreground mt-2">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading || !name || !file} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('icon.uploadCustom')}
      </Button>
    </form>
  );
}; 