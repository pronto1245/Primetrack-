import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Loader2, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface Invoice {
  id: string;
  shortId: string | null;
  publisherId: string;
  advertiserId: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: string;
  currency: string;
  status: "draft" | "issued" | "paid" | "cancelled";
  pdfUrl: string | null;
  notes: string | null;
  createdAt: string;
  issuedAt: string | null;
  paidAt: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Черновик", color: "bg-gray-500" },
  issued: { label: "Выставлен", color: "bg-blue-500" },
  paid: { label: "Оплачен", color: "bg-green-500" },
  cancelled: { label: "Отменён", color: "bg-red-500" },
};

export function PublisherInvoices() {
  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/publisher/invoices"],
    queryFn: async () => {
      const res = await fetch("/api/publisher/invoices", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
  });

  const handleDownload = async (invoiceId: string, shortId: string | null) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pdf`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to download invoice");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${shortId || invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download invoice:", error);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          Инвойсы
        </CardTitle>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>У вас пока нет инвойсов</p>
            <p className="text-sm mt-1">Инвойсы будут создаваться автоматически при выплатах</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => {
              const statusInfo = STATUS_LABELS[invoice.status] || STATUS_LABELS.draft;
              
              return (
                <div
                  key={invoice.id}
                  className="p-4 bg-muted/30 rounded-lg border border-border flex items-center justify-between"
                  data-testid={`invoice-${invoice.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{invoice.shortId || `INV-${invoice.id.substring(0, 8)}`}</span>
                        <Badge className={`${statusInfo.color} text-white text-xs`}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(invoice.periodStart), "dd.MM.yy", { locale: ru })} - {format(new Date(invoice.periodEnd), "dd.MM.yy", { locale: ru })}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {parseFloat(invoice.totalAmount).toLocaleString()} {invoice.currency}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(invoice.id, invoice.shortId)}
                    className="gap-2"
                    data-testid={`download-invoice-${invoice.id}`}
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
