// ============================================================
// utils/taxEmailTemplate.ts — Email thông báo Thuế TNCN
// ============================================================

import type { TaxRecord } from "@/types/salary";

export interface TaxEmailOptions {
  orgName?: string;
  emailTitle?: string;
  logoUrl?: string;
  footerText?: string;
  customMessage?: string;
  /** Nếu true, hiển thị chi tiết từng khoản thu nhập */
  showKhoanDetail?: boolean;
}

function fmtMoney(v: number): string {
  if (v === 0) return "0";
  return v.toLocaleString("vi-VN");
}

export function generateTaxEmail(
  data: TaxRecord,
  opts: TaxEmailOptions = {}
): string {
  const {
    orgName = "TRUNG TÂM KIỂM SOÁT BỆNH TẬT ĐÀ NẴNG",
    emailTitle = `Thông báo Thuế Thu Nhập Cá Nhân tháng ${data.thang}`,
    logoUrl = "https://ksbtdanang.vn/assets/images/logo.png",
    footerText = "© CDC Đà Nẵng — Phòng Tài chính - Kế toán",
    customMessage,
    showKhoanDetail = true,
  } = opts;

  // ── Inline styles ───────────────────────────────────────────
  const blueHdr = "#1565c0";
  const thBase = `padding:10px 14px;text-align:center;font-size:13px;font-weight:600;color:#ffffff;background-color:${blueHdr};border:1px solid #1976d2;`;
  const thLeft = `padding:10px 14px;text-align:left;font-size:13px;font-weight:600;color:#ffffff;background-color:${blueHdr};border:1px solid #1976d2;`;
  const tdLabel = `padding:9px 14px;text-align:left;font-size:13px;color:#333333;border:1px solid #cccccc;background-color:#ffffff;`;
  const tdVal = `padding:9px 14px;text-align:right;font-size:13px;color:#333333;border:1px solid #cccccc;background-color:#ffffff;`;
  const tdTotalLabel = `padding:10px 14px;text-align:left;font-size:13px;font-weight:700;color:#333333;border:1px solid #cccccc;background-color:#f0f4ff;`;
  const tdTotalVal = `padding:10px 14px;text-align:right;font-size:13px;font-weight:700;color:#1565c0;border:1px solid #cccccc;background-color:#f0f4ff;`;
  const tdDeductLabel = `padding:9px 14px;text-align:left;font-size:13px;color:#555555;border:1px solid #cccccc;background-color:#fafafa;font-style:italic;`;
  const tdDeductVal = `padding:9px 14px;text-align:right;font-size:13px;color:#c62828;border:1px solid #cccccc;background-color:#fafafa;font-style:italic;`;
  const tdTaxLabel = `padding:11px 14px;text-align:left;font-size:14px;font-weight:700;color:#b71c1c;border:1px solid #ef9a9a;background-color:#ffebee;`;
  const tdTaxVal = `padding:11px 14px;text-align:right;font-size:15px;font-weight:700;color:#b71c1c;border:1px solid #ef9a9a;background-color:#ffebee;`;

  // ── Xây dựng các hàng khoản thu nhập ─────────────────────
  const tdSubHdr = `padding:8px 14px;text-align:left;font-size:11px;font-weight:700;color:#ffffff;background-color:#1976d2;border:1px solid #1565c0;letter-spacing:0.5px;text-transform:uppercase;`;

  // Hiển thị tất cả các khoản (kể cả khoản = 0) khi showKhoanDetail = true
  let khoanRows = "";
  if (showKhoanDetail && data.khoans.length > 0) {
    khoanRows =
      // Sub-header nhóm thu nhập
      `<tr><td colspan="2" style="${tdSubHdr}">💰 Các khoản thu nhập</td></tr>` +
      data.khoans
        .filter((k) => k.soTien > 0)
        .map(
          (k) =>
            `<tr>
               <td style="${tdLabel}">${k.ten}</td>
               <td style="${tdVal}">${fmtMoney(k.soTien)}</td>
             </tr>`
        )
        .join("");
  }

  const hasNoTax = data.thueTNCN === 0;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${emailTitle} - ${data.tenNhanVien}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,'Helvetica Neue',sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;padding:20px 0;">
  <tr><td align="center">

    <table width="620" cellpadding="0" cellspacing="0" border="0"
      style="background-color:#ffffff;max-width:620px;width:100%;border:1px solid #dddddd;">

      <!-- ═══ HEADER ═══ -->
      <tr>
        <td style="padding:24px 24px 12px 24px;text-align:center;background-color:#ffffff;">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo CDC" width="70" height="70" style="display:block;margin:0 auto 10px auto;border-radius:50%;border:2px solid ${blueHdr};" />` : ""}
          <p style="margin:0 0 4px 0;font-size:16px;font-weight:700;color:${blueHdr};letter-spacing:0.5px;text-transform:uppercase;">
            ${orgName}
          </p>
          <p style="margin:0;font-size:14px;font-weight:600;color:#444444;">
            ${emailTitle}
          </p>
        </td>
      </tr>

      <!-- Blue divider -->
      <tr>
        <td style="background-color:${blueHdr};height:4px;font-size:0;line-height:0;">&nbsp;</td>
      </tr>

      <!-- ═══ GREETING ═══ -->
      <tr>
        <td style="padding:20px 24px 8px 24px;">
          <p style="margin:0 0 16px 0;font-size:14px;color:#333333;line-height:1.7;">
            Phòng Tài chính kế toán kính gửi <strong>Anh/Chị ${data.tenNhanVien}</strong>
            thông tin thuế thu nhập cá nhân tháng <strong>${data.thang}</strong> như sau:
          </p>
          ${customMessage ? `<div style="margin:0 0 16px 0;font-size:13px;color:#1e293b;line-height:1.6;background-color:#f1f5f9;padding:14px;border-left:4px solid ${blueHdr};border-radius:4px;">${customMessage.replace(/\n/g, "<br/>")}</div>` : ""}
        </td>
      </tr>

      <!-- ═══ TABLE ═══ -->
      <tr>
        <td style="padding:0 24px 16px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
            <thead>
              <tr>
                <th style="${thLeft}" width="65%">Nội dung</th>
                <th style="${thBase}" width="35%">Số tiền (VNĐ)</th>
              </tr>
            </thead>
            <tbody>
              <!-- Các khoản thu nhập chi tiết -->
              ${showKhoanDetail ? khoanRows : ""}

              <!-- Tổng cộng -->
              ${showKhoanDetail ? `<tr><td colspan="2" style="${tdSubHdr}">📊 Tổng hợp</td></tr>` : ""}
              <tr>
                <td style="${tdTotalLabel}">TỔNG THU NHẬP</td>
                <td style="${tdTotalVal}">${fmtMoney(data.cong)}</td>
              </tr>

              <!-- Khoản khấu trừ -->
              ${showKhoanDetail ? `<tr><td colspan="2" style="${tdSubHdr}">➖ Các khoản khấu trừ</td></tr>` : ""}
              <tr>
                <td style="${tdDeductLabel}">(-) Bảo hiểm xã hội (BHXH)</td>
                <td style="${tdDeductVal}">${data.bhxh > 0 ? "- " + fmtMoney(data.bhxh) : "0"}</td>
              </tr>
              <tr>
                <td style="${tdDeductLabel}">(-) Giảm trừ gia cảnh</td>
                <td style="${tdDeductVal}">${data.giamTruGiaCanh > 0 ? "- " + fmtMoney(data.giamTruGiaCanh) : "0"}</td>
              </tr>

              <!-- Thu nhập tính thuế -->
              <tr>
                <td style="${tdTotalLabel}">THU NHẬP TÍNH THUẾ</td>
                <td style="${tdTotalVal}">${fmtMoney(data.thuNhapTinhThue > 0 ? data.thuNhapTinhThue : 0)}</td>
              </tr>

              <!-- Thuế TNCN -->
              <tr>
                <td style="${tdTaxLabel}">🧾 THUẾ TNCN PHẢI NỘP</td>
                <td style="${tdTaxVal}">${fmtMoney(data.thueTNCN)}</td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>

      <!-- ═══ NOTICE ═══ -->
      <tr>
        <td style="padding:0 24px 20px 24px;">
          <p style="margin:0 0 16px 0;font-size:13px;color:#555555;line-height:1.7;">
            Anh/Chị vui lòng kiểm tra thông tin, nếu có thắc mắc xin vui lòng phản hồi.
          </p>
          <p style="margin:0 0 4px 0;font-size:13px;color:#333333;">Trân trọng!</p>
        </td>
      </tr>

      <!-- ═══ SIGNATURE ═══ -->
      <tr>
        <td style="padding:0 24px 20px 24px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-right:16px;vertical-align:top;">
                <div style="width:3px;height:80px;background-color:${blueHdr};border-radius:2px;"></div>
              </td>
              <td style="vertical-align:top;">
                <p style="margin:0 0 3px 0;font-size:14px;font-weight:700;color:#1565c0;">Phan Thị Yến Ly</p>
                <p style="margin:0 0 3px 0;font-size:12px;color:#555555;">Kế toán thuế - Phòng Tài chính kế toán</p>
                <p style="margin:0 0 2px 0;font-size:12px;color:#555555;">📞 0948.997.315</p>
                <p style="margin:0 0 2px 0;font-size:12px;color:#555555;">✉️ <a href="mailto:yenlyphan2012@gmail.com" style="color:#1565c0;text-decoration:none;">yenlyphan2012@gmail.com</a></p>
                <p style="margin:0;font-size:12px;color:#555555;">🏥 Trung tâm Kiểm soát bệnh tật Thành phố Đà Nẵng</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Blue divider -->
      <tr>
        <td style="background-color:${blueHdr};height:3px;font-size:0;line-height:0;">&nbsp;</td>
      </tr>

      <!-- ═══ FOOTER ═══ -->
      <tr>
        <td style="padding:10px 24px;text-align:center;background-color:#f8f8f8;">
          <p style="margin:0;font-size:11px;color:#aaaaaa;">© Trung tâm Kiểm soát bệnh tật Thành phố Đà Nẵng — Thông tin thuế TNCN là thông tin cá nhân, đề nghị không chia sẻ.</p>
        </td>
      </tr>

    </table>

  </td></tr>
</table>

</body>
</html>`;
}
