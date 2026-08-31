/* Luật né đòn của Shikamaru, bốn điều đã chốt:
   1. Đang choáng thì không né được cú nào.
   2. Né được thì cũng không dính choáng ăn theo.
   3. Sexy no Jutsu là ngoại lệ duy nhất: ăn cả sát thương lẫn choáng, không né được.
   4. Trừ lúc đang kết ấn trói bóng lần bù — lần đó không gì cắt được, kể cả Sexy no Jutsu.
   Chạy: node tools/t_dodge.js */
const { openGame } = require('./probe');

(async () => {
  const { browser, page, errors } = await openGame('shika', 'kono');
  const r = await page.evaluate(async () => {
    const G = window.__G();
    const k = G.fighters.find(f => f.key === 'shika');
    const e = G.fighters.find(f => f.key === 'kono');
    const N = 40;
    const reset = () => { k.hp = k.maxHp; k.stun = 0; k.invuln = 0; k.bind = null; k.dots.length = 0; k.evade = 1; };
    const out = {};

    // 1. đang choáng: mọi đòn phải trúng, dù tỉ lệ né đang là 100%
    reset(); k.stun = 5;
    let trung = 0;
    for (let i = 0; i < N; i++) trung += window.__hurt(k, 5, e, false) ? 1 : 0;
    out.choangThiTrung = `${trung}/${N}`;

    // 2. không choáng, tỉ lệ né 100%: phải trượt sạch
    reset();
    let ne = 0;
    for (let i = 0; i < N; i++) ne += window.__hurt(k, 5, e, false) ? 0 : 1;
    out.neSachKhiKhongChoang = `${ne}/${N}`;

    // 3. né được quả nổ thì không dính choáng theo
    reset();
    const mauTruoc = k.hp;
    window.__explode({ x: k.x, y: k.y, team: e.team, dmg: 60, owner: e });
    out.noBiNe = { mau: k.hp === mauTruoc ? 'nguyen' : 'mat', choang: +k.stun.toFixed(2) };

    // 4. Sexy no Jutsu: né 100% vẫn ăn đủ cả hai
    reset();
    window.__sexy(e, k);
    out.sexy = { dot: k.dots.length, choang: +k.stun.toFixed(2) };

    // 5. đang kết ấn trói bóng lần bù thì Sexy no Jutsu cũng không cắt được
    reset(); k.bindGuard = true;
    window.__shadowBind(k, e);
    const guard = !!(k.bind && k.bind.guard);
    window.__sexy(e, k);
    out.troiBongLanBu = { guard, conTroi: !!k.bind, choang: +k.stun.toFixed(2) };
    // 6. sóng mắng của ChiChi: né được thì cũng không dính choáng
    reset();
    const mauTruoc2 = k.hp;
    G.waves.push({ x: k.x, y: k.y, r: 12, max: 195, spd: 330, dmg: 30, crit: false, owner: e, team: e.team, hit: [] });
    await new Promise(res => setTimeout(res, 260));         // để step() chạy vài nhịp cho sóng lan qua
    out.songMang = { mau: k.hp === mauTruoc2 ? 'nguyen' : 'mat', choang: +k.stun.toFixed(2) };

    return out;
  });

  console.log(`1. dang choang, ne 100%  -> trung ${r.choangThiTrung} (can: het)`);
  console.log(`2. khong choang, ne 100% -> ne  ${r.neSachKhiKhongChoang} (can: het)`);
  console.log(`3. ne qua no             -> mau ${r.noBiNe.mau}, choang ${r.noBiNe.choang}s (can: nguyen / 0)`);
  console.log(`4. sexy no jutsu         -> dot ${r.sexy.dot}, choang ${r.sexy.choang}s (can: co / >0)`);
  console.log(`5. troi bong lan bu      -> guard ${r.troiBongLanBu.guard}, con troi ${r.troiBongLanBu.conTroi}, choang ${r.troiBongLanBu.choang}s (can: true / true / 0)`);
  console.log(`6. ne song mang           -> mau ${r.songMang.mau}, choang ${r.songMang.choang}s (can: nguyen / 0)`);
  console.log('loi trang:', errors.length ? errors.slice(0, 3) : 'khong co');
  await browser.close();

  const ok = r.choangThiTrung === '40/40' && r.neSachKhiKhongChoang === '40/40'
    && r.noBiNe.mau === 'nguyen' && r.noBiNe.choang === 0
    && r.sexy.dot > 0 && r.sexy.choang > 0
    && r.troiBongLanBu.guard && r.troiBongLanBu.conTroi && r.troiBongLanBu.choang === 0
    && r.songMang.mau === 'nguyen' && r.songMang.choang === 0
    && !errors.length;
  console.log(ok ? 'DAT' : 'HONG');
  process.exit(ok ? 0 : 1);
})();
