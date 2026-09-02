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
| `Horikita Suzune` (khối hằng) | cả cụm `SUZ`, `SUZ_BUBBLE` |
| `Shikamaru` (khối hằng) | `gs()`, cả cụm `SHIKA`, các hằng tuổi thọ hình (`GRUMBLE_LIFE`…) |
| *(kế đó)* | `CHARS` — `init` / `think` / `gauge` / mảng `skills` của năm nhân vật |
| *(kế đó)* | `Store` — IndexedDB, khoá `spr_*` / `sfx_*`, nạp và xoá ảnh |
| `âm thanh` | `SFX_EVENTS`, `synth()`, `SFX_FULL/MAXLEN/SEG/POS/ACTIVE`, `sfx()`, `playBuffer()` |
| `nhạc nền` | nhạc nền tự sinh |
| `state` | `mk()`, `mkChar()`, `foeOf()`, `newGame()`, `later()`, `pop()`, `setPose()` |
| `damage` | `stunFx()`, `tryEvade()`, **`hurt()`**, `counters()`, `finish()` |
| `Konohamaru` / `ChiChi` / `Shikamaru` / `Ozora Tsubasa` / `Horikita Suzune` | thân các chiêu thức |
| `AI` | `aiVec()`, `dodgeVec()`, `playerVec()` |
| `step` | một hàm to — toàn bộ mô phỏng một bước 1/120 giây |
| `draw` | `vector()`, `sprite()`, `drawFighter()`, `drawGarden()`, `drawForestGrip()`, `bombAt()`, `tendril()`, phân cảnh, băng-rôn |
| `loop` / `ghi hình sàn đấu` / `màn chọn nhân vật` | vòng `requestAnimationFrame`, quay video (`recFrame()` dựng khung dọc 9:16), dựng thẻ `.cTile` |

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

## 2. Năm nhân vật và những con số đã chốt

Cả năm đều **1000 máu** (`HP`). Bảng `CHARS` là nơi khai tất cả: mỗi nhân vật có
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
  **Drive Shot lúc này bỏ hẳn quãng vọt lên trời ngẫu nhiên**: bóng bay thẳng vào địch như
  mọi loại bóng khác (`straight:true`, `rise:0`, `homing:false`, tốc `EAGLE_DRIVE_SPD=420`),
  trượt thì nảy tường một lần rồi tan giống quả bóng thường. Kiểm bằng `node tools/t_drive.js`.

### Shikamaru (`shika`)
Toàn bộ trong hằng `SHIKA`. Những điểm người dùng chốt riêng:
- **Ngồi lười** (không phải nằm) đầu trận, tích 12 chakra/giây người chơi; bật dậy khi máu
  tụt xuống **80%** (`wakeHp:.80`) rồi chỉ còn 4/giây.
- **Trần của quãng ngồi lười là 600 chakra** (`lazyCap`). Không ai đánh thì cứ ngồi tới khi
  đủ 600 là **tự đứng dậy** đánh như bình thường. Trần này **chỉ chặn quãng ngồi**, không
  phải trần tuyệt đối: đứng dậy rồi vẫn tích tiếp 4/giây và **vượt qua 600 được**.
  *(Đường đi của con số: 1000 → 700 → 600, người dùng hạ dần cho anh vào trận sớm hơn.
  Test đọc thẳng `SHIKA.lazyCap` nên đổi con số này là đủ, đừng ghim số vào chỗ khác.)* Hai lối
  rời ghế đi chung hàm `shikaWake(f, why)` để phần dọn dẹp (câm tiếng than, xoá bong bóng,
  chờ `wakeDelay`) không bị chép thành hai bản. Thanh chakra canh theo `lazyCap`.
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

### Horikita Suzune (`suzune`)
Toàn bộ trong hằng `SUZ`, khai theo lối của Shikamaru (giây người chơi bọc `gs()`).
Nhân vật cận chiến, đi theo **ba form** — đây là cả tính cách nhân vật, đừng gộp lại:

| Form | Là ai | Có gì |
|---|---|---|
| 1 | Đã dám vung tay nhưng còn rụt rè | chỉ có chiêu 1, **10 dmg** mỗi đòn và ra chậm hơn form 2 **1.6 lần** (`SUZ.f1`, `SUZ.f1Slow`); **chưa có chiêu 2**, chưa tích điểm lớp, chưa có cửa hồi máu. Đứng thì dáng `scared` (hai tay chụm trước ngực, mắt mở to, giọt mồ hôi), trúng đòn thì dáng `block` (hai tay bắt chéo chữ X). AI nhích vào đủ tầm rồi lùi ngay |
| 2 | Dám đánh nhưng còn sai | chiêu 1 đấm/đá, chiêu 2 Decision Making |
| 3 | Tự đứng một mình | như form 2 nhưng mạnh hơn và cộng dồn theo điểm lớp. **Có hẳn bốn ô dán ảnh riêng**: `stand3` / `punch3` / `kick3` / `think3` (xem mục dưới) |

**Chuyển form 1 → 2**: máu tụt xuống **90%** (`SUZ.guardHp`) thì Ayanokouji hiện ra.
*(Từng là 85%; người dùng nâng lên 90% để anh xuất chiến sớm hơn.)*
Phân cảnh đóng băng 1.6s, anh nói *"Stand up and fight."*, rồi **đỡ đạn thay đúng 5 giây
người chơi** (`SUZ.guardT`). Trong quãng đó `hurt()` trả về **false** cho Horikita ngay từ
đầu hàm nên không chỉ mất máu mà cả choáng / cháy / chảy máu ăn theo cũng không dính.
*(Đồng hồ 5 giây chỉ chạy SAU phân cảnh — `step()` return sớm lúc `G.freeze>0`. Test phải
chờ cả hai, đây không phải lỗi.)*

Hết 5 giây anh **không lặng lẽ biến mất**: `f.ayaG` có ba pha `guard → kick → done`. Sang
pha `kick` anh lao tới trước mặt địch (`guardKickSpd`, để lại vệt bóng mờ) rồi tung **cước
chia tay 150 dmg + choáng 2 giây** (`guardKickDmg` / `guardKickStun`), đóng băng 1.1s, xong
mới poof và Horikita vào form 2. Đòn này **đứng tên Horikita** (`hurt(e,…,f,…)`) để nếu nó
kết liễu thì `finish()` trao chiến thắng cho cô. Lớp khiên chỉ vẽ ở pha `guard`.

**Cơ chế điểm lớp (class points)** — mới, dùng riêng cho nhân vật này:
- Mốc là **150** (`SUZ.cpMax`).
- Form 2: chạm 150 là **chặn ở đó** và gọi Ayanokouji ra làm đồng minh thật.
- Form 3: cứ đủ 150 thì đổi thành **một bậc cộng dồn** rồi tính lại từ 0 (trần 5 bậc).

