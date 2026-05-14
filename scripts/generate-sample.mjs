/**
 * Chạy: node scripts/generate-sample.mjs
 * Tạo file mẫu Excel tại public/mau-bang-luong.xlsx
 */
import * as XLSX from "xlsx";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public");
mkdirSync(outDir, { recursive: true });

// ── Dữ liệu mẫu ────────────────────────────────────────────
const rows = [
  {
    tenNhanVien: "Nguyễn Đại Vĩnh",
    email: "vinhnd@danang.gov.vn",
    heSoLieuT1: 5.42, pcvkT1: 0, pccvT1: 1.0, tongHeSoT1: 6.42,
    heSoLieuT2: 5.42, pcvkT2: 0, pccvT2: 1.0, tongHeSoT2: 6.42,
    heSoLieuT3: 5.42, pcvkT3: 0, pccvT3: 1.0, tongHeSoT3: 6.42,
    xepLoaiT1: "Hoàn thành xuất sắc nhiệm vụ", heSoXepLoaiT1: 0.5, thanhTienT1: 6.42 * 0.5 * 2340000,
    xepLoaiT2: "Hoàn thành tốt nhiệm vụ", heSoXepLoaiT2: 0.3, thanhTienT2: 6.42 * 0.3 * 2340000,
    xepLoaiT3: "Hoàn thành tốt nhiệm vụ", heSoXepLoaiT3: 0.3, thanhTienT3: 6.42 * 0.3 * 2340000,
    tongThuNhap: (6.42*0.5 + 6.42*0.3 + 6.42*0.3) * 2340000,
  },
  {
    tenNhanVien: "Lê Thành Chung",
    email: "chungle1975@gmail.com",
    heSoLieuT1: 6.44, pcvkT1: 0, pccvT1: 0.8, tongHeSoT1: 7.24,
    heSoLieuT2: 6.44, pcvkT2: 0, pccvT2: 0.8, tongHeSoT2: 7.24,
    heSoLieuT3: 6.44, pcvkT3: 0, pccvT3: 0.8, tongHeSoT3: 7.24,
    thanhTienT1: "Hoàn thành tốt nhiệm vụ",
    thanhTienT2: "Hoàn thành tốt nhiệm vụ",
    thanhTienT3: "Hoàn thành tốt nhiệm vụ",
    tongThuNhap: 15747448,
  },
  {
    tenNhanVien: "Võ Trung Hoàng",
    email: "vctruong002@gmail.com",
    heSoLieuT1: 4.74, pcvkT1: 0, pccvT1: 0.8, tongHeSoT1: 5.54,
    heSoLieuT2: 4.74, pcvkT2: 0, pccvT2: 0.8, tongHeSoT2: 5.54,
    heSoLieuT3: 4.74, pcvkT3: 0, pccvT3: 0.8, tongHeSoT3: 5.54,
    thanhTienT1: "Hoàn thành tốt nhiệm vụ",
    thanhTienT2: "Hoàn thành tốt nhiệm vụ",
    thanhTienT3: "Hoàn thành tốt nhiệm vụ",
    tongThuNhap: 12142000,
  },
  {
    tenNhanVien: "Trần Liên",
    email: "liennd@danang.gov.vn",
    heSoLieuT1: 5.08, pcvkT1: 0, pccvT1: 0.6, tongHeSoT1: 5.68,
    heSoLieuT2: 5.08, pcvkT2: 0, pccvT2: 0.6, tongHeSoT2: 5.68,
    heSoLieuT3: 5.08, pcvkT3: 0, pccvT3: 0.6, tongHeSoT3: 5.68,
    thanhTienT1: "Hoàn thành tốt nhiệm vụ",
    thanhTienT2: "Hoàn thành tốt nhiệm vụ",
    thanhTienT3: "Hoàn thành tốt nhiệm vụ",
    tongThuNhap: 11902000,
  },
  {
    tenNhanVien: "Lưu Thị Mai",
    email: "mailuu1973@gmail.com",
    heSoLieuT1: 5.21, pcvkT1: 0, pccvT1: 0.5, tongHeSoT1: 5.71,
    heSoLieuT2: 5.21, pcvkT2: 0, pccvT2: 0.5, tongHeSoT2: 5.71,
    heSoLieuT3: 5.21, pcvkT3: 0, pccvT3: 0.5, tongHeSoT3: 5.71,
    thanhTienT1: "Hoàn thành tốt nhiệm vụ",
    thanhTienT2: "Hoàn thành tốt nhiệm vụ",
    thanhTienT3: "Hoàn thành tốt nhiệm vụ",
    tongThuNhap: 11548500,
  },
  {
    tenNhanVien: "Nguyễn Thị Hoàng Việt",
    email: "hoangword070@gmail.com",
    heSoLieuT1: 3.99, pcvkT1: 0, pccvT1: 0.5, tongHeSoT1: 4.49,
    heSoLieuT2: 3.99, pcvkT2: 0, pccvT2: 0.5, tongHeSoT2: 4.49,
    heSoLieuT3: 3.99, pcvkT3: 0, pccvT3: 0.5, tongHeSoT3: 4.49,
    thanhTienT1: "Hoàn thành tốt nhiệm vụ",
    thanhTienT2: "Hoàn thành tốt nhiệm vụ",
    thanhTienT3: "Hoàn thành tốt nhiệm vụ",
    tongThuNhap: 7384620,
  },
  {
    tenNhanVien: "Nguyễn Thị Ly",
    email: "nguyenly2910@gmail.com",
    heSoLieuT1: 4.32, pcvkT1: 0, pccvT1: 0, tongHeSoT1: 4.32,
    heSoLieuT2: 4.32, pcvkT2: 0, pccvT2: 0, tongHeSoT2: 4.32,
    heSoLieuT3: 4.32, pcvkT3: 0, pccvT3: 0, tongHeSoT3: 4.32,
    thanhTienT1: "Hoàn thành tốt nhiệm vụ",
    thanhTienT2: "Hoàn thành tốt nhiệm vụ",
    thanhTienT3: "Hoàn thành tốt nhiệm vụ",
    tongThuNhap: 9104000,
  },
  {
    tenNhanVien: "Lê Thị Bích Vân",
    email: "bichvan_cdcdn@gmail.com",
    heSoLieuT1: 3.66, pcvkT1: 0, pccvT1: 0, tongHeSoT1: 3.66,
    heSoLieuT2: 3.66, pcvkT2: 0, pccvT2: 0, tongHeSoT2: 3.66,
    heSoLieuT3: 3.66, pcvkT3: 0, pccvT3: 0, tongHeSoT3: 3.66,
    thanhTienT1: "Hoàn thành tốt nhiệm vụ",
    thanhTienT2: "Hoàn thành tốt nhiệm vụ",
    thanhTienT3: "Hoàn thành tốt nhiệm vụ",
    tongThuNhap: 7012000,
  },
  {
    tenNhanVien: "Đoàn Thị Tuyền",
    email: "dangtuyena98@gmail.com",
    heSoLieuT1: 3.33, pcvkT1: 0, pccvT1: 0, tongHeSoT1: 3.33,
    heSoLieuT2: 3.33, pcvkT2: 0, pccvT2: 0, tongHeSoT2: 3.33,
    heSoLieuT3: 3.33, pcvkT3: 0, pccvT3: 0, tongHeSoT3: 3.33,
    thanhTienT1: "Hoàn thành tốt nhiệm vụ",
    thanhTienT2: "Hoàn thành tốt nhiệm vụ",
    thanhTienT3: "Hoàn thành tốt nhiệm vụ",
    tongThuNhap: 8021000,
  },
  {
    tenNhanVien: "Nguyễn Thị Quỳnh Thi",
    email: "thinhq5dc@gmail.com",
    heSoLieuT1: 3.99, pcvkT1: 0, pccvT1: 0, tongHeSoT1: 3.99,
    heSoLieuT2: 3.99, pcvkT2: 0, pccvT2: 0, tongHeSoT2: 3.99,
    heSoLieuT3: 3.99, pcvkT3: 0, pccvT3: 0, tongHeSoT3: 3.99,
    thanhTienT1: "Hoàn thành tốt nhiệm vụ",
    thanhTienT2: "Hoàn thành tốt nhiệm vụ",
    thanhTienT3: "Hoàn thành tốt nhiệm vụ",
    tongThuNhap: 6802540,
  },
  {
    tenNhanVien: "Lê Thị Thanh Vân",
    email: "thanvan2303@gmail.com",
    heSoLieuT1: 4.0, pcvkT1: 0, pccvT1: 0, tongHeSoT1: 4.0,
    heSoLieuT2: 4.0, pcvkT2: 0, pccvT2: 0, tongHeSoT2: 4.0,
    heSoLieuT3: 4.0, pcvkT3: 0, pccvT3: 0, tongHeSoT3: 4.0,
    thanhTienT1: "Hoàn thành tốt nhiệm vụ",
    thanhTienT2: "Hoàn thành tốt nhiệm vụ",
    thanhTienT3: "Hoàn thành tốt nhiệm vụ",
    tongThuNhap: 6484386,
  },
  {
    tenNhanVien: "Huỳnh Thị Hoàng Tra",
    email: "hoangtra02@gmail.com",
    heSoLieuT1: 3.0, pcvkT1: 0, pccvT1: 0, tongHeSoT1: 3.0,
    heSoLieuT2: 3.0, pcvkT2: 0, pccvT2: 0, tongHeSoT2: 3.0,
    heSoLieuT3: 3.0, pcvkT3: 0, pccvT3: 0, tongHeSoT3: 3.0,
    thanhTienT1: "Hoàn thành tốt nhiệm vụ",
    thanhTienT2: "Hoàn thành tốt nhiệm vụ",
    thanhTienT3: "Hoàn thành tốt nhiệm vụ",
    tongThuNhap: 6318000,
  },
];

