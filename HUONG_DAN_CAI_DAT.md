# HƯỚNG DẪN ĐÓNG GÓI VÀ CHẠY ỨNG DỤNG TRÊN MÁY KHÁC

Chào bạn, đây là hướng dẫn để bạn có thể copy toàn bộ ứng dụng này sang máy tính khác (ví dụ máy của đồng nghiệp hoặc máy chủ nội bộ) để sử dụng.

## 1. Các bước chuẩn bị trên máy mới
Trước khi chạy ứng dụng, máy tính mới cần cài đặt **Node.js**:
- Truy cập: [https://nodejs.org/](https://nodejs.org/)
- Tải bản **LTS** (bản ổn định nhất, ví dụ: 22.x hoặc 24.x).
- Cài đặt như một phần mềm bình thường (bấm Next đến hết).

## 2. Cách copy ứng dụng
Bạn hãy copy **toàn bộ thư mục** `du an goi email` sang máy mới.
> **Lưu ý quan trọng:** Bạn KHÔNG CẦN copy thư mục `.next` và `node_modules` (nếu có) để giảm dung lượng file khi nén gửi đi. Khi chạy lần đầu, ứng dụng sẽ tự động tải lại các thành phần này.

## 3. Cách khởi chạy
Tại thư mục ứng dụng trên máy mới, bạn chỉ cần:
1. Tìm file có tên là `khoi-dong.bat`.
2. Double-click (nhấp đúp) vào file này.
3. Trong lần đầu tiên, màn hình đen (Terminal) sẽ hiện ra và tải một số thư viện cần thiết (mất khoảng 1-2 phút tùy tốc độ mạng).
4. Khi thấy dòng chữ thông báo: `Ready in ...` hoặc `Started server on ... http://localhost:3000`.
5. Bạn mở trình duyệt (Chrome, Edge...) và gõ địa chỉ: **http://localhost:3000** để sử dụng.

## 4. Một số lưu ý
- **Mạng internet:** Cần có kết nối internet để hệ thống gửi email qua Gmail.
- **Tài khoản Gmail:** Danh sách tài khoản Gmail bạn đã nhập sẽ được lưu riêng trên từng trình duyệt máy tính. Nếu sang máy mới, bạn hãy nhập lại danh sách email/mật khẩu ứng dụng một lần đầu (hệ thống sẽ tự lưu cho các lần sau).
- **File mẫu:** Trong thư mục `public` có sẵn file `mau-bang-luong.xlsx`. Bạn có thể tải trực tiếp trên giao diện web để làm mẫu nhập liệu.

Chúc bạn sử dụng phần mềm hiệu quả!
