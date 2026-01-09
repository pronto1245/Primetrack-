import { createRequire } from "module";
const require = createRequire(import.meta.url);
const PDFDocument = require("pdfkit");
import { db } from "../../db";
import { publisherInvoices, publisherInvoiceItems, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

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
    
    return this.buildPdf(invoice);
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
  
  private buildPdf(invoice: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];
      
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      
      // Header
      doc.fontSize(24).font("Helvetica-Bold")
        .text(`INVOICE ${invoice.shortId}`, { align: "left" });
      doc.moveDown(1.5);
      
      // From/To section
      const startY = doc.y;
      
      // From
      doc.fontSize(12).font("Helvetica-Bold").text("From:", 40, startY);
      doc.fontSize(10).font("Helvetica")
        .text(invoice.advertiserName, 40, startY + 18)
        .text(invoice.advertiserEmail, 40, startY + 32);
      
      // To
      doc.fontSize(12).font("Helvetica-Bold").text("To:", 220, startY);
      doc.fontSize(10).font("Helvetica")
        .text(invoice.publisherName, 220, startY + 18)
        .text(invoice.publisherEmail, 220, startY + 32);
      
      // Details
      doc.fontSize(12).font("Helvetica-Bold").text("Details:", 400, startY);
      const issueDate = invoice.issuedAt ? format(invoice.issuedAt, "dd.MM.yyyy", { locale: ru }) : format(new Date(), "dd.MM.yyyy", { locale: ru });
      const periodText = `${format(invoice.periodStart, "dd.MM.yyyy", { locale: ru })} - ${format(invoice.periodEnd, "dd.MM.yyyy", { locale: ru })}`;
      doc.fontSize(10).font("Helvetica")
        .text(`Date: ${issueDate}`, 400, startY + 18)
        .text(`Period: ${periodText}`, 400, startY + 32);
      
      doc.y = startY + 70;
      
      // Items table
      doc.moveDown(1);
      doc.fontSize(12).font("Helvetica-Bold").text("Details:");
      doc.moveDown(0.5);
      
      // Table header
      const tableTop = doc.y;
      const col1 = 40, col2 = 280, col3 = 360, col4 = 450;
      
      doc.rect(40, tableTop, 515, 20).fill("#f3f4f6");
      doc.fillColor("black").fontSize(10).font("Helvetica-Bold")
        .text("Offer", col1 + 5, tableTop + 5)
        .text("Conv.", col2 + 5, tableTop + 5)
        .text("Rate", col3 + 5, tableTop + 5)
        .text("Amount", col4 + 5, tableTop + 5);
      
      // Table rows
      let rowY = tableTop + 22;
      doc.font("Helvetica");
      
      for (const item of invoice.items) {
        doc.text(item.offerName.substring(0, 35), col1 + 5, rowY)
          .text(item.conversions.toString(), col2 + 5, rowY)
          .text(`${item.payout} ${invoice.currency}`, col3 + 5, rowY)
          .text(`${item.total} ${invoice.currency}`, col4 + 5, rowY);
        
        doc.moveTo(40, rowY + 15).lineTo(555, rowY + 15).strokeColor("#e5e7eb").stroke();
        rowY += 20;
      }
      
      // Total
      doc.moveDown(2);
      doc.fontSize(14).font("Helvetica-Bold")
        .text(`TOTAL: ${invoice.totalAmount} ${invoice.currency}`, { align: "right" });
      
      // Notes
      if (invoice.notes) {
        doc.moveDown(2);
        doc.fontSize(12).font("Helvetica-Bold").text("Notes:");
        doc.fontSize(10).font("Helvetica").text(invoice.notes);
      }
      
      // Footer
      const pageHeight = doc.page.height;
      doc.fontSize(8).fillColor("#6b7280")
        .text("Generated by PrimeTrack", 40, pageHeight - 50, { align: "center" });
      
      doc.end();
    });
  }
}

export const invoicePdfService = new InvoicePdfService();
