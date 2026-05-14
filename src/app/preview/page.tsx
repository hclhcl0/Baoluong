import { generateSalaryEmail } from "@/utils/emailTemplate";
import type { SalaryEmailData } from "@/utils/emailTemplate";

/** Dữ liệu mẫu để preview */
const SAMPLE: SalaryEmailData = {
  tenNhanVien: "Nguyễn Thị Bích Thuỳ",
  heSoLieuT1: 4.65, heSoLieuT2: 4.65, heSoLieuT3: 4.65,
  pcvkT1: 0, pcvkT2: 0, pcvkT3: 0,
  pccvT1: 0.5, pccvT2: 0.5, pccvT3: 0.5,
  tongHeSoT1: 5.2, tongHeSoT2: 5.2, tongHeSoT3: 5.2,
  xepLoaiT1: "Hoàn thành xuất sắc nhiệm vụ",
  xepLoaiT2: "Hoàn thành tốt nhiệm vụ",
  xepLoaiT3: "Hoàn thành tốt nhiệm vụ",
  heSoXepLoaiT1: 0.5,
  heSoXepLoaiT2: 0.3,
  heSoXepLoaiT3: 0.3,
  thanhTienT1: 5.2 * 0.5 * 2340000,
  thanhTienT2: 5.2 * 0.3 * 2340000,
  thanhTienT3: 5.2 * 0.3 * 2340000,
  tongThuNhap: 5.2 * 1.1 * 2340000,
};

export default function PreviewPage() {
  const html = generateSalaryEmail(SAMPLE);
  return (
    <div>
      <div style={{ background: "#1565c0", color: "white", padding: "8px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 12 }}>
        <span>📧 Preview mẫu email — dữ liệu mẫu</span>
        <a href="/" style={{ color: "#90caf9", marginLeft: "auto" }}>← Quay lại ứng dụng</a>
      </div>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
