import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type ExportDataset = 
  | "reports-clicks"
  | "reports-conversions"
  | "finance-transactions"
  | "finance-payouts"
  | "publisher-payouts"
  | "postback-logs";

export type ExportFormat = "csv" | "xlsx" | "pdf";

interface ExportMenuProps {
  dataset: ExportDataset;
  getFilters?: () => Record<string, string | undefined>;
  disabled?: boolean;
}

export function ExportMenu({ dataset, getFilters, disabled }: ExportMenuProps) {
  const [loading, setLoading] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setLoading(format);
    
    try {
      const filters = getFilters?.() || {};
      const params = new URLSearchParams();
      params.set("format", format);
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.set(key, value);
        }
      });

      const response = await fetch(`/api/export/${dataset}?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Export failed");
      }

      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${dataset}_${new Date().toISOString().split("T")[0]}.${format}`;
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Экспорт завершён");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(error.message || "Ошибка экспорта");
    } finally {
      setLoading(null);
    }
  };

  const formatLabels: Record<ExportFormat, { label: string; icon: typeof Download }> = {
    csv: { label: "CSV", icon: FileText },
    xlsx: { label: "Excel", icon: FileSpreadsheet },
    pdf: { label: "PDF", icon: FileText },
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || loading !== null}
          className="border-border bg-transparent text-foreground hover:bg-muted"
          data-testid="button-export-menu"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Экспорт
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-border">
        {(["csv", "xlsx", "pdf"] as ExportFormat[]).map((format) => {
          const { label, icon: Icon } = formatLabels[format];
          return (
            <DropdownMenuItem
              key={format}
              onClick={() => handleExport(format)}
              disabled={loading !== null}
              className="cursor-pointer"
              data-testid={`button-export-${format}`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {loading === format ? "Экспорт..." : `Экспорт в ${label}`}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