// ── Tạo workbook ────────────────────────────────────────────
const wb = XLSX.utils.book_new();

// Sheet 1: Dữ liệu thực tế (để import vào app)
const ws = XLSX.utils.json_to_sheet(rows, {
  header: [
    "tenNhanVien", "email",
    "heSoLieuT1", "pcvkT1", "pccvT1", "tongHeSoT1",
    "heSoLieuT2", "pcvkT2", "pccvT2", "tongHeSoT2",
    "heSoLieuT3", "pcvkT3", "pccvT3", "tongHeSoT3",
    "xepLoaiT1", "heSoXepLoaiT1", "thanhTienT1",
    "xepLoaiT2", "heSoXepLoaiT2", "thanhTienT2",
    "xepLoaiT3", "heSoXepLoaiT3", "thanhTienT3",
    "tongThuNhap",
  ],
});

// Đặt độ rộng cột
ws["!cols"] = [
  { wch: 25 }, // tenNhanVien
  { wch: 30 }, // email
  { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, // T1
  { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, // T2
  { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, // T3
  { wch: 30 }, { wch: 30 }, { wch: 30 }, // thanhTien
  { wch: 15 }, // tongThuNhap
];

XLSX.utils.book_append_sheet(wb, ws, "DanhSachLuong");

// Sheet 2: Hướng dẫn cột
const guide = XLSX.utils.aoa_to_sheet([
  ["TÊN CỘT (PHẢI GIỮ NGUYÊN)", "Ý NGHĨA", "KIỂU DỮ LIỆU", "VÍ DỤ"],
  ["tenNhanVien", "Họ và tên nhân viên", "Chữ", "Nguyễn Văn A"],
  ["email", "Địa chỉ email nhận lương", "Email", "nvana@gmail.com"],
  ["heSoLieuT1", "Hệ số lương tháng 1", "Số", "4.65"],
  ["pcvkT1", "Phụ cấp vượt khung tháng 1", "Số (0 nếu không có)", "0"],
  ["pccvT1", "Phụ cấp chức vụ tháng 1", "Số (0 nếu không có)", "0.5"],
  ["tongHeSoT1", "Tổng hệ số tháng 1", "Số", "5.15"],
  ["heSoLieuT2", "Hệ số lương tháng 2", "Số", "4.65"],
  ["pcvkT2", "Phụ cấp vượt khung tháng 2", "Số", "0"],
  ["pccvT2", "Phụ cấp chức vụ tháng 2", "Số", "0.5"],
  ["tongHeSoT2", "Tổng hệ số tháng 2", "Số", "5.15"],
  ["heSoLieuT3", "Hệ số lương tháng 3", "Số", "4.65"],
  ["pcvkT3", "Phụ cấp vượt khung tháng 3", "Số", "0"],
  ["pccvT3", "Phụ cấp chức vụ tháng 3", "Số", "0.5"],
  ["tongHeSoT3", "Tổng hệ số tháng 3", "Số", "5.15"],
  ["xepLoaiT1", "Xếp loại tháng 1", "Chữ", "Hoàn thành xuất sắc nhiệm vụ"],
  ["heSoXepLoaiT1", "Hệ số xếp loại tháng 1", "Số", "0.5"],
  ["thanhTienT1", "Thành tiền tháng 1", "Số", "7511400"],
  ["xepLoaiT2", "Xếp loại tháng 2", "Chữ", "Hoàn thành tốt nhiệm vụ"],
  ["heSoXepLoaiT2", "Hệ số xếp loại tháng 2", "Số", "0.3"],
  ["thanhTienT2", "Thành tiền tháng 2", "Số", "4506840"],
  ["xepLoaiT3", "Xếp loại tháng 3", "Chữ", "Hoàn thành tốt nhiệm vụ"],
  ["heSoXepLoaiT3", "Hệ số xếp loại tháng 3", "Số", "0.3"],
  ["thanhTienT3", "Thành tiền tháng 3", "Số", "4506840"],
  ["tongThuNhap", "Tổng thu nhập cả quý (VNĐ)", "Số", "16525080"],
]);
guide["!cols"] = [{ wch: 20 }, { wch: 35 }, { wch: 20 }, { wch: 35 }];
XLSX.utils.book_append_sheet(wb, guide, "HuongDan");

// Xuất file
const outPath = join(outDir, "mau-bang-luong.xlsx");
XLSX.writeFile(wb, outPath);
console.log("✅ Đã tạo file mẫu:", outPath);
