import ExcelJS from "exceljs";
import PdfPrinter from "pdfmake";
import type { TDocumentDefinitions, Content } from "pdfmake/interfaces";

export type ExportFormat = "csv" | "xlsx" | "pdf";

export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
}

export interface ExportData {
  title: string;
  columns: ExportColumn[];
  rows: Record<string, any>[];
  filters?: Record<string, string>;
}

const fonts = {
  Roboto: {
    normal: "node_modules/pdfmake/build/vfs_fonts.js",
    bold: "node_modules/pdfmake/build/vfs_fonts.js",
    italics: "node_modules/pdfmake/build/vfs_fonts.js",
    bolditalics: "node_modules/pdfmake/build/vfs_fonts.js",
  },
};

export async function generateCSV(data: ExportData): Promise<Buffer> {
  const { columns, rows } = data;
  
  const headerRow = columns.map((col) => `"${col.header}"`).join(",");
  
  const dataRows = rows.map((row) => {
    return columns
      .map((col) => {
        const value = row[col.key];
        if (value === null || value === undefined) return '""';
        const strValue = String(value).replace(/"/g, '""');
        return `"${strValue}"`;
      })
      .join(",");
  });

  const csv = [headerRow, ...dataRows].join("\n");
  return Buffer.from("\uFEFF" + csv, "utf-8");
}

export async function generateExcel(data: ExportData): Promise<Buffer> {
  const { title, columns, rows, filters } = data;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PrimeTrack";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(title.substring(0, 31));

  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 15,
  }));

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F46E5" },
  };
  headerRow.alignment = { horizontal: "center" };

  rows.forEach((row, index) => {
    const excelRow = worksheet.addRow(row);
    if (index % 2 === 1) {
      excelRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF3F4F6" },
      };
    }
  });

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function generatePDF(data: ExportData): Promise<Buffer> {
  const { title, columns, rows, filters } = data;

  const tableHeaders = columns.map((col) => ({
    text: col.header,
    bold: true,
    fillColor: "#4F46E5",
    color: "#FFFFFF",
    fontSize: 8,
    alignment: "center" as const,
  }));

  const tableBody = rows.slice(0, 500).map((row, index) =>
    columns.map((col) => ({
      text: String(row[col.key] ?? ""),
      fontSize: 7,
      ...(index % 2 === 1 ? { fillColor: "#F3F4F6" } : {}),
    }))
  );

  const filterText = filters
    ? Object.entries(filters)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    : "";

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageOrientation: columns.length > 6 ? "landscape" : "portrait",
    pageMargins: [20, 40, 20, 40],
    content: [
      { text: title, style: "header", margin: [0, 0, 0, 10] },
      filterText
        ? { text: `Фильтры: ${filterText}`, style: "subheader", margin: [0, 0, 0, 10] }
        : ({} as Content),
      { text: `Дата экспорта: ${new Date().toLocaleString("ru-RU")}`, style: "meta", margin: [0, 0, 0, 10] },
      {
        table: {
          headerRows: 1,
          widths: columns.map(() => "*"),
          body: [tableHeaders, ...tableBody],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#E5E7EB",
          vLineColor: () => "#E5E7EB",
        },
      },
      rows.length > 500
        ? { text: `\n... и ещё ${rows.length - 500} записей (показаны первые 500)`, style: "note" }
        : ({} as Content),
    ],
    styles: {
      header: { fontSize: 16, bold: true, color: "#1F2937" },
      subheader: { fontSize: 9, color: "#6B7280" },
      meta: { fontSize: 8, color: "#9CA3AF" },
      note: { fontSize: 8, color: "#9CA3AF", italics: true },
    },
    defaultStyle: { font: "Helvetica" },
  };

  return new Promise((resolve, reject) => {
    const pdfDoc = new (require("pdfmake"))({
      Helvetica: {
        normal: "Helvetica",
        bold: "Helvetica-Bold",
        italics: "Helvetica-Oblique",
        bolditalics: "Helvetica-BoldOblique",
      },
    }).createPdfKitDocument(docDefinition);

    const chunks: Buffer[] = [];
    pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
    pdfDoc.end();
  });
}

