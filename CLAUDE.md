# autobattle — ghi chú cho Claude

Game đối kháng tự động, vẽ bằng canvas 2D. **Toàn bộ game nằm trong một file duy nhất:
`index.html`** (HTML + CSS + JS gói trong một IIFE `(() => { ... })();`). Không có bước
build, không có dependency. Mở file bằng trình duyệt là chạy.

Vì mọi thứ nằm trong IIFE nên **không có biến nào lộ ra `window`** — muốn test tự động
thì phải tạo bản sao có gắn thêm móc (xem mục Kiểm thử).

---

## 0. Bản đồ `index.html`

File dài ~4100 dòng. Các khu ngăn nhau bằng comment `/* ---------- tên ---------- */`,
**tìm bằng cách grep chính cái tên đó** thay vì nhớ số dòng (số dòng đổi liên tục):

| Khu | Có gì |
|---|---|
| đầu file (chưa đánh dấu) | CSS, khung HTML, các `id` của nút và bảng |
| *(ngay sau `<script>`)* | canvas, `BASE_SPEED` / `RT` / `rts`, vòng lặp bước cố định |
| `sprite slots` | `SPR`, `COLORS`, `HP`, `SETS` — danh sách ô dán ảnh |
| `bảng nhân vật chơi được` | mọi hằng số cân bằng của Kono / ChiChi / Tsubasa |
| `Shikamaru` (khối hằng) | `gs()`, cả cụm `SHIKA`, các hằng tuổi thọ hình (`GRUMBLE_LIFE`…) |
| *(kế đó)* | `CHARS` — `init` / `think` / `gauge` / mảng `skills` của bốn nhân vật |
| *(kế đó)* | `Store` — IndexedDB, khoá `spr_*` / `sfx_*`, nạp và xoá ảnh |
| `âm thanh` | `SFX_EVENTS`, `synth()`, `SFX_FULL/MAXLEN/SEG/POS/ACTIVE`, `sfx()`, `playBuffer()` |
| `nhạc nền` | nhạc nền tự sinh |
| `state` | `mk()`, `mkChar()`, `foeOf()`, `newGame()`, `later()`, `pop()`, `setPose()` |
| `damage` | `stunFx()`, `tryEvade()`, **`hurt()`**, `counters()`, `finish()` |
| `Konohamaru` / `ChiChi` / `Shikamaru` / `Ozora Tsubasa` | thân các chiêu thức |
| `AI` | `aiVec()`, `dodgeVec()`, `playerVec()` |
| `step` | một hàm to — toàn bộ mô phỏng một bước 1/120 giây |
| `draw` | `vector()`, `sprite()`, `drawFighter()`, `drawGarden()`, `drawForestGrip()`, `bombAt()`, `tendril()`, phân cảnh, băng-rôn |
| `loop` / `ghi hình sàn đấu` / `màn chọn nhân vật` | vòng `requestAnimationFrame`, quay video, dựng thẻ `.cTile` |

---

## 1. Quy đổi thời gian — đọc kỹ trước khi sửa bất kỳ con số nào

Thanh tốc độ ghi **"Gốc 1x"**, nhưng giá trị thật là `speedMul = 0.5`. Nghĩa là:

> **1 giây trong trận = 2 giây người chơi ngồi đếm.**

```js
const BASE_SPEED = 0.5, RT = 1/BASE_SPEED;   // RT = 2
const rts = sec => String(+(sec*RT).toFixed(2));  // giây-trong-trận -> giây người chơi (chỉ để HIỂN THỊ)
const gs  = sec => sec/RT;                        // giây người chơi -> giây-trong-trận (để KHAI HẰNG SỐ)
```

Ba quy tắc bắt buộc:

1. **Hằng số thời gian trong code tính bằng giây-trong-trận.** `EXHAUST_T = 4` nghĩa là
   người chơi thấy 8 giây.
2. **Mọi chữ hiển thị cho người chơi phải bọc `rts()`.** Không bao giờ in thẳng hằng số ra
   màn hình hay ra bảng kỹ năng.
3. **Sát thương duy trì (`dots[].dps`) tính theo giây-trong-trận**, nên khi khai phải nhân
   `RT`: muốn "5 dmg mỗi giây người chơi" thì viết `5*RT`. Ngược lại lúc hiển thị thì chia
   lại: `SHIKA.bleedDps/RT`.

