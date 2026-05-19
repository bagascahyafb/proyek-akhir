import { useEffect, useRef } from "react";
import type { KeyboardEventHandler } from "react";

type Props = {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  onKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
};

export default function EditableText({ value, onChange, className, onKeyDown }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      rows={1}
      className={`
        w-full
        bg-transparent
        outline-none
        resize-none
        overflow-hidden
        
        leading-tight
        p-0 m-0
        
        ${className}
      `}
    />
  );
}
