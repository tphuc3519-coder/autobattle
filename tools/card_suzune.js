/* Dựng thẻ mô tả nhân vật Horikita Suzune — hai bản: tiếng Anh và tiếng Việt.
   Khung **dọc 9:16 đúng 1080×1920**, vừa để đăng TikTok: nội dung xếp thành lưới
   (3 thẻ chiêu · 2 bảng · 2 bảng) và viết bằng gạch đầu dòng thay cho đoạn văn,
   nếu không thì không thể nào gói đủ trong tỉ lệ 1.78.

   Ảnh chân dung nhúng thẳng vào HTML dưới dạng data URI nên file HTML tạm tự chạy được.
   Chụp bằng Playwright, deviceScaleFactor 1 (vẽ thẳng ở 1080 nên chữ đã đủ to),
   font Liberation Sans — DejaVu thiếu chữ tiếng Việt có dấu.

   Chạy:  node tools/card_suzune.js
   Ra:    art/suzune_kit_en.png · art/suzune_kit_vi.png  (cả hai đúng 1080×1920)
*/
const fs = require('fs');
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const ROOT = path.join(__dirname, '..');
const PORTRAIT = process.env.SUZ_ART ||
  path.join(ROOT, 'ChatGPT Image 09_19_55 2 thg 9, 2026.png');
const OUT = path.join(ROOT, 'art');
const W = 1080, H = 1920;

/* ---------- số liệu, lấy đúng từ index.html ----------
   RT = 2 nên mọi mốc gs(x) hiện ra đúng bằng x giây người chơi.
   atkCd = cm(.25)*2.5 = .25*1.8*2.5 = 1.125 giây-trong-trận -> 2.25 giây người chơi,
   form 1 nhân thêm f1Slow = 1.6 -> 3.6 giây người chơi. */
const N = {
  speed: 100, dodge: 0.6, reach: 68,
  f1Hit: 10, f1Cd: 3.6,
  atkCd: 2.25, f2Hit: 15, f2Cp: 15, f2HealOdds: 25, f2HealPct: 5,
  f3Hit: 20, f3Cp: 20, f3HealOdds: 35, f3HealPct: 8,
  decThink: 1.5, decCd: 3.5,
  f2Odds: 65, f2Lo: 30, f2Hi: 80,
  f3Odds: 70, f3Lo: 40, f3Hi: 120,
  penLo: 5, penHi: 60, cpMax: 150,
  guardHp: 90, guardT: 5, kickDmg: 150, kickStun: 2,
  ayaHp: 35, ayaDmg: 40, ayaStun: 1.25, ayaCd: 4.5, ayaCast: 100,
  f3Res: 10, f3Cc: 10,
  stDec: 5, stHealOdds: 5, stHealPct: 6, stRes: 8, stCc: 8, stMax: 5
};

const TIERS = [
  ['ACCEPTABLE', '30–40', '40–70', '#A9BDD6'],
  ['GOOD', '41–60', '71–90', '#7FC8FF'],
  ['GREAT', '61–70', '91–110', '#7DEBAB'],
  ['BEST', '71–80', '111–120', '#FFE100']
];