Nhóm hằng số của Shikamaru khai theo giây người chơi rồi bọc `gs()` cho dễ đọc
(`stabCd: gs(15)` = 15 giây người chơi = 7.5 giây trong trận). Các nhân vật cũ khai thẳng
bằng giây-trong-trận. **Đừng trộn hai lối viết trong cùng một hằng số.**

Vòng lặp chính dùng bước cố định:

```js
const raw = Math.min(.05, (now-last)/1000);
acc += raw*speedMul;
while (acc >= 1/120) { step(1/120); acc -= 1/120; }
```

---

## 2. Bốn nhân vật và những con số đã chốt

Cả bốn đều **1000 máu** (`HP`). Bảng `CHARS` là nơi khai tất cả: mỗi nhân vật có
`init(f)`, `think(f,e,d,auto)`, `gauge(f)` và mảng `skills` (chuỗi HTML hiển thị trong
màn chọn nhân vật — nhớ cập nhật khi đổi số).

### Konohamaru (`kono`)
- Chiêu 1: Shuriken / Explosive Kunai.
- Chiêu 2: **Kage Bunshin** 60 dmg, phân thân đuổi theo, gây **Kiệt sức** — giảm
  **25%** tốc chạy và tốc ra chiêu (`EXHAUST_MUL = .75`, `EXHAUST_T = 4`).
  Hiệu ứng nhìn: **bọt khí kiểu trúng độc** bay lên, ánh xanh lá **rất nhạt**.
  *(Người dùng đã bác bản tô xanh đậm: "nhìn lởm quá".)*
- Chiêu 3: **Sexy no Jutsu** — 30 dmg (`SEXY_DPS=15`, 4 nhịp), choáng nam
  **2.5 giây người chơi** (`SEXY_STUN=1.25`), Konohamaru tự miễn **0.75 giây người chơi**
  (`SEXY_IMMUNE=.375`). Hồi chiêu `cm(5)`, không kèm điều kiện khoảng cách nên tung khá dày.
- Rage 20: Rasengan Dash.

### ChiChi (`chichi`)
- Chiêu 1 cận chiến, chiêu 2 **Mắng** — 5 đợt sóng xung kích, phản lại shuriken / kunai / bóng.
- **Flying Kick**: đồng hồ riêng `f.dashCd`, **không** nằm trong `f.cds` — cố định
  `CHICHI_DASH_CD = 5` giây-trong-trận = **10 giây người chơi**, nên hiệu ứng Kiệt sức
  không kéo dài được nó. Lúc lao: chí mạng chắc chắn, miễn khống chế, chỉ nhận 70% sát
  thương (`CHICHI_DASH_RES`).
- Nội tại: cứ 5 đòn +5% chí mạng.
- Dưới 20% máu: gọi **Goku / Gohan**. Có phân cảnh đóng băng (`G.freeze`) + zoom camera.

### Ozora Tsubasa (`tsubasa`)
- Chiêu 1 Basic Shot 25 (10% ra Overhead Kick 40 + choáng), chiêu 2 Drive Shot 80 + cháy 5×3.
- **5 goal** (`GOAL_MAX = 5`) mở Victory Twin Shot 150 + choáng.
- **Dưới 20% máu — Pre-Wings** (`PREWING_HP`): −35% sát thương nhận
  (`PREWING_RES=.65`), +50% tốc cast (`PREWING_CAST`), kháng choáng 40%
  (`PREWING_STUN=.6`). Hào quang **hiện dần dần, nhạt nhưng vẫn đủ thấy khác biệt**, kèm
  một dòng note lúc vào trạng thái.
- **Dưới 10% máu — Wings of the Eagle** (`EAGLE_HP=.10`): tốc đánh ×4, Drive Shot ×2 nữa,
  chuẩn xác ×2, kháng 70%, miễn khống chế, **cháy hết máu trong 7.5 giây người chơi**
  (`EAGLE_BURN=3.75`). Có chỉ tiêu `EAGLE_QUOTA` bắt buộc tung đủ 2 drive + 2 bicycle.

### Shikamaru (`shika`)
Toàn bộ trong hằng `SHIKA`. Những điểm người dùng chốt riêng:
- **Ngồi lười** (không phải nằm) đầu trận, tích 12 chakra/giây người chơi; bật dậy khi máu
  tụt xuống **80%** (`wakeHp:.80`) rồi chỉ còn 4/giây.
