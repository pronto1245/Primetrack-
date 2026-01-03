import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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

interface AdditionalDataset {
  id: ExportDataset;
  label: string;
}

interface ExportMenuProps {
  dataset: ExportDataset;
  getFilters?: () => Record<string, string | undefined>;
  disabled?: boolean;
  additionalDatasets?: AdditionalDataset[];
}

const datasetLabels: Record<ExportDataset, string> = {
  "reports-clicks": "Клики",
  "reports-conversions": "Конверсии",
  "finance-transactions": "Транзакции",
  "finance-payouts": "Выплаты",
  "publisher-payouts": "Мои выплаты",
  "postback-logs": "Постбеки",
};

export function ExportMenu({ dataset, getFilters, disabled, additionalDatasets }: ExportMenuProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleExport = async (targetDataset: ExportDataset, format: ExportFormat) => {
    const loadingKey = `${targetDataset}-${format}`;
    setLoading(loadingKey);
    
    try {
      const filters = getFilters?.() || {};
      const params = new URLSearchParams();
      params.set("format", format);
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.set(key, value);
        }
      });

      const response = await fetch(`/api/export/${targetDataset}?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Export failed");
      }

      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${targetDataset}_${new Date().toISOString().split("T")[0]}.${format}`;
      
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

  const formats: ExportFormat[] = ["csv", "xlsx", "pdf"];
  const hasMultipleDatasets = additionalDatasets && additionalDatasets.length > 0;

  const renderFormatItems = (targetDataset: ExportDataset) => (
    formats.map((format) => {
      const { label, icon: Icon } = formatLabels[format];
      const loadingKey = `${targetDataset}-${format}`;
      return (
        <DropdownMenuItem
          key={format}
          onClick={() => handleExport(targetDataset, format)}
          disabled={loading !== null}
          className="cursor-pointer"
          data-testid={`button-export-${targetDataset}-${format}`}
        >
          <Icon className="w-4 h-4 mr-2" />
          {loading === loadingKey ? "Экспорт..." : label}
        </DropdownMenuItem>
      );
    })
  );

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
        {hasMultipleDatasets ? (
          <>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {datasetLabels[dataset]}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-card border-border">
                {renderFormatItems(dataset)}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {additionalDatasets.map((ds) => (
              <DropdownMenuSub key={ds.id}>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  {ds.label}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="bg-card border-border">
                  {renderFormatItems(ds.id)}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}
          </>
        ) : (
          renderFormatItems(dataset)
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
