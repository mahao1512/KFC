# 🍗 KFC Landing Page (Vibe Coding / No-Backend)

Dự án Landing Page quảng cáo cho thương hiệu gà rán KFC được xây dựng theo phong cách **Vibe Coding**: đơn giản, tối ưu, không dùng bất kỳ code backend (Node.js, Python, PHP...) nào.

---

## 📌 Kiến trúc & Công nghệ

1. **Frontend**: HTML5, CSS3 (Tailwind CSS qua CDN), JavaScript Vanilla (ES6+).
2. **Database**: File `menu.csv` chứa danh sách món ăn, giá tiền, hình ảnh SVG/Placeholder nhẹ.
3. **CSV Parsing**: Dùng thư viện [PapaParse](https://www.papaparse.com/) qua CDN để đọc và hiển thị dữ liệu từ file CSV trực tiếp từ trình duyệt.

---

## 📁 Cấu trúc thư mục đề xuất

```text
kfc-landing-page/
├── index.html       # File giao diện chính (HTML + CSS + JS)
├── menu.csv         # File cơ sở dữ liệu sản phẩm
└── README.md        # File hướng dẫn này
```

---

## 🚀 Hướng dẫn chạy dự án

1. **Bước 1**: Tạo file `menu.csv` từ nội dung trong file `menu_data.md`.
2. **Bước 2**: Tạo file `index.html` từ nội dung trong file `landing_page_code.md`.
3. **Bước 3**: Chạy file `index.html` qua một Local HTTP Server đơn giản (ví dụ: extension *Live Server* trong VS Code, hoặc lệnh `npx serve` / `python -m http.server`).
   > *Lưu ý: Do trình duyệt chặn fetch file cục bộ (`file://`), bạn cần mở qua Local Web Server để JavaScript đọc được file `.csv`.*