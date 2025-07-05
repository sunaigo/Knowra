import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { CustomSvgIcon } from "@/components/custom-svg-icon";
import { request } from "@/lib/request";
import { useTranslation } from 'react-i18next';
import { toast } from "sonner";

interface SvgUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allIconNames: string[];
  onUploaded: () => void;
}

export const SvgUploadDialog: React.FC<SvgUploadDialogProps> = ({ open, onOpenChange, allIconNames, onUploaded }) => {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [svgContent, setSvgContent] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const validateName = (name: string) => /^[a-zA-Z0-9_-]+$/.test(name);

  function cleanSvg(svgString: string): string {
    try {
      const parser = new window.DOMParser();
      const doc = parser.parseFromString(svgString, "image/svg+xml");
      const svg = doc.querySelector("svg");
      if (!svg) return '';
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.querySelectorAll('*').forEach(el => {
        const fill = el.getAttribute('fill');
        const stroke = el.getAttribute('stroke');
        if (fill && fill !== 'none') {
        } else if (!fill && !stroke) {
          el.setAttribute('fill', 'currentColor');
        }
      });
      return svg.outerHTML;
    } catch {
      return svgString;
    }
  }

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
    e.stopPropagation();
    if (!validateName(name)) {
      setError(t('svg.invalidName'));
      return;
    }
    if (allIconNames.includes(name)) {
      setError(t('svg.nameExists'));
      return;
    }
    if (!file) {
      setError(t('svg.selectFile'));
      return;
    }
    if (file.size > 16 * 1024) {
      setError(t('svg.fileTooLarge'));
      return;
    }
    if (!svgContent) {
      setError(t('svg.invalidContent'));
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
      onOpenChange(false);
      setName("");
      setFile(null);
      setSvgContent("");
      toast.success(t('svg.uploadSuccess'));
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || t('svg.uploadFailed'));
        toast.error(err.message || t('svg.uploadFailed'));
      } else {
        setError(t('svg.uploadFailed'));
        toast.error(t('svg.uploadFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('svg.uploadTitle')}</DialogTitle>
          <DialogDescription>{t('svg.uploadDesc')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('svg.fileLabel')}</label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Button type="button" variant="outline" className="w-full justify-start text-muted-foreground font-normal" onClick={() => fileInputRef.current?.click()}>
                  {file ? file.name : t('svg.selectFileButton')}
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
          <div className="space-y-2">
            <label htmlFor="icon-name" className="text-sm font-medium text-foreground">{t('svg.nameLabel')}</label>
            <Input
              id="icon-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. my-awesome-icon"
              required
              className="bg-input border-border"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading || !name || !file} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('svg.uploadButton')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 