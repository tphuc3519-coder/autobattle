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
      const R = Math.random;
      // chance(.5) là Math.random()<.5 -> nhỏ thì địch ngơ ngác, lớn thì địch sôi máu
      const pulse = (ghim) => {
        e.gnDaze = 0; e.gnRage = 0; g.gnState = null;
        Math.random = () => ghim;
        try { window.__ginyuAura(g); } finally { Math.random = R; }
        return { st: g.gnState, daze: e.gnDaze > 0, rage: e.gnRage > 0 };
      };
      const out = {};
      /* Kịch bản A — nhịp aura ĐẦU địch sôi máu: đúng nhịp đó anh thăm dò, rồi 40 nhịp
         sôi máu tiếp theo phải vào thẳng thế chiến đấu. */
      g.gnProbeDone = false;
      out.a1 = pulse(.9).st;
      out.aSau = [];
      for (let i = 0; i < 40; i++) out.aSau.push(pulse(.9).st);
      /* Kịch bản B — nhịp aura ĐẦU địch ngơ ngác: anh hưng phấn, và cửa thăm dò đóng
         luôn từ đó, dù nhịp sau địch có sôi máu. */
      g.gnProbeDone = false;
      out.b1 = pulse(.1).st;
      out.bSau = [];
      for (let i = 0; i < 40; i++) out.bSau.push(pulse(.9).st);
      // hai nhánh aura vẫn phải bốc được cả hai kiểu
      g.gnProbeDone = false;
      const seen = { daze: 0, rage: 0 };
      for (let i = 0; i < 60; i++) {
        e.gnDaze = 0; e.gnRage = 0; g.gnState = null;
        window.__ginyuAura(g);
        if (e.gnDaze > 0) seen.daze++;
        if (e.gnRage > 0) seen.rage++;
      }
      out.seen = seen;
      return out;
    });
    ok('aura có đủ hai nhánh 50/50',
      roll.seen.daze > 10 && roll.seen.rage > 10 && roll.seen.daze + roll.seen.rage === 60,
      `${roll.seen.daze} ngơ ngác / ${roll.seen.rage} sôi máu trên 60 lần`);
    ok('nhịp aura đầu mà địch sôi máu thì Ginyu lùi về thăm dò',
      roll.a1 === 'def', `nhịp đầu ra "${roll.a1}"`);
    ok('qua nhịp đầu là cửa thăm dò đóng hẳn — địch sôi máu nữa vẫn hưng phấn',
      roll.aSau.every(x => x === 'atk'),
      `${roll.aSau.filter(x => x === 'def').length} lần thăm dò trên 40 nhịp sôi máu tiếp theo`);
    ok('nhịp aura đầu mà địch ngơ ngác thì Ginyu hưng phấn',
      roll.b1 === 'atk', `nhịp đầu ra "${roll.b1}"`);
    ok('lỡ nhịp đầu là cả trận không còn thấy thế thăm dò',
      roll.bSau.every(x => x === 'atk'),
      `${roll.bSau.filter(x => x === 'def').length} lần thăm dò trên 40 nhịp sôi máu sau đó`);

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
      g.gnProbeDone = false;
      return { a, d, GN: { atk: GN.atk, def: GN.def } };
    });
    ok('thế hưng phấn: +50% dmg, +50% dmg nhận, choáng dài thêm 40%',
      Math.abs(mult.a.dmg - 1.5) < .001 && Math.abs(mult.a.take - 1.5) < .001 &&
      Math.abs(mult.a.stun - 1.4) < .001 && Math.abs(mult.a.move - 1.6) < .001 &&
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
    ok('mỗi luồng khí gây 18 dmg', beam.dmg === 18, `${beam.dmg} dmg`);

    /* Choáng của luồng khí không còn chắc chắn: 15% ăn may, đổi lại dài 1.5 giây người
       chơi. Ghim Math.random để đo hẳn hai đầu thay vì trông vào xác suất. */
    const bstun = await page.evaluate(() => {
      const G = window.__G(), GN = window.__GN;
      const g = G.fighters.find(f => f.key === 'ginyu'), e = G.fighters.find(f => f !== g);
      g.gnState = null; g.gnStateT = 0; window.__gnStatus(g, 0);
      e.evade = 0; e.dodge = 0; e.dmgRes = 0; e.ccRes = 0; e.gnDaze = 0; e.gnRage = 0;
      e.prewing = false; e.eagle = false;
      window.__gnStatus(e, 0);
      const R = Math.random;
      const thu = ghim => {
        e.hp = e.maxHp; e.stun = 0; e.invuln = 0;
        const p = { type: 'gbeam', owner: g, dmg: GN.beamDmg, vx: 120, vy: 0, x: e.x, y: e.y, r: 15 };
        Math.random = () => ghim;
        try { window.__gnBeamHit(p, e); } finally { Math.random = R; }
        return +e.stun.toFixed(3);
      };
      return { an: thu(.05), truot: thu(.9), odds: GN.beamStunOdds, dur: GN.beamStun, RT: window.__RT };
    });
    ok('luồng khí chỉ 15% gây choáng, và choáng dài 1.5 giây người chơi',
      Math.abs(bstun.odds - .15) < 1e-9 && Math.abs(bstun.dur * bstun.RT - 1.5) < .01 &&
      Math.abs(bstun.an - bstun.dur) < .01 && bstun.truot === 0,
      `bốc trúng -> choáng ${(bstun.an * bstun.RT).toFixed(2)}s người chơi, bốc trượt -> ${bstun.truot}s`);


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
        /* Lấy mốc CAO NHẤT thay vì đọc một lần: choáng tụt dần từng nhịp, mà máy bận thì
           lượt đọc rơi trễ cả chục khung — đo ra 1.68 trên mốc 1.75 và đổ oan. */
        stun = Math.max(stun, e.stun); pend = Math.max(pend, e.gnSlowAfter);
        if (g.gnFlash && g.gnFlash.ph === 'fire' && !fired) {
          fired = G.t - t0; dmg = hp0 - e.hp;
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
    /* Choáng đo THẲNG bằng cách gọi gnFlashHit() chứ không đọc qua vòng poll: máy bận thì
       lượt đọc rơi trễ cả chục khung, đo ra 1.68 trên mốc 1.75 và đổ oan — đã dính hai lần
       nên thôi bỏ hẳn phép đo theo thời gian ở chỗ này. */
    const fstun = await page.evaluate(() => {
      const G = window.__G();
      const g = G.fighters.find(f => f.key === 'ginyu'), e = G.fighters.find(f => f !== g);
      g.gnState = null; g.gnStateT = 0; g.gnSelfCut = 1; g.gnCcCut = 1;
      window.__gnStatus(g, 0);
      /* Dọn sạch mọi thứ chặn choáng. ChiChi cứ 5 giây lại lao một cú Flying Kick, mà
         lúc đang lao thì stunFx() trả về CC IMMUNE — rơi trúng nhịp đó là đo ra 0. */
      e.stun = 0; e.evade = 0; e.dmgRes = 0; e.ccRes = 0; e.prewing = false; e.eagle = false;
      e.dash = null; e.invuln = 0; e.vuln = 0; e.gnCcRes = 0; e.drCcRes = 0; e.ccTake = 1;
      e.hp = e.maxHp; e.gnSlowAfter = 0;
      window.__gnStatus(e, 0);
      window.__gnFlashHit(g, e);
      const r = { stun: +e.stun.toFixed(3), pend: +(e.gnSlowAfter || 0).toFixed(3) };
      e.stun = 0; e.gnSlowAfter = 0; e.hp = e.maxHp;
      return r;
    });
    ok('Ginyu Flash gây 100 dmg và choáng 3.5 giây người chơi',
      flash.dmg === flash.GN.dmg && Math.abs(fstun.stun - flash.GN.stun) < .01,
      `${flash.dmg} dmg · choáng ${fstun.stun}s trong trận (chuẩn ${flash.GN.stun})`);
    ok('quãng ghì chân chỉ bắt đầu SAU khi hết choáng',
      flash.pend > 0 && Math.abs(flash.slow - flash.GN.slowT) < .2,
      `xếp hàng ${flash.pend}s, chạy ${flash.slow}s sau khi hết choáng`);

    /* Bắn từa lưa: sát mặt đã lệch sẵn một góc chứ không ngắm thẳng, đứng xa thì toác
       hẳn ra. Đo bằng góc thật của từng luồng so với đường thẳng nối tới địch.
       Lúc đo phải cho địch tạm CÙNG PHE: đứng sát 60px thì luồng khí chạm người ngay
       trong nhịp sinh ra nó và bị xoá trước khi kịp đọc, cùng phe thì nó bay xuyên qua. */
    const spray = await page.evaluate(() => new Promise(res => {
      const G = window.__G(), GN = window.__GN;
      const g = G.fighters.find(f => f.key === 'ginyu'), e = G.fighters.find(f => f !== g);
      const team0 = e.team;
      g.gnState = null; g.gnStateT = 0; g.gnFlash = null; window.__gnStatus(g, 0);
      const doOne = (dd, done) => {
        e.team = g.team;
        const put = () => { g.x = 300; g.y = 300; e.x = 300 + dd; e.y = 300;
                            e.hp = e.maxHp; g.hp = g.maxHp; };
        put(); G.proj.length = 0;
        for (let v = 0; v < 3; v++) window.__ginyuBeam(g, e);   // ba loạt cho đủ mẫu
        const seen = []; let ticks = 0;
        const id = setInterval(() => {
          ticks++; put();
          for (const p of G.proj) if (p.type === 'gbeam' && !p.__m) { p.__m = 1; seen.push(Math.abs(Math.atan2(p.vy, p.vx))); }
          if (seen.length >= GN.beamN * 3 || ticks > 1400) { clearInterval(id); e.team = team0; done(seen); }
        }, 8);
      };
      const tb = a => ({ n: a.length,
                         tb: a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(3) : -1,
                         max: a.length ? +Math.max(...a).toFixed(3) : -1 });
      doOne(60, near => doOne(430, far => res({ near: tb(near), far: tb(far),
        cfg: { near: GN.beamSpreadNear, far: GN.beamSpread } })));
      setTimeout(() => res({ timeout: 1, near: { n: 0, tb: -1 }, far: { n: 0, tb: -1, max: -1 } }), 60000);
    }));
    ok('sát mặt cũng đã bắn lệch sẵn, không ngắm thẳng',
      spray.near.n >= 12 && spray.near.tb > .05,
      `${spray.near.n} luồng, lệch trung bình ${spray.near.tb} rad ở 60px`);
    ok('đứng xa thì toác hẳn ra — bắn từa lưa',
      spray.far.n >= 12 && spray.far.tb > spray.near.tb * 1.6 && spray.far.max > .6,
      `${spray.near.tb} rad ở 60px -> ${spray.far.tb} rad ở 430px (lệch nhất ${spray.far.max})`);

    /* Đồng hồ aura phải ĐỨNG YÊN suốt quãng đang vận thế đứng, rồi mới nạp lại đủ
       auraCd — hai quãng không cộng dồn vào nhau. */
    const cd = await page.evaluate(() => new Promise(res => {
      const G = window.__G(), GN = window.__GN;
      const g = G.fighters.find(f => f.key === 'ginyu');
      g.gnPanic = false; g.gnFlash = null; g.gnChange = null;
      g.gnState = 'atk'; g.gnStateT = GN.atk.t; g.gnAura = GN.auraCd;
      const t0 = G.t;
      let duringMin = Infinity, atEnd = -1, stanceEnd = -1;
      const id = setInterval(() => {
        if (g.gnState) duringMin = Math.min(duringMin, g.gnAura);
        else if (stanceEnd < 0) { stanceEnd = G.t - t0; atEnd = g.gnAura; }
        if (stanceEnd >= 0 || G.t - t0 > GN.atk.t + 3) {
          clearInterval(id);
          res({ duringMin: +duringMin.toFixed(3), atEnd: +atEnd.toFixed(3),
                stanceEnd: +stanceEnd.toFixed(2), cd: GN.auraCd, stance: GN.atk.t, RT: window.__RT });
        }
      }, 12);
      setTimeout(() => { clearInterval(id); res({ timeout: 1 }); }, 40000);
    }));
    ok('đang vận thế đứng thì đồng hồ aura đứng yên',
      Math.abs(cd.duringMin - cd.cd) < .01, `tụt xuống thấp nhất ${cd.duringMin}/${cd.cd}`);
    ok('vận xong mới nạp lại đủ 18 giây người chơi — không cộng dồn',
      Math.abs(cd.atEnd - cd.cd) < .15 && Math.abs(cd.cd * cd.RT - 18) < .01,
      `hết thế đứng ở giây ${cd.stanceEnd}, còn ${(cd.atEnd * cd.RT).toFixed(1)}s người chơi mới tới aura sau`);

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
        gBody: g.key, gShows: g.name, gHp: g.hp, gWant: Math.round(g.maxHp * GN.changeHp), gAs: g.swapAs,
        eBody: e.key, eShows: e.name, eHp: e.hp, eWant: Math.round(e.maxHp * GN.changeHp), eAs: e.swapAs,
        eHp0,
        eProj: e.gnBodyProj, eMiss: e.missOdds, eAim: e.aimOff, eCut: e.gnSelfCut, eCc: e.gnCcCut,
        gCut: g.gnSelfCut, gCc: g.gnCcCut, gSoul: g.gnSoul, gCds: Object.keys(g.cds).sort().join(','),
        cut: GN.swapCut, ccCut: GN.swapCcCut
      };
    });
    ok('thân xác Ginyu vẫn là Ginyu nhưng chữ trên thanh máu là tên đối thủ',
      swap.gBody === 'ginyu' && swap.gShows === swap.eName && swap.gAs === 'foe',
      `${swap.gBody} -> "${swap.gShows}"`);
    ok('thân xác đối thủ vẫn là của họ nhưng chữ trên thanh máu là Captain Ginyu',
      swap.eBody === 'kono' && swap.eShows === swap.gName && swap.eAs === 'ginyu',
      `${swap.eBody} -> "${swap.eShows}"`);
    /* Cân bằng: hoán đổi xong thì CẢ HAI thân xác cùng về 20% máu tối đa, không lệch.
       Thân xác địch trước đó đang 50% máu — nếu còn kiểu cộng dồn cũ thì nó phải ra 70%. */
    ok('cả hai thân xác cùng về đúng 20% máu tối đa',
      swap.gHp === swap.gWant && swap.eHp === swap.eWant,
      `Ginyu ${swap.gHp}/${swap.gWant} · thân xác cướp được ${swap.eHp}/${swap.eWant}`);
    ok('không bên nào lệch máu so với bên kia',
      swap.gHp === swap.eHp && swap.eHp !== swap.eHp0,
      `${swap.gHp} vs ${swap.eHp} (trước khi đổi thân xác địch đang ${swap.eHp0})`);
    /* Cân bằng mới: MỘT mức cắt duy nhất cho cả hai bên và cho mọi chiêu — 25% dmg,
       25% thời lượng hiệu ứng. Bản trước chia làm bốn mức lệch nhau (35/30/40/50). */
    ok('cả hai bên cùng một mức cắt: 25% dmg và 25% thời lượng hiệu ứng',
      Math.abs(swap.gCut - swap.cut) < .001 && Math.abs(swap.gCc - swap.ccCut) < .001 &&
      Math.abs(swap.eCut - swap.cut) < .001 && Math.abs(swap.eCc - swap.ccCut) < .001,
      `Ginyu-body ${swap.gCut}/${swap.gCc} · thân xác cướp được ${swap.eCut}/${swap.eCc}`);
    ok('mức cắt đúng bằng 25%', Math.abs(swap.cut - .25) < .001 && Math.abs(swap.ccCut - .25) < .001,
      `${swap.cut} / ${swap.ccCut}`);
    ok('thân xác hệ ném (Konohamaru): ngắm hỏng hẳn thay vì đấm hụt',
      swap.eProj === true && swap.eMiss === 0 && swap.eAim > 1,
      `độ lệch ±${swap.eAim} rad`);
    /* Người dùng chốt: "đối thủ Ginyu khi bị change vẫn có thể dùng skill bản thân". */
    ok('hồn đối thủ nhớ mình là ai và mang theo bộ chiêu của chính mình',
      swap.gSoul === 'kono' && swap.gCds === 's1,s2,s3',
      `hồn ${swap.gSoul} · ô chiêu ${swap.gCds}`);

    // nội tại của thân xác bị cướp phải tắt, và bảng chiêu đọc theo Ginyu
    const after = await waitGame(page, 'true', .5);
    const cross = await page.evaluate(() => {
      const G = window.__G();
      const e = G.fighters.find(f => f.swapAs === 'ginyu');
      return { rage: e.rage, cds: Object.keys(e.cds).sort().join(','), aura: e.gnAura === Infinity };
    });
    ok('cướp xác xong thì nội tại của thân xác tắt, chỉ còn bộ chiêu của Ginyu',
      cross.cds === 's1,s2,s3' && cross.aura, JSON.stringify(cross));

    /* ---- hồn đối thủ trong thân xác Ginyu vẫn bấm được chiêu của CHÍNH MÌNH ----
       Người dùng chốt: "đối thủ Ginyu khi bị change vẫn có thể dùng skill bản thân".
       Chiêu đi theo hồn, đòn tay đi theo thân xác, và cả hai đều bị cắt 75%. */
    const kit = await page.evaluate(() => {
      const G = window.__G();
      const g = G.fighters.find(f => f.swapAs === 'foe');
      const e = G.fighters.find(f => f.swapAs === 'ginyu');
      // dọn sạch mọi thứ có thể xen vào: hiệu ứng, choáng, khoá, đạn đang bay
      for (const f of [g, e]) { f.stun = 0; f.lock = 0; f.dots.length = 0; f.gnDaze = f.gnRage = f.gnTired = f.gnSlow = 0; f.gnState = null; f.evade = 0; f.invuln = 0; }
      G.proj.length = 0;
      window.__statusTick(g, 0); window.__statusTick(e, 0);
      const dmgOut = g.dmgOut, ccOne = window.__gnCc(g, 1);

      // Chiêu 2 của Konohamaru (Kage Bunshin) — đứng ở 300px, ngoài tầm tay
      g.x = e.x - 300; g.y = e.y;
      g.cds.s1 = g.cds.s2 = g.cds.s3 = 0;
      g.pose = 'idle';
      window.__gnSoulThink(g, e, 300, true);
      const bun = { s2: g.cds.s2, pose: g.pose };

      // Chiêu 3 (Sexy no Jutsu) — chiêu 2 vừa vào hồi chiêu nên lần này rơi xuống s3
      g.pose = 'idle';
      window.__gnSoulThink(g, e, 300, true);
      const sexy = { s3: g.cds.s3, pose: g.pose };

      // Đòn tay thì theo THÂN XÁC: đấm đá của Ginyu, và cũng chỉ còn 25% dmg
      e.hp = e.maxHp; g.cds.s1 = 0;
      g.x = e.x - 40; g.y = e.y;
      window.__gnSoulThink(g, e, 40, true);
      const punchDrop = e.maxHp - e.hp;
      return { dmgOut, ccOne, bun, sexy, punchDrop, s1: g.cds.s1,
               want: window.__GN.hitDmg * window.__GN.swapCut };
    });
    ok('hồn đối thủ tung được CHIÊU 2 của chính mình trong thân xác Ginyu',
      kit.bun.s2 > 0 && kit.bun.pose === 'atk2', JSON.stringify(kit.bun));
    ok('và cả CHIÊU 3 của chính mình',
      kit.sexy.s3 > 0 && kit.sexy.pose === 'skill', JSON.stringify(kit.sexy));
    ok('đòn tay thì mượn của thân xác: đấm đá Ginyu, đúng 25% sát thương',
      kit.s1 > 0 && Math.abs(kit.punchDrop - kit.want) < .6,
      `mất ${kit.punchDrop} máu, mốc ${kit.want}`);
    ok('mọi chiêu KHÔNG phải của Ginyu cũng đi qua đúng mức cắt 25%',
      Math.abs(kit.dmgOut - .25) < .001, `dmgOut ${kit.dmgOut}`);
    ok('thời lượng hiệu ứng của hồn đó cũng còn 25%',
      Math.abs(kit.ccOne - .25) < .001, `1 giây -> ${kit.ccOne}`);

    /* Chạy thật một quãng: phân thân phải bay ra khỏi thân xác Ginyu. Đây là bằng
       chứng cuối cùng rằng chiêu của hồn chạy trọn vẹn chứ không chỉ trừ hồi chiêu.
       Phải chờ hết phân cảnh CHANGE trước: hẹn giờ của bunshin tự huỷ khi G.freeze>0. */
    await waitGame(page, 'G.freeze <= 0', 4);
    const cloneOut = await page.evaluate(() => {
      const G = window.__G();
      const g = G.fighters.find(f => f.swapAs === 'foe');
      const e = G.fighters.find(f => f.swapAs === 'ginyu');
      G.proj.length = 0;
      g.stun = 0; g.lock = 0; g.cds.s2 = 0;
      // đứng xa ra: sát mặt thì phân thân chạm địch và tan ngay trong một khung hình,
      // vòng poll 25ms không kịp thấy nó
      g.x = e.x - 300; g.y = e.y;
      window.__gnSoulThink(g, e, 300, true);
      return { s2: g.cds.s2, pose: g.pose, freeze: G.freeze, over: !!G.over, alive: g.alive, hp: g.hp };
    });
    const clone = await waitGame(page, "G.proj.some(p => p.type === 'clone')", 3);
    ok('phân thân bay ra thật từ thân xác Ginyu', clone.hit,
      `sau ${clone.t}s trong trận · ${JSON.stringify(cloneOut)}`);

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
      g.gnProbeDone = true;              // đã thăm dò rồi: luật ba người vẫn phải thắng trần này
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
    ok('ba người trở lên: luôn thăm dò, kể cả khi đã dùng hết lần thăm dò của mình',
      crowd.seen.atk === 0 && crowd.seen.def === 40 && crowd.seen.daze > 5,
      `hưng phấn ${crowd.seen.atk} / thăm dò ${crowd.seen.def}, có ${crowd.seen.daze} lần địch ngơ ngác`);

    ok('trận 3 không lỗi trang', errors.length === 0, errors.join(' | '));
    await browser.close();
  }

  /* ---------- trận 4: bảy cái hồn, cái nào cũng phải chạy được trong thân xác Ginyu ----------
     Mỗi hồn có một bộ chiêu riêng, và mấy chiêu nặng nề nhất (dải bóng, bảo bối, ba pha
     Meteor Strike, quãng đứng suy nghĩ của Horikita) đều tự khoá chân người tung ra rồi
     trông vào một hàm tick để mở khoá. Mấy tick đó gác ở f.key và tắt hẳn khi swapAs bật,
     nên thiếu một nhánh trong gnSoulTick là hồn đó ĐỨNG HÌNH VĨNH VIỄN — đúng cái đã xảy
     ra với Horikita (f.decT không ai đếm xuống). Vòng dưới đây bắt đúng lỗi đó: cướp xác,
     chạy thật một quãng, rồi đòi thấy thân xác Ginyu có lúc rảnh tay. */
  for (const soul of ['kono', 'chichi', 'tsubasa', 'shika', 'suzune', 'dora', 'superman']) {
    const { browser, page, errors } = await openGame('ginyu', soul);
    await page.selectOption('#speed', '1');
    await page.evaluate(() => {
      const G = window.__G();
      const g = G.fighters.find(f => f.key === 'ginyu'), e = G.fighters.find(f => f !== g);
      g.gnEntry = null; g.lock = 0; e.lock = 0;
      if (e.drEntry) { e.drEntry = null; e.drHide = false; }
      if (e.supEntry) { e.supEntry = null; e.supHide = false; e.supAir = 0; }
      window.__ginyuPossess(g, e);
    });
    await waitGame(page, 'G.freeze <= 0', 4);
    const run = await page.evaluate(() => new Promise(res => {
      const G = window.__G(), t0 = G.t;
      const g = G.fighters.find(f => f.swapAs === 'foe');
      let free = 0, acted = 0, poses = {};
      const id = setInterval(() => {
        if (!g) { clearInterval(id); res({ none: 1 }); return; }
        if (g.lock <= 0 && g.stun <= 0) free++;
        if (g.pose !== 'idle') { acted++; poses[g.pose] = 1; }
        if (G.t - t0 > 6 || G.over) {
          clearInterval(id);
          res({ free, acted, poses: Object.keys(poses).join(','), over: !!G.over,
                t: +(G.t - t0).toFixed(2), soul: g.gnSoul, hp: g.hp });
        }
      }, 25);
      setTimeout(() => { clearInterval(id); res({ free, acted, timeout: 1 }); }, 90000);
    }));
    ok(`hồn ${soul} trong thân xác Ginyu không đứng hình vĩnh viễn`,
      !run.none && !run.timeout && run.free > 0, JSON.stringify(run));
    ok(`hồn ${soul}: trận chạy sạch lỗi trang`, errors.length === 0, errors.join(' | '));
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
    /* Luồng khí: TOÀN BỘ tông tím, không lẫn một mảng xanh nào — kể cả thế thăm dò và
       lúc hoảng loạn. Vẽ từng thế ra canvas phụ trên nền đen rồi lấy màu trung bình của
       đám điểm ảnh có sáng lên: tím thì lục thấp nhất, lam cao nhất, đỏ nằm giữa. */
    const aura = await page.evaluate(() => {
      const G = window.__G(), g = G.fighters.find(f => f.key === 'ginyu');
      const doc = {};
      for (const st of ['atk', 'def', 'panic']) {
        g.gnState = st === 'panic' ? null : st;
        g.gnPanic = (st === 'panic');
        g.gnEntry = null;
        const c = document.createElement('canvas'); c.width = 200; c.height = 280;
        const cx = c.getContext('2d');
        cx.fillStyle = '#000'; cx.fillRect(0, 0, 200, 280);
        const old = window.__getCtx(); window.__setCtx(cx);
        window.__gnAuraDraw(g, 100, 240);
        window.__setCtx(old);
        const d = cx.getImageData(0, 0, 200, 280).data;
        let R = 0, Gg = 0, B = 0, n = 0, top = 280, wide = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] + d[i + 1] + d[i + 2] < 24) continue;
          R += d[i]; Gg += d[i + 1]; B += d[i + 2]; n++;
          const px = (i / 4) % 200, py = Math.floor((i / 4) / 200);
          if (py < top) top = py;
          wide = Math.max(wide, Math.abs(px - 100));
        }
        doc[st] = { R: R / n, G: Gg / n, B: B / n, n, top, wide };
      }
      g.gnState = null; g.gnPanic = false;
      return doc;
    });
    const tim = a => a.R > a.G * 1.3 && a.B > a.G * 1.5 && a.R > a.B * .45 && a.R < a.B * 1.1;
    for (const [st, ten] of [['atk', 'hưng phấn'], ['def', 'thăm dò'], ['panic', 'hoảng loạn']]) {
      const a = aura[st];
      ok(`luồng khí thế ${ten} là màu TÍM, không lẫn mảng xanh nào`, tim(a),
        `R ${a.R.toFixed(0)} · G ${a.G.toFixed(0)} · B ${a.B.toFixed(0)}`);
    }
    /* Vỏ khí phải trùm KÍN người: liếm hẳn lên trên đỉnh đầu (model cao 120, chân ở 240
       nên đỉnh đầu là 120) và toác rộng hơn thân người (nửa thân ~20px). */
    ok('vỏ khí trùm kín người — liếm lên trên đỉnh đầu và toác rộng hơn thân',
      aura.atk.top < 118 && aura.atk.wide > 45,
      `mép trên ${aura.atk.top} (đỉnh đầu 120) · rộng ±${aura.atk.wide}px`);
    ok('thế thăm dò là vỏ khí mỏng hơn hẳn, phân biệt bằng độ dày chứ không bằng màu',
      aura.def.n < aura.atk.n * .7,
      `thăm dò ${aura.def.n} điểm ảnh so với hưng phấn ${aura.atk.n}`);

    /* Dáng ra chiêu phải SỐNG HẾT chiêu rồi mới thôi. Chạy tay từng bước (hẹn giờ +
       ginyuTick + đồng hồ dáng) để đo chính xác mốc dáng tắt so với mốc luồng cuối. */
    const pose = await page.evaluate(() => {
      const G = window.__G(), GN = window.__GN, RT = window.__RT, dt = 1 / 120;
      const g = G.fighters.find(f => f.key === 'ginyu'), e = G.fighters.find(f => f !== g);
      const run = (ten, ban) => {
        g.gnState = null; g.gnStateT = 0; g.gnFlash = null; g.gnEntry = null;
        g.gnPanic = false; g.lock = 0; g.stun = 0; g.pose = 'idle'; g.poseT = 0;
        g.cds = { s1: 99, s2: 0, s3: 0 };
        e.x = g.x + 200; e.y = g.y; e.maxHp = 99999; e.hp = e.maxHp; e.evade = 0;
        G.proj.length = 0; G.timers.length = 0;
        ban();
        let poseEnd = -1, lastShot = -1, xong = -1, seen = 0;
        for (let i = 0; i < 900; i++) {
          const t = i * dt;
          for (let k = G.timers.length - 1; k >= 0; k--) {
            const tm = G.timers[k]; tm.t -= dt;
            if (tm.t <= 0) { G.timers.splice(k, 1); try { tm.fn(); } catch (err) { } }
          }
          G.t += dt;
          if (g.poseT > 0) { g.poseT -= dt; if (g.poseT <= 0) g.pose = 'idle'; }
          window.__ginyuTick(g, dt);
          const n = G.proj.filter(p => p.type === 'gbeam').length;
          if (n > seen) { seen = n; lastShot = t; }
          if (poseEnd < 0 && g.pose !== ten) poseEnd = t;
          if (ten === 'flash' && !g.gnFlash && xong < 0 && t > .05) xong = t;
        }
        G.proj.length = 0; G.timers.length = 0;
        return { poseEnd: poseEnd * RT, lastShot: lastShot * RT, xong: xong * RT };
      };
      const beam = run('beam', () => window.__ginyuBeam(g, e));
      const flash = run('flash', () => window.__ginyuFlash(g, e));
      g.pose = 'idle'; g.poseT = 0; g.lock = 0;
      return { beam, flash, n: GN.beamN };
    });
    ok(`dáng Ginyu Beam sống hết cả ${pose.n} luồng rồi mới thôi`,
      pose.beam.poseEnd > pose.beam.lastShot + .2,
      `luồng cuối ở giây ${pose.beam.lastShot.toFixed(2)}, dáng giữ tới ${pose.beam.poseEnd.toFixed(2)} (thừa ${(pose.beam.poseEnd - pose.beam.lastShot).toFixed(2)}s)`);
    ok('dáng Ginyu Flash sống hết luồng sáng rồi còn giữ thêm một nhịp',
      pose.flash.poseEnd > pose.flash.xong + .2,
      `luồng sáng tắt ở giây ${pose.flash.xong.toFixed(2)}, dáng giữ tới ${pose.flash.poseEnd.toFixed(2)} (thừa ${(pose.flash.poseEnd - pose.flash.xong).toFixed(2)}s)`);

    /* Hoán đổi thân xác xong thì CẢ HAI thân xác cùng về 20% máu — đúng cái mốc bật cờ
       tơi tả — nên cả hai phải mang model tơi tả, và dấu vết phải NHÌN RA ĐƯỢC chứ không
       phải vài nét mờ. Chấm bằng cách đếm điểm ảnh lệch giữa lành lặn và tơi tả. */
    const toi = await page.evaluate(() => {
      const G = window.__G(), GN = window.__GN;
      const g = G.fighters.find(f => f.key === 'ginyu'), e = G.fighters.find(f => f !== g);
      /* Thử với hai cỡ máu tối đa: một số chẵn và một số LẺ. Số lẻ là chỗ Math.round()
         từng đẩy máu lên cao hơn mốc 20% đúng một chút và model tơi tả không hiện —
         mà ô máu thì người chơi chỉnh được từ 100 tới 9999 nên số lẻ là chuyện thường. */
      const thu = max => {
        g.gnEntry = null; g.gnChange = null; g.gnChangeDone = false;
        g.swapAs = null; e.swapAs = null; g.gnSoul = null; e.gnSoul = null;
        g.maxHp = max; e.maxHp = max; g.hp = max; e.hp = max;
        g.injured = false; e.injured = false;
        window.__ginyuPossess(g, e);
        // cờ tơi tả do step() bật theo ngưỡng máu; ở đây soi thẳng mốc cho khỏi phải chờ
        return [g, e].map(f => ({
          key: f.key, hp: Math.round(f.hp), max: f.maxHp,
          duoiMoc: f.hp <= f.maxHp * .20
        }));
      };
      const moc = thu(1000).concat(thu(999));
      // đếm điểm ảnh của dấu vết tơi tả, soi cả bốn kênh RGBA
      const dem = key => {
        const ve = inj => {
          const c = document.createElement('canvas'); c.width = 140; c.height = 180;
          const cx = c.getContext('2d');
          const old = window.__getCtx(); window.__setCtx(cx);
          cx.save(); cx.translate(70, 150);
          window.__vector({ key, pose: 'idle', moving: false, injured: inj, face: 1,
                            spriteH: 120, vx: 0, vy: 0, speed: 100, form: 2 });
          cx.restore(); window.__setCtx(old);
          return cx.getImageData(0, 0, 140, 180).data;
        };
        const a = ve(false), b = ve(true);
        let n = 0;
        for (let i = 0; i < a.length; i += 4)
          if (a[i] !== b[i] || a[i+1] !== b[i+1] || a[i+2] !== b[i+2] || a[i+3] !== b[i+3]) n++;
        return n;
      };
      return { moc, px: dem('ginyu'), pxFoe: dem(e.key), foeKey: e.key, changeHp: GN.changeHp };
    });
    ok('CHANGE xong thì cả hai thân xác cùng nằm dưới mốc tơi tả 20% máu, kể cả khi máu tối đa là số lẻ',
      toi.moc.every(m => m.duoiMoc),
      toi.moc.map(m => `${m.key} ${m.hp}/${m.max}${m.duoiMoc ? '' : ' HONG'}`).join(' · '));
    /* Bản cũ chỉ có hai vệt xước con con, đo ra 113 điểm ảnh — đứng ở cỡ trong trận thì
       chẳng thấy gì. Đòi hẳn 300 để không ai lỡ tay rút gọn lại. */
    ok('dấu vết tơi tả của Ginyu đủ đậm để nhìn ra ở cỡ trong trận',
      toi.px >= 300, `${toi.px} điểm ảnh lệch (bản cũ chỉ 113)`);
    ok('thân xác bị cướp cũng mang dấu vết tơi tả của chính nó',
      toi.pxFoe > 60, `${toi.foeKey}: ${toi.pxFoe} điểm ảnh lệch`);

    ok('bảng tiếng/ảnh không lỗi trang', errors.length === 0, errors.join(' | '));
    await browser.close();
  }

  console.log(out.join('\n'));
  console.log(fail ? `\nHONG ${fail} muc` : `\nDAT tat ca ${out.length} muc`);
  process.exit(fail ? 1 : 0);
})();
