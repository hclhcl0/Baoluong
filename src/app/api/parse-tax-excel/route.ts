import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import type { TaxRecord } from "@/types/salary";

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function normalizeVi(s: string): string {
  // Chuyển về lowercase rồi bỏ dấu để so sánh không phân biệt dấu/hoa/thường
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

/** Tìm index cột trong header row, so sánh không phân biệt dấu tiếng Việt */
function findIdx(headerRow: unknown[], keywords: string[]): number {
  return headerRow.findIndex((h) => {
    const norm = normalizeVi(toStr(h));
    return keywords.some((k) => norm.includes(normalizeVi(k)));
  });
}

/** Tìm index theo khớp chính xác (dùng cho cột có tên ngắn như "CỘNG") */
function findIdxExact(headerRow: unknown[], keywords: string[]): number {
  return headerRow.findIndex((h) => {
    const norm = normalizeVi(toStr(h));
    return keywords.some((k) => norm === normalizeVi(k));
  });
}

/** Trích xuất tháng từ chuỗi, ví dụ "Thuế TNCN tháng 04/2026" → "04/2026" */
function extractThang(rows: unknown[][]): string {
  for (const row of rows.slice(0, 3)) {
    for (const cell of row) {
      const s = toStr(cell);
      const match = s.match(/(\d{1,2}\/\d{4})/);
      if (match) return match[1];
    }
  }
  return "";
}

/**
 * Tự phát hiện cột email bằng cách quét các hàng dữ liệu đầu tiên.
 * Trả về index cột đầu tiên có chứa "@" trong dữ liệu.
 */
function autoDetectEmailCol(dataRows: unknown[][], startCol = 0): number {
  const sampleRows = dataRows.slice(0, 10);
  const colCount = Math.max(...sampleRows.map((r) => (r as unknown[]).length));
  for (let c = startCol; c < colCount; c++) {
    let emailCount = 0;
    for (const row of sampleRows) {
      const v = toStr((row as unknown[])[c]);
      if (v.includes("@") && v.includes(".")) emailCount++;
    }
    if (emailCount >= Math.floor(sampleRows.length * 0.5)) return c;
  }
  return -1;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy file." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext ?? "")) {
      return NextResponse.json({ error: "Chỉ hỗ trợ .xlsx, .xls, .csv" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

    if (allRows.length < 3) {
      return NextResponse.json({ error: "File không có đủ dữ liệu." }, { status: 400 });
    }

    // Trích xuất tháng từ các dòng đầu
    const thang = extractThang(allRows as unknown[][]);

    // Tìm hàng header (chứa "HỌ VÀ TÊN" hoặc "họ và tên" hoặc "tên")
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(allRows.length, 5); i++) {
      const rowNorm = normalizeVi(JSON.stringify(allRows[i]));
      if (rowNorm.includes("ho va ten") || rowNorm.includes("ten nhan vien") || rowNorm.includes("ho ten")) {
        headerRowIdx = i;
        break;
      }
    }
    // Fallback: dòng 1 (index 1)
    if (headerRowIdx === -1) headerRowIdx = 1;

    const headerRow = allRows[headerRowIdx] as unknown[];
    const dataStartIdx = headerRowIdx + 1;
    const dataRows = allRows.slice(dataStartIdx) as unknown[][];

    // === Xác định các cột theo keyword (không phân biệt dấu) ===
    const idxPhong = 0;    // cột A: phòng/khoa
    const idxName  = findIdx(headerRow, ["ho va ten", "ho ten", "ten nhan vien"]);
    const idxSoTK  = findIdx(headerRow, ["so tk", "tai khoan", "so tai khoan"]);
    const idxCong  = findIdxExact(headerRow, ["cong", "tong cong"]);
    const idxBHXH  = findIdx(headerRow, ["bhxh"]);
    const idxGiamTru = findIdx(headerRow, ["giam tru"]);
    const idxTNTT  = findIdx(headerRow, ["thu nhap tinh thue", "tntt"]);
    const idxThue  = findIdx(headerRow, ["thue tncn", "thue phai nop"]);

    // Email: không tìm được trong header (header có thể là số) → tự phát hiện từ data
    let idxEmail = findIdx(headerRow, ["email", "dia chi mail", "dia chi email"]);
    if (idxEmail === -1) {
      idxEmail = autoDetectEmailCol(dataRows, idxThue > 0 ? idxThue + 1 : 0);
    }

    if (idxName === -1) {
      return NextResponse.json(
        {
          error: `Không tìm thấy cột 'Họ và Tên' trong file. Header đang có: ${headerRow.map(toStr).join(" | ")}`,
        },
        { status: 400 }
      );
    }

    // Cột tên các khoản: từ sau soTK đến trước CỘNG
    const khoanStartIdx = (idxSoTK !== -1 ? idxSoTK : 3) + 1;
    const khoanEndIdx = idxCong !== -1 ? idxCong - 1 : idxName + 10;

    // Lấy tên khoản từ header — ưu tiên titleRow (row 0) nếu header trống
    const titleRow = (allRows[0] ?? []) as unknown[];
    const khoanHeaders: { idx: number; ten: string }[] = [];
    for (let c = khoanStartIdx; c <= khoanEndIdx; c++) {
      // Tên khoản lấy từ headerRow, nếu trống thì lấy từ titleRow
      let ten = toStr(headerRow[c]);
      if (!ten) ten = toStr(titleRow[c]);
      if (!ten) continue;
      // Rút gọn tên dài (lấy phần đầu trước \r\n hoặc ngày)
      ten = ten.split(/\r\n|\n/)[0].trim();
      khoanHeaders.push({ idx: c, ten });
    }

    const records: TaxRecord[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as unknown[];

      const name = toStr(row[idxName]);
      if (!name) continue;

      // Bỏ qua hàng tổng/tiêu đề phòng ban
      const nameNorm = normalizeVi(name);
      if (
        nameNorm.startsWith("cong") ||
        nameNorm.startsWith("tong") ||
        nameNorm.startsWith("phong") ||
        nameNorm.startsWith("ban ") ||
        nameNorm.startsWith("khoa") ||
        nameNorm.startsWith("to ") ||
        nameNorm.includes("giam doc")
      ) continue;

      // Lấy email — thử idxEmail trước, rồi idxEmail+1
      let email = idxEmail !== -1 ? toStr(row[idxEmail]) : "";
      if (!email.includes("@") && idxEmail !== -1 && idxEmail + 1 < row.length) {
        const alt = toStr(row[idxEmail + 1]);
        if (alt.includes("@")) email = alt;
      }
      if (!email || !email.includes("@")) continue;

      // Các khoản thu nhập
      const khoans: { ten: string; soTien: number }[] = [];
      for (const kh of khoanHeaders) {
        const soTien = toNum(row[kh.idx]);
        khoans.push({ ten: kh.ten, soTien });
      }

      records.push({
        phong: toStr(row[idxPhong]),
        tenNhanVien: name,
        soTK: toStr(idxSoTK !== -1 ? row[idxSoTK] : ""),
        email,
        khoans,
        cong:              toNum(idxCong    !== -1 ? row[idxCong]    : undefined),
        bhxh:              toNum(idxBHXH    !== -1 ? row[idxBHXH]    : undefined),
        giamTruGiaCanh:    toNum(idxGiamTru !== -1 ? row[idxGiamTru] : undefined),
        thuNhapTinhThue:   toNum(idxTNTT    !== -1 ? row[idxTNTT]    : undefined),
        thueTNCN:          toNum(idxThue    !== -1 ? row[idxThue]    : undefined),
        thang,
      });
    }

    return NextResponse.json({ success: true, total: records.length, records, thang });
  } catch (err) {
    console.error("[parse-tax-excel]", err);
    return NextResponse.json(
      { error: "Lỗi khi xử lý file: " + (err as Error).message },
      { status: 500 }
    );
  }
}