const T = {
  en: {
    file: 'suzune_kit_en.png',
    eyebrow: 'CLASS 1-D · NEW FIGHTER',
    name: 'HORIKITA SUZUNE',
    sub: 'CLASS REPRESENTATIVE · MELEE · 1000 HP',
    chips: [['Move', N.speed], ['Dodge', N.dodge], ['Reach', N.reach], ['Opens in', 'Form 1']],
    quote: '“What should I do in this situation?”',
    portraitCap: 'THREE FORMS · SHE STARTS AFRAID',
    cards: [
      { badge: 'FORM 1 · OPENING BELL', title: 'Too Afraid to Commit', items: [
        `Punch or kick, <k>${N.f1Hit} dmg</k>`,
        `One blow every <k>${N.f1Cd}s</k> — <b>1.6× slower</b>`,
        `<b>No Skill 2, no class points, no healing</b>`,
        `Crosses both arms whenever she is hit`] },
      { badge: `SKILL 1 · EVERY ${N.atkCd}s`, title: 'Punch &amp; Kick', items: [
        `Random of the two · <b>2.5× slower than ChiChi</b>`,
        `<b>Form 2</b> <k>${N.f2Hit} dmg</k> · <k>+${N.f2Cp}</k> pts · ` +
        `<k>${N.f2HealOdds}%</k> heal <k>${N.f2HealPct}%</k>`,
        `<b>Form 3</b> <k>${N.f3Hit} dmg</k> · <k>+${N.f3Cp}</k> pts · ` +
        `<k>${N.f3HealOdds}%</k> heal <k>${N.f3HealPct}%</k>`,
        `Healing is a <b>% of current HP</b>`] },
      { badge: 'SKILL 2 · FORM 2 AND UP', title: 'Decision Making', items: [
        `Freezes to think <k>${N.decThink}s</k>, then <k>${N.decCd}s</k> off`,
        `<b>Right</b> <k>${N.f2Odds}%</k>/<k>${N.f3Odds}%</k> — ` +
        `<k>${N.f2Lo}–${N.f2Hi}</k> / <k>${N.f3Lo}–${N.f3Hi}</k> dmg`,
        `Damage dealt = class points gained`,
        `<b>Wrong</b> <r>−${N.penLo}~${N.penHi}</r> pts · below zero costs her that HP`] }
    ],
    mid: [
      { badge: `CUTSCENE · AT ${N.guardHp}% HP`, title: '“Stand up and fight.”',
        note: 'Ayanokouji steps in front of her, then leaves on one farewell kick.',
        items: [`Nothing touches her for <k>${N.guardT}s</k> — damage, stun, burn, bleed`,
                `Kick <k>${N.kickDmg} dmg</k> + <k>${N.kickStun}s</k> stun, credited <b>to her</b>`,
                `<b>Form 2 begins</b>`] },
      { badge: 'EVERY RIGHT CALL IS GRADED', tier: true,
        note: 'Read off the damage the verdict deals; its colour paints the banner and the bubble.',
        head: ['GRADE', 'FORM 2', 'FORM 3'] }
    ],
    low: [
      { badge: `${N.cpMax} CLASS POINTS`, title: 'Ayanokouji Joins for Real', items: [
        `HP = <k>${N.ayaHp}%</k> of her current HP`,
        `Ambush <k>${N.ayaDmg}</k> + <k>${N.ayaStun}s</k> stun every <k>${N.ayaCd}s</k>`,
        `<k>+${N.ayaCast}%</k> cast speed for her`,
        `<b>Taunts every attack onto himself</b>, ultimates included`,
        `Body-blocks shots · <b>immune to Sexy no Jutsu</b>`,
        `A domain grips both and splits its damage`] },
      { badge: 'FORM 3 · SHE STANDS ALONE', title: 'He walks away, never dies', gold: true,
        items: [`Hits <k>${N.f3Hit}</k> · <k>+${N.f3Cp}</k> pts · decisions <k>${N.f3Odds}%</k> right`,
                `<k>${N.f3HealOdds}%</k> to heal <k>${N.f3HealPct}%</k> of current HP`,
                `<k>+${N.f3Res}%</k> damage resist · <k>${N.f3Cc}%</k> CC resist`,
                `Every <k>${N.cpMax}</k> more points, up to <k>×${N.stMax}</k>:`,
                `<k>+${N.stDec}%</k> accuracy · <k>+${N.stHealOdds}%</k> heal chance · ` +
                `<k>+${N.stHealPct}%</k> heal`,
                `<k>+${N.stRes}%</k> damage resist · <k>+${N.stCc}%</k> CC resist`] }
    ],
    footer: ['KONOHAMARU · CHICHI · OZORA TSUBASA · SHIKAMARU · HORIKITA', 'FIGHTER KIT']
  },

  vi: {
    file: 'suzune_kit_vi.png',
    eyebrow: 'LỚP 1-D · NHÂN VẬT MỚI',
    name: 'HORIKITA SUZUNE',
    sub: 'LỚP TRƯỞNG · CẬN CHIẾN · 1000 MÁU',
    chips: [['Tốc chạy', N.speed], ['Né', N.dodge], ['Tầm tay', N.reach], ['Mở màn', 'form 1']],
    quote: '“Mình nên làm gì trong tình huống này?”',
    portraitCap: 'BA FORM · MỞ MÀN BẰNG NỖI SỢ',
    cards: [
      { badge: 'FORM 1 · MỞ MÀN', title: 'Còn rụt rè', items: [
        `Đấm hoặc đá, <k>${N.f1Hit} dmg</k>`,
        `Mỗi <k>${N.f1Cd} giây</k> một đòn — <b>chậm hơn 1.6 lần</b>`,
        `<b>Chưa có chiêu 2, chưa có điểm lớp, chưa hồi máu</b>`,
        `Trúng đòn thì bắt chéo hai tay che trước ngực`] },
      { badge: `CHIÊU 1 · MỖI ${N.atkCd} GIÂY`, title: 'Đấm &amp; Đá', items: [
        `Bốc ngẫu nhiên · <b>chậm hơn ChiChi 2.5 lần</b>`,
        `<b>Form 2</b> <k>${N.f2Hit} dmg</k> · <k>+${N.f2Cp}</k> điểm · ` +
        `<k>${N.f2HealOdds}%</k> hồi <k>${N.f2HealPct}%</k>`,
        `<b>Form 3</b> <k>${N.f3Hit} dmg</k> · <k>+${N.f3Cp}</k> điểm · ` +
        `<k>${N.f3HealOdds}%</k> hồi <k>${N.f3HealPct}%</k>`,
        `Hồi máu tính theo <b>% máu hiện tại</b>`] },
      { badge: 'CHIÊU 2 · TỪ FORM 2', title: 'Decision Making', items: [
        `Đứng nghĩ <k>${N.decThink} giây</k>, rồi <k>${N.decCd} giây</k> mới nghĩ tiếp`,
        `<b>Đúng</b> <k>${N.f2Odds}%</k>/<k>${N.f3Odds}%</k> — ` +
        `<k>${N.f2Lo}–${N.f2Hi}</k> / <k>${N.f3Lo}–${N.f3Hi}</k> dmg`,
        `Gây bao nhiêu sát thương thì tích bấy nhiêu điểm`,
        `<b>Sai</b> <r>−${N.penLo}~${N.penHi}</r> điểm · thủng âm thì tự chịu bằng máu`] }
    ],
    mid: [
      { badge: `PHÂN CẢNH · Ở ${N.guardHp}% MÁU`, title: '“Stand up and fight.”',
        note: 'Ayanokouji bước ra chắn trước mặt cô, rồi rời sàn bằng một cước chia tay.',
        items: [`<k>${N.guardT} giây</k> không gì chạm được: sát thương, choáng, cháy, chảy máu`,
                `Cước <k>${N.kickDmg} dmg</k> + choáng <k>${N.kickStun} giây</k>, đứng tên <b>cô</b>`,
                `<b>Form 2 bắt đầu</b>`] },
      { badge: 'MỖI QUYẾT ĐỊNH ĐÚNG ĐỀU CÓ MỨC', tier: true,
        note: 'Tra theo chính lượng sát thương gây ra; màu của mức tô luôn băng-rôn và bong bóng.',
        head: ['MỨC', 'FORM 2', 'FORM 3'] }
    ],
    low: [
      { badge: `${N.cpMax} ĐIỂM LỚP`, title: 'Ayanokouji vào sân thật', items: [
        `Máu = <k>${N.ayaHp}%</k> máu hiện tại của cô`,
        `Đột kích <k>${N.ayaDmg}</k> + choáng <k>${N.ayaStun} giây</k> mỗi <k>${N.ayaCd} giây</k>`,
        `<k>+${N.ayaCast}%</k> tốc ra chiêu cho cô`,
        `<b>Khiêu khích kéo mọi đòn về mình</b>, kể cả ultimate`,
        `Chắn đạn thay cô · <b>miễn nhiễm Sexy no Jutsu</b>`,
        `Lãnh địa thì trói cả hai và chia đều sát thương`] },
      { badge: 'FORM 3 · TỰ ĐỨNG MỘT MÌNH', title: 'Anh rời sàn, không bao giờ chết', gold: true,
        items: [`Đòn tay <k>${N.f3Hit}</k> · <k>+${N.f3Cp}</k> điểm · quyết định đúng <k>${N.f3Odds}%</k>`,
                `<k>${N.f3HealOdds}%</k> hồi <k>${N.f3HealPct}%</k> máu hiện tại`,
                `<k>+${N.f3Res}%</k> miễn thương · <k>${N.f3Cc}%</k> kháng hiệu ứng`,
                `Cứ thêm <k>${N.cpMax}</k> điểm, trần <k>×${N.stMax}</k>:`,
                `<k>+${N.stDec}%</k> tỉ lệ đúng · <k>+${N.stHealOdds}%</k> tỉ lệ hồi · ` +
                `<k>+${N.stHealPct}%</k> lượng hồi`,
                `<k>+${N.stRes}%</k> miễn thương · <k>+${N.stCc}%</k> kháng hiệu ứng`] }
    ],
    footer: ['KONOHAMARU · CHICHI · OZORA TSUBASA · SHIKAMARU · HORIKITA', 'BẢNG KỸ NĂNG']
  }
};

