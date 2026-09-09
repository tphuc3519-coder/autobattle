/* Cân bằng Beatrice — đo TỈ LỆ THẮNG thật, không đoán.
   Chạy: node tools/t_bea_balance.js [số lượt mỗi cặp]

   Mỗi cặp chạy `LUOT` trận tới khi ngã ngũ (hoặc chạm trần thời gian), ghi lại ai thắng và
   người thắng còn bao nhiêu máu. Máu còn lại mới là thứ nói lên trận đó sát nút hay một
   chiều — thắng mà còn 90% máu nghĩa là đối thủ gần như không chạm được vào người. */
const { build, playwright } = require('./probe');

const DICH = ['kono', 'chichi', 'tsubasa', 'shika', 'suzune', 'ginyu', 'dora', 'superman'];
const LUOT = +(process.argv[2] || 2);
const MOC = 90;            // giây trong trận: quá mốc này thì coi như hoà, không ai hạ nổi ai

(async () => {
  const file = build();
  const { chromium } = playwright();
  const browser = await chromium.launch();

  const danh = async (dich, seed) => {
    const page = await browser.newPage({ viewport: { width: 700, height: 960 } });
    await page.route('**://fonts.*/**', r => r.abort());
    const loi = [];
    page.on('pageerror', e => loi.push(e.message));
    await page.goto('file://' + file, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    await page.click('#mTabDuel');
    await page.click('#listA .cTile[data-key="beatrice"]');
    await page.click(`#listB .cTile[data-key="${dich}"]`);
    await page.click('#cselGo');
    await page.selectOption('#speed', '1');
    await page.click('#play');

    const r = await page.evaluate(moc => new Promise(res => {
      const G = window.__G();
      const id = setInterval(() => {
        if (G.over || G.t > moc) {
          clearInterval(id);
          const song = G.fighters.filter(f => f && !f.summon);
          const b = song.find(f => f.key === 'beatrice');
          const d = song.find(f => f.key !== 'beatrice') || song[0];
          res({ t: +G.t.toFixed(0), over: !!G.over,
                win: G.winner ? G.winner.key : null,
                bHp: b ? Math.round(b.hp) : 0, dHp: d ? Math.round(d.hp) : 0,
                bMax: b ? b.maxHp : 800 });
        }
      }, 50);
      setTimeout(() => { clearInterval(id); res({ t: -1, over: false, win: null, bHp: 0, dHp: 0, bMax: 800 }); }, 120000);
    }), MOC);
    await page.close();
    return { dich, seed, ...r, loi: loi.length };
  };

  const viec = [];
  for (const d of DICH) for (let s = 0; s < LUOT; s++) viec.push([d, s]);

  const out = [];
  const LO = 4;                       // máy test không có GPU: mở nhiều trang một lúc là đo lệch
  for (let i = 0; i < viec.length; i += LO) {
    out.push(...await Promise.all(viec.slice(i, i + LO).map(v => danh(v[0], v[1]))));
    process.stdout.write('.');
  }
  console.log('');
  await browser.close();

  let thang = 0, tong = 0, hoa = 0, mauCon = 0;
  const theoDich = {};
  for (const r of out) {
    const k = r.dich;
    theoDich[k] = theoDich[k] || { w: 0, l: 0, h: 0, hp: [] };
    tong++;
    if (!r.over) { hoa++; theoDich[k].h++; continue; }
    if (r.win === 'beatrice') { thang++; theoDich[k].w++; mauCon += r.bHp / r.bMax; theoDich[k].hp.push(Math.round(r.bHp / r.bMax * 100)); }
    else theoDich[k].l++;
  }
  console.log('doi thu      | Beatrice thang | thua | het gio | mau con lai cua co khi thang');
  for (const k of DICH) {
    const t = theoDich[k];
    console.log(`${k.padEnd(12)} | ${String(t.w).padStart(14)} | ${String(t.l).padStart(4)} | ${String(t.h).padStart(7)} | ${t.hp.length ? t.hp.map(x => x + '%').join(' ') : '-'}`);
  }
  const tyLe = tong ? thang / tong : 0;
  console.log(`\nTONG: thang ${thang}/${tong} = ${Math.round(tyLe * 100)}%  (het gio ${hoa})`);
  if (thang) console.log(`Trung binh mau con lai khi thang: ${Math.round(mauCon / thang * 100)}%`);
  console.log(`Loi trang: ${out.reduce((a, r) => a + r.loi, 0)}`);
})().catch(e => { console.error(e); process.exit(1); });
