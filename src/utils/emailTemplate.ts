// ============================================================
// utils/emailTemplate.ts — Mẫu email khớp thiết kế CDC Đà Nẵng
// ============================================================

export interface SalaryEmailData {
  tenNhanVien: string;

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

export interface EmailTemplateOptions {
  orgName?: string;
  quarterTitle?: string;
  logoUrl?: string;
  footerText?: string;
  customMessage?: string;
}

/** Format số → tiền VNĐ. Nếu là chuỗi, trả nguyên chuỗi. */
function fmtValue(v: number | string): string {
  if (typeof v === "string") {
    const n = parseFloat(v);
    if (isNaN(n)) return v; // trả chuỗi gốc (vd: "Hoàn thành tốt nhiệm vụ")
    return n.toLocaleString("vi-VN");
  }
  return v.toLocaleString("vi-VN");
}

function fmtCoef(v: number | string): string {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n) || n === 0) return "";
  return n % 1 === 0 ? String(n) : n.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

function fmtMoney(v: number | string): string {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return String(v);
  return n.toLocaleString("vi-VN");
}

export function generateSalaryEmail(
  data: SalaryEmailData,
  opts: EmailTemplateOptions = {}
): string {
  const {
    orgName = "TRUNG TÂM KIỂM SOÁT BỆNH TẬT ĐÀ NẴNG",
    quarterTitle = "Thông báo tiền lương tăng thêm Quý I/2026",
    logoUrl = "https://ksbtdanang.vn/assets/images/logo.png",
    footerText = "© CDC Đà Nẵng",
  } = opts;

  // ── Inline styles ────────────────────────────────────────────
  const blueHdr = "#1565c0";
  const thBase = `padding:10px 14px;text-align:center;font-size:13px;font-weight:600;color:#ffffff;background-color:${blueHdr};border:1px solid #1976d2;`;
  const thLeft = `padding:10px 14px;text-align:left;font-size:13px;font-weight:600;color:#ffffff;background-color:${blueHdr};border:1px solid #1976d2;`;
  const tdLabel = `padding:9px 14px;text-align:left;font-size:13px;color:#333333;border:1px solid #cccccc;background-color:#ffffff;`;
  const tdVal   = `padding:9px 14px;text-align:center;font-size:13px;color:#333333;border:1px solid #cccccc;background-color:#ffffff;`;
  const tdTotal = `padding:10px 14px;text-align:left;font-size:13px;font-weight:700;color:#333333;border:1px solid #cccccc;background-color:#f5f5f5;`;
  const tdTotalV= `padding:10px 14px;text-align:center;font-size:13px;font-weight:700;color:#333333;border:1px solid #cccccc;background-color:#f5f5f5;`;
  const tdGreenL= `padding:10px 14px;text-align:left;font-size:13px;font-weight:700;color:#1b5e20;border:1px solid #cccccc;background-color:#e8f5e9;`;
  const tdGreenV= `padding:10px 14px;text-align:center;font-size:13px;font-weight:600;color:#1b5e20;border:1px solid #cccccc;background-color:#e8f5e9;`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${quarterTitle} - ${data.tenNhanVien}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,'Helvetica Neue',sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;padding:20px 0;">
  <tr><td align="center">

    <table width="620" cellpadding="0" cellspacing="0" border="0"
      style="background-color:#ffffff;max-width:620px;width:100%;border:1px solid #dddddd;">

      <!-- ═══ HEADER ═══ -->
      <tr>
        <td style="padding:24px 24px 12px 24px;text-align:center;background-color:#ffffff;">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo CDC" width="70" height="70" style="display:block;margin:0 auto 10px auto;border-radius:50%;border:2px solid #1565c0;" />` : ""}
          <p style="margin:0 0 4px 0;font-size:16px;font-weight:700;color:${blueHdr};letter-spacing:0.5px;text-transform:uppercase;">
            ${orgName}
          </p>
          <p style="margin:0;font-size:14px;font-weight:600;color:#444444;">
            ${quarterTitle}
          </p>
        </td>
      </tr>

      <!-- Blue divider -->
      <tr>
        <td style="background-color:${blueHdr};height:4px;font-size:0;line-height:0;">&nbsp;</td>
      </tr>

      <!-- ═══ BODY ═══ -->
      <tr>
        <td style="padding:24px 24px 8px 24px;">
          <p style="margin:0 0 16px 0;font-size:14px;color:#333333;">
            Kính gửi: <strong>${data.tenNhanVien}</strong>
          </p>
          ${opts.customMessage ? `<div style="margin:0 0 16px 0;font-size:13px;color:#1e293b;line-height:1.6;background-color:#f1f5f9;padding:14px;border-left:4px solid ${blueHdr};border-radius:4px;">${opts.customMessage.replace(/\n/g, '<br/>')}</div>` : ''}
        </td>
      </tr>

      <!-- ═══ TABLE ═══ -->
      <tr>
        <td style="padding:0 24px 16px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
            <thead>
              <tr>
                <th style="${thLeft}">Nội dung</th>
                <th style="${thBase}">Tháng 1</th>
                <th style="${thBase}">Tháng 2</th>
                <th style="${thBase}">Tháng 3</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="${tdLabel}">Hệ số lương</td>
                <td style="${tdVal}">${fmtCoef(data.heSoLieuT1)}</td>
                <td style="${tdVal}">${fmtCoef(data.heSoLieuT2)}</td>
                <td style="${tdVal}">${fmtCoef(data.heSoLieuT3)}</td>
              </tr>
              <tr>
                <td style="${tdLabel}">Phụ cấp vượt khung</td>
                <td style="${tdVal}">${fmtCoef(data.pcvkT1)}</td>
                <td style="${tdVal}">${fmtCoef(data.pcvkT2)}</td>
                <td style="${tdVal}">${fmtCoef(data.pcvkT3)}</td>
              </tr>
              <tr>
                <td style="${tdLabel}">Phụ cấp chức vụ</td>
                <td style="${tdVal}">${fmtCoef(data.pccvT1)}</td>
                <td style="${tdVal}">${fmtCoef(data.pccvT2)}</td>
                <td style="${tdVal}">${fmtCoef(data.pccvT3)}</td>
              </tr>
              <tr>
                <td style="${tdTotal}">Tổng hệ số</td>
                <td style="${tdTotalV}">${fmtCoef(data.tongHeSoT1)}</td>
                <td style="${tdTotalV}">${fmtCoef(data.tongHeSoT2)}</td>
                <td style="${tdTotalV}">${fmtCoef(data.tongHeSoT3)}</td>
              </tr>
              <tr>
                <td style="${tdLabel}">Xếp loại</td>
                <td style="${tdVal}">${fmtValue(data.xepLoaiT1)}</td>
                <td style="${tdVal}">${fmtValue(data.xepLoaiT2)}</td>
                <td style="${tdVal}">${fmtValue(data.xepLoaiT3)}</td>
              </tr>
              <tr>
                <td style="${tdLabel}">Hệ số xếp loại</td>
                <td style="${tdVal}">${fmtCoef(data.heSoXepLoaiT1)}</td>
                <td style="${tdVal}">${fmtCoef(data.heSoXepLoaiT2)}</td>
                <td style="${tdVal}">${fmtCoef(data.heSoXepLoaiT3)}</td>
              </tr>
              <tr>
                <td style="${tdGreenL}">Thành tiền</td>
                <td style="${tdGreenV}">${fmtMoney(data.thanhTienT1)}</td>
                <td style="${tdGreenV}">${fmtMoney(data.thanhTienT2)}</td>
                <td style="${tdGreenV}">${fmtMoney(data.thanhTienT3)}</td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>

      <!-- ═══ TOTAL ═══ -->
      <tr>
        <td style="padding:0 24px 16px 24px;text-align:right;">
          <p style="margin:0;font-size:15px;font-weight:700;color:#c62828;">
            Tổng thu nhập: ${fmtMoney(data.tongThuNhap)}
          </p>
        </td>
      </tr>

      <!-- ═══ NOTES ═══ -->
      <tr>
        <td style="padding:0 24px 12px 24px;">
          <p style="margin:0 0 6px 0;font-size:13px;color:#555555;">
            Vui lòng kiểm tra lại thông tin. Nếu có sai sót, vui lòng phản hồi lại email này.
          </p>
          <p style="margin:0;font-size:12px;color:#888888;font-style:italic;">
            *Thông tin lương là thông tin cá nhân, đề nghị không chia sẻ.
          </p>
        </td>
      </tr>

      <!-- Blue divider -->
      <tr>
        <td style="background-color:${blueHdr};height:3px;font-size:0;line-height:0;">&nbsp;</td>
      </tr>

      <!-- ═══ FOOTER ═══ -->
      <tr>
        <td style="padding:12px 24px;text-align:center;background-color:#f8f8f8;">
          <p style="margin:0;font-size:12px;color:#888888;">${footerText}</p>
        </td>
      </tr>

    </table>

  </td></tr>
</table>

</body>
</html>`;
}