/* ---------- dựng HTML ---------- */
const img = 'data:image/png;base64,' + fs.readFileSync(PORTRAIT).toString('base64');

const list = it => `<ul>${it.map(s => `<li>${s}</li>`).join('')}</ul>`;

const block = b => `
  <section class="box${b.gold ? ' gold' : ''}">
    <span class="badge${b.gold ? ' bgold' : ''}">${b.badge}</span>
    ${b.title ? `<h3>${b.title}</h3>` : ''}
    ${b.note ? `<p>${b.note}</p>` : ''}
    ${b.tier
      ? `<table class="tiers">
           <tr><th>${b.head[0]}</th><th>${b.head[1]}</th><th>${b.head[2]}</th></tr>
           ${TIERS.map(([ten, a, c, mau]) => `<tr><td style="color:${mau}">${ten}</td>
             <td><k>${a}</k></td><td><k>${c}</k></td></tr>`).join('')}
         </table>`
      : list(b.items)}
  </section>`;

const page = t => `<!doctype html><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${W}px;height:${H}px;overflow:hidden}
  body{background:#07070d;font-family:'Liberation Sans',Arial,sans-serif;color:#e8ecf7;
       padding:38px 38px 30px;display:flex;flex-direction:column;gap:18px}
  header{display:flex;gap:34px;margin-bottom:auto}
    .pcard{width:366px;flex:none;background:linear-gradient(160deg,#141a34,#0d1020);
         border:1px solid #26304f;border-radius:18px;padding:18px 18px 14px;text-align:center}
  .pcard img{width:100%;display:block;border-radius:12px}
    .pcap{margin-top:13px;font-size:14px;letter-spacing:2.2px;color:#7c88a6;font-weight:bold}
  .id{padding-top:10px;flex:1}
    .eyebrow{font-size:18px;letter-spacing:4px;color:#FFCF3F;font-weight:bold}
    h1{font-size:60px;letter-spacing:.5px;color:#9FD4FF;margin:10px 0 10px;white-space:nowrap}
    .sub{font-size:18px;letter-spacing:2.4px;color:#8e9ab8;font-weight:bold}
    .chips{display:flex;flex-wrap:wrap;gap:11px;margin:22px 0 22px}
  .chip{border:1px solid #2b3557;border-radius:10px;padding:11px 17px;font-size:19.5px;
        color:#b9c4dc;background:#101528}
  .chip b{color:#7FC8FF}
  .quote{border-left:4px solid #7FC8FF;padding-left:18px;font-size:27px;font-style:italic;
         color:#dfe6f5}
      .row{display:flex;gap:18px;margin-bottom:auto}
  .box{flex:1;background:linear-gradient(170deg,#141a33,#0e1122);border:1px solid #26304f;
       border-top:3px solid #6E9BFF;border-radius:16px;padding:19px 21px 21px}
  .badge{display:inline-block;background:#7FC8FF;color:#0a1020;font-size:14px;font-weight:bold;
         letter-spacing:1.6px;border-radius:6px;padding:6px 11px;white-space:nowrap}
      h3{font-size:31px;margin:14px 0 12px}
      p{font-size:21px;line-height:1.5;color:#aab6d0;margin-bottom:12px}
  ul{list-style:none}
      li{font-size:22px;line-height:1.42;color:#c3cce0;margin-bottom:11px;padding-left:19px;
     position:relative}
  li:last-child{margin-bottom:0}
  li:before{content:'';position:absolute;left:0;top:11px;width:7px;height:7px;border-radius:50%;
            background:#4d6699}
  b{color:#eef2fb}
  k{color:#7FC8FF;font-weight:bold}
  r{color:#FF7B7B;font-weight:bold}
    .tiers{width:100%;border-collapse:collapse;font-size:22px;margin-top:4px}
    .tiers th{text-align:left;font-size:13.5px;letter-spacing:1.6px;color:#7c88a6;
            padding:0 10px 8px 0;font-weight:bold}
    .tiers td{padding:8px 10px 8px 0;font-weight:bold;white-space:nowrap}
  .gold{border-top-color:#FFCF3F;background:linear-gradient(170deg,#2a2113,#14110d)}
  .gold h3{color:#FFCF3F}
  .gold k{color:#FFCF3F}
  .gold li:before{background:#8a6f2a}
  .bgold{background:#FFCF3F}
  footer{display:flex;justify-content:space-between;border-top:1px solid #1b2138;
         padding-top:16px;font-size:14px;letter-spacing:2.6px;color:#59637e}
</style>
<header>
  <div class="pcard"><img src="${img}"><div class="pcap">${t.portraitCap}</div></div>
  <div class="id">
    <div class="eyebrow">${t.eyebrow}</div>
    <h1>${t.name}</h1>
    <div class="sub">${t.sub}</div>
    <div class="chips">${t.chips.map(([k, v]) => `<div class="chip">${k} <b>${v}</b></div>`).join('')}</div>
    <div class="quote">${t.quote}</div>
  </div>
</header>
<div class="row">${t.cards.map(block).join('')}</div>
<div class="row">${t.mid.map(block).join('')}</div>
<div class="row">${t.low.map(block).join('')}</div>
<footer><span>${t.footer[0]}</span><span>${t.footer[1]}</span></footer>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  await pg.route('**://fonts.*/**', r => r.abort());
  let bad = 0;
  for (const lang of Object.keys(T)) {
    const t = T[lang];
    const tmp = path.join(require('os').tmpdir(), `suz_card_${lang}.html`);
    fs.writeFileSync(tmp, page(t));
    await pg.goto('file://' + tmp);
    await pg.waitForTimeout(250);
    /* Khung cứng 9:16 nên phải tự soi: chữ tràn ra ngoài thì bị cắt mất chứ không
       đẩy ảnh dài thêm — nhìn ảnh xuất ra không phải lúc nào cũng thấy. */
    const over = await pg.evaluate(() => {
      const rows = [...document.querySelectorAll('.row')];
      const bot = rows[rows.length - 1].getBoundingClientRect().bottom;
      return Math.ceil(bot - document.querySelector('footer').getBoundingClientRect().top);
    });
    if (over > 0) { console.error(`!! ${lang}: tràn ${over}px, phải cắt bớt chữ`); bad = 1; }
    const out = path.join(OUT, t.file);
    await pg.screenshot({ path: out, clip: { x: 0, y: 0, width: W, height: H } });
    console.log('->', path.relative(ROOT, out), `${W}x${H}`, over <= 0 ? `(dư ${-over}px)` : '');
  }
  await browser.close();
  process.exit(bad);
})();