- Bật dậy: **cắt tiếng than thở ngay lập tức**, xoá bong bóng đang treo, rồi **chờ 1.5 giây
  người chơi** (`wakeDelay:1.5`) mới vận chiêu. Vẫn phải đi vào tầm nên đòn đầu tiên thực tế
  rơi vào khoảng 4 giây — đó là bình thường, không phải lỗi.
- **Né đòn**: gốc 10%, mỗi lần **trúng đòn thường** +2.5%, trần 70%. Né được thì **không**
  cộng dồn. Né được **mọi thứ kể cả ultimate** (Rasengan, Kamehameha, Masenko, mọi cú sút
  của Tsubasa) — nhưng ultimate **không** cộng dồn tỉ lệ. Bốn luật đi kèm:
  1. **Đang choáng thì không né được cú nào** (vẫn cộng dồn tỉ lệ, vì vẫn là đòn ăn vào người).
  2. **Né được thì không dính choáng ăn theo** — nên mọi chỗ gọi `stunFx()` phải nằm sau khi
     kiểm `hurt()` trả về true.
  3. **Ngoại lệ duy nhất: Sexy no Jutsu** — ăn cả sát thương lẫn choáng, không né được
     (sát thương đi đường `dots`, choáng gọi thẳng `stunFx`).
  4. Trừ lúc đang kết ấn **trói bóng lần bù** (`bind.guard`): lần đó không gì cắt được,
     Sexy no Jutsu cũng không.

  Kiểm bằng `node tools/t_dodge.js`.
- Chiêu 1: hai phi tiêu, mỗi cái **12 dmg + 5 dmg/giây chảy máu**, tốc đánh bằng nửa Konohamaru.
- Đâm sau lưng: 50 dmg + chảy máu + choáng 1 giây người chơi, mỗi 15 giây người chơi, bị
  cắt ngang thì hoàn 50% hồi chiêu.
- Chiêu 2 **Shadow-Neck Bind**: 45 dmg/giây trong 3 giây rồi choáng 1.5 giây. Bị choáng giữa
  chừng là đứt, lần thử lại được bảo đảm không đứt.
- Ultimate **Nara Clan Forest** (dưới 20% máu): thời lượng = chakra/100 giây người chơi. Địch
  bị kiệt sức, gây sát thương giảm 50%, ăn 35~215 dmg/giây. Xong lãnh địa: mất chiêu 2, chiêu 1
  yếu đi 30%, không tích chakra nữa (`f.weak`).

---

## 3. Lãnh địa Nara — người dùng muốn gì và không muốn gì

- **KHÔNG vẽ tay cả khung cảnh lãnh địa.** Người dùng chỉ cần một **ô để dán ảnh nền**
  (`SPR.garden`), cộng thêm ô dán **con nai** (`SPR.nara`) đứng cạnh Shikamaru.
- Cái cần đầu tư là **hiệu ứng bom nổ và trói bóng cho thật chi tiết** (`bombAt()`,
  `tendril()`, `drawForestGrip()`).
- **Dải bóng trong lãnh địa chỉ là hiệu ứng nhìn** — không thật sự khoá chuyển động của
  đối phương. (Chỉ chiêu 2 Shadow-Neck Bind mới trói thật.)
- Tên hiển thị: **Nara Clan Forest**.
- Có nút `#testForest` để xem thử lãnh địa mà không cần đánh tới 20% máu.
- Thứ tự vẽ: `drawForestGrip()` phải gọi **sau** khi vẽ nhân vật, nếu không khói bom sẽ
  che mất dải bóng.

---

## 4. Ô dán ảnh và ô dán tiếng

- Ảnh: `SPR[key][pose]` là mảng `<img>`; danh sách tư thế khai trong `SETS`.
- Tiếng: `SFX_EVENTS` là mảng `[tên, nhãn tiếng Việt]`; chưa nạp file thì dùng tiếng tự tạo
  trong `switch` của `synth()` — **thêm ô mới thì phải thêm cả `case` dự phòng**.
- Lưu trữ: `Store` (kho của Claude nếu có, không thì IndexedDB), khoá `spr_<key>` và `sfx_<tên>`.

> **Khoá phải giữ nguyên đời đời.** Đổi tên khoá là xoá sạch ảnh và tiếng người dùng đã nạp.
> Đổi tên một ô thì chỉ đổi **nhãn**, giữ nguyên tên khoá.

