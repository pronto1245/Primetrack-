import PdfPrinter from "pdfmake";
import type { TDocumentDefinitions, Content, ContentTable, StyleDictionary } from "pdfmake/interfaces";
import { db } from "../../db";
import { publisherInvoices, publisherInvoiceItems, users, offers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use standard PDF fonts that don't require external files
const fonts = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

const printer = new PdfPrinter(fonts);

interface InvoiceData {
  invoiceId: string;
  shortId: string;
  publisherName: string;
  publisherEmail: string;
  advertiserName: string;
  advertiserEmail: string;
  periodStart: Date;
  periodEnd: Date;
  totalAmount: string;
  currency: string;
  items: Array<{
    offerName: string;
    conversions: number;
    payout: string;
    total: string;
  }>;
  issuedAt?: Date;
  notes?: string;
}

export class InvoicePdfService {
  async generateInvoicePdf(invoiceId: string): Promise<Buffer> {
    const invoice = await this.getInvoiceData(invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }
    
    const docDefinition = this.buildDocDefinition(invoice);
    
    return new Promise((resolve, reject) => {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];
      
      pdfDoc.on("data", (chunk) => chunks.push(chunk));
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
      pdfDoc.on("error", reject);
      
      pdfDoc.end();
    });
  }
  
  private async getInvoiceData(invoiceId: string): Promise<InvoiceData | null> {
    const [invoice] = await db.select().from(publisherInvoices).where(eq(publisherInvoices.id, invoiceId));
    if (!invoice) return null;
    
    const [publisher] = await db.select().from(users).where(eq(users.id, invoice.publisherId));
    const [advertiser] = await db.select().from(users).where(eq(users.id, invoice.advertiserId));
    const items = await db.select().from(publisherInvoiceItems).where(eq(publisherInvoiceItems.invoiceId, invoiceId));
    
    const formattedItems = items.map((item) => ({
      offerName: item.offerName || "Unknown Offer",
      conversions: item.conversions,
      payout: item.payoutPerConversion,
      total: item.totalAmount,
    }));
    
    return {
      invoiceId: invoice.id,
      shortId: invoice.shortId || `INV-${invoice.id.substring(0, 8)}`,
      publisherName: publisher?.companyName || publisher?.fullName || publisher?.email || "Publisher",
      publisherEmail: publisher?.email || "",
      advertiserName: advertiser?.companyName || advertiser?.fullName || advertiser?.email || "Advertiser",
      advertiserEmail: advertiser?.email || "",
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      totalAmount: invoice.totalAmount,
      currency: invoice.currency,
      items: formattedItems,
      issuedAt: invoice.issuedAt || undefined,
      notes: invoice.notes || undefined,
    };
  }
  
  private buildDocDefinition(invoice: InvoiceData): TDocumentDefinitions {
    const styles: StyleDictionary = {
      header: { fontSize: 24, bold: true, margin: [0, 0, 0, 20] },
      subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
      normal: { fontSize: 10, margin: [0, 2, 0, 2] },
      tableHeader: { fontSize: 10, bold: true, fillColor: "#f3f4f6" },
      tableCell: { fontSize: 10 },
      total: { fontSize: 14, bold: true, margin: [0, 10, 0, 0] },
      footer: { fontSize: 8, color: "#6b7280" },
    };
    
    const tableBody: any[][] = [
      [
        { text: "Оффер", style: "tableHeader" },
        { text: "Конверсии", style: "tableHeader", alignment: "center" },
        { text: "Ставка", style: "tableHeader", alignment: "right" },
        { text: "Сумма", style: "tableHeader", alignment: "right" },
      ],
      ...invoice.items.map((item) => [
        { text: item.offerName, style: "tableCell" },
        { text: item.conversions.toString(), style: "tableCell", alignment: "center" },
        { text: `${item.payout} ${invoice.currency}`, style: "tableCell", alignment: "right" },
        { text: `${item.total} ${invoice.currency}`, style: "tableCell", alignment: "right" },
      ]),
    ];
    
    const itemsTable: ContentTable = {
      table: {
        headerRows: 1,
        widths: ["*", 80, 80, 100],
        body: tableBody,
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0,
        hLineColor: () => "#e5e7eb",
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6,
      },
    };
    
    const content: Content = [
      { text: `ИНВОЙС ${invoice.shortId}`, style: "header" },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "От кого:", style: "subheader" },
              { text: invoice.advertiserName, style: "normal" },
              { text: invoice.advertiserEmail, style: "normal" },
            ],
          },
          {
            width: "*",
            stack: [
              { text: "Кому:", style: "subheader" },
              { text: invoice.publisherName, style: "normal" },
              { text: invoice.publisherEmail, style: "normal" },
            ],
          },
          {
            width: 150,
            stack: [
              { text: "Детали:", style: "subheader" },
              { text: `Дата: ${invoice.issuedAt ? format(invoice.issuedAt, "dd.MM.yyyy", { locale: ru }) : format(new Date(), "dd.MM.yyyy", { locale: ru })}`, style: "normal" },
              { text: `Период: ${format(invoice.periodStart, "dd.MM.yyyy", { locale: ru })} - ${format(invoice.periodEnd, "dd.MM.yyyy", { locale: ru })}`, style: "normal" },
            ],
          },
        ],
      },
      { text: "", margin: [0, 20, 0, 0] },
      { text: "Детализация:", style: "subheader" },
      itemsTable,
      {
        columns: [
          { width: "*", text: "" },
          {
            width: 200,
            table: {
              widths: ["*", "auto"],
              body: [
                [
                  { text: "ИТОГО:", style: "total" },
                  { text: `${invoice.totalAmount} ${invoice.currency}`, style: "total", alignment: "right" },
                ],
              ],
            },
            layout: "noBorders",
          },
        ],
        margin: [0, 10, 0, 0],
      },
    ];
    
    if (invoice.notes) {
      content.push({ text: "", margin: [0, 20, 0, 0] });
      content.push({ text: "Примечания:", style: "subheader" });
      content.push({ text: invoice.notes, style: "normal" });
    }
    
    return {
      content,
      styles,
      defaultStyle: { font: "Helvetica" },
      pageSize: "A4",
      pageMargins: [40, 40, 40, 60],
      footer: (currentPage, pageCount) => ({
        text: `Страница ${currentPage} из ${pageCount} | Сгенерировано PrimeTrack`,
        style: "footer",
        alignment: "center",
        margin: [0, 20, 0, 0],
      }),
    };
  }
}

export const invoicePdfService = new InvoicePdfService();
