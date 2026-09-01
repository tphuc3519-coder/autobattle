/* Chạy đủ 15 cặp đấu (10 cặp khác nhau + 5 trận gương) song song, xem có trận nào
   ném lỗi trang không và các cơ chế lớn có thật sự nổ ra không.
   Chạy: node tools/t_reg.js */
const { build, playwright } = require('./probe');

const K = ['kono', 'chichi', 'tsubasa', 'shika', 'suzune'];
const MOC = 60;          // giây trong trận, đủ để một trận ngã ngũ

(async () => {
  const file = build();
  const { chromium } = playwright();
  const browser = await chromium.launch();

  const pairs = [];
  for (let i = 0; i < K.length; i++) for (let j = i; j < K.length; j++) pairs.push([K[i], K[j]]);

  const run = async ([a, c]) => {
    const page = await browser.newPage({ viewport: { width: 700, height: 960 } });
    await page.route('**://fonts.*/**', r => r.abort());
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + file, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    await page.click(`#listA .cTile[data-key="${a}"]`);
    await page.click(`#listB .cTile[data-key="${c}"]`);
    await page.click('#cselGo');
    await page.selectOption('#speed', '1');       // chạy nhanh cho đỡ tốn thời gian thật
    await page.click('#play');

    const r = await page.evaluate(moc => new Promise(res => {
      const G = window.__G(), t0 = G.t, seen = new Set();
      const xong = () => res({ over: G.over, t: +(G.t - t0).toFixed(0), seen: [...seen] });
      /* Đánh tự nhiên thì hiếm khi kịp tụt xuống máu thấp trong lúc chạy headless,
         mà mấy cơ chế dễ vỡ nhất lại nằm hết ở đó. Nên ép máu xuống theo hai chặng:
         18% để gọi Pre-Wings / viện binh / lãnh địa, rồi 8% để gọi Wings of the Eagle. */
      let chang = 0;
      const id = setInterval(() => {
        const troi = G.t - t0;
        if (chang === 0 && troi > 8) { chang = 1; for (const f of G.fighters) f.hp = Math.min(f.hp, f.maxHp * .18); }
        if (chang === 1 && troi > 16) { chang = 2; for (const f of G.fighters) f.hp = Math.min(f.hp, f.maxHp * .08); }
        for (const f of G.fighters) {
          if (f.lazy) seen.add('lazy');
          if (f.bind) seen.add('bind');
          if (f.domain) seen.add('forest');
          if (f.weak) seen.add('weak');
          if (f.dash && f.dash.kind === 'stab') seen.add('stab');
          if (f.eagle) seen.add('eagle');
          if (f.prewing) seen.add('prewing');
          if (f.summon) seen.add('summon');
          if (f.exhaust > 0) seen.add('exhaust');
          if (f.ayaG) seen.add('aya-guard');
          if (f.ally) seen.add('aya-ally');
          if (f.key === 'suzune' && f.form >= 2) seen.add('suz-f2');
          if (f.key === 'suzune' && f.form >= 3) seen.add('suz-f3');
          if (f.decT > 0) seen.add('decision');
        }
        if (G.over || G.t - t0 > moc) { clearInterval(id); xong(); }
      }, 60);
      setTimeout(() => { clearInterval(id); xong(); }, 45000);   // chặn treo
    }), MOC);

    await page.close();
    return { a, c, ...r, errors };
  };

  const out = await Promise.all(pairs.map(run));
  let hong = 0;
  for (const r of out) {
    if (r.errors.length) hong++;
    console.log(
      `${(r.a + ' vs ' + r.c).padEnd(20)} ` +
      `${r.over ? 'ket thuc' : 'con danh'} ${String(r.t).padStart(3)}s | ` +
      `${r.seen.join(',') || '-'} | ` +
      `${r.errors.length ? 'LOI: ' + r.errors[0] : 'khong loi'}`
    );
  }
  await browser.close();
  console.log(hong ? `HONG: ${hong}/${out.length} tran co loi trang` : `DAT: ${out.length}/${out.length} tran sach loi`);
  process.exit(hong ? 1 : 0);
})();
