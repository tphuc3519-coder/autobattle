/* Captain Ginyu — soi đủ bốn thứ làm nên nhân vật này:
     1. màn chào sân: bay đúng 1.5 giây người chơi, ba dáng Ginyu Force, đối phương
        chỉ được đứng nhìn chứ chưa được đánh;
     2. nội tại aura: hai nhánh ngơ ngác / sôi máu, và luật ba người trở lên thì luôn thăm dò;
     3. ba chiêu thường: đấm đá, sáu luồng khí (ba luồng là mệt mỏi), luồng sáng liền mạch;
     4. CHANGE!!!: đứng nguyên chỗ ngã, tia phóng từ miệng, trúng thì đổi hồn giữ nguyên
        thân xác — thân xác A mà tên B — trượt thì còn 1 máu và hoảng loạn.
   Chạy: node tools/t_ginyu.js */
const { openGame } = require('./probe');

const out = [];
let fail = 0;
function ok(name, pass, note) {
  out.push(`${pass ? 'DAT ' : 'HONG'}  ${name}${note ? '  — ' + note : ''}`);
  if (!pass) fail++;
}

/* Chạy trận tới khi điều kiện đúng, đo bằng THỜI GIAN TRONG TRẬN chứ không phải
   đồng hồ thật: chạy headless thì mỗi giây thật chỉ trôi ~0.26 giây trong trận. */
async function waitGame(page, fnBody, limit) {
  return page.evaluate(([body, lim]) => new Promise(res => {
    const G = window.__G(), t0 = G.t;
    const test = new Function('G', 'return (' + body + ')');
    const id = setInterval(() => {
      let done = false;
      try { done = !!test(G); } catch (e) { done = false; }
      if (done || G.t - t0 > lim) { clearInterval(id); res({ hit: done, t: +(G.t - t0).toFixed(2) }); }
    }, 25);
    setTimeout(() => { clearInterval(id); res({ hit: false, t: +(G.t - t0).toFixed(2), timeout: 1 }); }, 60000);
  }), [fnBody, limit]);
}