export async function generateExport(
  data: ExportData,
  format: ExportFormat
): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  switch (format) {
    case "csv":
      return {
        buffer: await generateCSV(data),
        contentType: "text/csv; charset=utf-8",
        extension: "csv",
      };
    case "xlsx":
      return {
        buffer: await generateExcel(data),
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        extension: "xlsx",
      };
    case "pdf":
      return {
        buffer: await generatePDF(data),
        contentType: "application/pdf",
        extension: "pdf",
      };
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

export const EXPORT_DATASETS = {
  "reports-clicks": {
    title: "Клики",
    columns: [
      { key: "id", header: "ID", width: 36 },
      { key: "createdAt", header: "Дата", width: 20 },
      { key: "offerId", header: "Оффер ID", width: 36 },
      { key: "publisherId", header: "Партнёр ID", width: 36 },
      { key: "geo", header: "GEO", width: 5 },
      { key: "device", header: "Устройство", width: 10 },
      { key: "ip", header: "IP", width: 15 },
      { key: "sub1", header: "Sub1", width: 15 },
      { key: "sub2", header: "Sub2", width: 15 },
    ],
  },
  "reports-conversions": {
    title: "Конверсии",
    columns: [
      { key: "id", header: "ID", width: 36 },
      { key: "createdAt", header: "Дата", width: 20 },
      { key: "clickId", header: "Click ID", width: 36 },
      { key: "offerId", header: "Оффер ID", width: 36 },
      { key: "publisherId", header: "Партнёр ID", width: 36 },
      { key: "eventType", header: "Тип", width: 10 },
      { key: "status", header: "Статус", width: 10 },
      { key: "advertiserPayout", header: "Расход", width: 10 },
      { key: "publisherPayout", header: "Выплата", width: 10 },
    ],
  },
  "finance-transactions": {
    title: "Транзакции",
    columns: [
      { key: "id", header: "ID", width: 36 },
      { key: "createdAt", header: "Дата", width: 20 },
      { key: "publisherName", header: "Партнёр", width: 20 },
      { key: "requestedAmount", header: "Сумма", width: 12 },
      { key: "status", header: "Статус", width: 12 },
      { key: "methodName", header: "Метод", width: 15 },
    ],
  },
  "finance-payouts": {
    title: "Выплаты",
    columns: [
      { key: "id", header: "ID", width: 36 },
      { key: "createdAt", header: "Дата", width: 20 },
      { key: "publisherName", header: "Партнёр", width: 20 },
      { key: "amount", header: "Сумма", width: 12 },
      { key: "currency", header: "Валюта", width: 8 },
      { key: "payoutType", header: "Тип", width: 12 },
      { key: "transactionId", header: "TX ID", width: 20 },
    ],
  },
  "publisher-payouts": {
    title: "История выплат",
    columns: [
      { key: "id", header: "ID", width: 36 },
      { key: "createdAt", header: "Дата", width: 20 },
      { key: "amount", header: "Сумма", width: 12 },
      { key: "currency", header: "Валюта", width: 8 },
      { key: "payoutType", header: "Тип", width: 12 },
      { key: "transactionId", header: "TX ID", width: 20 },
    ],
  },
  "postback-logs": {
    title: "Логи постбеков",
    columns: [
      { key: "id", header: "ID", width: 36 },
      { key: "createdAt", header: "Дата", width: 20 },
      { key: "direction", header: "Направление", width: 10 },
      { key: "url", header: "URL", width: 50 },
      { key: "method", header: "Метод", width: 8 },
      { key: "responseCode", header: "Код", width: 6 },
      { key: "success", header: "Успех", width: 6 },
    ],
  },
} as const;

export type ExportDatasetKey = keyof typeof EXPORT_DATASETS;
