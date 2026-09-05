/* Doraemon — soi đủ năm mảng làm nên nhân vật:
     1. màn ra mắt: Anywhere Door đúng 1.5 giây người chơi, bốn pha, địch chỉ được đứng chờ;
     2. hai nội tại: Take-copter (bay đuổi, dải bóng không bám được) và Emergency Door
        (miễn thương lúc chui cửa, chỉ xoá hiệu ứng làm chậm, đáp trong sàn và tránh xa địch);
     3. ba chiêu: combo 15/15/20 cách nhau 0.6s, Air Cannon (đẩy 22% sàn, choáng 3s, xuyên
        hai người, đứt trong 0.35s đầu thì nửa hồi chiêu), Small Light (thu nhỏ, không cộng dồn);
     4. Time Machine: Second Chance — quay ngược 1~3 giây, trần hồi máu 20%, cắt 40% hồi chiêu;
     5. chữ hiển thị đều bằng tiếng Anh.
   Chạy: node tools/t_dora.js */
const { openGame } = require('./probe');

const out = [];
let fail = 0;
function ok(name, pass, note) {
  out.push(`${pass ? 'DAT ' : 'HONG'}  ${name}${note ? '  — ' + note : ''}`);
  if (!pass) fail++;
}
async function waitGame(page, body, limit) {
  return page.evaluate(([b, lim]) => new Promise(res => {
    const G = window.__G(), t0 = G.t;
    const test = new Function('G', 'return (' + b + ')');
    const id = setInterval(() => {
      let done = false;
      try { done = !!test(G); } catch (e) { done = false; }
      if (done || G.t - t0 > lim) { clearInterval(id); res({ hit: done, t: +(G.t - t0).toFixed(2) }); }
    }, 25);
    setTimeout(() => { clearInterval(id); res({ hit: false, timeout: 1 }); }, 60000);
  }), [body, limit]);
}

