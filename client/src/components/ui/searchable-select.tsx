import * as React from "react";
import { useState, useMemo } from "react";
import { Search, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SearchableSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  "data-testid"?: string;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Выбрать...",
  searchPlaceholder = "Поиск...",
  emptyText = "Не найдено",
  className,
  "data-testid": testId,
}: SearchableSelectProps) {
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const lower = search.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(lower));
  }, [options, search]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn("bg-input border-border text-foreground", className)}
        data-testid={testId}
      >
        <SelectValue placeholder={placeholder}>
          {selectedOption && (
            <span className="flex items-center gap-1">
              {selectedOption.icon && <span>{selectedOption.icon}</span>}
              {selectedOption.label}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-input border-border max-h-[300px]">
        <div className="flex items-center border-b border-border px-3 pb-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        {filteredOptions.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          filteredOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex items-center gap-2">
                {option.icon && <span>{option.icon}</span>}
                {option.label}
              </span>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
