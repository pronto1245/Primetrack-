import { createRequire } from "module";
const require = createRequire(import.meta.url);
const PDFDocument = require("pdfkit");
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { FinanceAnalytics } from "./advertiser-finance-service";

interface FinanceReportOptions {
  analytics: FinanceAnalytics;
  advertiserName?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class FinancePdfService {
  generateReport(options: FinanceReportOptions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const { analytics, advertiserName, dateFrom, dateTo } = options;
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];
      
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      
      const now = new Date();
      const periodText = dateFrom && dateTo 
        ? `${format(dateFrom, "dd.MM.yyyy", { locale: ru })} - ${format(dateTo, "dd.MM.yyyy", { locale: ru })}`
        : "Весь период";
      
      doc.fontSize(22).font("Helvetica-Bold")
        .text("Финансовый отчёт", { align: "center" });
      doc.moveDown(0.5);
      
      doc.fontSize(10).font("Helvetica")
        .fillColor("#666666")
        .text(`Дата формирования: ${format(now, "dd.MM.yyyy HH:mm", { locale: ru })}`, { align: "center" });
      if (advertiserName) {
        doc.text(`Рекламодатель: ${advertiserName}`, { align: "center" });
      }
      doc.text(`Период: ${periodText}`, { align: "center" });
      doc.fillColor("black");
      doc.moveDown(1.5);
      
      this.drawSummarySection(doc, analytics);
      doc.moveDown(1);
      
      if (analytics.offerBreakdown.length > 0) {
        this.drawOfferTable(doc, analytics);
        doc.moveDown(1);
      }
      
      if (analytics.publisherBreakdown.length > 0) {
        this.drawPublisherTable(doc, analytics);
        doc.moveDown(1);
      }
      
      if (analytics.trend.length > 0) {
        this.drawTrendTable(doc, analytics);
      }
      
      doc.end();
    });
  }
  
  private drawSummarySection(doc: any, analytics: FinanceAnalytics): void {
    doc.fontSize(14).font("Helvetica-Bold").text("Сводка");
    doc.moveDown(0.5);
    
    const tableTop = doc.y;
    const rowHeight = 22;
    const col1 = 40, col2 = 200, col3 = 300, col4 = 430;
    
    doc.save();
    doc.rect(40, tableTop, 515, rowHeight).fill("#1a56db");
    doc.restore();
    
    doc.fillColor("white").fontSize(10).font("Helvetica-Bold")
      .text("Показатель", col1 + 10, tableTop + 6)
      .text("Значение", col2 + 10, tableTop + 6)
      .text("Показатель", col3 + 10, tableTop + 6)
      .text("Значение", col4 + 10, tableTop + 6);
    doc.fillColor("black");
    
    const summaryData = [
      ["Доход", `$${analytics.summary.revenue.toFixed(2)}`, "FTD", String(analytics.summary.totalFtd)],
      ["Выплаты", `$${analytics.summary.payouts.toFixed(2)}`, "Repeat Deposits", String(analytics.summary.totalRepeatDeposits)],
      ["Прибыль", `$${analytics.summary.profit.toFixed(2)}`, "Средний депозит", `$${analytics.summary.avgDepositAmount.toFixed(2)}`],
      ["ROI", `${analytics.summary.roiPercent.toFixed(2)}%`, "", ""],
    ];
    
    let y = tableTop + rowHeight;
    summaryData.forEach((row, i) => {
      const bgColor = i % 2 === 0 ? "#f9fafb" : "#ffffff";
      doc.save();
      doc.rect(40, y, 515, rowHeight).fill(bgColor);
      doc.restore();
      
      doc.fillColor("black").fontSize(10).font("Helvetica")
        .text(row[0], col1 + 10, y + 6)
        .text(row[1], col2 + 10, y + 6)
        .text(row[2], col3 + 10, y + 6)
        .text(row[3], col4 + 10, y + 6);
      y += rowHeight;
    });
    
    doc.strokeColor("#e5e7eb");
    doc.rect(40, tableTop, 515, (summaryData.length + 1) * rowHeight).stroke();
    doc.y = y + 10;
  }
  
  private drawOfferTable(doc: any, analytics: FinanceAnalytics): void {
    doc.fontSize(14).font("Helvetica-Bold").fillColor("black").text("По офферам");
    doc.moveDown(0.5);
    
    const tableTop = doc.y;
    const cols = [40, 180, 260, 340, 420, 495];
    const rowHeight = 20;
    
    doc.save();
    doc.rect(40, tableTop, 515, rowHeight).fill("#1a56db");
    doc.restore();
    
    doc.fillColor("white").fontSize(9).font("Helvetica-Bold")
      .text("Оффер", cols[0] + 5, tableTop + 5)
      .text("Доход", cols[1] + 5, tableTop + 5)
      .text("Выплаты", cols[2] + 5, tableTop + 5)
      .text("Прибыль", cols[3] + 5, tableTop + 5)
      .text("FTD", cols[4] + 5, tableTop + 5)
      .text("ROI", cols[5] + 5, tableTop + 5);
    doc.fillColor("black");
    
    let y = tableTop + rowHeight;
    const offers = analytics.offerBreakdown.slice(0, 15);
    offers.forEach((offer, i) => {
      const bgColor = i % 2 === 0 ? "#f9fafb" : "#ffffff";
      doc.save();
      doc.rect(40, y, 515, rowHeight).fill(bgColor);
      doc.restore();
      
      doc.fillColor("black").fontSize(9).font("Helvetica")
        .text(offer.offerName.substring(0, 25), cols[0] + 5, y + 5)
        .text(`$${offer.revenue.toFixed(2)}`, cols[1] + 5, y + 5)
        .text(`$${offer.payouts.toFixed(2)}`, cols[2] + 5, y + 5)
        .text(`$${offer.profit.toFixed(2)}`, cols[3] + 5, y + 5)
        .text(String(offer.ftdCount), cols[4] + 5, y + 5)
        .text(`${offer.roiPercent.toFixed(1)}%`, cols[5] + 5, y + 5);
      y += rowHeight;
    });
    
    doc.strokeColor("#e5e7eb");
    doc.rect(40, tableTop, 515, (offers.length + 1) * rowHeight).stroke();
    doc.y = y + 10;
  }
  
  private drawPublisherTable(doc: any, analytics: FinanceAnalytics): void {
    doc.fontSize(14).font("Helvetica-Bold").fillColor("black").text("По паблишерам");
    doc.moveDown(0.5);
    
    const tableTop = doc.y;
    const cols = [40, 180, 260, 340, 420, 495];
    const rowHeight = 20;
    
    doc.save();
    doc.rect(40, tableTop, 515, rowHeight).fill("#1a56db");
    doc.restore();
    
    doc.fillColor("white").fontSize(9).font("Helvetica-Bold")
      .text("Паблишер", cols[0] + 5, tableTop + 5)
      .text("Доход", cols[1] + 5, tableTop + 5)
      .text("Выплаты", cols[2] + 5, tableTop + 5)
      .text("Прибыль", cols[3] + 5, tableTop + 5)
      .text("FTD", cols[4] + 5, tableTop + 5)
      .text("ROI", cols[5] + 5, tableTop + 5);
    doc.fillColor("black");
    
    let y = tableTop + rowHeight;
    const publishers = analytics.publisherBreakdown.slice(0, 15);
    publishers.forEach((pub, i) => {
      const bgColor = i % 2 === 0 ? "#f9fafb" : "#ffffff";
      doc.save();
      doc.rect(40, y, 515, rowHeight).fill(bgColor);
      doc.restore();
      
      doc.fillColor("black").fontSize(9).font("Helvetica")
        .text(pub.publisherName.substring(0, 25), cols[0] + 5, y + 5)
        .text(`$${pub.revenue.toFixed(2)}`, cols[1] + 5, y + 5)
        .text(`$${pub.payouts.toFixed(2)}`, cols[2] + 5, y + 5)
        .text(`$${pub.profit.toFixed(2)}`, cols[3] + 5, y + 5)
        .text(String(pub.ftdCount), cols[4] + 5, y + 5)
        .text(`${pub.roiPercent.toFixed(1)}%`, cols[5] + 5, y + 5);
      y += rowHeight;
    });
    
    doc.strokeColor("#e5e7eb");
    doc.rect(40, tableTop, 515, (publishers.length + 1) * rowHeight).stroke();
    doc.y = y + 10;
  }
  
  private drawTrendTable(doc: any, analytics: FinanceAnalytics): void {
    if (doc.y > 650) {
      doc.addPage();
    }
    
    doc.fontSize(14).font("Helvetica-Bold").fillColor("black").text("Динамика по периодам");
    doc.moveDown(0.5);
    
    const tableTop = doc.y;
    const cols = [40, 150, 260, 370];
    const rowHeight = 18;
    
    doc.save();
    doc.rect(40, tableTop, 515, rowHeight).fill("#1a56db");
    doc.restore();
    
    doc.fillColor("white").fontSize(9).font("Helvetica-Bold")
      .text("Дата", cols[0] + 5, tableTop + 4)
      .text("Доход", cols[1] + 5, tableTop + 4)
      .text("Выплаты", cols[2] + 5, tableTop + 4)
      .text("Прибыль", cols[3] + 5, tableTop + 4);
    doc.fillColor("black");
    
    let y = tableTop + rowHeight;
    const maxRows = Math.min(analytics.trend.length, 20);
    const trendData = analytics.trend.slice(0, maxRows);
    
    trendData.forEach((row, i) => {
      if (y > 750) {
        doc.addPage();
        y = 40;
      }
      const bgColor = i % 2 === 0 ? "#f9fafb" : "#ffffff";
      doc.save();
      doc.rect(40, y, 515, rowHeight).fill(bgColor);
      doc.restore();
      
      const dateStr = row.periodStart ? format(new Date(row.periodStart), "dd.MM.yyyy", { locale: ru }) : "-";
      doc.fillColor("black").fontSize(9).font("Helvetica")
        .text(dateStr, cols[0] + 5, y + 4)
        .text(`$${row.revenue.toFixed(2)}`, cols[1] + 5, y + 4)
        .text(`$${row.payouts.toFixed(2)}`, cols[2] + 5, y + 4)
        .text(`$${row.profit.toFixed(2)}`, cols[3] + 5, y + 4);
      y += rowHeight;
    });
    
    doc.strokeColor("#e5e7eb");
    doc.rect(40, tableTop, 515, (trendData.length + 1) * rowHeight).stroke();
    doc.y = y + 10;
  }
}

export const financePdfService = new FinancePdfService();
