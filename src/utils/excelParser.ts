// ============================================================
// utils/excelParser.ts
// Parse file Excel/CSV và trả về mảng SalaryRecord[]
// ============================================================

import * as XLSX from "xlsx";
import type { SalaryRecord } from "@/types/salary";

/** Đọc Buffer (từ upload) và trả về danh sách SalaryRecord */
export function parseExcelBuffer(buffer: ArrayBuffer): SalaryRecord[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Chuyển sheet thành mảng object (hàng đầu là header)
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: 0,
  });

  return rows.map((row) => ({
    tenNhanVien: String(row["tenNhanVien"] ?? ""),
    email: String(row["email"] ?? ""),

    heSoLieuT1: Number(row["heSoLieuT1"] ?? 0),
    heSoLieuT2: Number(row["heSoLieuT2"] ?? 0),
    heSoLieuT3: Number(row["heSoLieuT3"] ?? 0),

    pcvkT1: Number(row["pcvkT1"] ?? 0),
    pcvkT2: Number(row["pcvkT2"] ?? 0),
    pcvkT3: Number(row["pcvkT3"] ?? 0),

    pccvT1: Number(row["pccvT1"] ?? 0),
    pccvT2: Number(row["pccvT2"] ?? 0),
    pccvT3: Number(row["pccvT3"] ?? 0),

    tongHeSoT1: Number(row["tongHeSoT1"] ?? 0),
    tongHeSoT2: Number(row["tongHeSoT2"] ?? 0),
    tongHeSoT3: Number(row["tongHeSoT3"] ?? 0),

    thanhTienT1: Number(row["thanhTienT1"] ?? 0),
    thanhTienT2: Number(row["thanhTienT2"] ?? 0),
    thanhTienT3: Number(row["thanhTienT3"] ?? 0),

    xepLoaiT1: String(row["xepLoaiT1"] ?? ""),
    xepLoaiT2: String(row["xepLoaiT2"] ?? ""),
    xepLoaiT3: String(row["xepLoaiT3"] ?? ""),

    heSoXepLoaiT1: Number(row["heSoXepLoaiT1"] ?? 0),
    heSoXepLoaiT2: Number(row["heSoXepLoaiT2"] ?? 0),
    heSoXepLoaiT3: Number(row["heSoXepLoaiT3"] ?? 0),

    tongThuNhap: Number(row["tongThuNhap"] ?? 0),
  }));
}
