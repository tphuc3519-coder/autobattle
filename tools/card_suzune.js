/* Dựng thẻ mô tả nhân vật Horikita Suzune — hai bản: tiếng Anh và tiếng Việt.
   Cùng bố cục với thẻ Shikamaru: ảnh chân dung bên trái, tên + chỉ số bên phải,
   ba thẻ chiêu, mấy bảng nội tại, rồi khối form 3 tô vàng.

   Ảnh chân dung nhúng thẳng vào HTML dưới dạng data URI nên file HTML tạm tự chạy được.
   Chụp bằng Playwright, deviceScaleFactor 2, font Liberation Sans (DejaVu thiếu chữ có dấu).

   Chạy:  node tools/card_suzune.js
   Ra:    art/suzune_kit_en.png · art/suzune_kit_vi.png
*/
const fs = require('fs');
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const ROOT = path.join(__dirname, '..');
const PORTRAIT = process.env.SUZ_ART ||
  path.join(ROOT, 'ChatGPT Image 09_19_55 2 thg 9, 2026.png');
const OUT = path.join(ROOT, 'art');

/* ---------- số liệu, lấy đúng từ index.html ----------
   RT = 2 nên mọi mốc gs(x) hiện ra đúng bằng x giây người chơi.
   atkCd = cm(.25)*2.5 = .25*1.8*2.5 = 1.125 giây-trong-trận -> 2.25 giây người chơi,
   form 1 nhân thêm f1Slow = 1.6 -> 3.6 giây người chơi. */
