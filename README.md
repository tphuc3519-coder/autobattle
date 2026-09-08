# Multiverse Battler

Game đối kháng tự động vẽ bằng canvas 2D, **không cần cài gì, không có bước build**.
Tám đấu thủ từ tám vũ trụ, sáu màn đấu, ba chế độ (1v1 · hỗn chiến · đánh theo đội),
giao diện **Việt / Anh** đổi được bằng một nút.

## Có gì trong game

| | |
|---|---|
| **8 đấu thủ** | mỗi người một hồ sơ: vai trò, năm thanh chỉ số, bộ chiêu mô tả gọn, và phần "xem chi tiết số liệu" cho ai muốn soi từng con số |
| **6 màn đấu** | Dojo · Night Street · Stadium · Nara Forest · Deep Space · Sunset Roof — mỗi màn có một ô dán ảnh nền riêng |
| **3 chế độ** | 1v1 · hỗn chiến 3–6 người · đánh đội 2–4 đội |
| **2 ngôn ngữ** | Tiếng Việt / English, nút 🌐 ở thanh công cụ, trong màn chọn và trên màn tiêu đề |
| **Nhạc nền của bạn** | mặc định **tắt**; nạp nhạc riêng cho từng màn ở trang xưởng rồi bật ở thanh công cụ |

## Hai trang, một engine

| Trang | File | Ai dùng | Có gì |
|---|---|---|---|
| **Trang chơi** | `play.html` | mọi người | màn tiêu đề → chọn nhân vật → chọn màn → xem đánh. Không có bảng dán ảnh/tiếng |
| **Trang xưởng** | `index.html` | mình bạn | đủ bảng dán ảnh, dán tiếng, nạp hàng loạt, nút thử chiêu, ghi hình, xuất gói |

`play.html` **dựng ra từ `index.html`**, đừng sửa tay:

```bash
python3 tools/mk_play.py        # đọc index.html -> ghi play.html
```

Nó chỉ làm hai việc: cắt mấy khối đánh dấu `<!--STUDIO-->…<!--/STUDIO-->` và đặt
`window.ARCADE=1` để engine bật vỏ arcade. Sửa game thì sửa `index.html` rồi chạy lại
script; `tools/t_play.js` dựng lại và so từng byte nên quên chạy là test đổ.

## Mở thử trong máy

```bash
python3 -m http.server 8000
# trang chơi   http://localhost:8000/play.html
# trang xưởng  http://localhost:8000/index.html
```

Mở bằng `http://` chứ đừng nhấp đúp mở `file://`: gói phát hành và bộ giọng mẫu đi bằng
`fetch`, mà `file://` thì trình duyệt chặn. (Nhấp đúp vẫn chơi được, chỉ là phải kéo thả
thư mục `assets/` vào bảng tiếng bằng tay.)

## Ảnh và tiếng đi từ xưởng sang trang chơi thế nào

1. Mở **trang xưởng**, dán ảnh / tiếng / nhạc vào các ô (hoặc kéo cả thư mục thả vào — xem
   *Nạp hàng loạt* trong `CLAUDE.md`).
2. Bấm **📦 Xuất gói lên web chơi** → được file `pack.json`.
3. Chép nó vào `assets/pack/pack.json` rồi commit + push.
4. Trang chơi tự `fetch` gói đó lúc mở. Ô nào người chơi chưa có gì thì lấy từ gói; gói
   không bao giờ đè lên file người ta tự nạp.

> `pack.json` là **một file JSON chứa toàn bộ ảnh dạng base64** nên nó nặng: mỗi PNG phình
> thêm ~33%. GitHub chặn file trên 100 MB (và cảnh báo từ 50 MB), nên nếu bộ ảnh to thì
> giảm số khung hoạt ảnh, hoặc chuyển sang backend (xem mục cuối).

## Đưa lên mạng

### Cách 1 — GitHub Pages (miễn phí, tự động)

1. Push lên `main`. Workflow `.github/workflows/pages.yml` **tự bật Pages** (bước
   `configure-pages` có `enablement: true`) rồi dựng và đẩy lên — không phải vào Settings
   bấm gì. Muốn kiểm lại thì Settings → Pages phải hiện *Source = GitHub Actions*.
