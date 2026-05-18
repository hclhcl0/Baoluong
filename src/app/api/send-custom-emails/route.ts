import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import nodemailer from "nodemailer";
import { EmailPool } from "@/utils/emailPool";
import { generateCustomEmail } from "@/utils/customEmailTemplate";
import type { GmailAccount, ColumnMapping, CustomRecord, CustomSendResult } from "@/types/salary";

// ============================================================
// /api/send-custom-emails
// Nhận file Excel + column mapping → gửi email theo cột đã chọn
// ============================================================

interface SendCustomBody {
  fileBase64: string;       // File Excel encode base64
  fileName: string;
  headerRowIndex: number;   // Hàng header trong file gốc
  isSubHeader?: boolean;    // Cờ do preview trả về
  columnMapping: ColumnMapping;
  accounts: GmailAccount[];
  subject?: string;
  batchSize?: number;
  batchDelayMs?: number;
  customMessage?: string;
  footerNote?: string;
  emailTitle?: string;
}

function enc(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(req: NextRequest) {
  const body: SendCustomBody = await req.json();
  const {
    fileBase64,
    fileName,
    headerRowIndex,
    isSubHeader,
    columnMapping,
    accounts,
    subject,
    batchSize = 10,
    batchDelayMs = 2000,
    customMessage,
    footerNote,
    emailTitle,
  } = body;

  if (!fileBase64) return new Response("Không có dữ liệu file.", { status: 400 });
  if (!accounts?.length) return new Response("Cần ít nhất 1 tài khoản Gmail.", { status: 400 });
  if (!columnMapping?.nameCol || !columnMapping?.emailCol) {
    return new Response("Thiếu cột tên hoặc email.", { status: 400 });
  }

  // Decode base64 → ArrayBuffer → parse Excel
  const binaryStr = atob(fileBase64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  
  const workbook = XLSX.read(bytes, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  const topRow = (allRows[headerRowIndex] as unknown[] || []).map(h => String(h || "").trim());
  const nextRow = (allRows[headerRowIndex + 1] as unknown[] || []).map(h => String(h || "").trim());

  let actualIsSubHeader = isSubHeader || false;
  if (isSubHeader === undefined) {
    let currentTop = "";
    const maxLen = Math.max(topRow.length, nextRow.length);
    for (let i = 0; i < maxLen; i++) {
      const t = topRow[i] || "";
      const n = nextRow[i] || "";
      if (t !== "") currentTop = t;
      if (t === "" && currentTop !== "" && n !== "") {
        actualIsSubHeader = true; break;
      }
    }
  }

  const headerMap: { index: number; name: string }[] = [];
  let currentTop = "";
  const maxLen = Math.max(topRow.length, nextRow.length);
  for (let i = 0; i < maxLen; i++) {
    const t = topRow[i] || "";
    const n = nextRow[i] || "";
    if (t !== "") currentTop = t;
    let headerName = currentTop;
    if (actualIsSubHeader && n !== "") {
      if (currentTop && currentTop !== n) headerName = `${currentTop} - ${n}`;
      else headerName = n;
    }
    if (headerName !== "" && !headerMap.some(h => h.name === headerName)) headerMap.push({ index: i, name: headerName });
  }

  const records: CustomRecord[] = [];
  const dataStartIdx = headerRowIndex + (actualIsSubHeader ? 2 : 1);
  for (let i = dataStartIdx; i < allRows.length; i++) {
    const row = allRows[i] as unknown[];
    const rowObj: Record<string, unknown> = {};
    headerMap.forEach(({ index, name }) => { rowObj[name] = row[index] ?? ""; });

    const name = String(rowObj[columnMapping.nameCol] || "").trim();
    const email = String(rowObj[columnMapping.emailCol] || "").trim();

    if (!name || !email || !email.includes("@")) continue;

    const deptKeywords = ["phòng", "ban ", "khoa", "tổ ", "đội ", "tổng cộng", "cộng"];
    if (deptKeywords.some((k) => name.toLowerCase().startsWith(k))) continue;

    const data: Record<string, unknown> = {};
    columnMapping.displayCols.forEach(({ key }) => { data[key] = rowObj[key]; });
    if (columnMapping.totalCol) data[columnMapping.totalCol] = rowObj[columnMapping.totalCol];

    records.push({ tenNhanVien: name, email, data });
  }

  if (!records.length) {
    return new Response("Không tìm thấy nhân viên hợp lệ trong file.", { status: 400 });
  }

  const transporters = new Map<string, nodemailer.Transporter>();
  for (const acc of accounts) {
    transporters.set(acc.id, nodemailer.createTransport({
      service: "gmail",
      auth: { user: acc.user, pass: acc.appPassword },
    }));
  }
  const pool = new EmailPool(accounts);
  const finalSubject = subject || emailTitle || "Thông báo lương - CDC Đà Nẵng";
  const finalTitle = emailTitle || subject || "Thông báo lương - CDC Đà Nẵng";

  const stream = new ReadableStream({
    async start(controller) {
      enc(controller, { type: "start", total: records.length });

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const account = pool.next();
        const transporter = transporters.get(account.id)!;

        let result: CustomSendResult;
        try {
          const html = generateCustomEmail(record, {
            emailTitle: finalTitle,
            columnMapping,
            customMessage,
            footerNote,
          });
          await transporter.sendMail({
            from: `"CDC Đà Nẵng - Phòng TCHC" <${account.user}>`,
            to: record.email,
            subject: finalSubject,
            html,
          });
          result = { tenNhanVien: record.tenNhanVien, email: record.email, status: "success", sentVia: account.user };
        } catch (err) {
          result = { tenNhanVien: record.tenNhanVien, email: record.email, status: "error", sentVia: account.user, error: (err as Error).message };
        }

        enc(controller, { type: "progress", index: i + 1, total: records.length, result });

        if (batchSize > 0 && (i + 1) % batchSize === 0 && i < records.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
        }
      }

      enc(controller, { type: "done", stats: pool.getStats() });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json() as { fileBase64: string; headerRowIndex: number; isSubHeader?: boolean; columnMapping: ColumnMapping };
  const { fileBase64, headerRowIndex, isSubHeader, columnMapping } = body;

  const binaryStr = atob(fileBase64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

  const workbook = XLSX.read(bytes, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  const topRow = (allRows[headerRowIndex] as unknown[] || []).map(h => String(h || "").trim());
  const nextRow = (allRows[headerRowIndex + 1] as unknown[] || []).map(h => String(h || "").trim());

  let actualIsSubHeader = isSubHeader || false;
  if (isSubHeader === undefined) {
    let currentTop = "";
    const maxLen = Math.max(topRow.length, nextRow.length);
    for (let i = 0; i < maxLen; i++) {
      const t = topRow[i] || "";
      const n = nextRow[i] || "";
      if (t !== "") currentTop = t;
      if (t === "" && currentTop !== "" && n !== "") {
        actualIsSubHeader = true; break;
      }
    }
  }

  const headerMap: { index: number; name: string }[] = [];
  let currentTop = "";
  const maxLen = Math.max(topRow.length, nextRow.length);
  for (let i = 0; i < maxLen; i++) {
    const t = topRow[i] || "";
    const n = nextRow[i] || "";
    if (t !== "") currentTop = t;
    let headerName = currentTop;
    if (actualIsSubHeader && n !== "") {
      if (currentTop && currentTop !== n) headerName = `${currentTop} - ${n}`;
      else headerName = n;
    }
    if (headerName !== "" && !headerMap.some(h => h.name === headerName)) headerMap.push({ index: i, name: headerName });
  }

  const records: (CustomRecord & { id: string })[] = [];
  const dataStartIdx = headerRowIndex + (actualIsSubHeader ? 2 : 1);
  for (let i = dataStartIdx; i < allRows.length; i++) {
    const row = allRows[i] as unknown[];
    const rowObj: Record<string, unknown> = {};
    headerMap.forEach(({ index, name }) => { rowObj[name] = row[index] ?? ""; });

    const name = String(rowObj[columnMapping.nameCol] || "").trim();
    const email = String(rowObj[columnMapping.emailCol] || "").trim();
    if (!name || !email || !email.includes("@")) continue;

    const deptKeywords = ["phòng", "ban ", "khoa", "tổ ", "đội ", "tổng cộng", "cộng"];
    if (deptKeywords.some((k) => name.toLowerCase().startsWith(k))) continue;

    const data: Record<string, unknown> = {};
    columnMapping.displayCols.forEach(({ key }) => { data[key] = rowObj[key]; });
    if (columnMapping.totalCol) data[columnMapping.totalCol] = rowObj[columnMapping.totalCol];

    records.push({ id: `${i}`, tenNhanVien: name, email, data });
  }

  return new Response(JSON.stringify({ records }), {
    headers: { "Content-Type": "application/json" },
  });
}