**Chiêu 1** — áp sát rồi bốc ngẫu nhiên đấm hoặc đá, **hai dáng tách hẳn** (`punch` / `kick`).
**10 dmg + 0 điểm ở form 1**, 15 dmg + 15 điểm ở form 2, 20 dmg + 20 điểm ở form 3. Hồi chiêu
gốc `cm(.25)*2.5`, tức **chậm hơn ChiChi đúng 2.5 lần** và vẫn co giãn theo thanh tốc độ ra
chiêu; form 1 nhân thêm `f1Slow = 1.6` nữa. **Hồi chiêu phải đọc qua `suzTune(f).atkCd`**,
đừng đọc thẳng `SUZ.atkCd`. Mỗi đòn trúng có **25%** hồi **5%** máu hiện tại
(form 1: không có, form 3: 35% / 8%).

> **Form 1 không tích điểm lớp và không có cửa hồi máu** — chỗ này người dùng không nói rõ,
> tôi chốt vậy vì hai thứ đó là phần thưởng của sự tự tin, mà bản mô tả gốc chỉ nêu chúng từ
> form 2. Quan trọng hơn: cho tích điểm ở form 1 thì cô có thể chạm 150 trước khi Ayanokouji
> kịp đỡ đòn, `suzCp()` sẽ gọi `ayaJoin()` lúc cô còn chưa qua form 2 — vỡ cả mạch truyện.
> Muốn đổi thì sửa `SUZ.f1`.

> **Điểm lượn của AI form 1 phải nằm hẳn trong tầm tay** (`d > 50` thì tiến, dưới thì lùi;
> tầm tay là `r+r+16 = 68`). Để mốc sát mép tầm thì phần lớn lượt hồi chiêu rơi đúng lúc cô
> vừa lùi ra, nhìn như không thèm đánh. Đo được: gặp địch cận chiến cô ra đủ 7 đòn trong 14
> giây trong trận (đúng trần lý thuyết 14/1.8); gặp địch đánh xa thì ít hơn hẳn vì bị kéo
> giãn — đó là chuyện thường của cận chiến, ChiChi cũng vậy.

**Chiêu 2 — Decision Making**. Vòng đời một quyết định: đứng **bất động 1.5 giây**
(`decThink`, qua `f.decT` + `f.lock`) → chốt và phóng đi **siêu nhanh** (`decSpd = 1150`) →
**3.5 giây nữa** (`decCd`) mới nghĩ tiếp. Nên `think()` đặt
`f.cds.s2 = decThink + decCd`, đừng đặt mỗi `decCd`.

Đúng (**65%** ở form 2, **70%** ở form 3) thì câu nói biến thành **bong bóng phóng thẳng
vào mặt địch**, tích **đúng bằng lượng sát thương vừa gây**, kèm cửa hồi máu 25%/3%
(form 3: 35%/8%). Sai (35% / 30%) thì **trừ 5~60 điểm**; điểm thủng xuống âm thì cô **tự
chịu đúng phần âm đó** (không né được, không giảm nhẹ) rồi tích lại từ 0.

**Mỗi quyết định đúng còn được chấm mức độ** theo chính lượng sát thương nó gây ra — bảng
`SUZ_TIERS`, tra bằng `suzTier(f,dmg)`. Tên mức hiện ra bằng **băng-rôn chí mạng** lúc chạm
người (thay cho chữ `DECISION!` cũ), và màu của mức tô luôn viền bong bóng lẫn mũi tên lúc
nó đang bay:

| Mức | Form 2 (`f2.decLo~decHi` = 30~80) | Form 3 (40~120) |
|---|---|---|
| ACCEPTABLE DECISION | 30–40 | 40–70 |
| GOOD DECISION | 41–60 | 71–90 |
| GREAT DECISION | 61–70 | 91–110 |
| BEST DECISION | 71–80 | 111–120 |

> `SUZ_TIERS` **phải khai trước bảng `CHARS`** vì mảng `skills` đọc nó ngay lúc khai `CHARS`.
> Từng để nó dưới thân chiêu và dính TDZ: `new Function` biên dịch vẫn qua, mở game mới thấy
> màn chọn nhân vật trống trơn.

**Bong bóng lúc đứng suy nghĩ luôn là một câu duy nhất** — `SUZ_ASK`
(*"What should I do in this situation?"*), không phải dấu ba chấm. Bong bóng sống
`SUZ_THINK_LIFE = decThink + gs(.9)` chứ không chỉ bằng quãng đứng im, vì đọc hết một câu
hỏi mất lâu hơn 1.5 giây — mà tiếng thì không được sống lâu hơn hình đi kèm.

> **Nhân vật này chỉ có ĐÚNG BA ô giọng**, nhãn có gắn 🎙 trong bảng nạp tiếng:
> | Ô | Nội dung | Kiểu đọc |
> |---|---|---|
> | `suz_think` | một câu duy nhất: `SUZ_ASK` | `SFX_MAXLEN`, cắt đúng lúc bong bóng tắt |
> | `suz_decide` | 15 câu trong `SUZ_DECISIONS` | `SFX_SEG`, mỗi lần đọc tiếp một câu |
> | `suz_wrong` | 6 câu trong `SUZ_WRONG` | `SFX_SEG`, mỗi lần đọc tiếp một câu |
>
> **Sửa file tiếng thì phải sửa luôn ba chỗ trên cho khớp thứ tự.** Mấy ô còn lại
> (`suz_hit` / `suz_heal` / `suz_form2` / `suz_form3`) là tiếng động, không phải giọng,
> nên giữ nguyên.
>
> **Ba ô `suz_punch` / `suz_kick` / `suz_block` đã BỎ HẲN** (người dùng: đấm/đá thì mượn
> tiếng của ChiChi, đỡ đòn thì dùng tiếng chịu đòn thường). `suzStrike()` gọi `sfx('punch')`
> cho cả đấm lẫn đá — ChiChi chỉ có đúng một ô cận chiến — còn `ayaBlock()` gọi `sfx('hit')`.
> Ô đầu của khu Horikita trong `SFX_GROUPS` vì vậy chuyển sang `suz_think`. Đừng dựng lại ba
> ô đó.
>
> **Ayanokouji có BA ô giọng riêng**, đúng ba câu anh nói trong cả trận:
> | Ô | Câu | Trần độ dài |
> |---|---|---|
> | `aya_stand` | `AYA_STAND` — *"Stand up and fight."* (lúc bước ra chắn đòn) | `AYA_STAND_LIFE*RT` |
> | `aya_join` | `AYA_LAST` — câu lúc vào sân sát cánh lần cuối | `AYA_JOIN_LIFE*RT` |
> | `aya_bye` | `AYA_BYE` — *"This is where I take my leave."* (lúc rời sàn) | `AYA_BYE_LIFE*RT` |
>
> **Lần xuất hiện tách làm hai ô.** `aya_appear` = lần đầu (bước ra chắn đòn),
> `aya_appear2` = lần 2 (vào sân sát cánh khi đủ 150 điểm lớp). Ô lần 2 **bỏ trống thì
> mượn hẳn ô `summon`** — đúng tiếng dịch chuyển của viện binh twin shot — qua bảng
> `SFX_ALIAS`: `sfx()` thấy ô chưa nạp file mà có tên trong bảng thì đổi luôn sang ô kia,
> nên mượn cả file người dùng đã nạp cho `summon` lẫn tiếng tự tạo của nó. Vì vậy ô có
> mặt trong `SFX_ALIAS` **không cần** thêm `case` trong `synth()`; nạp file cho chính nó
> thì file đó thắng. Chỗ đọc: `ayaShield()` (lần đầu) đọc `aya_appear`, `ayaJoin()` (lần 2)
> đọc `aya_appear2` — `t_suzune.js` soi thân hai hàm này để không ai lỡ tay gộp lại.

