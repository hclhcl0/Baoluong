import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

// ============================================================
// /api/preview-excel
// Nhận file Excel → trả về headers + vài dòng mẫu
// ============================================================

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

    // Đọc tất cả dòng dưới dạng mảng thô để tìm header
    const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

    // Tìm hàng header đầu tiên có ít nhất 2 ô không trống
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(allRows.length, 15); i++) {
      const row = allRows[i] as unknown[];
      const nonEmpty = row.filter((c) => String(c || "").trim() !== "").length;
      if (nonEmpty >= 2) {
        headerRowIndex = i;
        break;
      }
    }

    const topRow = (allRows[headerRowIndex] as unknown[] || []).map(h => String(h || "").trim());
    const nextRow = (allRows[headerRowIndex + 1] as unknown[] || []).map(h => String(h || "").trim());

    // Phát hiện nếu có dòng sub-header (Merge cell ở dòng trên)
    // Nếu dòng trên trống (do merge) mà dòng dưới có dữ liệu -> là sub-header
    let isSubHeader = false;
    let currentTop = "";
    const maxLen = Math.max(topRow.length, nextRow.length);
    for (let i = 0; i < maxLen; i++) {
      const t = topRow[i] || "";
      const n = nextRow[i] || "";
      if (t !== "") currentTop = t;
      if (t === "" && currentTop !== "" && n !== "") {
        isSubHeader = true;
        break;
      }
    }

    const headerMap: { index: number; name: string }[] = [];
    currentTop = "";
    for (let i = 0; i < maxLen; i++) {
      const t = topRow[i] || "";
      const n = nextRow[i] || "";
      
      if (t !== "") currentTop = t; // Kế thừa giá trị merge cell
      
      let headerName = currentTop;
      if (isSubHeader && n !== "") {
        if (currentTop && currentTop !== n) {
          headerName = `${currentTop} - ${n}`;
        } else {
          headerName = n;
        }
      }
      
      if (headerName !== "" && !headerMap.some(h => h.name === headerName)) {
        headerMap.push({ index: i, name: headerName });
      }
    }

    const headers = headerMap.map((h) => h.name);

    // Lấy tối đa 5 dòng dữ liệu để preview (bỏ qua hàng header)
    // Nếu có sub-header thì bỏ qua thêm 1 hàng
    const dataStartIdx = headerRowIndex + (isSubHeader ? 2 : 1);
    const previewRaw = allRows.slice(dataStartIdx, dataStartIdx + 5) as unknown[][];
    const previewRows: Record<string, unknown>[] = previewRaw.map((row) => {
      const obj: Record<string, unknown> = {};
      headerMap.forEach(({ index, name }) => {
        obj[name] = (row as unknown[])[index] ?? "";
      });
      return obj;
    });

    // Tổng số dòng dữ liệu (không kể header)
    const totalRows = Math.max(0, allRows.length - dataStartIdx);

    return NextResponse.json({
      success: true,
      headers,
      rows: previewRows,
      totalRows,
      headerRowIndex,
      isSubHeader, // Trả về để client biết gửi đúng số liệu
    });
  } catch (err) {
    console.error("[preview-excel]", err);
    return NextResponse.json(
      { error: "Lỗi khi đọc file: " + (err as Error).message },
      { status: 500 }
    );
  }
}
