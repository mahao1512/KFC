# 💻 File `index.html` (Mã nguồn Landing Page)

Lưu toàn bộ mã nguồn bên dưới thành file `index.html`:

```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KFC Vietnam - Vị Ngon Trên Từng Ngón Tay</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- PapaParse CDN để đọc file CSV -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js"></script>
    <style>
        .kfc-red { background-color: #e60023; }
        .text-kfc-red { color: #e60023; }
    </style>
</head>
<body class="bg-gray-50 text-gray-800 font-sans">

    <!-- Header / Navbar -->
    <header class="kfc-red text-white sticky top-0 z-50 shadow-md">
        <div class="container mx-auto px-4 py-3 flex justify-between items-center">
            <div class="flex items-center space-x-2">
                <span class="text-3xl font-extrabold tracking-wider">KFC</span>
            </div>
            <nav class="hidden md:flex space-x-6 font-semibold">
                <a href="#hero" class="hover:underline">Trang chủ</a>
                <a href="#menu" class="hover:underline">Thực đơn CSV</a>
                <a href="#about" class="hover:underline">Khuyến mãi</a>
            </nav>
            <button class="bg-white text-kfc-red font-bold px-4 py-2 rounded-full shadow hover:bg-gray-100 transition">
                Đặt hàng ngay
            </button>
        </div>
    </header>

    <!-- Hero Banner -->
    <section id="hero" class="bg-red-700 text-white py-16">
        <div class="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
            <div class="md:w-1/2 mb-8 md:mb-0">
                <h1 class="text-4xl md:text-6xl font-black mb-4">VỊ NGON TRÊN TỪNG NGÓN TAY</h1>
                <p class="text-lg mb-6">Thưởng thức gà rán giòn rụm chuẩn vị Colonel Sanders ngay hôm nay!</p>
                <a href="#menu" class="inline-block bg-yellow-400 text-red-900 font-bold text-lg px-8 py-3 rounded-full shadow-lg hover:bg-yellow-300 transition">
                    Khám phá Thực đơn
                </a>
            </div>
            <div class="md:w-1/2 flex justify-center">
                <!-- Hình ảnh SVG đơn giản, nhẹ -->
                <svg width="300" height="240" viewBox="0 0 300 240" class="w-full max-w-sm rounded-lg shadow-xl">
                    <rect width="300" height="240" rx="15" fill="#e60023"/>
                    <circle cx="150" cy="110" r="70" fill="#ffffff" />
                    <text x="150" y="105" text-anchor="middle" fill="#e60023" font-size="24" font-weight="bold">CRISPY CHICKEN</text>
                    <text x="150" y="135" text-anchor="middle" fill="#e60023" font-size="32">🍗🍗</text>
                </svg>
            </div>
        </div>
    </section>

    <!-- Menu Section (Đọc từ CSV) -->
    <section id="menu" class="py-12">
        <div class="container mx-auto px-4">
            <h2 class="text-3xl font-bold text-center mb-2 text-kfc-red">THỰC ĐƠN NỔI BẬT</h2>
            <p class="text-center text-gray-600 mb-8">(Dữ liệu load trực tiếp từ file <code class="bg-gray-200 px-2 py-1 rounded">menu.csv</code> không dùng backend)</p>
            
            <!-- Grid chứa các sản phẩm -->
            <div id="product-list" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- Sẽ được fill tự động bằng JS từ CSV -->
                <div class="col-span-full text-center py-8 text-gray-500">Đang tải dữ liệu thực đơn...</div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-gray-400 py-6 text-center text-sm">
        <div class="container mx-auto px-4">
            <p>© 2026 KFC Vietnam Demo Page (No-Backend Static CSV Reader).</p>
        </div>
    </footer>

    <!-- Script Parse CSV & Render -->
    <script>
        document.addEventListener("DOMContentLoaded", function() {
            // Load file menu.csv
            Papa.parse("menu.csv", {
                download: true,
                header: true,
                complete: function(results) {
                    renderMenu(results.data);
                },
                error: function(err) {
                    console.error("Lỗi đọc file CSV:", err);
                    document.getElementById("product-list").innerHTML = 
                        `<div class="col-span-full text-center text-red-500 font-semibold">
                            Không thể tải file menu.csv. Hãy đảm bảo bạn đang chạy dự án trên Local Server!
                        </div>`;
                }
            });
        });

        function renderMenu(items) {
            const container = document.getElementById("product-list");
            container.innerHTML = "";

            items.forEach(item => {
                // Bỏ qua dòng rỗng nếu có
                if (!item.name) return;

                const priceFormatted = Number(item.price).toLocaleString('vi-VN') + " đ";

                const cardHTML = `
                    <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition duration-300 flex flex-col justify-between border border-gray-100">
                        <img class="w-full h-48 object-cover" src="${item.image_url}" alt="${item.name}">
                        <div class="p-5 flex-grow">
                            <span class="text-xs font-bold text-white bg-red-500 px-2.5 py-1 rounded-full uppercase">${item.category}</span>
                            <h3 class="font-bold text-xl mt-2 text-gray-900">${item.name}</h3>
                            <p class="text-gray-600 text-sm mt-1">${item.description}</p>
                        </div>
                        <div class="p-5 pt-0 flex justify-between items-center mt-4">
                            <span class="text-lg font-extrabold text-kfc-red">${priceFormatted}</span>
                            <button class="kfc-red text-white font-bold px-4 py-2 rounded-lg hover:bg-red-700 transition">
                                + Thêm
                            </button>
                        </div>
                    </div>
                `;
                container.innerHTML += cardHTML;
            });
        }
    </script>
</body>
</html>
```