(async () => {
  /* ---------- trận 1: Doraemon vs ChiChi — ra mắt, combo, hai chiêu bảo bối ---------- */
  {
    const { browser, page, errors } = await openGame('dora', 'chichi', { play: false });

    const before = await page.evaluate(() => {
      const G = window.__G(), f = G.fighters.find(x => x.key === 'dora');
      return { hide: !!f.drHide, entry: !!f.drEntry, ph: f.drEntry ? f.drEntry.t : -1 };
    });
    ok('chưa bấm Bắt đầu thì Doraemon chưa có mặt trên sàn',
      before.entry && before.hide, `drHide=${before.hide}`);

    await page.click('#play');
    await page.selectOption('#speed', '1');

    const ent = await page.evaluate(() => new Promise(res => {
      const G = window.__G(), D = window.__DORA;
      const f = G.fighters.find(x => x.key === 'dora'), e = G.fighters.find(x => x !== f);
      const t0 = G.t - (D.doorT - (f.drEntry ? D.doorT - f.drEntry.t : 0));
      const ex = e.x, ey = e.y;
      let outAt = -1, endAt = -1, foeFree = 0, foeMoved = 0, doorMax = 0, doorEnd = 1;
      const id = setInterval(() => {
        if (f.drEntry) {
          if (!(e.lock > 0)) foeFree++;
          foeMoved = Math.max(foeMoved, Math.hypot(e.x - ex, e.y - ey));
          doorMax = Math.max(doorMax, f.drEntry.doorOpen);
          doorEnd = f.drEntry.doorOpen;
          if (!f.drHide && outAt < 0) outAt = G.t - t0;
        } else if (endAt < 0) endAt = G.t - t0;
        if (endAt >= 0 || G.t - t0 > 8) {
          clearInterval(id);
          res({ outAt: +outAt.toFixed(2), endAt: +endAt.toFixed(2), foeFree, doorMax: +doorMax.toFixed(2),
                doorEnd: +doorEnd.toFixed(2), foeMoved: +foeMoved.toFixed(1),
                ph: D.doorPh, tot: D.doorT, RT: window.__RT });
        }
      }, 10);
      setTimeout(() => { clearInterval(id); res({ timeout: 1 }); }, 40000);
    }));
    ok('cả màn ra mắt dài đúng 1.5 giây người chơi',
      ent.endAt > 0 && Math.abs(ent.endAt - ent.tot) < .12,
      `đo ${(ent.endAt * ent.RT).toFixed(2)}s người chơi (chuẩn 1.50)`);
    ok('anh chỉ bước ra ở pha ba, không hiện ngay từ đầu',
      ent.outAt > 0 && Math.abs(ent.outAt - ent.ph[1]) < .1,
      `hiện ra ở giây ${(ent.outAt * ent.RT).toFixed(2)} người chơi (chuẩn 0.75)`);
    ok('cửa mở hẳn rồi khép lại trước khi biến mất',
      ent.doorMax > .95 && ent.doorEnd < .35, `mở tối đa ${ent.doorMax}, lúc tắt còn ${ent.doorEnd}`);
    ok('đối phương chỉ được đứng chờ suốt màn ra mắt',
      ent.foeFree === 0, `${ent.foeFree} nhịp không bị khoá, xê dịch ${ent.foeMoved}px`);

    // combo ba đòn: 15 / 15 / 20, cách nhau 0.6 giây người chơi, đòn ba đẩy lùi + choáng
    const combo = await page.evaluate(() => new Promise(res => {
      const G = window.__G(), D = window.__DORA;
      const f = G.fighters.find(x => x.key === 'dora'), e = G.fighters.find(x => x !== f);
      f.drAim = null; f.drCombo = null; f.copter = 0;
      f.cds.s2 = 99; f.cds.s3 = 99; f.edCd = 99;   // đừng để AI rút bảo bối cắt ngang combo
      window.__statusTick(f, 0);
      e.evade = 0; e.dodge = 0; e.dmgRes = 0; e.ccRes = 0; e.gnCcRes = 0; e.drCcRes = 0;
      e.eagle = false; e.prewing = false; e.invuln = 0; e.dis = 0;
      // CHỈ ghim vị trí, đừng nạp lại máu: nạp lại là phép đo không thấy đòn nào trúng
      const put = () => { f.x = 300; f.y = 300; e.x = 300 + f.r + e.r + 10; e.y = 300;
                          e.stun = 0; e.kbx = 0; e.kby = 0; };
      put();
      window.__doraCombo(f, e);
      const blows = []; let last = e.hp, kb = 0, stun = 0;
      const t0 = G.t;
      const id = setInterval(() => {
        /* Đọc lực đẩy và choáng TRƯỚC khi ghim lại vị trí: put() xoá kbx/stun, ghim trước
           thì đúng cú đánh thứ ba vừa gây ra đã bị xoá mất trước khi kịp đo. */
        const kbNow = Math.hypot(e.kbx, e.kby), stunNow = e.stun;
        if (e.hp < last) {
          blows.push({ n: blows.length + 1, dmg: Math.round(last - e.hp), t: +(G.t - t0).toFixed(2) });
          last = e.hp;
          if (blows.length === 3) { kb = kbNow; stun = stunNow; }
        }
        f.cds.s2 = 99; f.cds.s3 = 99; f.edCd = 99; f.stun = 0;
        if (blows.length < 3) put();
        if (blows.length >= 3 || G.t - t0 > 6) {
          clearInterval(id);
          res({ blows, kb: Math.round(kb), stun: +stun.toFixed(2),
                want: D.hit, gap: D.hitGap, slamStun: D.slamStun, RT: window.__RT });
        }
      }, 10);
      setTimeout(() => { clearInterval(id); res({ blows, timeout: 1 }); }, 40000);
    }));
    ok('combo đúng ba đòn 15 / 15 / 20',
      combo.blows.length === 3 && combo.blows[0].dmg === 15 && combo.blows[1].dmg === 15 && combo.blows[2].dmg === 20,
      JSON.stringify(combo.blows));
    ok('ba đòn cách nhau 0.6 giây người chơi',
      combo.blows.length === 3 &&
      Math.abs((combo.blows[1].t - combo.blows[0].t) - combo.gap) < .08 &&
      Math.abs((combo.blows[2].t - combo.blows[1].t) - combo.gap) < .08,
      combo.blows.length === 3 ? `${((combo.blows[1].t - combo.blows[0].t) * combo.RT).toFixed(2)}s và ${((combo.blows[2].t - combo.blows[1].t) * combo.RT).toFixed(2)}s` : '-');
    ok('đòn thứ ba đẩy lùi và choáng 0.6 giây người chơi',
      combo.kb > 200 && Math.abs(combo.stun - combo.slamStun) < .06,
      `lực đẩy ${combo.kb}, choáng ${(combo.stun * combo.RT).toFixed(2)}s người chơi`);

    // Air Cannon: độ chính xác theo ba dải, sát thương, đẩy lùi 22% sàn, choáng 3 giây
    const acc = await page.evaluate(() => {
      const f = window.__drAcOdds, D = window.__DORA;
      return { near: +f(60).toFixed(3), mid: +f(360).toFixed(3), far: +f(600).toFixed(3),
               farthest: +f(9999).toFixed(3) };
    });
    ok('Air Cannon: gần 75~90%, trung bình 50~60%, xa 30~40%',
      acc.near >= .75 && acc.near <= .90 && acc.mid >= .50 && acc.mid <= .60 &&
      acc.far >= .30 && acc.far <= .40 && acc.farthest >= .30,
      `${Math.round(acc.near * 100)}% · ${Math.round(acc.mid * 100)}% · ${Math.round(acc.far * 100)}%`);
    ok('càng xa càng khó trúng, không có chỗ nào đảo chiều',
      acc.near > acc.mid && acc.mid > acc.far, `${acc.near} > ${acc.mid} > ${acc.far}`);

    const ac = await page.evaluate(() => new Promise(res => {
      const G = window.__G(), D = window.__DORA, WH = window.__WH();
      const f = G.fighters.find(x => x.key === 'dora'), e = G.fighters.find(x => x !== f);
      f.fk = 0; window.__statusTick(f, 0);
      e.evade = 0; e.dodge = 0; e.dmgRes = 0; e.ccRes = 0; e.gnCcRes = 0; e.drCcRes = 0;
      e.eagle = false; e.prewing = false; e.invuln = 0; e.shrunk = 0; e.kbTake = 1;
      e.hp = e.maxHp; e.stun = 0; e.kbx = 0; e.kby = 0;
      f.x = 200; f.y = 300; e.x = 340; e.y = 300;
      const hp0 = e.hp, x0 = e.x;
      const p = { type: 'aircan', owner: f, dmg: D.acDmg, vx: D.acSpd, vy: 0, x: e.x, y: e.y, r: 22, hitList: [] };
      window.__drAcHit(p, e);
      const dmg = hp0 - e.hp, stun = e.stun;
      let far = 0;
      const id = setInterval(() => {
        far = Math.max(far, e.x - x0);
        if (Math.hypot(e.kbx, e.kby) < 1) {
          clearInterval(id);
          res({ dmg: Math.round(dmg), stun: +stun.toFixed(2), far: Math.round(far),
                want: Math.round(WH.W * D.acKbDist), acStun: D.acStun, RT: window.__RT });
        }
      }, 10);
      setTimeout(() => { clearInterval(id); res({ dmg: Math.round(dmg), far: Math.round(far), timeout: 1 }); }, 30000);
    }));
    ok('Air Cannon gây 100 dmg và choáng 3 giây người chơi',
      ac.dmg === 100 && Math.abs(ac.stun - ac.acStun) < .06,
      `${ac.dmg} dmg · choáng ${(ac.stun * ac.RT).toFixed(2)}s người chơi`);
    ok('Air Cannon thổi địch lùi khoảng 22% chiều dài sàn',
      Math.abs(ac.far - ac.want) / ac.want < .18, `bay ${ac.far}px (chuẩn ~${ac.want}px)`);

    // xuyên hai người: người thứ hai chỉ chịu 60% dmg và 60% choáng
    const pierce = await page.evaluate(() => {
      const G = window.__G(), D = window.__DORA;
      const f = G.fighters.find(x => x.key === 'dora'), e = G.fighters.find(x => x !== f);
      const clean = t => { t.evade = 0; t.dodge = 0; t.dmgRes = 0; t.ccRes = 0; t.gnCcRes = 0;
                           t.drCcRes = 0; t.eagle = false; t.prewing = false; t.invuln = 0;
                           t.hp = t.maxHp; t.stun = 0; t.dmgTake = 1; };
      clean(e);
      const p = { type: 'aircan', owner: f, dmg: D.acDmg, vx: D.acSpd, vy: 0, x: e.x, y: e.y, r: 22, hitList: [] };
      const h0 = e.hp; const die1 = window.__drAcHit(p, e);
      const d1 = h0 - e.hp, s1 = e.stun;
      clean(e);
      // giả vờ luồng khí đã xuyên qua một người rồi: người này thành người thứ hai
      const p2 = { type: 'aircan', owner: f, dmg: D.acDmg, vx: D.acSpd, vy: 0, x: e.x, y: e.y, r: 22, hitList: [{}] };
      const h1 = e.hp; const die2 = window.__drAcHit(p2, e);
      const d2 = h1 - e.hp, s2 = e.stun;
      return { d1: Math.round(d1), d2: Math.round(d2), s1: +s1.toFixed(2), s2: +s2.toFixed(2),
               die1, die2, cut: D.acPierce2 };
    });
    ok('luồng khí xuyên được người thứ hai, chịu 60% dmg và 60% choáng',
      pierce.die1 === false && pierce.die2 === true &&
      Math.abs(pierce.d2 / pierce.d1 - pierce.cut) < .02 &&
      Math.abs(pierce.s2 / pierce.s1 - pierce.cut) < .02,
      `${pierce.d1} -> ${pierce.d2} dmg · ${pierce.s1} -> ${pierce.s2}s choáng`);

    // bị đánh trong 0.35 giây đầu thì đứt chiêu và chỉ chờ nửa hồi chiêu
    const brk = await page.evaluate(() => {
      const G = window.__G(), D = window.__DORA;
      const f = G.fighters.find(x => x.key === 'dora'), e = G.fighters.find(x => x !== f);
      f.edCd = 999; f.evade = 0; f.dodge = 0; f.drAim = null; f.cds.s2 = 0;
      window.__doraAirCannon(f, e);
      f.drAim.age = D.acBreak * .5;
      window.__hurt(f, 5, e);
      const som = { aim: !!f.drAim, cd: +f.cds.s2.toFixed(3) };
      f.hp = f.maxHp; f.cds.s2 = 0; f.drAim = null;
      window.__doraAirCannon(f, e);
      f.drAim.age = D.acBreak * 2;
      window.__hurt(f, 5, e);
      const muon = { aim: !!f.drAim, cd: +f.cds.s2.toFixed(3) };
      f.drAim = null; f.lock = 0; f.hp = f.maxHp; f.edCd = 0;
      return { som, muon, want: +(D.acCd * D.acBreakCut).toFixed(3), full: D.acCd };
    });
    ok('bị đánh trong 0.35 giây đầu thì Air Cannon đứt, chỉ chờ nửa hồi chiêu',
      brk.som.aim === false && Math.abs(brk.som.cd - brk.want) < .01,
      `hồi chiêu còn ${brk.som.cd} (đầy đủ là ${brk.full})`);
    ok('qua mốc đó thì đòn không huỷ được nữa',
      brk.muon.aim === true, `vẫn đang ngắm: ${brk.muon.aim}`);

    ok('trận 1 không lỗi trang', errors.length === 0, errors.join(' | '));
    await browser.close();
  }

  /* ---------- trận 2: Small Light, Emergency Door, Take-copter ---------- */
  {
    const { browser, page, errors } = await openGame('dora', 'kono');
    await page.selectOption('#speed', '1');
    await waitGame(page, 'G.fighters.every(f=>!f.drEntry)', 10);

    const sl = await page.evaluate(() => {
      const G = window.__G(), D = window.__DORA;
      const f = G.fighters.find(x => x.key === 'dora'), e = G.fighters.find(x => x !== f);
      e.shrunk = 0; e.hitMul = 1; e.reachMul = 1; e.kbTake = 1; e.szMul = 1;
      if (e.r0 !== undefined) { e.r = e.r0; e.r0 = undefined; }
      const r0 = e.r;
      window.__drShrink(e);
      const a = { t: +e.shrunk.toFixed(2), r: e.r, r0, hit: +e.hitMul.toFixed(2),
                  reach: +e.reachMul.toFixed(2), kb: +e.kbTake.toFixed(2) };
      // cộng dồn: bắn thêm một tia chỉ làm mới đồng hồ, không chồng hiệu ứng
      e.shrunk = D.shrunkT * .3;
      window.__drShrink(e);
      const b = { t: +e.shrunk.toFixed(2), r: e.r, hit: +e.hitMul.toFixed(2) };
      return { a, b, D: { t: D.shrunkT, size: D.shrunkSize, hit: D.shrunkHit,
                          reach: D.shrunkReach, kb: D.shrunkKb }, RT: window.__RT };
    });
    ok('Shrunk kéo dài 7 giây người chơi và gắn đủ bốn hệ số',
      Math.abs(sl.a.t - sl.D.t) < .01 && sl.a.hit === sl.D.hit &&
      sl.a.reach === sl.D.reach && sl.a.kb === sl.D.kb,
      `${(sl.a.t * sl.RT).toFixed(1)}s · vòng ăn đòn ×${sl.a.hit} · tầm tay ×${sl.a.reach} · lực đẩy ×${sl.a.kb}`);
    ok('model nhỏ còn 55% nhưng vòng ăn đòn chỉ nhỏ đi 15%',
      sl.D.size === .55 && sl.D.hit === .85 && sl.a.r === Math.round(sl.a.r0 * .85),
      `bán kính ${sl.a.r0} -> ${sl.a.r}`);
    ok('Shrunk không cộng dồn, tia thứ hai chỉ làm mới đồng hồ',
      Math.abs(sl.b.t - sl.D.t) < .01 && sl.b.hit === sl.D.hit && sl.b.r === sl.a.r,
      `làm mới về ${(sl.b.t * sl.RT).toFixed(1)}s, hệ số giữ nguyên`);

    const grow = await waitGame(page, 'G.fighters.some(f=>f.key!=="dora"&&f.szMul<.6)', 4);
    const back = await page.evaluate(() => new Promise(res => {
      const G = window.__G();
      const e = G.fighters.find(x => x.key !== 'dora');
      e.shrunk = 0;
      const t0 = G.t;
      const id = setInterval(() => {
        if (e.szMul >= .999) { clearInterval(id); res({ t: +(G.t - t0).toFixed(2), sz: +e.szMul.toFixed(3),
          r: e.r, hit: e.hitMul, want: window.__DORA.growT, RT: window.__RT }); }
        if (G.t - t0 > 3) { clearInterval(id); res({ t: -1, sz: +e.szMul.toFixed(3) }); }
      }, 8);
      setTimeout(() => { clearInterval(id); res({ timeout: 1 }); }, 30000);
    }));
    ok('hết hiệu ứng thì model phình lại từ từ trong 0.4 giây người chơi, không bật cụp',
      back.t > 0 && Math.abs(back.t - back.want) < .05 && back.hit === 1,
      `mất ${(back.t * (back.RT || 2)).toFixed(2)}s người chơi để về ${back.sz}`);

    // Emergency Door: miễn thương lúc chui cửa, chỉ xoá hiệu ứng làm chậm
    const ed = await page.evaluate(() => new Promise(res => {
      const G = window.__G(), D = window.__DORA, WH = window.__WH();
      const f = G.fighters.find(x => x.key === 'dora'), e = G.fighters.find(x => x !== f);
      f.edCd = 0; f.dis = D.disT; f.gnDaze = 1; f.stun = .5; f.shrunk = 0;
      f.dots.push({ dps: 10, left: 2, acc: 0, src: e, tint: 'red' });
      const from = { x: f.x, y: f.y }, hp0 = f.hp;
      window.__doraEscape(f);
      const midHp = f.hp;
      const blocked = window.__hurt(f, 200, e) === false;   // trong cửa thì không ăn đòn
      const t0 = G.t;
      const id = setInterval(() => {
        if (f.edT <= 0) {
          clearInterval(id);
          res({ blocked, noDmg: Math.abs(f.hp - hp0) < .01 && Math.abs(midHp - hp0) < .01,
                moved: +Math.hypot(f.x - from.x, f.y - from.y).toFixed(0),
                want: Math.round(WH.W * D.edDist),
                inside: f.x >= 0 && f.x <= WH.W && f.y >= 0 && f.y <= WH.H,
                dis: f.dis, daze: f.gnDaze, stun: +f.stun.toFixed(2), dots: f.dots.length,
                speed: +f.edSpeed.toFixed(2), cd: +f.edCd.toFixed(2),
                clear: Math.min(...G.fighters.filter(o => o !== f && o.alive).map(o => Math.hypot(o.x - f.x, o.y - f.y))) });
        }
        if (G.t - t0 > 4) { clearInterval(id); res({ timeout: 1 }); }
      }, 8);
      setTimeout(() => { clearInterval(id); res({ timeout: 1 }); }, 30000);
    }));
    ok('đang chui cửa thì không ăn đòn nào', ed.blocked === true && ed.noDmg === true,
      `chặn=${ed.blocked}, máu không đổi=${ed.noDmg}`);
    ok('dịch chuyển khoảng 30% chiều dài sàn và vẫn nằm trong sàn',
      ed.inside === true && Math.abs(ed.moved - ed.want) / ed.want < .35,
      `đi ${ed.moved}px (chuẩn ~${ed.want}px)`);
    ok('không đáp vào trong model người khác',
      ed.clear > 40, `người gần nhất cách ${Math.round(ed.clear)}px`);
    ok('xoá hiệu ứng làm chậm nhưng giữ nguyên choáng và độc',
      ed.dis === 0 && ed.daze === 0 && ed.stun > 0 && ed.dots > 0,
      `slow ${ed.dis}/${ed.daze} · choáng ${ed.stun}s · dot ${ed.dots}`);
    ok('ra khỏi cửa thì được tăng tốc 2 giây và nạp lại hồi chiêu 8 giây',
      ed.speed > 0 && ed.cd > 0, `tăng tốc còn ${ed.speed}s, hồi chiêu ${ed.cd}s`);

    // Take-copter: dải bóng của Shikamaru không bám được vào người đang bay
    const cop = await page.evaluate(() => {
      const G = window.__G(), D = window.__DORA;
      const f = G.fighters.find(x => x.key === 'dora');
      f.copter = 0; f.gnDaze = 0; f.dis = 0; f.shrunk = 0; f.fk = 0; f.edSpeed = 0;
      window.__statusTick(f, 0);
      const base = +f.moveMul.toFixed(3);
      f.copter = D.copT; window.__statusTick(f, 0);
      const bay = +f.moveMul.toFixed(3);
      // hiệu ứng làm chậm chỉ còn 60% hiệu lực lúc đang bay
      f.copter = 0; f.dis = D.disT; window.__statusTick(f, 0);
      const cham = +f.moveMul.toFixed(3);
      f.copter = D.copT; window.__statusTick(f, 0);
      const chamBay = +f.moveMul.toFixed(3);
      f.copter = 0; f.dis = 0; window.__statusTick(f, 0);
      return { base, bay, cham, chamBay, mul: D.copMove, res: D.copSlowRes, dis: D.disMove };
    });
    ok('Take-copter tăng đúng 70% tốc chạy',
      Math.abs(cop.bay / cop.base - cop.mul) < .01, `×${(cop.bay / cop.base).toFixed(2)}`);
    ok('đang bay thì hiệu ứng làm chậm chỉ còn 60% hiệu lực',
      Math.abs((1 - cop.chamBay / cop.mul) / (1 - cop.cham) - (1 - cop.res)) < .02,
      `chậm ${Math.round((1 - cop.cham) * 100)}% dưới đất, còn ${Math.round((1 - cop.chamBay / cop.mul) * 100)}% khi bay`);

    ok('trận 2 không lỗi trang', errors.length === 0, errors.join(' | '));
    await browser.close();
  }

  /* ---------- trận 3: Time Machine: Second Chance ---------- */
  {
    const { browser, page, errors } = await openGame('dora', 'shika');
    await page.selectOption('#speed', '1');
    await waitGame(page, 'G.fighters.every(f=>!f.drEntry)', 10);
    // chờ đủ lịch sử rồi mới ép chết, để nhánh "đủ dữ liệu" được chạy
    await waitGame(page, 'G.fighters.some(f=>f.key==="dora"&&f.hist.length>1&&G.t-f.hist[0].t>=window.__DORA.tmHistT-0.1)', 12);

    const tm = await page.evaluate(() => new Promise(res => {
      const G = window.__G(), D = window.__DORA;
      const f = G.fighters.find(x => x.key === 'dora'), e = G.fighters.find(x => x !== f);
      f.edCd = 999;                                  // đừng để cửa thoát hiểm nuốt mất cú chết
      f.dis = D.disT; f.gnDaze = 1; f.stun = 1;
      f.dots.push({ dps: 10, left: 2, acc: 0, src: e, tint: 'red' });
      f.cds.s2 = D.acCd; f.cds.s3 = D.slCd;
      const cd0 = { s2: f.cds.s2, s3: f.cds.s3 };
      const eHp0 = e.hp, ex0 = e.x, ey0 = e.y;
      // đạn của anh phải biến mất để không bị nhân đôi sau khi tua lại
      G.proj.push({ type: 'aircan', owner: f, x: f.x, y: f.y, vx: 100, vy: 0, r: 22, dmg: 10, life: 3, ang: 0, hitList: [] });
      const projMine0 = G.proj.filter(p => p.owner === f).length;
      const t0 = G.t;
      window.__hurt(f, 99999, e);
      const inCine = { tm: !!f.tm, alive: f.alive, over: G.over, warp: !!G.timeWarp,
                       theme: window.__MUSIC.theme,
                       projMine: G.proj.filter(p => p.owner === f).length };
      const id = setInterval(() => {
        e.lock = Math.max(e.lock, 5);   // khoá địch để đo đúng trạng thái NGAY LÚC tua xong
        if (!f.tm && f.fk > 0) {
          clearInterval(id);
          res({ projMine0, inCine, cine: +(G.t - t0).toFixed(2), tot: D.tmT,
                hp: Math.round(f.hp), cap: Math.round(f.maxHp * D.tmHealCap),
                dis: f.dis, daze: f.gnDaze, stun: +f.stun.toFixed(2), dots: f.dots.length,
                fk: +f.fk.toFixed(2), fkWant: D.fkT,
                cdCut: { s2: +(f.cds.s2 / cd0.s2).toFixed(2), s3: +(f.cds.s3 / cd0.s3).toFixed(2) },
                want: +(1 - D.tmCdCut).toFixed(2), done: f.tmDone,
                foeSame: Math.round(e.hp) === Math.round(eHp0) && Math.abs(e.x - ex0) < 1 && Math.abs(e.y - ey0) < 1,
                theme: window.__MUSIC.theme, RT: window.__RT });
        }
        if (G.t - t0 > 8) { clearInterval(id); res({ timeout: 1, inCine }); }
      }, 10);
      setTimeout(() => { clearInterval(id); res({ timeout: 1, inCine }); }, 40000);
    }));
    ok('máu về 0 thì Doraemon chưa thua, phân cảnh Time Machine chạy',
      tm.inCine && tm.inCine.tm && tm.inCine.alive && !tm.inCine.over,
      JSON.stringify(tm.inCine));
    ok('phân cảnh đổi hẳn sang theme du hành thời gian',
      tm.inCine && tm.inCine.warp === true && tm.inCine.theme === 'time',
      `warp=${tm.inCine && tm.inCine.warp}, theme=${tm.inCine && tm.inCine.theme}`);
    ok('đạn Doraemon vừa bắn ra bị xoá để không nhân đôi sau khi tua',
      tm.projMine0 > 0 && tm.inCine.projMine === 0,
      `${tm.projMine0} viên -> ${tm.inCine.projMine}`);
    ok('phân cảnh dài đúng 2.2 giây người chơi',
      tm.cine > 0 && Math.abs(tm.cine - tm.tot) < .2,
      `đo ${(tm.cine * tm.RT).toFixed(2)}s người chơi (chuẩn 2.20)`);
    ok('hồi lại không quá 20% máu tối đa',
      tm.hp > 0 && tm.hp <= tm.cap, `${tm.hp}/${tm.cap}`);
    ok('xoá sạch debuff đang mang trên người anh',
      tm.dis === 0 && tm.daze === 0 && tm.stun === 0 && tm.dots === 0,
      `slow ${tm.dis}/${tm.daze} · choáng ${tm.stun} · dot ${tm.dots}`);
    ok('hồi chiêu đang chạy bị cắt 40% phần còn lại',
      Math.abs(tm.cdCut.s2 - tm.want) < .02 && Math.abs(tm.cdCut.s3 - tm.want) < .02,
      `còn ${tm.cdCut.s2} và ${tm.cdCut.s3} (chuẩn ${tm.want})`);
    ok('nhận Future Knowledge 5 giây người chơi',
      Math.abs(tm.fk - tm.fkWant) < .1, `${(tm.fk * tm.RT).toFixed(2)}s người chơi`);
    ok('chỉ mình anh được tua lại, đối thủ giữ nguyên máu và vị trí',
      tm.foeSame === true, `đối thủ không đổi: ${tm.foeSame}`);
    ok('hết phân cảnh thì nhạc trả về theme chính', tm.theme === 'main', tm.theme);

    const again = await page.evaluate(() => {
      const G = window.__G();
      const f = G.fighters.find(x => x.key === 'dora');
      return { can: window.__drCanTime(f), done: f.tmDone };
    });
    ok('Time Machine chỉ dùng được một lần mỗi trận',
      again.can === false && again.done === true, JSON.stringify(again));

    const fkm = await page.evaluate(() => {
      const G = window.__G(), D = window.__DORA;
      const f = G.fighters.find(x => x.key === 'dora');
      f.fk = 0; f.dis = 0; f.shrunk = 0; f.copter = 0; f.edSpeed = 0;
      window.__statusTick(f, 0);
      const b = { mv: +f.moveMul.toFixed(3), ct: +f.castMul.toFixed(3), take: +f.dmgTake.toFixed(3) };
      f.fk = D.fkT; window.__statusTick(f, 0);
      const a = { mv: +f.moveMul.toFixed(3), ct: +f.castMul.toFixed(3), take: +f.dmgTake.toFixed(3),
                  ccr: +f.drCcRes.toFixed(2), acc: +(window.__drAcOdds(360, f) - window.__drAcOdds(360, null)).toFixed(3) };
      f.fk = 0; window.__statusTick(f, 0);
      return { b, a, D: { mv: D.fkMove, ct: D.fkCast, take: D.fkTake, cc: D.fkCcRes, acc: D.fkAcc } };
    });
    ok('Future Knowledge: −30% dmg nhận, +35% chạy, +45% ra chiêu, kháng 35%, ngắm +25%',
      Math.abs(fkm.a.mv / fkm.b.mv - fkm.D.mv) < .01 && Math.abs(fkm.a.ct / fkm.b.ct - fkm.D.ct) < .01 &&
      Math.abs(fkm.a.take / fkm.b.take - fkm.D.take) < .01 && Math.abs(fkm.a.ccr - fkm.D.cc) < .01 &&
      Math.abs(fkm.a.acc - fkm.D.acc) < .01,
      `chạy ×${(fkm.a.mv / fkm.b.mv).toFixed(2)} · chiêu ×${(fkm.a.ct / fkm.b.ct).toFixed(2)} · nhận ×${fkm.a.take} · kháng ${fkm.a.ccr} · ngắm +${fkm.a.acc}`);

    ok('trận 3 không lỗi trang', errors.length === 0, errors.join(' | '));
    await browser.close();
  }

  /* ---------- bảng tiếng, ô dán ảnh, và chữ hiển thị đều là tiếng Anh ---------- */
  {
    const { browser, page, errors } = await openGame('dora', 'chichi', { play: false });
    const snd = await page.evaluate(() => {
      const E = window.__SFXE, src = window.__synthSrc(), alias = window.__SFXALIAS, max = window.__SFXMAX;
      const keys = E.map(x => x[0]).filter(k => k.indexOf('dora_') === 0);
      const thieu = keys.filter(k => !alias[k] && src.indexOf(`'${k}'`) < 0);
      const voice = E.filter(x => x[0].indexOf('dora_') === 0 && x[1].indexOf('🎙') >= 0).map(x => x[0]);
      return { keys, thieu, voice, capped: voice.filter(v => max[v] > 0), group: window.__SFXGROUPS.dora_door };
    });
    ok('mọi ô tiếng của Doraemon đều có tiếng tự tạo dự phòng',
      snd.thieu.length === 0, snd.thieu.join(',') || `${snd.keys.length} ô`);
    ok('ô giọng bị cắt đúng bằng bong bóng thoại',
      snd.voice.length === 1 && snd.capped.length === 1, snd.voice.join(','));
    ok('bảng nạp tiếng có tiêu đề riêng cho Doraemon', snd.group === 'Doraemon', snd.group);

    const slots = await page.evaluate(() => {
      const S = window.__SETS.find(x => x.key === 'dora');
      return S ? S.poses.map(p => p[0]) : null;
    });
    ok('có ô dán ảnh riêng cho từng bảo bối và cho màn thắng / thua',
      slots && ['pocket', 'aircannon', 'smalllight', 'copter', 'slam', 'win', 'down'].every(k => slots.includes(k)),
      slots ? slots.join(',') : 'không có');

    // mọi chữ hiển thị trong game của nhân vật này phải là tiếng Anh
    const eng = await page.evaluate(() => {
      const C = window.__CHARS.dora;
      const txt = [C.name, C.tag].concat(C.skills).join(' ');
      const viet = txt.match(/[ăâđêôơưÁÀÃẢẠăắằẵẳặâấầẫẩậéèẽẻẹêếềễểệíìĩỉịóòõỏọôốồỗổộơớờỡởợúùũủụưứừữửựýỳỹỷỵđ]/gi);
      /* Panic Mode / Prepared Mode đã bỏ hẳn theo yêu cầu, nên không còn trong danh sách. */
      const must = ['Doraemon','Fourth-Dimensional Pocket','Take-copter','Emergency Door',
                    'Basic Attack','Air Cannon','Small Light','Shrunk','Disoriented',
                    'Time Machine: Second Chance','Future Knowledge'];
      return { viet: viet ? [...new Set(viet)] : [], thieu: must.filter(m => txt.indexOf(m) < 0) };
    });
    ok('bảng kỹ năng của Doraemon không lẫn một chữ tiếng Việt nào',
      eng.viet.length === 0, eng.viet.join(',') || 'sạch');
    ok('đủ mười một cái tên tiếng Anh còn lại đều có mặt',
      eng.thieu.length === 0, eng.thieu.join(' · ') || 'đủ');

    ok('bảng tiếng/ảnh không lỗi trang', errors.length === 0, errors.join(' | '));
    await browser.close();
  }

  console.log(out.join('\n'));
  console.log(fail ? `\nHONG ${fail} muc` : `\nDAT tat ca ${out.length} muc`);
  process.exit(fail ? 1 : 0);
})();
