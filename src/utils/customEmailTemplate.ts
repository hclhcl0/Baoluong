// ============================================================
// utils/customEmailTemplate.ts
// Sinh email HTML động theo các cột người dùng tự chọn
// ============================================================

import type { CustomRecord, ColumnMapping } from "@/types/salary";

export interface CustomEmailOptions {
  orgName?: string;
  emailTitle?: string;
  logoUrl?: string;
  footerText?: string;
  customMessage?: string;
  footerNote?: string;
  columnMapping: ColumnMapping;
}

/** Format giá trị ô: số → toLocaleString, còn lại giữ nguyên */
function fmtVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") {
    return v === 0 ? "0" : v.toLocaleString("vi-VN");
  }
  const n = parseFloat(String(v));
  if (!isNaN(n) && String(v).trim() !== "") {
    return n.toLocaleString("vi-VN");
  }
  return String(v);
}

export function generateCustomEmail(
  record: CustomRecord,
  opts: CustomEmailOptions
): string {
  const {
    orgName = "TRUNG TÂM KIỂM SOÁT BỆNH TẬT ĐÀ NẴNG",
    emailTitle = "Thông báo lương — CDC Đà Nẵng",
    logoUrl = "https://ksbtdanang.vn/assets/images/logo.png",
    footerText = "© CDC Đà Nẵng",
    customMessage,
    columnMapping,
  } = opts;

  const blueHdr = "#1565c0";
  const thLeft = `padding:10px 14px;text-align:left;font-size:13px;font-weight:600;color:#ffffff;background-color:${blueHdr};border:1px solid #1976d2;`;
  const thRight = `padding:10px 14px;text-align:right;font-size:13px;font-weight:600;color:#ffffff;background-color:${blueHdr};border:1px solid #1976d2;`;
  const tdLabel = `padding:9px 14px;text-align:left;font-size:13px;color:#333333;border:1px solid #cccccc;background-color:#ffffff;`;
  const tdVal = `padding:9px 14px;text-align:right;font-size:13px;color:#333333;border:1px solid #cccccc;background-color:#ffffff;`;
  const tdTotalL = `padding:10px 14px;text-align:left;font-size:14px;font-weight:700;color:#c62828;border:1px solid #cccccc;background-color:#fff3e0;`;
  const tdTotalV = `padding:10px 14px;text-align:right;font-size:14px;font-weight:700;color:#c62828;border:1px solid #cccccc;background-color:#fff3e0;`;

  // Sinh các hàng bảng từ displayCols, nhóm theo prefix nếu có
  let currentGroup = "";
  const tableRows = columnMapping.displayCols
    .filter((col) => col.key !== columnMapping.totalCol)
    .map((col) => {
      const val = record.data[col.key];
      const isTotal = col.key === columnMapping.totalCol;
      const lStyle = isTotal ? tdTotalL : tdLabel;
      const vStyle = isTotal ? tdTotalV : tdVal;

      let html = "";
      const parts = col.label.split(" - ");
      if (parts.length > 1) {
        const group = parts[0].trim();
        const subName = parts.slice(1).join(" - ").trim();
        
        if (group !== currentGroup) {
          currentGroup = group;
          html += `<tr><td colspan="2" style="padding:10px 14px;background-color:#e2e8f0;font-weight:700;color:#1e293b;font-size:13px;border:1px solid #cccccc;text-transform:uppercase;">${group}</td></tr>`;
        }
        
        html += `
      <tr>
        <td style="${lStyle}; padding-left: 24px;">${subName}</td>
        <td style="${vStyle}">${fmtVal(val)}</td>
      </tr>`;
      } else {
        currentGroup = ""; // Reset group for top-level items
        html += `
      <tr>
        <td style="${lStyle}">${col.label}</td>
        <td style="${vStyle}">${fmtVal(val)}</td>
      </tr>`;
      }
      
      return html;
    })
    .join("");

  // Hàng "Tổng thu nhập" ở cuối bảng (nếu có)
  let totalRow = "";
  if (columnMapping.totalCol && record.data[columnMapping.totalCol] !== undefined) {
    const totalLabel =
      columnMapping.displayCols.find((c) => c.key === columnMapping.totalCol)?.label ||
      columnMapping.totalCol;
    totalRow = `
      <tr>
        <td style="${tdTotalL}">${totalLabel}</td>
        <td style="${tdTotalV}">${fmtVal(record.data[columnMapping.totalCol])}</td>
      </tr>`;
  }

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${emailTitle} - ${record.tenNhanVien}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,'Helvetica Neue',sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;padding:20px 0;">
  <tr><td align="center">

    <table width="620" cellpadding="0" cellspacing="0" border="0"
      style="background-color:#ffffff;max-width:620px;width:100%;border:1px solid #dddddd;">

      <!-- HEADER -->
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
      <tr><td style="background-color:${blueHdr};height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

      <!-- BODY -->
      <tr>
        <td style="padding:24px 24px 8px 24px;">
          <p style="margin:0 0 16px 0;font-size:14px;color:#333333;">
            Kính gửi: Ông/Bà <strong>${record.tenNhanVien}</strong>
          </p>
          ${customMessage
            ? `<div style="margin:0 0 16px 0;font-size:13px;color:#1e293b;line-height:1.6;background-color:#f1f5f9;padding:14px;border-left:4px solid ${blueHdr};border-radius:4px;">${customMessage.replace(/\n/g, "<br/>")}</div>`
            : ""}
        </td>
      </tr>

      <!-- TABLE -->
      <tr>
        <td style="padding:0 24px 16px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
            <thead>
              <tr>
                <th style="${thLeft}">Nội dung</th>
                <th style="${thRight}">Giá trị</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
              ${totalRow}
            </tbody>
          </table>
        </td>
      </tr>

      <!-- NOTES -->
      ${opts.footerNote ? `
      <tr>
        <td style="padding:0 24px 12px 24px;">
          <div style="margin:0;font-size:13px;color:#555555;line-height:1.5;">
            ${opts.footerNote.replace(/\n/g, "<br/>")}
          </div>
        </td>
      </tr>
      ` : `
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
      `}

      <!-- Blue divider -->
      <tr><td style="background-color:${blueHdr};height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>

      <!-- FOOTER -->
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