### Luật về tiếng (người dùng nhắc nhiều lần)

1. **Tiếng không được sống lâu hơn hình đi kèm.** Bảng `SFX_MAXLEN` cắt độ dài theo tuổi thọ
   của hình: `GRUMBLE_LIFE`, `CALL_BANNER_LIFE`, `SUMMON_CHARGE`, `SCOLD_BUBBLE`.
   *(Vì vậy các hằng tuổi thọ này phải khai **trước** `SFX_MAXLEN` — từng dính lỗi TDZ ở đây.)*
2. **File dài đọc nối tiếp rồi lặp vòng**, không lặp lại câu đầu: `SFX_SEG` là độ dài mỗi đoạn
   (có thể là hàm), `SFX_POS` là con trỏ đọc. Áp dụng cho tiếng than thở của Shikamaru và
   tiếng mắng của ChiChi. **Riêng tiếng gọi Goku/Gohan giữ nguyên**, không cắt đoạn.
3. **Chỉ phát khi có bong bóng chat**, không phát nền suốt lúc ngồi lười.
4. `stopSfx(name)` cắt tiếng đang phát qua `SFX_ACTIVE`. Dùng khi Shikamaru bật dậy.
5. `sfx()` có chặn trùng 45 ms — test gọi liên tiếp thì phải giãn ≥70 ms.
6. Cặp tiếng "lúc tung" / "lúc trúng" là mẫu chuẩn: `shika_stab` + `shika_stab_hit`,
   `shika_bind` + `shika_grab`. Tiếng "trúng" đặt **sau** nhánh né, địch né được thì im.

---

## 5. Phân cảnh, ưu tiên model

`G.freeze` đóng băng trận đấu (hàm `step()` return sớm), camera zoom vào. Hẹn giờ gắn cờ
`cine` vẫn chạy trong lúc đóng băng (`later(t, fn, cine)`).

> **Model phân cảnh được ưu tiên cao nhất.** Cụ thể: dáng ChiChi chấn thương lúc gọi viện
> binh không được để Flying Kick đè lên. Nếu trùng nhau thì **hoãn cú đá lại sau phân cảnh**,
> miễn sao không chồng model.

---

## 6. Sát thương và né đòn

```js
tryEvade(t, kind)   // kind: 'dot' và 'domain' không né được; 'big' né được nhưng không cộng dồn
hurt(t, amt, src, crit, kind, tint)   // TRẢ VỀ true nếu đòn thật sự trúng
```

**`hurt()` bắt buộc `return true` ở cuối.** Từng thiếu dòng này và mọi đòn đánh đều bị đọc
nhầm thành né, âm thầm mất hết choáng/cháy/chảy máu ăn theo.

Mọi hiệu ứng ăn theo phải kiểm tra giá trị trả về:

```js
const landed = hurt(e, dmg, k, 'SHADOW STAB!', 'big');
if (!landed) { say('...né được...','s'); return; }
bleedOn(e, k);
```

---

## 7. Vẽ và tốc độ khung hình

Máy chạy test không có GPU, nên:
- `ctx.filter` tính theo **từng lệnh vẽ**, đặt rồi phải trả về `'none'`.
- Blit ảnh full màn hình với `imageSmoothingQuality='high'` **rất đắt**. Từng thử cache khung
  cảnh lãnh địa ra canvas phụ, fps **tụt** 43 → 27. Đã bỏ. Đừng thử lại hướng đó.
- Gradient phủ toàn màn hình cũng nặng — dùng dè.

---

## 8. Kiểm thử

Bộ test nằm trong `tools/`, chạy bằng Node, không cần cài gì thêm:

```bash
node tools/t_reg.js     # 10 cặp đấu song song, bắt lỗi trang, xem cơ chế lớn có nổ không
node tools/t_wake.js    # đo nhịp Shikamaru bật dậy: câm tiếng, xoá bong bóng, chờ đủ giây
node tools/t_dodge.js   # sáu luật né đòn của Shikamaru (choáng, choáng ăn theo, Sexy, lần bù)
```

Cả hai trả mã thoát 0 khi đạt. **Chạy `t_reg.js` trước mỗi lần commit đụng tới cân bằng
hoặc tới `step()`.**

