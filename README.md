# 🍗 KFC Vietnam Landing Page (UI/UX Chuẩn Thương Hiệu & No-Backend CSV)

Trang web Landing Page quảng cáo và đặt món trực tuyến cho thương hiệu gà rán **KFC**, được thiết kế theo tiêu chuẩn **UI/UX hiện đại**, tối ưu trải nghiệm người dùng, sử dụng toàn bộ hình ảnh trong thư mục `image/` và kiến trúc đọc dữ liệu động từ tệp `menu.csv` (Vibe Coding / No-Backend).

---

## 🌟 Điểm nổi bật về UI/UX (Design & User Experience)

1. **Nhận diện thương hiệu & Thị giác (Brand Identity & Visuals)**:
   - Sử dụng bảng màu chuẩn KFC: Đỏ thương hiệu (`#E4002B`), Đỏ sẫm (`#B8001F`), Vàng kim (`#FFC72C`), Nền xám ấm thanh lịch (`#F8FAFC`).
   - Phông chữ hiện đại **Plus Jakarta Sans** kết hợp typography phân tầng rõ ràng, độ tương phản cao, chuẩn chuẩn Accessibility (WCAG).
   - Tích hợp logo KFC chính thức từ `image/KFC_logo-image.png` và hệ thống hình ảnh sản phẩm trong `image/products/`.

2. **Thanh thông báo & Điều hướng thông minh (Sticky Smart Navigation)**:
   - Thanh ưu đãi trên cùng với đồng hồ đếm ngược Flash Deal trực tiếp.
   - Thanh menu cố định (Sticky Header) với hiệu ứng làm mờ nền (Backdrop Blur).
   - Nút giỏ hàng nổi bật kèm hiệu ứng rung (Bounce animation) và bộ đếm số lượng thời gian thực.
   - Hỗ trợ đầy đủ màn hình di động (Responsive Drawer / Mobile Hamburger Menu).

3. **Hero Banner chuyển đổi cao (High Conversion Hero)**:
   - Thông điệp thương hiệu mạnh mẽ: *"Vị ngon trên từng ngón tay"*.
   - Huy hiệu chứng thực uy tín (⭐ 4.9/5 từ hơn 50.000+ thực khách, Giao nóng 30 phút, 100% Gà tươi VietGAP).
   - Khối hình ảnh nổi bật với các thẻ thông tin bồng bềnh (Floating Badges).

4. **Ưu Đãi & Mã Giảm Giá Một Chạm (One-Click Vouchers)**:
   - Hệ thống thẻ voucher (`KFCGIOL` giảm 20%, `FREESHIP` miễn phí ship, `PARTY50` giảm 50K).
   - Bấm là tự động sao chép mã vào bộ nhớ đệm và hiển thị Toast thông báo.

5. **Thực Đơn Động Từ `menu.csv` (Dynamic Menu Section)**:
   - Nạp dữ liệu sản phẩm trực tiếp từ tệp `menu.csv` bằng thư viện **PapaParse**.
   - Bộ lọc phân loại tức thì: *Tất cả*, *Gà rán giòn*, *Combo tiết kiệm*, *Burger*, *Món ăn kèm*, *Đồ uống & Tráng miệng*.
   - Thanh tìm kiếm trực tiếp (Live Instant Search) theo tên món, mô tả hoặc danh mục.
   - Sắp xếp linh hoạt (Theo giá tăng/giảm dần, theo bảng chữ cái).
   - Thẻ món ăn tương tác cao: hiệu ứng phóng to ảnh khi hover, nhãn ưu đãi (HOT, BEST SELLER), nút yêu thích (Wishlist), nút xem nhanh (Quick View).

6. **Giỏ hàng trượt (Slide-Over Cart Drawer) & Quy trình Đặt hàng (Checkout Flow)**:
   - Ngăn kéo trượt mượt mà từ cạnh phải màn hình.
   - Thanh tiến độ Miễn phí vận chuyển trực quan (đạt mốc 150.000₫ được Freeship).
   - Tùy chỉnh số lượng món ăn `[+]` `[-]`, xóa món, nhập mã giảm giá.
   - Form đặt hàng nhanh (Họ tên, SĐT, Địa chỉ, Ghi chú, Phương thức COD/MoMo/VNPay).
   - Màn hình thông báo đặt hàng thành công kèm mã đơn, thời gian giao dự kiến.

7. **Các thành phần gia tăng trải nghiệm người dùng**:
   - **Xem nhanh món ăn (Quick View Modal)**: Xem kích thước ảnh lớn, thông tin chi tiết và thành phần dinh dưỡng.
   - **Chuẩn cam kết KFC (Value Propositions)**: 4 giá trị cốt lõi (Gà tươi mỗi ngày, 11 loại thảo mộc, giao siêu tốc, chuẩn vệ sinh ISO).
   - **Đánh giá thực tế (Social Proof)**: Nhận xét khách quan từ khách hàng thân thiết.
   - **Tìm cửa hàng gần nhất (Store Locator)**: Lọc nhà hàng theo tỉnh/thành phố (TP.HCM, Hà Nội, Đà Nẵng, Bình Dương) kèm địa chỉ và hotline.
   - **Hỏi đáp thường gặp (FAQ Accordion)**.
   - **Nút Back-to-top & Hotline gọi nhanh**.

---

## 📁 Cấu trúc thư mục

```text
kfc-csv/
├── image/
│   ├── KFC_logo-image.png             # Logo thương hiệu KFC chính thức
│   └── products/
│       ├── ga-ran.svg                 # Gà rán giòn cay truyền thống
│       ├── ga-sot-cay.svg             # Gà rán sốt cay Hàn Quốc kèm mè rang
│       ├── khoai-tay-chien.jpg        # Khoai tây chiên giòn
│       ├── burger.svg                 # Burger tôm crispy / burger gà giòn
│       ├── combo-party.svg            # Combo nhóm party tưng bừng
│       ├── kem-sundae.svg             # Kem sundae dâu tây ngọt mát
│       └── pepsi.svg                  # Nước ngọt Pepsi có gas mát lạnh
├── index.html                         # Mã nguồn giao diện chính (HTML5 + Tailwind CSS + JS)
├── menu.csv                           # Cơ sở dữ liệu danh mục & món ăn
└── README.md                          # Tài liệu dự án
```

---

## 🚀 Hướng dẫn mở và trải nghiệm

### Cách 1: Mở trực tiếp (Không cần cài đặt bất kỳ server nào)
- Bạn chỉ cần nhấp đúp vào tệp `index.html` để mở ngay trên trình duyệt (Chrome, Edge, Firefox, Cốc Cốc, Safari...).
- *Hệ thống đã tích hợp sẵn cơ chế Fallback thông minh: Dù mở qua giao thức `file:///` (vốn bị trình duyệt chặn Fetch CORS), trang vẫn nạp dữ liệu mượt mà 100%!*

### Cách 2: Chạy qua Local HTTP Server (Khuyên dùng khi chỉnh sửa `menu.csv`)
Nếu bạn muốn thử nghiệm việc sửa đổi trực tiếp dữ liệu trong file `menu.csv` và xem thay đổi ngay lập tức:

- **Sử dụng VS Code Live Server**: Chuột phải vào `index.html` chọn **Open with Live Server**.
- **Sử dụng Node.js `npx serve`**:
  ```bash
  npx serve .
  ```
- **Sử dụng Python**:
  ```bash
  python -m http.server 8000
  ```
  Sau đó mở trình duyệt tại: `http://localhost:8000`
