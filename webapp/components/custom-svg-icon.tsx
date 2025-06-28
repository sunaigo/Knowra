import React, { useEffect, useState } from "react";
import pako from "pako";
import { get } from "@/lib/request";
import * as HeroIconsSolid from "@heroicons/react/24/solid";
import * as HeroIconsOutline from "@heroicons/react/24/outline";

interface CustomSvgIconProps {
  name?: string;
  content?: string;
  width?: number;
  height?: number;
  className?: string;
}

function optimizeSvg(svgString: string, width: number, height: number): string {
  try {
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) return svgString;
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("width", width.toString());
    svg.setAttribute("height", height.toString());
    let vb = svg.getAttribute("viewBox");
    if (!vb) {
      const w = svg.getAttribute("width") || width;
      const h = svg.getAttribute("height") || height;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    }
    return svg.outerHTML;
  } catch {
    return svgString;
  }
}

export const CustomSvgIcon: React.FC<CustomSvgIconProps> = ({ name, content, width = 24, height = 24, className }) => {
  const [svgContent, setSvgContent] = useState<string | null>(content || null);
  const [loading, setLoading] = useState(false);

  // 优先渲染内置Heroicons
  if (name && (HeroIconsSolid as any)[name]) {
    const HeroIcon = (HeroIconsSolid as any)[name];
    return <HeroIcon className={className} style={{ width, height, display: "block" }} />;
  }
  if (name && (HeroIconsOutline as any)[name]) {
    const HeroIcon = (HeroIconsOutline as any)[name];
    return <HeroIcon className={className} style={{ width, height, display: "block" }} />;
  }

  // 如果没有content但有name，自动请求后端
  useEffect(() => {
    let ignore = false;
    if (!content && name) {
      setLoading(true);
      get(`/icons/custom?names=${name}&with_content=true`).then(res => {
        if (!ignore && res.data && res.data.length > 0) {
          setSvgContent(res.data[0].content);
        }
      }).finally(() => {
        if (!ignore) setLoading(false);
      });
    }
    return () => { ignore = true; };
  }, [name, content]);

  let svg = "";
  try {
    if (svgContent && svgContent.trim().startsWith("<svg")) {
      svg = optimizeSvg(svgContent, width, height);
    } else if (svgContent) {
      // 尝试解压
      const binary = atob(svgContent);
      const binData = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        binData[i] = binary.charCodeAt(i);
      }
      const decompressed = pako.ungzip(binData, { to: "string" });
      svg = optimizeSvg(decompressed, width, height);
    }
  } catch (e) {
    svg = "<svg viewBox='0 0 24 24'><text x='0' y='12' font-size='10'>SVG错误</text></svg>";
  }
  if (loading && !svg) {
    return <span className={className} style={{ width, height, display: "inline-block", verticalAlign: "middle" }}>加载中...</span>;
  }
  if (!svg) {
    return <span className={className} style={{ width, height, display: "inline-block", verticalAlign: "middle" }}>无图标</span>;
  }
  return (
    <span
      className={className}
      style={{ width, height, display: "inline-block", verticalAlign: "middle" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}; 