> Ba hằng `AYA_*_LIFE` khai **trước `SFX_MAXLEN`** (cạnh `SUZ_BUBBLE`) và dùng chung cho cả
> `talk()` lẫn trần độ dài tiếng — hai chỗ không được lệch nhau. `aya_strike` / `aya_leave`
> vẫn là tiếng động như cũ.
> *(Bản trước từng chốt "không cho anh ô giọng nào"; người dùng hỏi lại "mấy ô âm thanh
> Ayanokouji xuất hiện và thoại mấy câu đó đâu" nên mở lại đủ ba ô.)*

> **Bảng nạp tiếng chia theo nhóm.** `SFX_GROUPS` gắn tiêu đề vào ô ĐẦU của mỗi khu
> (Chung · Konohamaru · ChiChi · Ozora Tsubasa · Shikamaru · Horikita Suzune · Ayanokouji);
> `buildSfx()` gặp tiêu đề thì mở một lưới `.slots` mới, y như bảng dán ảnh. Trước đó 45 ô
> xếp phẳng một mạch nên mấy ô cuối tìm không ra — đó chính là lý do người dùng tưởng
> ô của Ayanokouji chưa có. **Thứ tự trong `SFX_EVENTS` chỉ ảnh hưởng chỗ hiển thị**, mọi
> thứ khác tra theo tên khoá; mà tên khoá thì giữ nguyên đời đời.

**Ayanokouji làm đồng minh thật** (đủ 150 điểm ở form 2). Anh là fighter duy nhất mang cờ
`ally:true`; `summon:true` để `hurt()` không gọi `finish()` khi anh cạn máu, nhưng
`ally` lại cho anh **ăn được đạn** (vòng va chạm bỏ qua `f.summon&&!f.ally`).
- Máu = **35% máu hiện tại của Horikita** lúc anh bước ra.
- **Đột kích** mỗi 4.5 giây người chơi: 40 dmg + choáng 1.25 giây.
- Buff Horikita **+100% tốc ra chiêu** (`f.castBuff`, nhân vào nhịp trôi hồi chiêu).
- Tự dịch chuyển chắn đạn (`ayaIntercept`) và, khi địch **cận chiến** áp sát, đứng hẳn giữa
  hai người rồi **đẩy Horikita vòng ra sau lưng địch** để cô rảnh tay đánh.
- **Khiêu khích chạy suốt quãng anh còn trên sàn**, không đợi địch áp sát và không phân biệt
  địch cận chiến hay đánh xa: `ayaTick` đặt `e.tauntBy=a` mỗi nhịp, nên **mọi đòn của địch —
  chiêu thường, chiêu lớn, ultimate — đều rơi vào anh** chứ không vào Horikita. Anh rời sàn
  (`leaving>0`) hay cạn máu thì `tauntBy` được xoá và địch nhắm lại vào cô.
  *(Bản cũ chỉ bật taunt 0.6 giây lúc `mode==='tank'`, tức chỉ khi địch cận chiến vào trong
  `ayaGuardR` — người dùng bác: "chưa thu hút đối phương".)*
- **Taunt đi qua `aimTarget(f)`**, không đụng tới `foeOf()`. `foeOf` vẫn là quan hệ phe;
  `aimTarget` chỉ trả lời "đang nhắm vào ai". Mọi chỗ NHẮM (aiVec, think, cú lao, đạn dò,
  viện binh) đọc `aimTarget`, mọi chỗ tính phe vẫn đọc `foeOf`.
  **Ngoại lệ duy nhất là lãnh địa Nara**: nó là một vùng nên trói cả hai người có thanh máu
  và chia đều sát thương, đọc thẳng `domainTargets()` chứ không đọc `aimTarget` (xem mục 3).
- **Viện binh của địch không có khiêu khích riêng** nên `aimTarget` cho chúng đọc luôn
  `master.tauntBy` — nếu không, Goku / Gohan / phân thân cứ gọi ra là lách được anh và bắn
  thẳng vào Horikita. Có chặn `t.team!==f.team` để không bao giờ nhắm nhầm vào phe mình.
- **Miễn nhiễm Sexy no Jutsu** (`sexyImmune:true` lúc `mk`): khói hồng không bám dot, không
  choáng, không trừ một giọt máu nào của anh. Nhánh này nằm **trước** nhánh `f.summon` trong
  `sexy()` để anh có dòng nhật ký riêng thay vì mượn câu của Goku/Gohan.
- Dấu hiệu duy nhất của khiêu khích là **vòng sáng nhấp nháy dưới chân anh** (`drawFighter`,
  nhánh `f.ally&&f.taunt>0`). **Không dán chữ `TAUNT` / `TAUNTED` lên sàn** — người dùng đã bác.

> **Cú cước chia tay không được nện vào lớp miễn thương.** Konohamaru tự miễn thương 0.75 giây
> người chơi mỗi lần tung Sexy no Jutsu; cú cước rơi trúng quãng đó thì `hurt()` trả về false
> ngay từ đầu hàm — mất sạch 150 dmg lẫn 2 giây choáng, nhật ký còn báo nhầm thành "bị né".
> Cách xử: **không phá miễn thương của người ta**, mà giữ anh treo ngay trước mặt địch (bám
> theo địch qua `ayaGuardAim`), hết miễn thương mới tung. Có trần chờ `SUZ.guardKickWait`
> (2 giây người chơi) để chuỗi phân cảnh không bao giờ kẹt lại. Đo được: 14/14 lần cú cước
> ăn đủ 150 dmg, trước đó cứ 10 lần thì hụt 1.

**Ô dán ảnh riêng theo form.** Form 3 có `stand3` / `punch3` / `kick3` / `think3`; hai nhánh của
chiêu 2 tách theo cả form lẫn kết quả: `right2` / `wrong2` (form 2) và `right3` / `wrong3`
(form 3); trạng thái dưới 20% máu tách làm hai: `injured2` (form 1/2) và `injured3` (form 3);
dưới 20% máu mà đang **đứng suy nghĩ** thì có ô riêng nữa: `thinkHurt2` (form 2) và `thinkHurt3`
(form 3). Nhãn trong `SETS` ghi rõ form cho khỏi lẫn — ô cũ cũng đổi nhãn theo:
`idle` = "Thủ thế (form 2)", `punch`/`kick` = "(form 1/2)", `think` = "(form 2)".
`sprite()` đổi ô theo form ngay chỗ đã đổi cho form 1; thiếu ảnh thì lùi về đúng ô cùng nghĩa của
form 2 (ô tơi tả-suy nghĩ lùi về ô đứng nghĩ lành lặn). Riêng `hurt` vẫn dùng chung cho mọi form
(form 1 vẫn mượn `block`).

> **Hai ô "lùi chung" `decide` / `injured` đã BỎ.** Chúng không phải tư thế nào của cô: `decide`
> chỉ là ô lùi của `right*`/`wrong*`, `injured` chỉ là ô lùi của `injured2`/`injured3` — mà bản
> thân hai cặp kia đã lùi được về nhau, nên nạp ảnh vào ô chung chẳng thêm được gì. Người dùng
> hỏi thẳng "ô lùi chung là gì", lúc đó cả hai đang trống, nên đổi chỗ đó thành `thinkHurt2` /
> `thinkHurt3`. `decide` vẫn còn là **tư thế** (`suzDecide` return sớm khi không còn ai để nhắm)
> nhưng không còn ô dán ảnh — nhánh lùi `pk==='decide'` trong `sprite()` giữ nguyên.
>
> Kèm theo đó là một **lỗi thật đã sửa**: `sprite()` bật cờ tơi tả bằng `set.injured` (ô vừa bỏ),
> nên ai chỉ nạp `injured2`/`injured3` thì ảnh tơi tả **không bao giờ hiện**. Giờ cờ đọc
> `injArr` = `injured3||injured2` theo form, mấy nhân vật kia vẫn đọc `injured` như cũ.

Dáng vector đi kèm — tất cả đều **vẽ sau tóc**, vẽ trước thì hai lọn tóc dài che mất:
- `stand3` đứng hẳn thế thủ như võ sĩ, khuỷu ép sát sườn, nắm đấm dẫn đường ngang cằm.
- `punch3` như đấm của form 2 nhưng tay còn lại **không buông xuôi**, thủ ngay quai hàm.
- `kick3` đá **cao hơn** (góc `1.5` thay vì `1.15`), tay sau thủ cằm, tay trước chìa ra giữ đà.
- `think3` một tay ngang bụng chống lấy khuỷu, tay kia đỡ cằm — nghĩ mà vẫn đứng vững, khác hẳn
  kiểu ôm lấy mình của form 1 và kiểu buông thõng của form 2.
- `right*` chốt đúng: tay chìa thẳng đẩy câu trả lời vào mặt địch, dấu `!` vàng trên đầu.
- `wrong*` chốt trật: tay ra được nửa đường thì khựng lại rồi xuôi xuống, **dấu gạch chéo hồng**
  vẽ bằng nét chứ không phải chữ (font headless hay thiếu ký tự ✕).
- Bản form 3 của cả `right`/`wrong` giữ nguyên nắm đấm ở quai hàm; form 2 thì buông tay sau.
- `injured3` nặng hơn `injured2`: ngoài hai vệt xước và băng vai chung, form 3 có thêm vệt trên
  gò má, băng quấn hai cánh tay và gấu váy rách một góc. Góc rách tô bằng tông sẫm hơn váy chứ
  **không mượn màu nền** — nền sàn đổi màu theo phân cảnh.

> **Dáng phải đặt trong từng nhánh của `suzDecide`, không đặt một lần ở đầu hàm** — lúc vào hàm
> còn chưa bốc ra đúng hay sai. Nhánh sai mà điểm lớp thủng xuống âm thì `setPose(f,'hurt')` đè
> lên `'wrong'`, đó là cố ý: cô đang tự ăn sát thương.

Nắm đấm thủ sát quai hàm dùng chung qua hàm `thuCam()`, đoạn chi vẽ qua `tay()` — cả hai khai ở
đầu khối vẽ của Horikita. `t_suzune.js` chấm bằng cách vẽ từng dáng ra canvas phụ rồi **đếm điểm
ảnh lệch** giữa form 2 và form 3 (thủ thế 387 · đấm 197 · đá 476 · nghĩ 427 · đúng 194 · sai 200 ·
tơi tả 441), nên xoá mất một nhánh vẽ là test đổ ngay. Riêng trạng thái tơi tả còn so **lành lặn
với tơi tả trong cùng một form** để chắc là có vẽ thêm dấu vết: form 1/2 được 113 điểm, form 3 được
209 — luật là form 3 phải nặng hơn.

> **Đếm điểm ảnh phải soi cả bốn kênh RGBA.** Chỉ soi kênh alpha thì mấy vết thương vẽ đè lên thân
> người (vốn đã đục sẵn) gần như không đổi gì — đo ra đúng 3 điểm và test báo hỏng oan.

**Chuyển form 2 → 3**: anh về 0 máu thì **KHÔNG chết**. `a.alive` vẫn `true`, không có
`finish()`, không có hiệu ứng gục. Anh nói *"This is where I take my leave."* rồi **đi bộ ra
khỏi mép sàn** và mờ dần (`a.leaving` / `a.fade`). Đi hẳn rồi Horikita mới nói *"From here on
I fight for my own goal — alone."* và vào form 3.

**Form 3**: đòn tay 20 / +20 điểm, quyết định đúng 70%, hồi máu 35% × 8% máu hiện tại,
**+10% miễn thương** (`f.dmgRes`, ăn trong `hurt()`) và **10% kháng hiệu ứng** (`f.ccRes`,
rút ngắn thời gian choáng trong `stunFx()`). Mỗi 150 điểm lớp tích thêm được thì **+5% tỉ lệ
quyết định đúng, +5% tỉ lệ hồi máu, +6% lượng hồi máu, +8% miễn thương, +8% kháng hiệu ứng**.

> **Không dán chữ giải thích form lên sàn.** Người dùng đã bác: bỏ hẳn dòng
> `FORM n · …` dưới thanh máu, bỏ băng-rôn `FORM 2 · RESOLVE` / `FORM 3 · STANDING ALONE`,
> bỏ bảng chỉ số lúc lên bậc, bỏ đồng hồ `AYANOKOUJI GUARDS …s`, bỏ luôn mấy dòng
> `AYANOKOUJI SUPPORT` / `TAUNT` / `TAUNTED`. Đổi form thì chỉ nói bằng **hình và câu
> thoại**: dáng đứng khác, vòng sáng, chớp màn, một tiếng. Thanh phụ chỉ còn
> `Class: n/150`, đúng kiểu Rage / Crit / Goal / Chakra của mấy nhân vật kia.
> Chỗ duy nhất được phép giải thích là **mảng `skills` trong màn chọn nhân vật**.
> Nhật ký cũng kể chuyện chứ không đọc bảng chỉ số.

> **Chỗ đã tự quyết, nói rõ để sau này khỏi cãi nhau:** bản mô tả gốc ghi *"+8% miễn thương,
> +8% miễn thương"* hai lần. Hiểu là **+8% miễn thương và +8% kháng hiệu ứng** — vì form 3
> vốn có sẵn cặp 10%/10%, cộng dồn theo cặp mới cân. Trần 5 bậc để miễn thương không chạy
> tới 100%. Nếu người dùng muốn khác thì sửa `SUZ.st`.

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
- **Lãnh địa trói mọi đối thủ CÓ THANH MÁU** — đấu thủ chính và đồng minh (Ayanokouji).
  Khu rừng là một *vùng*, không phải đòn đơn, nên **khiêu khích không kéo nó về một người**:
  `domainTick()` duyệt `domainTargets(k)`, ai bị trói cũng dính đủ `exhaust` và `outCut`.
- **Viện binh thuần triệu hồi thì không trói được.** Goku / Gohan / phân thân **không có thanh
  máu** — bóng chẳng bám vào đâu. Cờ nhận diện là `summon && !ally`, đúng cái cờ `drawBars()`
  dùng để quyết định có vẽ thanh máu hay không. *(Người dùng: "dạng thuần summon k có thanh máu
  như goku với gohan, phân thân thì trói sao đc".)*
- **Sát thương CHIA ĐỀU cho những người đang bị trói**, không phải mỗi người một lượt riêng:
  một nhịp bốc **một** lượt `rnd(domainLo, domainHi)` rồi nhân `domainShare(n) = 1/n` — một
  người ăn trọn, hai người mỗi người một nửa, ba người mỗi người một phần ba. Trói thêm người
  **không** làm khu rừng mạnh lên, chỉ làm nó dàn mỏng ra.
  `drawForestGrip()` gọi `forestGripOn(k,e)` cho từng người để dải bóng bám đúng ai đang
  bị trói. Hết giờ thì trả `outCut` của cả danh sách về 0.
  *(Đường đi của yêu cầu: lúc đầu cho lãnh địa dí theo `aimTarget()` → bác, "trói cả 2" →
  làm thành giảm dần theo bậc → bác tiếp, chốt là **chia đều** và **chỉ trói ai có thanh máu**.)*

---

## 4. Ô dán ảnh và ô dán tiếng

- Ảnh: `SPR[key][pose]` là mảng `<img>`; danh sách tư thế khai trong `SETS`.
- Tiếng: `SFX_EVENTS` là mảng `[tên, nhãn tiếng Việt]`; chưa nạp file thì dùng tiếng tự tạo
  trong `switch` của `synth()` — **thêm ô mới thì phải thêm cả `case` dự phòng**.
- Lưu trữ: `Store` (kho của Claude nếu có, không thì IndexedDB), khoá `spr_<key>` và `sfx_<tên>`.
- **Xoá riêng một ô**: mỗi ô có nút `✕` ở góc trên bên phải (class `.slotdel`), chỉ hiện khi ô
  đã có nội dung. Bấm là xoá đúng ô đó — cả trong bộ nhớ lẫn trong kho — rồi bật nút *Hoàn tác*
  (`#sprUndo` / `#sfxUndo`). Ba điều bắt buộc khi đụng vào chỗ này:
  1. **Nút `✕` phải nằm NGOÀI thẻ `<label>`** (là anh em của nó trong `.slotwrap`). Để trong
     label thì cú bấm bị label nuốt và mở luôn hộp chọn file.
  2. Cờ `.set` gắn ở **cả `.slot` lẫn `.slotwrap`** — CSS hiện nút đọc `.slotwrap.set`. Bên
     bảng tiếng mọi chỗ bật/tắt đi qua `sfxSet(nm,on)`, bên bảng ảnh qua
     `setFrames()` / `clearFrames()`; đừng sửa class hay chữ `✓` bằng tay ở chỗ khác.
  3. Xoá xong phải `inp.value=''`, không thì chọn lại **đúng cái file vừa xoá** sẽ không bắn
     sự kiện `change` — nhìn như nút nạp bị hỏng.
  Thùng rác chỉ giữ **lần xoá gần nhất** (`SPR_TRASH` / `SFX_TRASH`), mất khi tải lại trang.
  Nút xoá cả bộ ảnh giờ cũng hỏi lại và hoàn tác được, giống bên bảng tiếng.

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

## 6b. Thứ tự vẽ chữ nổi — bong bóng thoại luôn nằm trên

Mọi chữ nổi (số sát thương, băng-rôn tên chiêu, bong bóng thoại) đều nằm chung mảng
`G.floats` và trước đây vẽ đúng theo thứ tự trong mảng, nên thứ nào **đẩy vào sau thì đè
lên trên**. Hệ quả: tung chiêu ngay lúc đang nói là băng-rôn `RASENGAN!` / `DECISION!` phủ
kín câu thoại. **Người dùng chốt: lời thoại được ưu tiên, hiệu ứng chiêu chạy phía dưới.**

- `chatFloat(f)` = `f.banner && f.bubble && !f.gold` — đúng khung trắng bo góc có đuôi nhọn
  do `talk()` / tiếng than Shikamaru / câu mắng ChiChi tạo ra. Băng-rôn tên chiêu cũng là
  bong bóng nhưng **viền vàng** (`gold:true`), nên **cờ `gold` chính là ranh giới** giữa
  "lời nói" và "hiệu ứng chiêu". Đặt bong bóng thoại mới thì đừng gắn `gold`.
- Thân vẽ một dòng chữ tách thành hàm riêng `drawFloat(f)` để gọi được nhiều lượt.
- `draw()` vẽ **hai lượt**: trong vùng cắt của sàn vẽ mọi float **không phải** thoại; xong
  hết `arenaFrame()` / `drawFlashback()` / `drawCallBanner()` mới mở lại đúng vùng cắt +
  `camApply()` để vẽ đám bong bóng thoại. Nhờ lượt cuối này bong bóng nằm trên **cả băng-rôn
  giữa màn** (NARA CLAN FOREST, TWIN SHOT!!, AYANOKOUJI…) vốn vẽ ở hệ toạ độ màn hình.
- **Lúc hồi tưởng (`G.flashback`) thì bong bóng vẫn vẽ ở lượt đầu**, không đẩy lên trên:
  phân cảnh đó phủ kín màn, chữ đè lên nhìn rối.
- Bong bóng thoại chỉ được vẽ **một lượt duy nhất** — vẽ hai lượt thì viền đen và nền trắng
  chồng lên nhau, nhìn đậm hẳn lên.

Kiểm bằng `node tools/t_bubble.js`: đặt câu thoại và băng-rôn tên chiêu chồng đúng lên nhau
rồi **đếm điểm ảnh** giữa chỗ chồng — nền trắng phải chiếm >50%, viền vàng phải là 0%. Bản
cũ đo ra 35% vàng và test đổ đúng 5 mục.

---

## 7. Vẽ và tốc độ khung hình

Máy chạy test không có GPU, nên:
- `ctx.filter` tính theo **từng lệnh vẽ**, đặt rồi phải trả về `'none'`.
- Blit ảnh full màn hình với `imageSmoothingQuality='high'` **rất đắt**. Từng thử cache khung
  cảnh lãnh địa ra canvas phụ, fps **tụt** 43 → 27. Đã bỏ. Đừng thử lại hướng đó.
- Gradient phủ toàn màn hình cũng nặng — dùng dè.

---

## 7b. Ghi hình — khung dọc 9:16, nhịp khung cố định (CFR)

Nút `#rec` quay canvas sàn đấu; ô chọn `#rec916` quyết định khung video:
**1080p (1080×1920, mặc định)**, **720p (720×1280)**, hoặc khung nguyên bản. Một canvas phụ
`RECV` đúng cỡ đó, mỗi khung `recFrame()` blit canvas sàn đấu vào giữa.

> **Khung dọc chỉ có hai thứ: nền đen và nguyên canvas sàn đấu đặt giữa** — trong canvas đã
> sẵn băng-rôn tên cặp đấu có màu. **Đừng vẽ thêm chữ gì lên video.** Người dùng đã bác lần
> lượt: dải nhật ký tiếng Việt phía dưới, dòng đồng hồ và chữ AUTOBATTLE phía trên, rồi cả
> dòng tên cặp đấu tự vẽ — "chỉ cần tên màu của cặp đấu vs arena như trước giờ thôi".

### Vì sao không dùng MediaRecorder nữa

`MediaRecorder` gắn mốc thời gian theo **lúc khung tới**, nên file xuất ra là **VFR** —
khung nào vẽ chậm là giãn ra, phần mềm dựng phim hay lệch tiếng. Đường ghi chính vì vậy tự
làm:

1. `cfrPump()` chạy mỗi lượt vẽ, bù cho đủ số khung lẽ ra đã trôi qua. Khung thứ n **luôn**
   mang mốc `n/60` giây; máy khựng thì khung trước được mã hoá lại chứ mốc không xê dịch.
   Bù tối đa 8 khung mỗi lượt, quá thì dời `t0` chứ không dồn cục.
2. `VideoEncoder` (WebCodecs) mã hoá: thử `avc1` trước (Chrome thường có → H.264), không
   thì `vp09`. Khoá hình mỗi 2 giây.
3. `mp4Build()` tự dựng file MP4: `ftyp + mdat + moov`, mỗi track gom vào **một chunk** nên
   `stsc`/`stco` chỉ có một dòng. Track hình timescale `60*1000`, mỗi mẫu **1000 nhịp** ⇒
   bảng `stts` đúng **một dòng** = CFR thật.
   - Track PCM (`sowt`) khai `stsz` **cỡ mẫu cố định** (`ch*2`) và `stts` một dòng
     `[số mẫu, 1]` với timescale = tần số, nếu không bảng sẽ phình ra 44100 dòng mỗi giây.
     Có PCM thì `ftyp` thêm brand `qt  `.
4. Tiếng: **đầu thu PCM cắm thẳng vào đồ thị âm thanh** (`cfrAudioTap`) → `AudioEncoder`
   (`mp4a.40.2`, không thì `opus`) → track thứ hai (`esds` cho AAC, `dOps` cho Opus).
   - **Đừng quay lại `MediaStreamTrackProcessor`.** API đó chỉ có trên Chrome desktop; trên
     Safari/Firefox thì không, và video quay ra chỉ có mỗi track hình — người dùng gửi đúng
     một file như vậy (`avc1` một track, CFR chuẩn, không có tiếng).
   - Thứ tự thử: `AudioWorklet` (chạy trên luồng âm thanh, không rơi mẫu), không được thì
     `ScriptProcessor` (đệm 16384 cho đỡ rơi). Nạp worklet bằng **`data:` URL** — blob URL bị
     chặn khi mở game bằng `file://` (`AbortError`).
   - Đầu thu phải nối vào một `GainNode` gain 0 rồi ra `destination`, không thì đồ thị không
     được kéo.
   - Mốc thời gian của mẫu tiếng tính theo **số mẫu đã đi qua** (`st.apos`), không theo đồng
     hồ máy, nên tiếng không trôi.
   - Cấu hình bộ mã hoá theo đúng **tần số của `AudioContext`**, đừng lấy
     `track.getSettings()`: thông số track có khi lệch với dữ liệu thật, `encode()` ném lỗi
     và mất sạch tiếng.
   - AAC phải khai `aac:{format:'aac'}` cho ra AudioSpecificConfig. Vẫn chuẩn bị sẵn hai
     đường bù: `aacRaw()` lột 7~9 byte ADTS nếu bộ mã hoá trả khung bọc ADTS, `aacAsc()` tự
     dựng ASC nếu không có `description`.
   - **Đừng nuốt lỗi ở đường tiếng.** Mọi nhánh hỏng đều phải `say()` ra nhật ký, và dòng
     "Đã lưu video" nói rõ tiếng bằng codec gì / bao nhiêu mẫu, hay KHÔNG có tiếng.
   - Vòng đọc PCM hay **bị bỏ đói** lúc mã hoá hình, nên lúc dừng phải **chờ tiếng đuổi kịp
     độ dài hình** (tối đa 2.5s) rồi mới `cancel()`, không thì cụt tiếng đoạn cuối.
   - Tiếng vào trễ vài chục ms so với hình, nên track tiếng có `edts/elst` chèn một đoạn
     trống đúng bằng khoảng trễ đó.
   - Máy không có bộ mã hoá AAC thì lui về Opus-trong-MP4 và **báo cho người dùng biết**:
     Chrome/VLC nghe được nhưng vài phần mềm dựng phim thì không.
   - **Hộp mô tả codec (`esds`/`dOps`) phải nằm TRONG sample entry.** Từng dựng nó ra rồi quên
     gắn vào: Chromium vẫn giải mã Opus như thường nên test cũ báo đạt, còn Chrome giải mã AAC
     thì im tiếng hoàn toàn. `t_rec.js` giờ soi thẳng byte của `mp4a` (esds, objType 0x40,
     streamType 0x15, ASC) vì máy test không có AAC để chạy thật.

Không có WebCodecs (Firefox, Safari cũ) thì lui về `MediaRecorder` — vẫn ghi được nhưng là
VFR, và nhật ký nói rõ điều đó.

> **Thứ tự ưu tiên: CFR + AAC/Opus → CFR + PCM thô → VFR có tiếng.** Đừng bao giờ để ra file câm. Sau 1.2 giây mà chưa có mẫu PCM nào vào bộ mã hoá
> (`st.apos === 0`), `cfrNoAudio()` huỷ đường CFR và ghi lại từ đầu bằng `MediaRecorder` —
> bộ ghi đó lấy tiếng qua `MediaStream` nên chạy ở mọi trình duyệt. Xét theo `st.apos` chứ
> đừng xét `st.a`: máy yếu thì đầu ra bộ mã hoá về trễ, PCM vẫn chảy, đó không phải là câm.
> `t_rec.js` chặn lần lượt `AudioEncoder`, `AudioData`, mọi codec tiếng, rồi cả
> `AudioWorklet` + `ScriptProcessor` — cả bốn trường hợp file ra vẫn phải giải mã được tiếng.

### Safari

Người dùng quay bằng **Safari**. Safari có `VideoEncoder` (ra `avc1`) nhưng **không có
`MediaStreamTrackProcessor`**, và tuỳ đời máy có thể không có `AudioEncoder`/`AudioData` —
hai file họ gửi đều chỉ có mỗi track hình. Vì vậy:

- Thiếu `AudioEncoder`/`AudioData`, hoặc bộ mã hoá không nhả mẫu ⇒ **ghép tiếng PCM thô**
  (`sowt`) thay vì bỏ CFR. Người dùng cần CFR để up TikTok nên đây là ưu tiên; đổi lại file
  nặng thêm ~10 MB mỗi phút.
- Có PCM thì **xuất hẳn file QuickTime `.mov`** (major brand `qt  `) và sample entry `sowt`
  phải là **version 1** (kèm `samplesPerPacket`/`bytesPerPacket`/`bytesPerFrame`/
  `bytesPerSample`). Nhét `sowt` version 0 vào MP4 brand `isom` thì Safari **im tiếng** dù
  dữ liệu tiếng nằm đủ trong file — người dùng đã gửi đúng một file như vậy. TikTok nhận
  `.mov` bình thường.
- **Luôn gom PCM song song từ giây đầu**; 1.5 giây sau mới chốt: bộ mã hoá có nhả mẫu thì bỏ
  bản PCM, không thì dùng nó (đủ tiếng từ đầu trận, không hụt mấy giây đầu).
- **Số kênh của `AudioData` phải đúng bằng lúc `configure()`.** Mọi nguồn tiếng trong game
  đều mono nên đầu thu hay trả 1 kênh; cấu hình 2 kênh mà đưa 1 kênh thì `encode()` ném
  "Input audio buffer is incompatible with codec parameters" và mất sạch tiếng.
- `ScriptProcessor` **bỏ hẳn lượt gọi** khi luồng chính bận mã hoá hình (file người dùng gửi:
  tiếng 4.7s / hình 8.7s). Đo theo `e.playbackTime` để biết hụt bao nhiêu rồi **chèn im lặng
  bù** — tiếng mới không ngắn hơn hình và không trôi dần.
- Chỉ khi **không tạo nổi đầu thu PCM** (không có cả AudioWorklet lẫn ScriptProcessor) mới
  nhường cho `MediaRecorder` — VFR nhưng có tiếng.
- `cfrAudioOpen()` thử `isConfigSupported` trước, không được thì **liều `configure()` luôn**:
  Safari có lúc báo false nhưng vẫn cấu hình được.
- Bộ ghi thường gộp hình + tiếng bằng `new MediaStream([...])`, **đừng `addTrack` vào luồng
  canvas** — Safari không chịu. Danh sách mime có thêm `video/mp4` trần.
- Safari hay chặn cú bấm tải tự động, nên `recSave()` in thêm một đường dẫn bấm tay vào nhật
  ký và giữ object URL 5 phút.

Lúc bắt đầu ghi, nhật ký in một dòng chẩn đoán: `VideoEncoder <codec> · AudioEncoder <codec>
· đầu thu <AudioWorklet|ScriptProcessor>` — hỏi người dùng dòng này là biết ngay khâu nào hỏng.

Đo trên máy test không có GPU (fps trong lúc đang ghi): **1080p 55.9 · 720p 60.1 · khung
nguyên bản 59.5** (không ghi: 60.2). Đường WebCodecs còn nhẹ hơn `MediaRecorder` trước đây
(1080p chỉ được 37~45 fps). Hai chỗ vẫn phải giữ cho nhẹ:

1. **`imageSmoothingQuality='low'` cho `RECX`.** Để `'medium'`/`'high'` thì cú thu nhỏ sàn
   đấu mỗi khung kéo fps xuống còn nửa.
2. **Nền đen chỉ tô một lần** (`recPainted`): cú blit sàn đấu không đè lên hai dải đen nên
   chúng vẫn còn từ khung trước.

Vẽ theo hệ toạ độ thiết kế **1080×1920** (`RECD`) rồi `setTransform` thu về bề ngang đang chọn,
nên đổi độ phân giải không phải tính lại toạ độ. `recCanvas(wide)` dựng lại canvas khi đổi cỡ
(gán `.width` là reset luôn transform lẫn `imageSmoothing*`, nhớ đặt lại và tô nền lại).

## 8. Kiểm thử

Bộ test nằm trong `tools/`, chạy bằng Node, không cần cài gì thêm:

```bash
node tools/t_reg.js     # 15 cặp đấu song song, bắt lỗi trang, xem cơ chế lớn có nổ không
node tools/t_wake.js    # Shikamaru bật dậy: câm tiếng, xoá bong bóng, chờ đủ giây, và trần chakra (lazyCap)
node tools/t_dodge.js   # sáu luật né đòn của Shikamaru (choáng, choáng ăn theo, Sexy, lần bù)
node tools/t_drive.js   # Drive Shot: thường thì vọt lên trời, trong Eagle thì bay thẳng vào địch
node tools/t_rec.js     # ghi hình: MP4 đúng CFR (stts một dòng), tiếng giải mã ra thật, đường lui
node tools/t_slots.js   # nút ✕ xoá riêng một ô ảnh / một ô tiếng, và nút Hoàn tác
node tools/t_bubble.js  # bong bóng thoại nằm trên băng-rôn tên chiêu và băng-rôn giữa màn
node tools/t_suzune.js  # ba form của Horikita: quãng đỡ 4s, điểm lớp, Ayanokouji vào rồi rời sàn,
                        # khiêu khích kéo địch ở mọi khoảng cách, anh miễn nhiễm Sexy no Jutsu,
                        # ba ô giọng của anh + hai ô xuất hiện + bảng tiếng chia nhóm,
                        # lãnh địa Nara trói ai có thanh máu và chia đều dmg (trận thứ hai: shika vs suzune),
                        # cước chia tay không nện vào miễn thương, bốn ô dáng riêng của form 3
```

Tất cả trả mã thoát 0 khi đạt. **Chạy `t_reg.js` trước mỗi lần commit đụng tới cân bằng
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
`#testGohan`, `#testSuz2` (ép Ayanokouji đỡ đòn → form 2), `#testSuzAya` (nạp đủ 150 điểm
lớp để anh vào sân), `#testSuz3` (ép anh rời sàn → form 3).

## 9. Lỗi đã sửa — đừng làm lại

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| Video quay ra không có tiếng | `mAudioEntry()` dựng `esds`/`dOps` rồi quên gắn vào sample entry | gắn `cfg` vào cuối `mBox(type,…)`, và test soi byte thay vì chỉ đếm track |
| Video chỉ có track hình, không có track tiếng | thu PCM bằng `MediaStreamTrackProcessor` — Safari/Firefox không có API này | thu thẳng từ đồ thị âm thanh: `AudioWorklet`, không được thì `ScriptProcessor` |
| Gohan bắn vào chính ChiChi | `summonHelp` cắm cứng `team:1` | `team:c.team` + `master:c`, `foeOf` đi qua `master` |
| Mọi đòn đều thành "né" | `hurt()` thiếu `return true` | thêm lại, và kiểm giá trị trả về ở mọi nơi gọi |
| `GRUMBLE_LIFE is not defined` | khai sau chỗ `SFX_MAXLEN` dùng nó | dời hằng số lên trên |
| Shikamaru ngồi bị bẹt | mẹo `sy*.68` vốn dành cho ảnh đứng | chỉ áp dụng khi **không** có ảnh `lazy` do người dùng nạp |
| fps tụt khi cache khung cảnh | blit full màn hình đắt hơn vẽ vector | bỏ cache |
| Dải bóng bị khói bom che | vẽ chung với nền | tách ra `drawForestGrip()`, gọi sau nhân vật |
| Dáng thủ chéo tay của Horikita nhìn không ra | vẽ tay trước tóc, hai lọn tóc dài che mất | vẽ hai tay **sau** đầu và tóc, ở cuối khối vector |
| Câu thoại dài tràn ra ngoài sàn | bong bóng thoại chỉ vẽ được một dòng | `wrapTxt()` + nhánh bong bóng nhận `\n` nhiều dòng; dùng qua `talk()` |
| Ayanokouji đứng chồng lên Horikita | chỗ đứng chỉ cách 48px, mà hình rộng ~40px | giãn ra 66px và giãn luôn đội hình lúc chắn cận chiến |
| Chữ thò ra ngoài khung sàn | mọi float vẽ đúng tại `f.x/f.y`, không ai đo bề ngang chữ | đo khối chữ trước rồi kéo vào **khung đang nhìn thấy** (`W/z × H/z` quanh tâm camera), không phải cả sàn — lúc phân cảnh zoom, chỗ nằm trong sàn vẫn có thể nằm ngoài màn hình. Dòng trạng thái dưới thanh máu cũng canh theo bề ngang của chính nó |
| Mũi tên bong bóng quyết định tụt vào trong khung | lấy `min(bw/2,bh/2)` làm mép | tính giao điểm của tia với hình chữ nhật |
| Cú cước chia tay đo ra 160 thay vì 150 | test cộng dồn mọi lượng máu địch mất, mà Horikita vẫn đấm 10 dmg ở form 1 | đo **cú sụt lớn nhất trong một nhịp**, đừng cộng dồn |
| Test treo cứng, không lỗi không thoát | `pickLine()` bốc lại tới khi ra chỉ số **khác lần trước**, mà test ghim `Math.random` một hằng số nên vòng `do…while` không bao giờ ra | gọi `window.__resetLines()` (móc trong `probe.js`) trước mỗi lần ghim `Math.random` rồi mới gọi `suzDecide` — lần bốc đầu chắc chắn ăn, `pen` cũng thành số cố định để đo |
| Cước chia tay của Ayanokouji thỉnh thoảng không gây dmg | rơi trúng 0.75 giây tự miễn thương của Sexy no Jutsu, `hurt()` trả false ngay từ đầu hàm | treo cú lao lại trước mặt địch cho tới khi hết miễn thương (`SUZ.guardKickWait` làm trần chờ), và sửa dòng nhật ký báo nhầm thành "bị né" |
| Ảnh tơi tả của Horikita không hiện | `sprite()` bật cờ `inj` bằng `set.injured` — ô lùi chung, còn ô thật là `injured2`/`injured3` | cờ đọc `injArr` chọn theo form; bỏ luôn hai ô lùi chung khỏi bảng |
| Chữ trong thanh phụ thò ra ngoài thanh | `bar()` vẽ nhãn ở cỡ 15px cố định, không ai đo | `bar()` tự thu cỡ chữ cho vừa lòng thanh (sàn 9px) và truyền thêm `maxWidth` làm chặn cuối. Đây là lỗi chung của mọi nhân vật chứ không riêng Horikita: `Chakra: 1025` cũng tràn |

---

## 10. Quy trình git

- Nhánh làm việc: `claude/ayanokouji-audio-split-boxes-dqcy9e`. **Không đẩy sang nhánh khác.**
- `git push -u origin <nhánh>`; lỗi mạng thì thử lại 4 lần, giãn 2s/4s/8s/16s.
- Người dùng thường merge rất nhanh rồi hỏi luôn "pr?" / "merge đâu" — làm xong một việc thì
  **mở PR ngay**. Nếu PR trước đã merge thì mở PR mới, đừng chồng lên nhánh đã merge.
- Commit message và mô tả PR viết **tiếng Việt**, nói rõ đo được gì.
- **Không ghi tên model** vào commit, PR, hay comment trong code.

---

## 11. Còn treo

- Người dùng có lần nói tiếng bật dậy là ở **75% máu**, nhưng bản mô tả gốc và code đang để
  **80%** (`SHIKA.wakeHp = .80`). Đã hỏi hai lần chưa có câu trả lời — hiện giữ 80%.
- Bộ ảnh thẻ nhân vật (dựng bằng script trong thư mục nháp, chụp bằng Playwright,
  `deviceScaleFactor: 2`, font **Liberation Sans** — DejaVu Sans Mono thiếu chữ tiếng Việt có dấu)
  đang cũ: chưa có Shikamaru lẫn Horikita, và chưa cập nhật vài con số của Tsubasa/ChiChi.
- Ô tiếng của Horikita/Ayanokouji mới chỉ có tiếng tự tạo trong `synth()`; hai ô đọc nối tiếp
  (`suz_decide`, `suz_wrong`) đang chờ người dùng thu file TTS theo `SUZ_DECISIONS` / `SUZ_WRONG`.
