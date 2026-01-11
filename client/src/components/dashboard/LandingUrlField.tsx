import { Input } from "@/components/ui/input";

interface LandingUrlFieldProps {
  value: string;
  clickIdParam: string;
  onChange: (value: string) => void;
  testId?: string;
}

export function LandingUrlField({ value = "", clickIdParam = "click_id", onChange, testId }: LandingUrlFieldProps) {
  const param = clickIdParam || "click_id";
  const separator = (value || "").includes("?") ? "&" : "?";
  const suffix = value ? `${separator}${param}=<uuid>` : "";
  
  return (
    <div className="relative w-full">
      <Input
        data-testid={testId}
        type="text"
        className="bg-card border-border text-foreground font-mono h-8 text-sm pr-40"
        placeholder="https://landing.com/click?o=123"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-green-400 font-mono text-xs whitespace-nowrap pointer-events-none bg-card pl-1">
          {suffix}
        </span>
      )}
    </div>
  );
}
