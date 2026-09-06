/* Viện binh của ChiChi — hai chiêu vừa được buff:
     1. Kamehameha của Goku: 400 dmg, choáng 2 giây người chơi, HẾT choáng mới tới quãng
        ghì chân 4 giây (−60% tốc chạy, −30% tốc ra chiêu);
     2. Masenko của Gohan: vẫn 100 dmg mỗi đợt, nhưng mỗi đợt trúng chồng thêm −10% tốc
        chạy / −7% tốc ra chiêu, trúng hai đợt là −20% / −14%.
   Chạy: node tools/t_chichi.js */
const { openGame } = require('./probe');

const out = [];
let fail = 0;
function ok(name, pass, note) {
  out.push(`${pass ? 'DAT ' : 'HONG'}  ${name}${note ? '  — ' + note : ''}`);
  if (!pass) fail++;
}

(async () => {
  const { browser, page, errors } = await openGame('chichi', 'kono');
  await page.selectOption('#speed', '1');
  await page.waitForTimeout(600);

  const r = await page.evaluate(() => {
    const G = window.__G(), K = window.__KAME, M = window.__MASENKO, dt = 1 / 120;
    const c = G.fighters.find(x => x.key === 'chichi'), e = G.fighters.find(x => x !== c);
    const sach = () => {
      e.stun = 0; e.kameSlow = 0; e.kameAfter = 0; e.msSlow = 0; e.msStack = 0;
      e.prewing = false; e.eagle = false; e.ccRes = 0; e.dash = null;
      window.__statusTick(e, 0);
    };
    const doc = () => ({ move: +e.moveMul.toFixed(4), cast: +e.castMul.toFixed(4) });

    // ---- Kamehameha: choáng trước, ghì chân sau ----
    sach();
    const nen = doc();
    window.__kameHit(e);
    const ngayLuc = { stun: +e.stun.toFixed(3), cho: +e.kameAfter.toFixed(3) };
    window.__statusTick(e, 0);
    const trongChoang = doc();                 // còn choáng thì CHƯA ghì chân
    // chạy hết quãng choáng
    let b = 0;
    while (e.stun > 0 && b < 2000) { e.stun = Math.max(0, e.stun - dt); window.__statusTick(e, dt); b++; }
    window.__statusTick(e, 0);
    const sauChoang = { ...doc(), con: +e.kameSlow.toFixed(3), cho: e.kameAfter };
    // rồi chạy hết quãng ghì chân
    let b2 = 0;
    while (e.kameSlow > 0 && b2 < 4000) { window.__statusTick(e, dt); b2++; }
    window.__statusTick(e, 0);
    const hetHan = doc();

    // ---- Masenko: cộng dồn theo số đợt trúng ----
    sach();
    window.__masenkoHit(e); window.__statusTick(e, 0);
    const mot = { ...doc(), n: e.msStack };
    window.__masenkoHit(e); window.__statusTick(e, 0);
    const hai = { ...doc(), n: e.msStack };
    for (let i = 0; i < 6; i++) window.__masenkoHit(e);
    window.__statusTick(e, 0);
    const tran = { ...doc(), n: e.msStack };
    // hết giờ thì rơi sạch chồng
    let b3 = 0;
    while (e.msSlow > 0 && b3 < 4000) { window.__statusTick(e, dt); b3++; }
    window.__statusTick(e, 0);
    const roi = { ...doc(), n: e.msStack };

    // ---- sát thương của hai chiêu đọc thẳng từ đạn bắn ra ----
    G.proj.length = 0;
    const goku = window.__mk ? null : null;
    return { nen, ngayLuc, trongChoang, sauChoang, hetHan, mot, hai, tran, roi,
             K, M, RT: window.__RT };
  });

  ok('Kamehameha choáng đúng 2 giây người chơi',
    Math.abs(r.ngayLuc.stun - r.K.stun) < .01,
    `${(r.ngayLuc.stun * r.RT).toFixed(2)}s người chơi`);
  ok('còn đang choáng thì CHƯA ghì chân',
    r.trongChoang.move === r.nen.move && r.trongChoang.cast === r.nen.cast &&
    Math.abs(r.ngayLuc.cho - r.K.slowT) < .01,
    `tốc chạy vẫn ×${r.trongChoang.move}, quãng ghì chân đang xếp hàng ${(r.ngayLuc.cho * r.RT).toFixed(1)}s`);
  ok('hết choáng mới tới −60% tốc chạy / −30% tốc ra chiêu trong 4 giây người chơi',
    Math.abs(r.sauChoang.move / r.nen.move - r.K.move) < .01 &&
    Math.abs(r.sauChoang.cast / r.nen.cast - r.K.cast) < .01 &&
    r.sauChoang.cho === 0 && r.sauChoang.con > 0,
    `×${r.sauChoang.move} chạy · ×${r.sauChoang.cast} ra chiêu · còn ${(r.sauChoang.con * r.RT).toFixed(2)}s`);
  ok('hết quãng ghì chân thì trả lại hệ số như cũ',
    r.hetHan.move === r.nen.move && r.hetHan.cast === r.nen.cast);

  ok('Masenko trúng một đợt: −10% tốc chạy / −7% tốc ra chiêu',
    r.mot.n === 1 && Math.abs(r.mot.move / r.nen.move - (1 - r.M.move)) < .005 &&
    Math.abs(r.mot.cast / r.nen.cast - (1 - r.M.cast)) < .005,
    `×${r.mot.move} chạy · ×${r.mot.cast} ra chiêu`);
  ok('trúng đợt thứ hai thì cộng dồn thành −20% / −14%',
    r.hai.n === 2 && Math.abs(r.hai.move / r.nen.move - (1 - r.M.move * 2)) < .005 &&
    Math.abs(r.hai.cast / r.nen.cast - (1 - r.M.cast * 2)) < .005,
    `×${r.hai.move} chạy · ×${r.hai.cast} ra chiêu`);
  ok('chồng lớp chặn ở đúng số đợt của một lượt Masenko',
    r.tran.n === r.M.max &&
    Math.abs(r.tran.move / r.nen.move - (1 - r.M.move * r.M.max)) < .005,
    `${r.tran.n} lớp · ×${r.tran.move} chạy`);
  ok('hết giờ thì rơi sạch chồng lớp',
    r.roi.n === 0 && r.roi.move === r.nen.move && r.roi.cast === r.nen.cast);

  // sát thương: đọc thẳng viên đạn hai viện binh bắn ra
  const dmg = await page.evaluate(() => new Promise(res => {
    const G = window.__G();
    const c = G.fighters.find(x => x.key === 'chichi');
    const doc = { kame: 0, masenko: 0 };
    window.__summonHelp(c, 'goku');
    const id = setInterval(() => {
      for (const p of G.proj) {
        if (p.type === 'kame') doc.kame = p.dmg;
        if (p.type === 'masenko') doc.masenko = p.dmg;
      }
      if (doc.kame) { clearInterval(id); G.proj.length = 0;
        window.__summonHelp(c, 'gohan');
        const id2 = setInterval(() => {
          for (const p of G.proj) if (p.type === 'masenko') doc.masenko = p.dmg;
          if (doc.masenko) { clearInterval(id2); res(doc); }
        }, 20);
        setTimeout(() => { clearInterval(id2); res(doc); }, 40000);
      }
    }, 20);
    setTimeout(() => { clearInterval(id); res(doc); }, 40000);
  }));
  ok('Kamehameha bắn ra đúng 400 dmg', dmg.kame === 400, `${dmg.kame} dmg`);
  ok('mỗi đợt Masenko vẫn giữ nguyên 100 dmg', dmg.masenko === 100, `${dmg.masenko} dmg`);

  ok('không lỗi trang', errors.length === 0, errors.slice(0, 2).join(' | '));
  await browser.close();

  console.log(out.join('\n'));
  console.log(fail ? `HONG ${fail} muc` : `DAT tat ca ${out.length} muc`);
  process.exit(fail ? 1 : 0);
})();