2. Lần chạy nào lỡ hỏng ở bước đó (`Get Pages site failed … Not Found`) thì vào tab
   **Actions → Pages → Re-run all jobs**.
3. Xong:
   - trang chơi: `https://<tài-khoản>.github.io/autobattle/`
   - trang xưởng: `https://<tài-khoản>.github.io/autobattle/studio/`

Trang xưởng chỉ **giấu đường dẫn** chứ không khoá — Pages không có mật khẩu. Ai mò đúng
địa chỉ vẫn mở được, nhưng họ chỉ đổi được bản nằm trong máy họ: gói phát hành nằm trong
repo, muốn đổi thật thì phải commit.

### Cách 2 — tự kéo lên host khác (Netlify, Vercel, hosting của bạn)

Cả game là file tĩnh, không cần Node, không cần server. Đưa lên đúng ba thứ:

```
play.html          -> trang chơi   (đổi tên thành index.html nếu muốn nó là trang gốc)
index.html         -> trang xưởng  (nên để trong thư mục con, ví dụ /studio/)
assets/            -> gói phát hành + bộ giọng mẫu
```

Netlify: kéo thả nguyên thư mục vào netlify.com/drop là xong. Vercel: `vercel deploy`.
Muốn khoá trang xưởng bằng mật khẩu thật thì Netlify (bản trả phí) và Cloudflare Access
đều làm được ở mức hosting, không phải sửa code.

## Muốn bỏ bước commit — làm backend

Bước 2–3 ở trên là chỗ vướng duy nhất: đổi một cái ảnh cũng phải đẩy repo. Muốn bấm nút
là xong thì cần một chỗ chứa file có **API ghi**. Ba hướng, rẻ dần theo công sức:

| Hướng | Mất gì | Được gì |
|---|---|---|
| **Supabase Storage** (gợi ý) | tài khoản miễn phí 1 GB, khoảng 30 dòng JS | upload thẳng từ trang xưởng, trang chơi đọc URL công khai |
| **Cloudflare R2 + Worker** | tên miền + Worker, ~10 GB miễn phí | rẻ nhất khi bộ ảnh lớn, tự viết route upload |
| **Firebase Storage** | tài khoản Google | giống Supabase, SDK nặng hơn |

Chỗ phải sửa trong repo này **rất nhỏ**, vì cả hai trang đã đi qua đúng một cửa:

- `packLoad()` trong `index.html` đang đọc hằng `PACK_URL = 'assets/pack/pack.json'`.
  Đổi nó thành URL công khai của bucket là trang chơi đọc từ mạng ngay.
- Nút **Xuất gói** đang tải file về máy. Thêm một nhánh gọi API upload (Supabase:
  `supabase.storage.from('pack').upload('pack.json', blob, {upsert:true})`) là bấm một nút
  ăn ngay, khỏi commit.
- **Khoá ghi, mở đọc**: bucket để public-read, còn quyền ghi thì đòi khoá. Đừng nhét khoá
  ghi vào `index.html` — trang xưởng cũng là file tĩnh ai cũng tải về đọc được. Cách gọn:
  bucket chỉ cho ghi qua một Edge Function / Worker, hàm đó đòi một mật khẩu bạn gõ vào ô
  trên trang xưởng và giữ trong `localStorage`.

Nhắn tôi khi bạn đã có tài khoản (Supabase hay Cloudflare) là tôi nối thẳng vào, kèm test.

## Kiểm thử

```bash
node tools/t_reg.js      # 36 cặp đấu, bắt lỗi trang
node tools/t_play.js     # hai trang: play.html khớp bản dựng, luồng arcade, gói phát hành
node tools/t_stage.js    # sáu màn đấu, ảnh nền, bóng đổ
node tools/t_ui.js       # tên game, hai ngôn ngữ, hồ sơ nhân vật, nhạc nền tự chỉnh
node tools/t_bulk.js     # nạp hàng loạt theo tên file
node tools/t_voice.js    # bộ giọng dựng sẵn
```

Danh sách đầy đủ và mọi ghi chú về cơ chế nằm trong [`CLAUDE.md`](CLAUDE.md).