const N = {
  hp: 1000, speed: 100, dodge: 0.6, reach: 68,
  f1Hit: 10, f1Cd: 3.6,
  atkCd: 2.25, f2Hit: 15, f2Cp: 15, f2HealOdds: 25, f2HealPct: 5,
  f3Hit: 20, f3Cp: 20, f3HealOdds: 35, f3HealPct: 8,
  decThink: 1.5, decCd: 3.5,
  f2Odds: 65, f2Lo: 30, f2Hi: 80, f2DecHeal: 3,
  f3Odds: 70, f3Lo: 40, f3Hi: 120, f3DecHeal: 8,
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
    sub: ['CLASS REPRESENTATIVE', 'SHE STARTS THE FIGHT AFRAID'],
    chips: [
      ['Move', N.speed], ['Dodge', N.dodge],
      ['Melee reach', N.reach], ['Opens the match', 'in Form 1']
    ],
    quote: '“What should I do in this situation?”',
    quoteSub: 'SHE ASKS IT EVERY TIME SHE STOPS TO THINK',
    portraitCap: 'STILL DECIDING',
    tierTitle: 'EVERY RIGHT CALL IS GRADED',
    tierNote: 'The grade is read off the damage the verdict deals, and its colour paints the ' +
      'banner, the bubble and the arrow while it flies.',
    tierHead: ['GRADE', 'FORM 2', 'FORM 3'],
    tierSuffix: ' DECISION',
    cards: [
      { badge: 'FORM 1 · OPENING BELL', title: 'Too Afraid to Commit',
        body: [
          `She dares to swing, and that is all. A punch or a kick for <b>${N.f1Hit} dmg</b>, ` +
          `one blow every <k>${N.f1Cd}s</k> — <b>1.6× slower</b> than she will ever be again.`,
          `<b>No Decision Making, no class points, no healing</b> yet: those are the rewards ` +
          `of confidence. Every hit she takes, she crosses both arms in front of her.`
        ] },
      { badge: `SKILL 1 · EVERY ${N.atkCd}s`, title: 'Punch &amp; Kick',
        body: [
          `She closes to arm's length and picks one of the two at random. <b>2.5× slower ` +
          `than ChiChi</b>, and it stretches with the cast-speed bar like anyone else's.`,
          `<b>Form 2</b> <k>${N.f2Hit} dmg</k> · <k>+${N.f2Cp}</k> class points · ` +
          `<k>${N.f2HealOdds}%</k> to heal <k>${N.f2HealPct}%</k> of current HP<br>` +
          `<b>Form 3</b> <k>${N.f3Hit} dmg</k> · <k>+${N.f3Cp}</k> points · ` +
          `<k>${N.f3HealOdds}%</k> to heal <k>${N.f3HealPct}%</k>`
        ] },
      { badge: 'SKILL 2 · FORM 2 AND UP', title: 'Decision Making',
        body: [
          `She stops dead and thinks for <k>${N.decThink}s</k>, then fires the answer straight ` +
          `into the enemy's face — <k>${N.decCd}s</k> more before she thinks again.`,
          `<b>Right</b> (<k>${N.f2Odds}%</k> · <k>${N.f3Odds}%</k> in Form 3) — ` +
          `<k>${N.f2Lo}–${N.f2Hi}</k> dmg (<k>${N.f3Lo}–${N.f3Hi}</k>) and exactly that many ` +
          `class points.<br><b>Wrong</b> — <r>−${N.penLo}~${N.penHi}</r> points; going below ` +
          `zero costs her that much HP, then the count resets to 0.`
        ] }
    ],
    panels: [
      { badge: `CUTSCENE · AT ${N.guardHp}% HP`, title: 'Stand up and fight.', accent: false,
        body: `Ayanokouji steps in front of her and the fight freezes. For ` +
          `<k>${N.guardT}s</k> nothing touches her — not damage, not stun, not burn, not ` +
          `bleed. He does not fade out either: he waits until the enemy has no immunity left, ` +
          `lunges, and leaves on one farewell kick. <b>Form 2 begins.</b>`,
        stats: [`Guards her for <k>${N.guardT}s</k>`,
                `Farewell kick <k>${N.kickDmg} dmg</k>`,
                `Stun <k>${N.kickStun}s</k>`,
                `The kick is credited <b>to her</b>`] },
      { badge: `${N.cpMax} CLASS POINTS · FORM 2`, title: 'Ayanokouji Joins for Real',
        accent: false,
        body: `At ${N.cpMax} points he walks back on as a real ally with his own HP bar. He ` +
          `body-blocks shots, pushes her around behind the enemy, and <b>taunts every attack ` +
          `onto himself for as long as he stands</b> — basics, skills and ultimates alike. ` +
          `A domain is the one thing a taunt cannot pull: Nara Clan Forest grips both of them ` +
          `and splits its damage evenly.`,
        stats: [`HP = <k>${N.ayaHp}%</k> of her current HP`,
                `Ambush <k>${N.ayaDmg}</k> + <k>${N.ayaStun}s</k> stun every <k>${N.ayaCd}s</k>`,
                `<k>+${N.ayaCast}%</k> cast speed for her`,
                `<b>Immune to Sexy no Jutsu</b>`] }
    ],
    ult: { badge: 'FORM 3 · SHE STANDS ALONE', title: 'From here on I fight for my own goal',
      body: `He never dies. At 0 HP he says his last line, walks off the edge of the floor and ` +
        `fades — and only then does she step up. Everything she learned holds, and every ` +
        `further ${N.cpMax} points makes it hold harder.`,
      stats: [`Hits <k>${N.f3Hit}</k> · <k>+${N.f3Cp}</k> points`,
              `Decisions <k>${N.f3Odds}%</k> right for <k>${N.f3Lo}–${N.f3Hi}</k>`,
              `<k>${N.f3HealOdds}%</k> to heal <k>${N.f3HealPct}%</k>`,
              `<k>+${N.f3Res}%</k> damage resist · <k>${N.f3Cc}%</k> CC resist`,
              `Every ${N.cpMax} points: <k>+${N.stDec}%</k> accuracy, ` +
              `<k>+${N.stHealOdds}%</k> heal chance, <k>+${N.stHealPct}%</k> heal amount, ` +
              `<k>+${N.stRes}%</k> damage resist, <k>+${N.stCc}%</k> CC resist (up to ×${N.stMax})`] },
    footer: ['KONOHAMARU · CHICHI · OZORA TSUBASA · SHIKAMARU · HORIKITA', 'FIGHTER KIT']
  },

  vi: {
    file: 'suzune_kit_vi.png',
    eyebrow: 'LỚP 1-D · NHÂN VẬT MỚI',
    name: 'HORIKITA SUZUNE',
    sub: ['LỚP TRƯỞNG', 'VÀO TRẬN VỚI MỘT NỖI SỢ'],
    chips: [
      ['Tốc chạy', N.speed], ['Né', N.dodge],
      ['Tầm tay', N.reach], ['Mở màn', 'ở form 1']
    ],
    quote: '“Mình nên làm gì trong tình huống này?”',
    quoteSub: 'CÔ HỎI CÂU ĐÓ MỖI LẦN ĐỨNG LẠI SUY NGHĨ',
    portraitCap: 'VẪN CÒN ĐANG PHÂN VÂN',
    tierTitle: 'MỖI QUYẾT ĐỊNH ĐÚNG ĐỀU ĐƯỢC CHẤM ĐIỂM',
    tierNote: 'Mức được tra theo chính lượng sát thương câu trả lời gây ra, và màu của mức tô ' +
      'luôn băng-rôn, viền bong bóng lẫn mũi tên lúc nó đang bay.',
    tierHead: ['MỨC', 'FORM 2', 'FORM 3'],
    tierSuffix: ' DECISION',
    cards: [
      { badge: 'FORM 1 · MỞ MÀN', title: 'Còn rụt rè',
        body: [
          `Cô đã dám vung tay, chỉ có vậy. Một cú đấm hoặc một cú đá <b>${N.f1Hit} dmg</b>, ` +
          `mỗi <k>${N.f1Cd} giây</k> một đòn — <b>chậm hơn 1.6 lần</b> so với sau này.`,
          `<b>Chưa có chiêu 2, chưa có điểm lớp, chưa có cửa hồi máu</b>: đó là phần thưởng ` +
          `của sự tự tin. Trúng đòn thì cô bắt chéo hai tay che trước ngực.`
        ] },
      { badge: `CHIÊU 1 · MỖI ${N.atkCd} GIÂY`, title: 'Đấm &amp; Đá',
        body: [
          `Áp sát tới tầm tay rồi bốc ngẫu nhiên một trong hai. <b>Chậm hơn ChiChi đúng ` +
          `2.5 lần</b>, và vẫn co giãn theo thanh tốc độ ra chiêu như mọi người.`,
          `<b>Form 2</b> <k>${N.f2Hit} dmg</k> · <k>+${N.f2Cp}</k> điểm lớp · ` +
          `<k>${N.f2HealOdds}%</k> hồi <k>${N.f2HealPct}%</k> máu hiện tại<br>` +
          `<b>Form 3</b> <k>${N.f3Hit} dmg</k> · <k>+${N.f3Cp}</k> điểm · ` +
          `<k>${N.f3HealOdds}%</k> hồi <k>${N.f3HealPct}%</k>`
        ] },
      { badge: 'CHIÊU 2 · TỪ FORM 2', title: 'Decision Making',
        body: [
          `Cô đứng bất động suy nghĩ <k>${N.decThink} giây</k>, rồi phóng thẳng câu trả lời ` +
          `vào mặt địch — <k>${N.decCd} giây</k> nữa mới nghĩ tiếp.`,
          `<b>Đúng</b> (<k>${N.f2Odds}%</k> · form 3 là <k>${N.f3Odds}%</k>) — ` +
          `<k>${N.f2Lo}–${N.f2Hi}</k> dmg (<k>${N.f3Lo}–${N.f3Hi}</k>) và tích đúng bằng ` +
          `chừng ấy điểm lớp.<br><b>Sai</b> — <r>−${N.penLo}~${N.penHi}</r> điểm; thủng xuống ` +
          `âm thì cô tự chịu đúng phần âm đó bằng máu, rồi tích lại từ 0.`
        ] }
    ],
    panels: [
      { badge: `PHÂN CẢNH · Ở ${N.guardHp}% MÁU`, title: '“Stand up and fight.”', accent: false,
        body: `Ayanokouji bước ra đứng chắn trước mặt cô, trận đấu đóng băng. Trong ` +
          `<k>${N.guardT} giây</k> không gì chạm được vào cô — không sát thương, không choáng, ` +
          `không cháy, không chảy máu. Anh cũng không lặng lẽ biến mất: chờ tới lúc địch hết ` +
          `miễn thương, lao tới, rồi tung một cước chia tay. <b>Form 2 bắt đầu.</b>`,
        stats: [`Đỡ đòn thay <k>${N.guardT} giây</k>`,
                `Cước chia tay <k>${N.kickDmg} dmg</k>`,
                `Choáng <k>${N.kickStun} giây</k>`,
                `Cú cước đứng tên <b>Horikita</b>`] },
      { badge: `${N.cpMax} ĐIỂM LỚP · FORM 2`, title: 'Ayanokouji vào sân thật',
        accent: false,
        body: `Đủ ${N.cpMax} điểm là anh trở lại làm đồng minh thật, có thanh máu riêng. Anh ` +
          `dịch chuyển chắn đạn, đẩy cô vòng ra sau lưng địch, và <b>khiêu khích kéo mọi đòn ` +
          `về mình suốt quãng còn đứng trên sàn</b> — chiêu thường, chiêu lớn, ultimate đều ` +
          `vậy. Lãnh địa là thứ duy nhất khiêu khích không kéo nổi: rừng Nara trói cả hai và ` +
          `chia đều sát thương.`,
        stats: [`Máu = <k>${N.ayaHp}%</k> máu hiện tại của cô`,
                `Đột kích <k>${N.ayaDmg}</k> + choáng <k>${N.ayaStun} giây</k> mỗi <k>${N.ayaCd} giây</k>`,
                `<k>+${N.ayaCast}%</k> tốc ra chiêu cho cô`,
                `<b>Miễn nhiễm Sexy no Jutsu</b>`] }
    ],
    ult: { badge: 'FORM 3 · TỰ ĐỨNG MỘT MÌNH',
      title: 'Từ đây mình chiến đấu cho mục tiêu của riêng mình',
      body: `Anh không bao giờ chết. Cạn máu thì anh nói câu cuối, đi bộ ra khỏi mép sàn rồi ` +
        `mờ dần — đi hẳn rồi cô mới bước lên. Mọi thứ cô học được vẫn còn đó, và cứ thêm ` +
        `${N.cpMax} điểm nữa là nó lại chắc thêm một bậc.`,
      stats: [`Đòn tay <k>${N.f3Hit}</k> · <k>+${N.f3Cp}</k> điểm`,
              `Quyết định đúng <k>${N.f3Odds}%</k>, ăn <k>${N.f3Lo}–${N.f3Hi}</k> dmg`,
              `<k>${N.f3HealOdds}%</k> hồi <k>${N.f3HealPct}%</k> máu`,
              `<k>+${N.f3Res}%</k> miễn thương · <k>${N.f3Cc}%</k> kháng hiệu ứng`,
              `Mỗi ${N.cpMax} điểm: <k>+${N.stDec}%</k> tỉ lệ đúng, ` +
              `<k>+${N.stHealOdds}%</k> tỉ lệ hồi, <k>+${N.stHealPct}%</k> lượng hồi, ` +
              `<k>+${N.stRes}%</k> miễn thương, <k>+${N.stCc}%</k> kháng hiệu ứng (trần ×${N.stMax})`] },
    footer: ['KONOHAMARU · CHICHI · OZORA TSUBASA · SHIKAMARU · HORIKITA', 'BẢNG KỸ NĂNG']
  }
};

