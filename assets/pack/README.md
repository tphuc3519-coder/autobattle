# Gói phát hành — đã CHẺ NHỎ

Trang chơi (`play.html`) đọc thư mục này lúc mở:

- **`index.json`** — danh mục: mảnh nào, khoá nào, nặng bao nhiêu byte.
- **`spr.<nhân-vật>.json`** — ảnh của một nhân vật.
- **`sfx.<tên-ô>.json`** — một ô tiếng.
- **`bgm.<tên-ô>.json`** — một bài nhạc nền.

Ô nào người chơi đã tự có thì **gói không đè**. Chưa có thư mục này thì trang chơi vẫn
chạy bình thường bằng model vector và tiếng tự tạo.

## Cập nhật

```bash
# 1. Trang xưởng -> nút 📦 Xuất gói lên web chơi  ->  được pack.json
# 2. Chẻ nó ra (ghi thẳng vào thư mục này, tự xoá mảnh thừa):
python3 tools/split_pack.py ~/Downloads/pack.json
# 3. Xem git chỉ đổi đúng mấy mảnh mình vừa sửa:
git status --short assets/pack
git add assets/pack && git commit -m "cap nhat anh ginyu" && git push
```

**Chờ trang xưởng nạp xong gói cũ rồi mới bấm Xuất gói** — phải thấy dòng
`Đã nạp gói phát hành: N ảnh · M tiếng`. Bấm sớm là xuất ra gói thiếu, chẻ ra rồi commit
là mất phần cũ. Không chắc thì bấm **📥 Nạp thử gói** ép nạp lại.

## Vì sao chẻ

Trước đây là **một file `pack.json` 25 MB**. Ba chuyện cùng một gốc:

1. git không delta được JSON base64, nên mỗi lần xuất lại gói là repo phồng thêm nguyên
   25 MB **vĩnh viễn**. Chẻ ra thì đổi ảnh một nhân vật chỉ ghi lại mảnh của người đó.
2. Chrome **không cache nổi** một mục 25 MB (mỗi mục có trần cỡ) nên lần nào mở trang cũng
   tải lại từ đầu. Mảnh vài trăm KB thì cache ăn ngay.
3. GitHub chặn hẳn file trên 100 MB, và nút kéo thả trên web chặn ở 25 MB.

Vẫn còn đường lùi: site nào chỉ có `pack.json` một file (bản cũ, hoặc chép tay) thì trang
chơi vẫn đọc được như thường — `index.json` trước, `pack.json` sau.
