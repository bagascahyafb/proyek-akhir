import type { KeyboardEventHandler } from "react";

type Props = {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  onKeyDown?: KeyboardEventHandler<HTMLTextAreaElement | HTMLInputElement>;
  inline?: boolean;
};

export default function EditableText({
  value,
  onChange,
  className = "",
  onKeyDown,
  inline,
}: Props) {
  const safeValue = typeof value === "string" ? value : "";

  if (inline) {
    return (
      <span className="relative inline-block align-baseline">
        {/* Tambahin spasi kosong ("  ") di belakang teks buat ngasih ruang napas kursor dan huruf terakhir */}
        <span className={`invisible whitespace-pre pointer-events-none ${className}`}>
          {safeValue ? safeValue + "  " : "   "}
        </span>
        
        {/* Input Asli */}
        <input
          type="text"
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown as any}
          className={`absolute inset-0 w-full h-full outline-none ${className}`}
          style={{ 
            background: "transparent", 
            padding: 0, 
            margin: 0, 
            border: "none", 
            minHeight: "0",
            boxShadow: "none",
            color: "inherit"
          }}
        />
      </span>
    );
  }

  // Multiline
  return (
    <textarea
      value={safeValue}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown as any}
      rows={1}
      className={`w-full outline-none resize-none overflow-hidden leading-tight ${className}`}
      style={{ 
        height: "auto", 
        fieldSizing: "content",
        background: "transparent",
        padding: 0,
        margin: 0,
        border: "none",
        minHeight: "0",
        boxShadow: "none",
        color: "inherit"
      }}
    />
  );
}