/* ---------- dựng HTML ---------- */
const img = 'data:image/png;base64,' + fs.readFileSync(PORTRAIT).toString('base64');

const card = c => `
  <section class="card">
    <span class="badge">${c.badge}</span>
    <h3>${c.title}</h3>
    ${c.body.map(p => `<p>${p}</p>`).join('')}
  </section>`;

const panel = (p, gold) => `
  <section class="panel${gold ? ' gold' : ''}">
    <span class="badge${gold ? ' bgold' : ''}">${p.badge}</span>
    <h3>${p.title}</h3>
    <div class="split">
      <p>${p.body}</p>
      <ul class="stats">${p.stats.map(s => `<li>${s}</li>`).join('')}</ul>
    </div>
  </section>`;

const tierTable = t => `
  <section class="panel">
    <span class="badge">${t.tierTitle}</span>
    <div class="split">
      <p>${t.tierNote}</p>
      <table class="tiers">
        <tr><th>${t.tierHead[0]}</th><th>${t.tierHead[1]}</th><th>${t.tierHead[2]}</th></tr>
        ${TIERS.map(([ten, a, b, mau]) => `<tr>
          <td style="color:${mau}">${ten}${t.tierSuffix}</td>
          <td><k>${a}</k></td><td><k>${b}</k></td></tr>`).join('')}
      </table>
    </div>
  </section>`;