(async () => {
  /* ---------- trận 1: Ginyu vs ChiChi — chào sân, aura, ba chiêu ---------- */
  {
    const { browser, page, errors } = await openGame('ginyu', 'chichi', { play: false });

    // trước khi bấm Bắt đầu anh chưa được đứng trên sàn
    const before = await page.evaluate(() => {
      const G = window.__G(), g = G.fighters.find(f => f.key === 'ginyu'), wh = window.__WH();
      return { y: g.y, H: wh.H, entry: !!g.gnEntry, ph: g.gnEntry && g.gnEntry.ph };
    });
    ok('chưa bấm Bắt đầu thì Ginyu còn ở ngoài sàn',
      before.entry && before.ph === 'fly' && (before.y < 0 || before.y > before.H),
      `y=${Math.round(before.y)} (sàn cao ${before.H})`);

    await page.click('#play');
    await page.selectOption('#speed', '1');

    // quãng bay đúng GN.flyT giây trong trận, và suốt màn chào sân địch bị khoá
    const fly = await page.evaluate(() => new Promise(res => {
      const G = window.__G(), g = G.fighters.find(f => f.key === 'ginyu');
      const e = G.fighters.find(f => f !== g);
      /* Quãng bay bắt đầu ngay lúc bấm Bắt đầu, tức là TRƯỚC khi đoạn đo này chạy.
         Trừ ngược phần đã trôi qua, nếu không đo ra thiếu mất một nhịp. */
      const t0 = G.t - (window.__GN.flyT - ((g.gnEntry && g.gnEntry.ph === 'fly') ? g.gnEntry.t : 0));
      let landed = -1, danceEnd = -1, foeFree = 0, foeMoved = 0;
      const ex = e.x, ey = e.y;
      const id = setInterval(() => {
        if (g.gnEntry && g.gnEntry.ph === 'dance' && landed < 0) landed = G.t - t0;
        if (g.gnEntry) {
          if (!(e.lock > 0)) foeFree++;
          foeMoved = Math.max(foeMoved, Math.hypot(e.x - ex, e.y - ey));
        }
        if (landed >= 0 && !g.gnEntry && danceEnd < 0) danceEnd = G.t - t0;
        if (danceEnd >= 0 || G.t - t0 > 12) {
          clearInterval(id);
          res({ landed, danceEnd, foeFree, foeMoved: +foeMoved.toFixed(1), gx: g.x, gy: g.y,
                flyT: window.__GN.flyT, RT: window.__RT, aura: g.gnAura, state: g.gnState });
        }
      }, 12);
      setTimeout(() => { clearInterval(id); res({ landed, danceEnd, foeFree, timeout: 1 }); }, 60000);
    }));
    ok('bay vào sân đúng 1.5 giây người chơi',
      fly.landed > 0 && Math.abs(fly.landed - fly.flyT) < .12,
      `đo ${(fly.landed * (fly.RT || 2)).toFixed(2)}s người chơi (chuẩn 1.50)`);
    ok('đối phương bị khoá suốt màn chào sân', fly.foeFree === 0,
      `${fly.foeFree} nhịp không bị khoá, xê dịch ${fly.foeMoved}px`);
    ok('hết ba dáng Ginyu Force là aura toả ra ngay',
      fly.danceEnd > fly.landed && !!fly.state,
      `thế đứng sau aura: ${fly.state}`);

    // hai nhánh của aura: bốc đủ nhiều lần thì phải ra cả ngơ ngác lẫn sôi máu
    const roll = await page.evaluate(() => {
      const G = window.__G(), GN = window.__GN;
      const g = G.fighters.find(f => f.key === 'ginyu'), e = G.fighters.find(f => f !== g);
      const seen = { daze: 0, rage: 0, atk: 0, def: 0 };
      for (let i = 0; i < 60; i++) {
        e.gnDaze = 0; e.gnRage = 0; g.gnState = null;
        window.__ginyuAura(g);
        if (e.gnDaze > 0) seen.daze++;
        if (e.gnRage > 0) seen.rage++;
        if (g.gnState === 'atk') seen.atk++;
        if (g.gnState === 'def') seen.def++;
      }
      return { seen, dazeT: GN.dazeT, rageT: GN.rageT };
    });
    ok('aura có đủ hai nhánh 50/50',
      roll.seen.daze > 10 && roll.seen.rage > 10 && roll.seen.daze + roll.seen.rage === 60,
      `${roll.seen.daze} ngơ ngác / ${roll.seen.rage} sôi máu trên 60 lần`);
    ok('ngơ ngác thì Ginyu hưng phấn, sôi máu thì Ginyu thăm dò',
      roll.seen.atk === roll.seen.daze && roll.seen.def === roll.seen.rage,
      `hưng phấn ${roll.seen.atk} / thăm dò ${roll.seen.def}`);

    // hệ số của hai thế đứng phải ăn thật vào sát thương và thời gian choáng
    const mult = await page.evaluate(() => {
      const G = window.__G(), GN = window.__GN;
      const g = G.fighters.find(f => f.key === 'ginyu'), e = G.fighters.find(f => f !== g);
      const meas = which => {
        g.gnState = which; g.gnStateT = 99; window.__gnStatus(g, 0);
        e.hp = e.maxHp; e.stun = 0; e.evade = 0; e.dmgRes = 0; e.ccRes = 0;
        window.__gnStatus(e, 0);
        const dmg = window.__gnDmg(g);
        // choáng ăn vào chính Ginyu: hưng phấn thì dài hơn, thăm dò thì ngắn hơn
        g.stun = 0; window.__stunFx(g, 1, 'spark');
        return { dmg: +dmg.toFixed(3), stun: +g.stun.toFixed(3), take: +g.dmgTake.toFixed(3),
                 move: +g.moveMul.toFixed(3), cast: +g.castMul.toFixed(3) };
      };
      const a = meas('atk'), d = meas('def');
      g.gnState = null; g.gnStateT = 0; window.__gnStatus(g, 0);
      return { a, d, GN: { atk: GN.atk, def: GN.def } };
    });
    ok('thế hưng phấn: +75% dmg, +50% dmg nhận, choáng dài thêm 30%',
      Math.abs(mult.a.dmg - 1.75) < .001 && Math.abs(mult.a.take - 1.5) < .001 &&
      Math.abs(mult.a.stun - 1.3) < .001 && Math.abs(mult.a.move - 1.6) < .001 &&
      Math.abs(mult.a.cast - 1.5) < .001,
      `dmg ${mult.a.dmg} · nhận ${mult.a.take} · choáng 1s -> ${mult.a.stun}s · chạy ${mult.a.move} · cast ${mult.a.cast}`);
    ok('thế thăm dò: chỉ ăn 40% dmg, kháng 40% hiệu ứng, đánh và ra chiêu còn 60%',
      Math.abs(mult.d.dmg - .6) < .001 && Math.abs(mult.d.take - .4) < .001 &&
      Math.abs(mult.d.stun - .6) < .001 && Math.abs(mult.d.cast - .6) < .001,
      `dmg ${mult.d.dmg} · nhận ${mult.d.take} · choáng 1s -> ${mult.d.stun}s`);

    // chiêu 2: đúng sáu luồng khí, ba luồng trúng là mệt mỏi
    const beam = await page.evaluate(() => new Promise(res => {
      const G = window.__G(), GN = window.__GN;
      const g = G.fighters.find(f => f.key === 'ginyu'), e = G.fighters.find(f => f !== g);
      g.gnState = null; g.gnStateT = 0; window.__gnStatus(g, 0);
      e.gnBeamHits = 0; e.gnTired = 0; e.evade = 0;
      let most = 0, total = 0;
      const seen = new Set();
      window.__ginyuBeam(g, e);
      const id = setInterval(() => {
        for (const p of G.proj) if (p.type === 'gbeam' && !seen.has(p)) { seen.add(p); total++; }
        most = Math.max(most, G.proj.filter(p => p.type === 'gbeam').length);
        if (total >= GN.beamN) {
          clearInterval(id);
          // ép ba luồng trúng để xem hiệu ứng mệt mỏi có bật không
          e.gnBeamHits = 0; e.gnTired = 0;
          const one = { owner: g, dmg: GN.beamDmg, vx: 100, vy: 0 };
          window.__gnStatus(e, 0);
          for (let i = 0; i < GN.tiredHits; i++) { e.stun = 0; e.hp = e.maxHp; window.__G().t += .001; window.__gnBeamHit ? 0 : 0; }
          res({ total, most, kb: GN.beamKb, spd: GN.beamSpd, dmg: GN.beamDmg });
        }
      }, 15);
      setTimeout(() => { clearInterval(id); res({ total, most, timeout: 1 }); }, 30000);
    }));
    ok('Ginyu Beam bắn đúng 6 luồng khí', beam.total === 6, `đếm được ${beam.total}`);
    ok('luồng khí đẩy lùi xa hơn cú sút của Tsubasa (260)', beam.kb > 260, `beamKb=${beam.kb}`);
    ok('luồng khí bay nhanh hơn Masenko (330)', beam.spd > 330, `beamSpd=${beam.spd}`);

    // đủ ba luồng trúng thì dính mệt mỏi
    const tired = await page.evaluate(() => {
      const G = window.__G(), GN = window.__GN;
      const g = G.fighters.find(f => f.key === 'ginyu'), e = G.fighters.find(f => f !== g);
      e.gnBeamHits = 0; e.gnTired = 0; e.evade = 0; e.hp = e.maxHp; e.dodge = 0;
      e.gnDaze = 0; e.gnRage = 0; e.gnSlow = 0; e.gnSlowAfter = 0; e.exhaust = 0;
      g.gnState = null; g.gnStateT = 0; window.__gnStatus(g, 0);
      const before = [];
      for (let i = 1; i <= GN.tiredHits; i++) {
        e.stun = 0; e.invuln = 0; e.gnDaze = 0; e.gnRage = 0;
        window.__G().proj.length = 0;
        const p = { type: 'gbeam', owner: g, dmg: GN.beamDmg, vx: 120, vy: 0, x: e.x, y: e.y, r: 15 };
        window.__gnBeamHit(p, e);
        before.push({ n: i, tired: +e.gnTired.toFixed(2) });
      }
      e.gnDaze = 0; e.gnRage = 0; e.gnSlow = 0;
      window.__gnStatus(e, 0);
      return { before, move: +e.moveMul.toFixed(2), cast: +e.castMul.toFixed(2), out: +e.gnOut.toFixed(2),
               tiredT: GN.tiredT };
    });
    ok('trúng 3 luồng khí mới dính "mệt mỏi"',
      tired.before[0].tired === 0 && tired.before[1].tired === 0 &&
      Math.abs(tired.before[2].tired - tired.tiredT) < .01,
      JSON.stringify(tired.before));
    ok('mệt mỏi: −60% tốc chạy, −40% tốc chiêu, −25% dmg',
      Math.abs(tired.move - .4) < .01 && Math.abs(tired.cast - .6) < .01 && Math.abs(tired.out - .75) < .01,
      `move ${tired.move} · cast ${tired.cast} · dmg ${tired.out}`);

    // chiêu 3: gồng rồi mới bắn, trúng thì choáng xong mới tới quãng ghì chân
    const flash = await page.evaluate(() => new Promise(res => {
      const G = window.__G(), GN = window.__GN;
      const g = G.fighters.find(f => f.key === 'ginyu'), e = G.fighters.find(f => f !== g);
      g.gnState = null; g.gnStateT = 0; g.gnFlash = null; g.gnPanic = false;
      window.__gnStatus(g, 0);
      e.hp = e.maxHp; e.evade = 0; e.dodge = 0; e.stun = 0; e.gnSlow = 0; e.gnSlowAfter = 0;
      e.eagle = false; e.prewing = false; e.dmgRes = 0; e.ccRes = 0;
      const hp0 = e.hp;
      window.__ginyuFlash(g, e);
      const t0 = G.t;
      let charge = 0, fired = 0, dmg = 0, stun = 0, pend = 0, slow = 0;
      const id = setInterval(() => {
        if (g.gnFlash && g.gnFlash.ph === 'charge') charge = G.t - t0;
        if (g.gnFlash && g.gnFlash.ph === 'fire' && !fired) {
          fired = G.t - t0; dmg = hp0 - e.hp; stun = e.stun; pend = e.gnSlowAfter;
        }
        if (fired && e.stun <= 0 && e.gnSlow > 0) slow = e.gnSlow;
        if (slow > 0 || G.t - t0 > 8) {
          clearInterval(id);
          res({ charge: +charge.toFixed(2), fired: +fired.toFixed(2), dmg: Math.round(dmg),
                stun: +stun.toFixed(2), pend: +pend.toFixed(2), slow: +slow.toFixed(2),
                GN: { charge: GN.flashCharge, dmg: GN.flashDmg, stun: GN.flashStun, slowT: GN.flashSlowT } });
        }
      }, 15);
      setTimeout(() => { clearInterval(id); res({ timeout: 1, charge, fired, dmg, stun, slow }); }, 40000);
    }));
    ok('Ginyu Flash gồng đủ 1.75 giây người chơi rồi mới bắn',
      flash.fired > 0 && Math.abs(flash.fired - flash.GN.charge) < .15,
      `bắn ở giây ${flash.fired} trong trận (chuẩn ${flash.GN.charge})`);
    ok('Ginyu Flash gây 100 dmg và choáng 3.5 giây người chơi',
      flash.dmg === flash.GN.dmg && Math.abs(flash.stun - flash.GN.stun) < .05,
      `${flash.dmg} dmg · choáng ${flash.stun}s trong trận`);
    ok('quãng ghì chân chỉ bắt đầu SAU khi hết choáng',
      flash.pend > 0 && Math.abs(flash.slow - flash.GN.slowT) < .2,
      `xếp hàng ${flash.pend}s, chạy ${flash.slow}s sau khi hết choáng`);

    ok(`trận 1 không lỗi trang`, errors.length === 0, errors.join(' | '));
    await browser.close();
  }

  /* ---------- trận 2: Ginyu vs Konohamaru — CHANGE!!! ---------- */
  {
    const { browser, page, errors } = await openGame('ginyu', 'kono');
    await page.selectOption('#speed', '1');
    await waitGame(page, 'G.fighters.every(f=>!f.gnEntry)', 12);

    // tỉ lệ trúng theo khoảng cách: gần cao, xa thấp, gần nhất cũng không tới 100%
    const odds = await page.evaluate(() => {
      const GN = window.__GN, f = window.__gnChangeOdds;
      return { near: f(0), mid: f((GN.changeNear + GN.changeFar) / 2), far: f(9999),
               hi: GN.changeHi, lo: GN.changeLo };
    });
    ok('càng xa càng dễ trượt, gần nhất cũng không bao giờ 100%',
      Math.abs(odds.near - odds.hi) < 1e-9 && Math.abs(odds.far - odds.lo) < 1e-9 && odds.near < 1 &&
      odds.mid < odds.near && odds.mid > odds.far,
      `gần ${odds.near} · giữa ${odds.mid.toFixed(2)} · xa ${odds.far}`);
    ok('đứng xa nhất thì tỉ lệ trúng nằm trong khoảng 15~20%',
      odds.far >= .15 && odds.far <= .20, `${Math.round(odds.far * 100)}%`);

    // máu về 0 nhưng chưa chết: đứng nguyên chỗ ngã, tia phóng ra từ MIỆNG
    const shot = await page.evaluate(() => new Promise(res => {
      const G = window.__G();
      const g = G.fighters.find(f => f.key === 'ginyu'), e = G.fighters.find(f => f !== g);
      g.gnState = null; g.gnStateT = 0; window.__gnStatus(g, 0);
      const x0 = g.x, y0 = g.y;
      window.__hurt(g, 99999, e);
      const t0 = G.t;
      const id = setInterval(() => {
        const p = G.proj.find(q => q.type === 'change');
        if (p) {
          clearInterval(id);
          res({ alive: g.alive, over: G.over, hp: g.hp, moved: +Math.hypot(g.x - x0, g.y - y0).toFixed(1),
                mouthUp: +(g.y - p.y).toFixed(0), spriteH: g.spriteH, done: !!g.gnChangeDone });
        }
        if (G.t - t0 > 10) { clearInterval(id); res({ none: 1, over: G.over, alive: g.alive, hp: g.hp }); }
      }, 15);
      setTimeout(() => { clearInterval(id); res({ timeout: 1 }); }, 40000);
    }));
    ok('máu về 0 thì Ginyu chưa chết mà tung CHANGE',
      !shot.none && shot.alive && !shot.over, JSON.stringify(shot));
    ok('đứng nguyên chỗ ngã xuống, không dịch đi đâu', shot.moved !== undefined && shot.moved < 2,
      `dịch ${shot.moved}px`);
    ok('tia CHANGE phóng ra từ miệng chứ không phải từ tay',
      shot.mouthUp > shot.spriteH * .5, `cao hơn gốc chân ${shot.mouthUp}px (người cao ${shot.spriteH})`);

    // ép trúng: hồn đổi chỗ, thân xác đứng yên -> thân xác A mà tên B
    const swap = await page.evaluate(() => {
      const G = window.__G(), GN = window.__GN;
      const g = G.fighters.find(f => f.key === 'ginyu'), e = G.fighters.find(f => f !== g);
      G.proj.length = 0;
      const eHp0 = e.hp = Math.round(e.maxHp * .5);
      const gName = g.name, eName = e.name;
      window.__ginyuPossess(g, e);
      return {
        gName, eName,
        gBody: g.key, gShows: g.name, gHp: g.hp, gWant: Math.round(g.maxHp * GN.changeKeep), gAs: g.swapAs,
        eBody: e.key, eShows: e.name, eHp: e.hp, eWant: Math.round(eHp0 + e.maxHp * GN.changeGain), eAs: e.swapAs,
        eProj: e.gnBodyProj, eMiss: e.missOdds, eAim: e.aimOff, eCut: e.gnSelfCut, eCc: e.gnCcCut,
        gCut: g.gnSelfCut
      };
    });
    ok('thân xác Ginyu vẫn là Ginyu nhưng chữ trên thanh máu là tên đối thủ',
      swap.gBody === 'ginyu' && swap.gShows === swap.eName && swap.gAs === 'foe',
      `${swap.gBody} -> "${swap.gShows}"`);
    ok('thân xác đối thủ vẫn là của họ nhưng chữ trên thanh máu là Captain Ginyu',
      swap.eBody === 'kono' && swap.eShows === swap.gName && swap.eAs === 'ginyu',
      `${swap.eBody} -> "${swap.eShows}"`);
    ok('thân xác Ginyu về đúng 15% máu tối đa', swap.gHp === swap.gWant, `${swap.gHp}/${swap.gWant}`);
    ok('thân xác cướp được cộng đúng 20% máu tối đa', swap.eHp === swap.eWant, `${swap.eHp}/${swap.eWant}`);
    ok('đối thủ kẹt trong thân xác Ginyu chỉ còn 50% dmg', Math.abs(swap.gCut - .5) < .001, `${swap.gCut}`);
    ok('thân xác hệ ném (Konohamaru): không giảm dmg nhưng ngắm hỏng hẳn',
      swap.eProj === true && swap.eMiss === 0 && swap.eAim > 1,
      `dmg mượn nguyên, độ lệch ±${swap.eAim} rad`);
    ok('chiêu của chính Ginyu trong thân xác người khác: −65% dmg, −70% hiệu ứng',
      Math.abs(swap.eCut - .35) < .001 && Math.abs(swap.eCc - .3) < .001,
      `dmg ${swap.eCut} · hiệu ứng ${swap.eCc}`);

    // nội tại của thân xác bị cướp phải tắt, và bảng chiêu đọc theo Ginyu
    const after = await waitGame(page, 'true', .5);
    const cross = await page.evaluate(() => {
      const G = window.__G();
      const e = G.fighters.find(f => f.swapAs === 'ginyu');
      return { rage: e.rage, cds: Object.keys(e.cds).sort().join(','), aura: e.gnAura === Infinity };
    });
    ok('cướp xác xong thì nội tại của thân xác tắt, chỉ còn bộ chiêu của Ginyu',
      cross.cds === 's1,s2,s3' && cross.aura, JSON.stringify(cross));
    ok('trận 2 không lỗi trang', errors.length === 0, errors.join(' | '));
    await browser.close();
  }

  /* ---------- trận 3: bắn trượt -> 1 máu và hoảng loạn · luật ba người ---------- */
  {
    const { browser, page, errors } = await openGame('ginyu', 'suzune');
    await page.selectOption('#speed', '1');
    await waitGame(page, 'G.fighters.every(f=>!f.gnEntry)', 12);

    const miss = await page.evaluate(() => {
      const G = window.__G(), GN = window.__GN;
      const g = G.fighters.find(f => f.key === 'ginyu');
      g.gnState = null; g.gnStateT = 0;
      g.gnChange = { ph: 'beam', t: 0, tgt: null, x: g.x, y: g.y };
      g.gnChangeDone = true;
      window.__ginyuChangeMiss(g);
      window.__gnStatus(g, 0);
      return { hp: g.hp, panic: g.gnPanic, move: +g.moveMul.toFixed(2), out: +g.gnOut.toFixed(2),
               cc: +g.gnCcCut.toFixed(2), lo: GN.panicMove[0], hi: GN.panicMove[1] };
    });
    ok('bắn trượt: máu về 1 và vào trạng thái hoảng hốt', miss.hp === 1 && miss.panic === true,
      `hp ${miss.hp}`);
    ok('hoảng hốt chạy nhanh gấp 2.5~3 lần', miss.move >= miss.lo && miss.move <= miss.hi,
      `×${miss.move}`);
    ok('hoảng hốt thì dmg và hiệu ứng chỉ còn 30%',
      Math.abs(miss.out - .3) < .001 && Math.abs(miss.cc - .3) < .001,
      `dmg ${miss.out} · hiệu ứng ${miss.cc}`);

    // ba người có thanh máu trở lên: dù địch ngơ ngác Ginyu vẫn phải chọn thế thăm dò
    await page.evaluate(() => {
      const G = window.__G();
      const g = G.fighters.find(f => f.key === 'ginyu');
      const s = G.fighters.find(f => f.key === 'suzune');
      g.gnPanic = false; g.gnChange = null; g.gnChangeDone = false; g.hp = g.maxHp;
      // gọi Ayanokouji ra làm đồng minh thật -> ba người có thanh máu
      s.ayaG = null; s.ayaShieldDone = true;
      window.__suzForm2(s); s.cp = 0; window.__suzCp(s, window.__SUZ.cpMax);
    });
    // anh vào sân sau một phân cảnh đóng băng, không có mặt ngay trong cùng một nhịp
    await waitGame(page, 'G.fighters.some(f=>f.ally)', 8);
    const crowd = await page.evaluate(() => {
      const G = window.__G();
      const g = G.fighters.find(f => f.key === 'ginyu');
      const n = window.__gnCrowd();
      const seen = { atk: 0, def: 0, daze: 0 };
      for (let i = 0; i < 40; i++) {
        g.gnState = null;
        for (const f of G.fighters) { f.gnDaze = 0; f.gnRage = 0; }
        window.__ginyuAura(g);
        if (g.gnState === 'atk') seen.atk++;
        if (g.gnState === 'def') seen.def++;
        if (G.fighters.some(f => f.team !== g.team && f.gnDaze > 0)) seen.daze++;
      }
      return { n, seen, ally: G.fighters.filter(f => f.ally).length };
    });
    ok('có đồng minh thứ ba trên sàn thì đếm được 3 người có thanh máu',
      crowd.n >= 3, `đếm ${crowd.n}, đồng minh ${crowd.ally}`);
    ok('ba người trở lên: dù ai dính hiệu ứng gì Ginyu cũng ở thế thăm dò',
      crowd.seen.atk === 0 && crowd.seen.def === 40 && crowd.seen.daze > 5,
      `hưng phấn ${crowd.seen.atk} / thăm dò ${crowd.seen.def}, có ${crowd.seen.daze} lần địch ngơ ngác`);

    ok('trận 3 không lỗi trang', errors.length === 0, errors.join(' | '));
    await browser.close();
  }

  /* ---------- bảng tiếng: ô nào cũng phải có tiếng tự tạo dự phòng ---------- */
  {
    const { browser, page, errors } = await openGame('ginyu', 'chichi', { play: false });
    const snd = await page.evaluate(() => {
      const E = window.__SFXE, src = window.__synthSrc(), alias = window.__SFXALIAS;
      const keys = E.map(x => x[0]).filter(k => k.indexOf('ginyu_') === 0);
      const thieu = keys.filter(k => !alias[k] && src.indexOf(`'${k}'`) < 0);
      const voice = E.filter(x => x[0].indexOf('ginyu_') === 0 && x[1].indexOf('🎙') >= 0).map(x => x[0]);
      const max = window.__SFXMAX;
      return { keys, thieu, voice, capped: voice.filter(v => max[v] > 0), group: window.__SFXGROUPS.ginyu_fly };
    });
    ok('mọi ô tiếng của Ginyu đều có tiếng tự tạo dự phòng', snd.thieu.length === 0,
      snd.thieu.join(',') || `${snd.keys.length} ô`);
    ok('hai ô giọng của Ginyu bị cắt đúng bằng bong bóng thoại',
      snd.voice.length === 2 && snd.capped.length === 2, snd.voice.join(','));
    ok('bảng nạp tiếng có tiêu đề riêng cho Captain Ginyu', snd.group === 'Captain Ginyu', snd.group);

    const slots = await page.evaluate(() => {
      const S = window.__SETS.find(x => x.key === 'ginyu');
      return S ? S.poses.map(p => p[0]) : null;
    });
    ok('có ô dán ảnh riêng cho ba dáng Ginyu Force và dáng bay',
      slots && ['fly', 'dance1', 'dance2', 'dance3', 'change', 'panic'].every(k => slots.includes(k)),
      slots ? slots.join(',') : 'không có');
    ok('bảng tiếng/ảnh không lỗi trang', errors.length === 0, errors.join(' | '));
    await browser.close();
  }

  console.log(out.join('\n'));
  console.log(fail ? `\nHONG ${fail} muc` : `\nDAT tat ca ${out.length} muc`);
  process.exit(fail ? 1 : 0);
})();
