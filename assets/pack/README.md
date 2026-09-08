# Gói phát hành

Chép file `pack.json` xuất ra từ **trang xưởng** (`index.html` → nút **📦 Xuất gói lên web
chơi**) vào đúng thư mục này, rồi commit + push.

Trang chơi (`play.html`) đọc thẳng `assets/pack/pack.json` lúc mở:

- ô nào trong gói có ảnh / tiếng thì nạp vào;
- ô nào người chơi đã tự có thì **gói không đè**;
- chưa có file này thì trang chơi vẫn chạy bình thường bằng model vector và tiếng tự tạo.

Gói là JSON chứa ảnh base64 nên nặng hơn ảnh gốc chừng 33%. GitHub cảnh báo từ 50 MB và
chặn hẳn ở 100 MB — bộ ảnh to quá thì bớt khung hoạt ảnh, hoặc chuyển sang backend (xem
mục cuối của `README.md`).
