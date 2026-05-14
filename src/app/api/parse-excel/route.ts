import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import type { SalaryRecord } from "@/types/salary";

/** Đọc ô có thể là số hoặc chuỗi */
function readVal(v: unknown): number | string {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const s = String(v).trim();
  const n = parseFloat(s);
  return isNaN(n) ? s : n; // chuỗi chữ → trả nguyên, số → trả số
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
    
    // Đọc tất cả các hàng dưới dạng mảng để tìm hàng tiêu đề
    const allRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });
    
    // Tìm hàng tiêu đề (hàng chứa "Họ và tên" hoặc "Địa chỉ mail")
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(allRows.length, 10); i++) {
      const rowStr = JSON.stringify(allRows[i]).toLowerCase();
      if (rowStr.includes("họ và tên") || rowStr.includes("địa chỉ mail") || rowStr.includes("email")) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      return NextResponse.json({ error: "Không tìm thấy hàng tiêu đề hợp lệ trong file Excel. Vui lòng kiểm tra lại tên các cột." }, { status: 400 });
    }

    const headers = allRows[headerRowIndex] as string[];
    const subHeaders = allRows[headerRowIndex + 1] as string[]; // Hàng sub-header (nếu có)

    // Hàm tìm index cột dựa trên keyword
    const findCol = (keywords: string[], fromIndex = 0) => {
      return headers.findIndex((h, idx) => 
        idx >= fromIndex && keywords.some(k => String(h || "").toLowerCase().includes(k.toLowerCase()))
      );
    };

    // Tìm index cột dựa trên sub-header (ví dụ: "Hệ số lương" nằm dưới "Tháng 1")
    const findSubCol = (keyword: string, startSearchIdx: number) => {
      if (!subHeaders) return -1;
      for (let i = startSearchIdx; i < subHeaders.length; i++) {
        if (String(subHeaders[i] || "").toLowerCase().includes(keyword.toLowerCase())) return i;
      }
      return -1;
    };

    // Ánh xạ các cột chính
    const idxName = findCol(["Họ và tên", "TenNhanVien", "tenNhanVien"]);
    const idxEmail = findCol(["Địa chỉ mail", "email", "Email"]);
    const idxTotal = findCol(["Thành tiền", "tongThuNhap", "Tổng thu nhập"]);

    // Tìm các tháng (Tháng 1, 2, 3 thường là các cột lớn chứa sub-columns)
    const idxMonth1 = findCol(["Tháng 1", "Tháng 01", "heSoLieuT1"]);
    const idxMonth2 = findCol(["Tháng 2", "Tháng 02", "heSoLieuT2"], idxMonth1 + 1);
    const idxMonth3 = findCol(["Tháng 3", "Tháng 03", "heSoLieuT3"], idxMonth2 + 1);

    // Lấy dữ liệu từ các hàng sau tiêu đề
    const records: SalaryRecord[] = [];
    // Nếu có sub-header thì bắt đầu từ headerRowIndex + 2, ngược lại + 1
    const startDataIdx = subHeaders && JSON.stringify(subHeaders).includes("Hệ số") ? headerRowIndex + 2 : headerRowIndex + 1;

    for (let i = startDataIdx; i < allRows.length; i++) {
      const row = allRows[i];
      const name = String(row[idxName] || "").trim();
      const email = String(row[idxEmail] || "").trim();

      // --- LOGIC BỎ QUA DÒNG KHÔNG PHẢI NHÂN VIÊN ---
      // 1. Bỏ qua nếu tên trống
      if (!name) continue;
      
      // 2. Bỏ qua nếu là tên Phòng, Ban, Khoa, Tổ, Đội...
      const deptKeywords = ["Phòng", "Ban ", "Khoa", "Tổ ", "Đội "];
      const isDept = deptKeywords.some(k => name.toLowerCase().startsWith(k.toLowerCase())) || 
                     name.toLowerCase().includes("giám đốc");
      if (isDept) continue;

      // 3. Bỏ qua nếu không có email hoặc email không hợp lệ (phải có chữ @)
      if (!email || !email.includes("@")) continue;

      // --- TÌM CỘT XẾP LOẠI ---
      let idxXL1 = -1, idxXL2 = -1, idxXL3 = -1;
      const idxKqXepLoai = findCol(["Kết quả xếp loại", "Xếp loại"], idxMonth3 + 1);
      
      if (idxKqXepLoai !== -1 && subHeaders && String(subHeaders[idxKqXepLoai] || "").toLowerCase().includes("tháng")) {
        // Trường hợp file kế toán gốc: Header "Kết quả xếp loại", sub-header "Tháng 1", "Hệ số", v.v.
        idxXL1 = idxKqXepLoai;
        idxXL2 = idxKqXepLoai + 2;
        idxXL3 = idxKqXepLoai + 4;
      } else {
        // Trường hợp tìm trong sub-header
        idxXL1 = findSubCol("Tháng 1", idxMonth3 + 1);
        idxXL2 = findSubCol("Tháng 2", idxMonth3 + 1);
        idxXL3 = findSubCol("Tháng 3", idxMonth3 + 1);
        
        // Trường hợp dùng file mẫu do hệ thống sinh ra (header thẳng không gộp)
        if (idxXL1 === -1) idxXL1 = findCol(["xepLoaiT1", "Xếp loại tháng 1", "Tháng 1"], idxMonth3 + 1);
        if (idxXL2 === -1) idxXL2 = findCol(["xepLoaiT2", "Xếp loại tháng 2", "Tháng 2"], idxMonth3 + 1);
        if (idxXL3 === -1) idxXL3 = findCol(["xepLoaiT3", "Xếp loại tháng 3", "Tháng 3"], idxMonth3 + 1);
      }

      const xepLoaiT1 = String(row[idxXL1] || "");
      const xepLoaiT2 = String(row[idxXL2] || "");
      const xepLoaiT3 = String(row[idxXL3] || "");

      const heSoXepLoaiT1 = Number(readVal(row[idxXL1 + 1])) || 0;
      const heSoXepLoaiT2 = Number(readVal(row[idxXL2 + 1])) || 0;
      const heSoXepLoaiT3 = Number(readVal(row[idxXL3 + 1])) || 0;

      const tongHeSoT1 = Number(readVal(row[idxMonth1 + 3])) || 0;
      const tongHeSoT2 = Number(readVal(row[idxMonth2 + 3])) || 0;
      const tongHeSoT3 = Number(readVal(row[idxMonth3 + 3])) || 0;

      const thanhTienT1 = tongHeSoT1 * heSoXepLoaiT1 * 2340000;
      const thanhTienT2 = tongHeSoT2 * heSoXepLoaiT2 * 2340000;
      const thanhTienT3 = tongHeSoT3 * heSoXepLoaiT3 * 2340000;

      records.push({
        tenNhanVien: name,
        email: email,
        
        // Tháng 1
        heSoLieuT1: readVal(row[idxMonth1] || row[idxMonth1 + 1]),
        pcvkT1: readVal(row[idxMonth1 + 1]), 
        pccvT1: readVal(row[idxMonth1 + 2]),
        tongHeSoT1: tongHeSoT1,
        
        // Tháng 2
        heSoLieuT2: readVal(row[idxMonth2]),
        pcvkT2: readVal(row[idxMonth2 + 1]),
        pccvT2: readVal(row[idxMonth2 + 2]),
        tongHeSoT2: tongHeSoT2,

        // Tháng 3
        heSoLieuT3: readVal(row[idxMonth3]),
        pcvkT3: readVal(row[idxMonth3 + 1]),
        pccvT3: readVal(row[idxMonth3 + 2]),
        tongHeSoT3: tongHeSoT3,

        // Xếp loại & Thành tiền
        xepLoaiT1, xepLoaiT2, xepLoaiT3,
        heSoXepLoaiT1, heSoXepLoaiT2, heSoXepLoaiT3,
        thanhTienT1, thanhTienT2, thanhTienT3,

        tongThuNhap: readVal(row[idxTotal]),
      });
    }

    return NextResponse.json({ success: true, total: records.length, records });
  } catch (err) {
    console.error("[parse-excel]", err);
    return NextResponse.json(
      { error: "Lỗi khi xử lý file: " + (err as Error).message },
      { status: 500 }
    );
  }
}
