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
