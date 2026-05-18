// ============================================================
// types/salary.ts
// ============================================================

export interface SalaryRecord {
  tenNhanVien: string;
  email: string;

  heSoLieuT1: number | string;
  heSoLieuT2: number | string;
  heSoLieuT3: number | string;

  /** Phụ cấp vượt khung */
  pcvkT1: number | string;
  pcvkT2: number | string;
  pcvkT3: number | string;

  /** Phụ cấp chức vụ */
  pccvT1: number | string;
  pccvT2: number | string;
  pccvT3: number | string;

  tongHeSoT1: number | string;
  tongHeSoT2: number | string;
  tongHeSoT3: number | string;

  xepLoaiT1: string;
  xepLoaiT2: string;
  xepLoaiT3: string;

  heSoXepLoaiT1: number;
  heSoXepLoaiT2: number;
  heSoXepLoaiT3: number;

  thanhTienT1: number;
  thanhTienT2: number;
  thanhTienT3: number;

  tongThuNhap: number | string;
}

export interface GmailAccount {
  id: string;
  user: string;
  appPassword: string;
}

export type SendStatus = "pending" | "sending" | "success" | "error";

export interface SendResult {
  tenNhanVien: string;
  email: string;
  status: SendStatus;
  sentVia?: string;
  error?: string;
}

export interface SendEmailsRequest {
  records: SalaryRecord[];
  accounts: GmailAccount[];
  subject?: string;
  batchSize?: number;
  batchDelayMs?: number;
}

export interface SendEmailsResponse {
  total: number;
  success: number;
  failed: number;
  results: SendResult[];
}

// ============================================================
// Tax (Thuế TNCN) types
// ============================================================

export interface TaxRecord {
  phong: string;          // Phòng/Khoa
  tenNhanVien: string;
  soTK: string;           // Số tài khoản
  email: string;

  // Các khoản thu nhập — tên cột thay đổi theo tháng nên lưu dạng mảng
  khoans: { ten: string; soTien: number }[];

  cong: number;           // Tổng cộng các khoản
  bhxh: number;           // BHXH khấu trừ
  giamTruGiaCanh: number; // Giảm trừ gia cảnh
  thuNhapTinhThue: number; // Thu nhập tính thuế
  thueTNCN: number;        // Thuế TNCN phải nộp

  thang: string;           // Ví dụ: "04/2026"
}

export interface TaxSendResult {
  tenNhanVien: string;
  email: string;
  status: SendStatus;
  sentVia?: string;
  error?: string;
}

// ============================================================
// Custom Excel Upload (chọn cột tùy chỉnh)
// ============================================================

/** Kết quả parse preview — trả về headers + vài dòng mẫu */
export interface ExcelPreview {
  headers: string[];                       // Tên cột từ file Excel
  rows: Record<string, unknown>[];         // Tối đa 5 dòng preview
  totalRows: number;                       // Tổng số dòng dữ liệu
}

/** Cấu hình ánh xạ cột mà người dùng chọn */
export interface ColumnMapping {
  nameCol: string;                                // Cột "Tên nhân viên" (bắt buộc)
  emailCol: string;                               // Cột "Email" (bắt buộc)
  displayCols: { key: string; label: string }[];  // Các cột hiển thị trong email
  totalCol?: string;                              // Cột "Tổng thu nhập" (highlight đỏ)
}

/** Record linh hoạt sau khi ánh xạ cột */
export interface CustomRecord {
  tenNhanVien: string;
  email: string;
  data: Record<string, unknown>;  // key=header gốc, value=giá trị ô
}

export interface CustomSendResult {
  tenNhanVien: string;
  email: string;
  status: SendStatus;
  sentVia?: string;
  error?: string;
}
