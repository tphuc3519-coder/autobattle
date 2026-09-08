#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dựng `play.html` — TRANG CHƠI công khai — từ `index.html` (trang XƯỞNG).

    python3 tools/mk_play.py

Hai trang **dùng chung một engine**: `play.html` chỉ là `index.html` đã bị cắt mấy khối
đánh dấu `<!--STUDIO-->…<!--/STUDIO-->` (bảng dán ảnh, bảng dán tiếng, ô chỉnh máu/màu,
nút ghi hình, dãy nút thử) và được đặt sẵn `window.ARCADE=1` để engine bật vỏ arcade:
màn tiêu đề → chọn nhân vật → chọn màn → đánh.

Ba luật, đừng nới ra:
1. **`index.html` là nguồn duy nhất.** Đừng sửa tay `play.html` — chạy lại script này.
   `t_play.js` dựng lại rồi so từng byte, sửa tay là test đổ ngay.
2. **Chỉ CẮT, không viết thêm HTML.** Vỏ arcade (`#arcTitle`, `#arcOver`, lưới chọn màn)
   nằm sẵn trong `index.html` và tự tắt khi không có `window.ARCADE` — như vậy chỉ có một
   chỗ để sửa giao diện.
3. Trang chơi **không có bảng dán** nên ảnh/tiếng đi qua gói `assets/pack/pack.json`
   (nút "📦 Xuất gói lên web chơi" bên xưởng).
"""
import io, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'index.html')
OUT = os.path.join(ROOT, 'play.html')

src = io.open(SRC, encoding='utf-8').read()

n = src.count('<!--STUDIO-->')
if n == 0 or n != src.count('<!--/STUDIO-->'):
    sys.exit('index.html thiếu mốc <!--STUDIO-->…<!--/STUDIO--> (thấy %d / %d)'
             % (n, src.count('<!--/STUDIO-->')))

out = re.sub(r'<!--STUDIO-->.*?<!--/STUDIO-->', '', src, flags=re.S)

# tiêu đề trang + dòng nhắc đây là bản dựng
out = out.replace('<title>', '<!-- ĐỪNG SỬA TAY: dựng bằng tools/mk_play.py từ index.html -->\n<title>', 1)
out = re.sub(r'<title>.*?</title>', '<title>Đấu Trường Chiba — Auto Battle Arena</title>', out, count=1, flags=re.S)

# bật vỏ arcade: đặt cờ TRƯỚC thẻ script của engine
out = out.replace('<body>', '<body>\n<script>window.ARCADE=1;</script>', 1)

io.open(OUT, 'w', encoding='utf-8').write(out)
print('play.html: %d dòng (index.html %d dòng, cắt %d khối xưởng)'
      % (out.count('\n') + 1, src.count('\n') + 1, n))
