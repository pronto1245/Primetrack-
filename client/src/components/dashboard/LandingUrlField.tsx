import { useRef, useEffect, useState } from "react";

interface LandingUrlFieldProps {
  value: string;
  clickIdParam: string;
  onChange: (value: string) => void;
  testId?: string;
}

export function LandingUrlField({ value, clickIdParam, onChange, testId }: LandingUrlFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputWidth, setInputWidth] = useState(0);
  
  const param = clickIdParam || "click_id";
  const separator = value.includes("?") ? "&" : "?";
  const suffix = value ? `${separator}${param}=<uuid>` : "";
  
  useEffect(() => {
    if (inputRef.current) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const style = window.getComputedStyle(inputRef.current);
        ctx.font = style.font;
        const textWidth = ctx.measureText(value).width;
        setInputWidth(textWidth + 8);
      }
    }
  }, [value]);

  return (
    <div className="relative w-full">
      <div className="flex items-center bg-card border border-border rounded-md h-8 overflow-hidden">
        <input
          ref={inputRef}
          data-testid={testId}
          type="text"
          className="bg-transparent text-foreground font-mono text-sm h-full px-2 outline-none flex-shrink-0"
          style={{ width: Math.max(inputWidth, 200) }}
          placeholder="https://landing.com/click?o=123"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
        {value && (
          <span className="text-green-400 font-mono text-sm whitespace-nowrap pr-2">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