const page = t => `<!doctype html><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:790px;background:#07070d;font-family:'Liberation Sans',Arial,sans-serif;
       color:#e8ecf7;padding:26px 30px 22px}
  .wrap{position:relative}
  .ghost{position:absolute;top:4px;left:4px;font-size:10.5px;letter-spacing:3.4px;
         color:#131623;white-space:nowrap}
  header{display:flex;gap:26px;margin-bottom:26px;position:relative}
  .pcard{width:212px;flex:none;background:linear-gradient(160deg,#141a34,#0d1020);
         border:1px solid #26304f;border-radius:16px;padding:14px 14px 10px;text-align:center}
  .pcard img{width:100%;display:block;border-radius:10px}
  .pcap{margin-top:9px;font-size:9.5px;letter-spacing:2.6px;color:#7c88a6}
  .id{padding-top:30px}
  .eyebrow{font-size:11px;letter-spacing:3.4px;color:#FFCF3F;font-weight:bold}
  h1{font-size:44px;letter-spacing:.5px;color:#9FD4FF;margin:6px 0 6px}
  .sub{font-size:10.5px;letter-spacing:2px;color:#8e9ab8;white-space:nowrap}
  .sub i{display:inline-block;width:34px;height:1px;background:#3b4666;
         vertical-align:middle;margin:0 10px}
  .chips{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 16px}
  .chip{border:1px solid #2b3557;border-radius:8px;padding:7px 13px;font-size:12.5px;
        color:#b9c4dc;background:#101528}
  .chip b{color:#7FC8FF;font-weight:bold}
  .quote{border-left:3px solid #7FC8FF;padding-left:14px}
  .quote p{font-size:17px;font-style:italic;color:#dfe6f5}
  .quote span{display:block;margin-top:6px;font-size:9.5px;letter-spacing:2.2px;color:#7c88a6}
  .row{display:flex;gap:14px;margin-bottom:16px}
  .card,.panel{background:linear-gradient(170deg,#141a33,#0e1122);border:1px solid #26304f;
               border-top:2px solid #6E9BFF;border-radius:13px;padding:15px 17px 17px}
  .card{flex:1}
  .panel{margin-bottom:16px}
  .badge{display:inline-block;background:#7FC8FF;color:#0a1020;font-size:9.5px;font-weight:bold;
         letter-spacing:1.6px;border-radius:5px;padding:4px 9px;white-space:nowrap}
  h3{font-size:19px;margin:11px 0 9px}
  p{font-size:13.4px;line-height:1.62;color:#c3cce0;margin-bottom:9px}
  p:last-child{margin-bottom:0}
  b{color:#eef2fb}
  k{color:#7FC8FF;font-weight:bold}
  r{color:#FF7B7B;font-weight:bold}
  .split{display:flex;gap:22px}
  .badge+.split{margin-top:12px}
  .split p{flex:1;margin:0}
  .stats{list-style:none;width:262px;flex:none;border-left:1px solid #26304f;padding-left:20px;
         font-size:12.4px;line-height:1.55;color:#aab6d0}
  .stats li{margin-bottom:6px;font-weight:bold}
  .stats li:last-child{margin-bottom:0}
  .tiers{width:300px;flex:none;border-collapse:collapse;font-size:12.4px}
  .tiers th{text-align:left;font-size:9.5px;letter-spacing:1.8px;color:#7c88a6;
            padding:0 14px 7px 0;font-weight:bold}
  .tiers td{padding:4px 14px 4px 0;font-weight:bold;white-space:nowrap}
  .gold{border-top-color:#FFCF3F;background:linear-gradient(170deg,#2a2113,#14110d)}
  .gold h3{color:#FFCF3F}
  .bgold{background:#FFCF3F}
  .gold k{color:#FFCF3F}
  footer{display:flex;justify-content:space-between;border-top:1px solid #1b2138;
         margin-top:8px;padding-top:14px;font-size:9.5px;letter-spacing:2.6px;color:#59637e}
</style>
<div class="wrap">
  <div class="ghost">${t.footer[0]}</div>
  <header>
    <div class="pcard"><img src="${img}"><div class="pcap">${t.portraitCap}</div></div>
    <div class="id">
      <div class="eyebrow">${t.eyebrow}</div>
      <h1>${t.name}</h1>
      <div class="sub">${t.sub[0]}<i></i>${t.sub[1]}</div>
      <div class="chips">${t.chips.map(([k, v]) => `<div class="chip">${k} <b>${v}</b></div>`).join('')}</div>
      <div class="quote"><p>${t.quote}</p><span>${t.quoteSub}</span></div>
    </div>
  </header>
  <div class="row">${t.cards.map(card).join('')}</div>
  ${panel(t.panels[0], false)}
  ${tierTable(t)}
  ${panel(t.panels[1], false)}
  ${panel(t.ult, true)}
  <footer><span>${t.footer[0]}</span><span>${t.footer[1]}</span></footer>
</div>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 790, height: 1400 }, deviceScaleFactor: 2 });
  const pg = await ctx.newPage();
  await pg.route('**://fonts.*/**', r => r.abort());
  for (const lang of Object.keys(T)) {
    const t = T[lang];
    const tmp = path.join(require('os').tmpdir(), `suz_card_${lang}.html`);
    fs.writeFileSync(tmp, page(t));
    await pg.goto('file://' + tmp);
    await pg.waitForTimeout(250);
    const out = path.join(OUT, t.file);
    await pg.screenshot({ path: out, fullPage: true });
    console.log('->', path.relative(ROOT, out));
  }
  await browser.close();
})();
