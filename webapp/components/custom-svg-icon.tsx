import React from "react";
import pako from "pako";

interface CustomSvgIconProps {
  content: string;
  width?: number;
  height?: number;
  className?: string;
}

export const CustomSvgIcon: React.FC<CustomSvgIconProps> = ({ content, width = 24, height = 24, className }) => {
  let svg = "";
  try {
    if (content.trim().startsWith("<svg")) {
      // 未压缩，直接渲染
      svg = content;
    } else {
      // 尝试解压
      const binary = atob(content);
      const binData = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        binData[i] = binary.charCodeAt(i);
      }
      const decompressed = pako.ungzip(binData, { to: "string" });
      svg = decompressed;
    }
  } catch (e) {
    svg = "<svg viewBox='0 0 24 24'><text x='0' y='12' font-size='10'>SVG错误</text></svg>";
  }
  return (
    <span
      className={className}
      style={{ width, height, display: "inline-block", verticalAlign: "middle" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}; 