`tools/probe.js` là phần dùng chung: nó đọc `index.html`, chèn một dòng gán vào ngay trước
dấu đóng IIFE rồi ghi ra file tạm, nhờ vậy test với tới được `G`, `SHIKA`, `hurt()`… mà
**không phải sửa `index.html`**. Cần thêm móc thì sửa hằng `HOOKS` trong file đó.
`openGame(keyA, keyB)` lo hết phần chọn nhân vật và bấm vào trận.

Vài điều đã học khi viết test:

- **Đo bằng thời gian trong trận (`G.t`), đừng đo bằng đồng hồ thật.** Chạy headless thì mỗi
  giây thật chỉ trôi ~0.26 giây trong trận — từng đo nhầm Flying Kick thành 20 giây trong khi
  thật sự là 5.
- Đánh tự nhiên hiếm khi kịp tụt xuống máu thấp, mà mấy cơ chế dễ vỡ nhất lại nằm hết ở đó.
  `t_reg.js` vì vậy **ép máu xuống hai chặng** (18% rồi 8%) để gọi Pre-Wings, Wings of the
  Eagle, viện binh và lãnh địa ra. *(Chiêu trói bóng có thể không kịp xuất hiện khi lãnh địa
  mở trước — không phải lỗi.)*
- `sfx()` chặn trùng 45 ms, gọi liên tiếp trong test thì phải giãn ≥70 ms.
- Chặn font mạng (`page.route('**://fonts.*/**', r => r.abort())`) cho khỏi treo.
- Kiểm cú pháp nhanh bằng `new Function(<phần trong thẻ script>)` — nhưng **nó chỉ biên dịch,
  không bắt được lỗi TDZ**, phải chạy thật trong trình duyệt mới thấy.
- Playwright có sẵn ở `/opt/node22/lib/node_modules/playwright`, Chromium ở `/opt/pw-browsers`.
  **Đừng chạy `playwright install`.**

Nút test bấm tay có sẵn trong game: `#testEagle`, `#testForest`, `#testTwin`, `#testGoku`,
`#testGohan`.

## 9. Lỗi đã sửa — đừng làm lại

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| Gohan bắn vào chính ChiChi | `summonHelp` cắm cứng `team:1` | `team:c.team` + `master:c`, `foeOf` đi qua `master` |
| Mọi đòn đều thành "né" | `hurt()` thiếu `return true` | thêm lại, và kiểm giá trị trả về ở mọi nơi gọi |
| `GRUMBLE_LIFE is not defined` | khai sau chỗ `SFX_MAXLEN` dùng nó | dời hằng số lên trên |
| Shikamaru ngồi bị bẹt | mẹo `sy*.68` vốn dành cho ảnh đứng | chỉ áp dụng khi **không** có ảnh `lazy` do người dùng nạp |
| fps tụt khi cache khung cảnh | blit full màn hình đắt hơn vẽ vector | bỏ cache |
| Dải bóng bị khói bom che | vẽ chung với nền | tách ra `drawForestGrip()`, gọi sau nhân vật |

---

## 10. Quy trình git

- Nhánh làm việc: `claude/third-character-design-rxoda8`. **Không đẩy sang nhánh khác.**
- `git push -u origin <nhánh>`; lỗi mạng thì thử lại 4 lần, giãn 2s/4s/8s/16s.
- Người dùng thường merge rất nhanh rồi hỏi luôn "pr?" / "merge đâu" — làm xong một việc thì
  **mở PR ngay**. Nếu PR trước đã merge thì mở PR mới, đừng chồng lên nhánh đã merge.
- Commit message và mô tả PR viết **tiếng Việt**, nói rõ đo được gì.
- **Không ghi tên model** vào commit, PR, hay comment trong code.

---

## 11. Còn treo

- Người dùng có lần nói tiếng bật dậy là ở **75% máu**, nhưng bản mô tả gốc và code đang để
  **80%** (`SHIKA.wakeHp = .80`). Đã hỏi hai lần chưa có câu trả lời — hiện giữ 80%.
- Bộ 4 ảnh thẻ nhân vật (dựng bằng script trong thư mục nháp, chụp bằng Playwright,
  `deviceScaleFactor: 2`, font **Liberation Sans** — DejaVu Sans Mono thiếu chữ tiếng Việt có dấu)
  đang cũ: chưa có Shikamaru và chưa cập nhật vài con số của Tsubasa/ChiChi.
