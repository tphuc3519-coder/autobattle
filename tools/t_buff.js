/* Đợt tăng sức mạnh cho ChiChi · Ozora Tsubasa · Horikita Suzune.
   Mọi con số ở đây đều đo THẬT trong game chứ không đọc suông hằng số: gọi thẳng
   melee() / kickBall() / ballHit() / eagleAwaken() / suzHeal() qua móc trong probe.js
   rồi xem máu, tốc bóng, quãng hất lùi và lượng hồi thay đổi ra sao.

   1. ChiChi — chí mạng gốc 30%, cú đá chí mạng 30 dmg, và cộng dồn KHÔNG có trần;
   2. Tsubasa — tỉ lệ overhead kick / tốc bóng / nhịp sút cùng lên 150%, Drive Shot
      +10 dmg và hất lùi 20% sàn, overhead kick +15% dmg, Twin Shot dài thêm 0.5s
      choáng và 3s thủng giáp, bật Wings of the Eagle thì hồi 6.5% máu tối đa, và
      cửa thoát khi bị dồn sát mép sàn;
   3. Horikita — quyết định đúng 75% ở form 2 / 80% ở form 3, form 3 hồi máu theo
      MÁU TỐI ĐA, bốn bậc cộng dồn, Ayanokouji lần 2 có 65% máu của cô.
   Chạy: node tools/t_buff.js */
const { openGame } = require('./probe.js');

let hong = 0;
const ok = (ten, dat, ghi) => {
  console.log(`${dat ? ' dat  ' : ' HONG '} ${ten}${ghi !== undefined ? '  — ' + ghi : ''}`);
  if (!dat) hong++;
};

(async () => {
  /* ================= ChiChi ================= */
  {
    const { browser, page, errors } = await openGame('chichi', 'kono');
    const C = await page.evaluate(() => window.__CHICHI);
    ok('ChiChi chí mạng gốc 30% (cũ 10%)', C.crit === .30, C.crit);
    ok('cú đá chí mạng khai 30 dmg (cũ 25)', C.critDmg === 30, C.critDmg);

    /* Ghim `Math.random` về 0 thì `chance(p)` luôn đúng ⇒ ép ra chí mạng, đo đúng
       lượng máu tụt trong MỘT đòn chứ không cộng dồn (mục 9: đo cú sụt lớn nhất). */
    const dmg = await page.evaluate(() => {
      const G = window.__G();
      const c = G.fighters.find(f => f.key === 'chichi'), e = G.fighters.find(f => f.key === 'kono');
      e.hp = e.maxHp; e.evade = 0; e.dodge = 0; e.dmgRes = 0; e.invuln = 0; e.prewing = false;
      const r = Math.random; Math.random = () => 0;
      window.__melee(c, e);
      Math.random = r;
      return e.maxHp - e.hp;
    });
    ok('cú đá chí mạng ăn đúng 30 dmg vào người', dmg === 30, `${dmg} dmg`);

    /* "Crit ko giới hạn": nội tại cứ 5 đòn +5%, không ai được kẹp `Math.min` vào đó. */
    const cb = await page.evaluate(() => {
      const G = window.__G();
      const c = G.fighters.find(f => f.key === 'chichi'), e = G.fighters.find(f => f.key === 'kono');
      c.critBonus = 0; c.hits = 0;
      for (let i = 0; i < 200; i++) window.__counters(c, e);
      return c.critBonus;
    });
    ok('chí mạng KHÔNG có trần — 200 đòn ⇒ +200%', cb >= 1.9, `+${Math.round(cb * 100)}%`);
    ok('trận ChiChi không lỗi trang', errors.length === 0, errors.slice(0, 2).join(' | '));
    await browser.close();
  }

  /* ================= Tsubasa ================= */
  {
    const { browser, page, errors } = await openGame('tsubasa', 'kono');
    const S = await page.evaluate(() => window.__TSU);
    ok('ba thứ cùng lên 150%: tỉ lệ overhead kick 10% -> 15%',
      Math.abs(S.bicOdds - .15) < 1e-9, S.bicOdds.toFixed(3));
    ok('tốc bóng thường 305 -> 457.5', Math.abs(S.ballSpd - 457.5) < 1e-9, S.ballSpd);
    ok('tốc bóng overhead 345 -> 517.5', Math.abs(S.bicSpd - 517.5) < 1e-9, S.bicSpd);
    ok('nhịp sút nhanh gấp rưỡi (1.35 -> 0.9)', Math.abs(S.shotCd - .9) < 1e-9, S.shotCd);
    ok('overhead kick +15% dmg (40 -> 46)', S.bicDmg === 46, S.bicDmg);
    ok('Drive Shot +10 dmg gốc (80 -> 90)', S.driveDmg === 90, S.driveDmg);

    const spd = await page.evaluate(() => {
      const G = window.__G();
      const t = G.fighters.find(f => f.key === 'tsubasa'), e = G.fighters.find(f => f.key === 'kono');
      G.proj.length = 0;
      window.__kickBall(t, e, false);
      const p = G.proj[G.proj.length - 1];
      return Math.round(Math.hypot(p.vx, p.vy));
    });
    ok('viên bóng bắn ra thật đúng tốc mới', Math.abs(spd - 458) <= 1, `${spd} px/s`);

    /* Quãng hất lùi đo theo lối `t_dora.js`: bám cú DỊCH XA NHẤT trong lúc trận vẫn
       chạy, đừng đọc vị trí cuối — AI vẫn đi lại nên đọc kiểu đó ra thiếu hẳn. */
    const dr = await page.evaluate(() => new Promise(res => {
      const G = window.__G(), WH = window.__WH();
      const t = G.fighters.find(f => f.key === 'tsubasa'), e = G.fighters.find(f => f.key === 'kono');
      e.hp = e.maxHp; e.evade = 0; e.dodge = 0; e.dmgRes = 0; e.invuln = 0;
      e.eagle = false; e.prewing = false; e.kbTake = 1; e.kbx = 0; e.kby = 0;
      t.x = 160; t.y = 300; e.x = 200; e.y = 300;
      const hp0 = e.hp, x0 = e.x;
      window.__ballHit({ type: 'drive', dmg: window.__TSU.driveDmg, owner: t,
                         vx: 300, vy: 0, x: e.x - 30, y: e.y }, e);
      const mat = hp0 - e.hp;
      let far = 0;
      const id = setInterval(() => {
        far = Math.max(far, e.x - x0);
        if (Math.hypot(e.kbx, e.kby) < 1) {
          clearInterval(id); res({ mat: Math.round(mat), di: Math.round(far), W: WH.W });
        }
      }, 10);
      setTimeout(() => { clearInterval(id); res({ mat: Math.round(mat), di: Math.round(far), W: WH.W }); }, 20000);
    }));
    ok('Drive Shot ăn đúng 90 dmg', dr.mat === 90, `${dr.mat} dmg`);
    ok(`Drive Shot hất lùi khoảng 20% sàn (~${Math.round(dr.W * .2)}px)`,
      Math.abs(dr.di - dr.W * .2) / (dr.W * .2) < .18, `bay ${dr.di}px / sàn ${dr.W}px`);

    const tw = await page.evaluate(() => {
      const G = window.__G();
      const t = G.fighters.find(f => f.key === 'tsubasa'), e = G.fighters.find(f => f.key === 'kono');
      e.hp = e.maxHp; e.evade = 0; e.dodge = 0; e.invuln = 0;
      e.stun = 0; e.vuln = 0; e.ccRes = 0; e.gnCcRes = 0; e.prewing = false;
      window.__ballHit({ type: 'twin', dmg: 150, owner: t, vx: 300, vy: 0, x: e.x, y: e.y }, e);
      return { stun: e.stun, vuln: e.vuln, rt: window.__RT };
    });
    ok('Twin Shot choáng dài thêm 0.5s (4 -> 4.5 giây người chơi)',
      Math.abs(tw.stun * tw.rt - 4.5) < .05, `${(tw.stun * tw.rt).toFixed(2)}s`);
    ok('Twin Shot thủng giáp dài thêm 3s (6 -> 9 giây người chơi)',
      Math.abs(tw.vuln * tw.rt - 9) < .05, `${(tw.vuln * tw.rt).toFixed(2)}s`);

    const eg = await page.evaluate(() => {
      const G = window.__G();
      const t = G.fighters.find(f => f.key === 'tsubasa');
      t.hp = Math.round(t.maxHp * .09);
      const truoc = t.hp;
      window.__eagleAwaken(t);
      for (let i = 0; i < 1200 && !t.eagle; i++) window.__step(1 / 120);
      return { truoc, sau: Math.round(t.hp), max: t.maxHp, eagle: !!t.eagle, burn: t.eagleBurn };
    });
    ok('bật Wings of the Eagle thì hồi 6.5% máu tối đa',
      eg.eagle && Math.abs((eg.sau - eg.truoc) - eg.max * .065) <= 2,
      `${eg.truoc} -> ${eg.sau} (+${eg.sau - eg.truoc}, chuẩn +${Math.round(eg.max * .065)})`);
    /* `eagleBurn` chia đều máu CÒN LẠI vào EAGLE_BURN giây, nên phần hồi phải cộng vào
       TRƯỚC lúc chốt con số đó — hồi sau là quãng cháy vẫn tính theo máu cũ, anh gục non. */
    ok('nhịp cháy chốt SAU khi hồi, không gục non',
      Math.abs(eg.burn * S.burn - eg.sau) <= 2,
      `${Math.round(eg.burn)}/giây × ${S.burn}s = ${Math.round(eg.burn * S.burn)} trên ${eg.sau} máu`);
    ok('trận Tsubasa không lỗi trang', errors.length === 0, errors.slice(0, 2).join(' | '));
    await browser.close();
  }

  /* ---- bị dồn vào góc thì bứt tốc thoát ra ---- */
  {
    const { browser, page, errors } = await openGame('tsubasa', 'chichi');
    const pin = await page.evaluate(() => {
      const G = window.__G(), WH = window.__WH(), S = window.__TSU;
      const t = G.fighters.find(f => f.key === 'tsubasa'), e = G.fighters.find(f => f.key === 'chichi');
      t.tsuPin = 0; t.tsuRun = 0;
      let mo = -1, mulLucMo = 1;
      for (let i = 0; i < 600; i++) {
        t.x = 40; t.y = WH.H / 2; e.x = t.x + 120; e.y = t.y;   // ép sát mép, địch dí sát
        t.moveMul = 1;
        window.__tsuPinTick(t, 1 / 120);
        if (mo < 0 && t.tsuRun > 0) { mo = i / 120; mulLucMo = t.moveMul; }
      }
      t.tsuPin = 0; t.tsuRun = 0;
      for (let i = 0; i < 300; i++) {                            // ra giữa sàn thì thôi
        t.x = WH.W / 2; t.y = WH.H / 2; t.moveMul = 1;
        window.__tsuPinTick(t, 1 / 120);
      }
      return { mo, mulLucMo, giua: t.tsuRun, mul: S.pinMul, rt: window.__RT };
    });
    ok('bị dồn sát mép sàn đúng 2 giây người chơi thì cửa thoát mở',
      pin.mo > 0 && Math.abs(pin.mo * pin.rt - 2) < .1, `${(pin.mo * pin.rt).toFixed(2)}s`);
    ok('thoát ra thì tốc chạy nhân đúng hệ số',
      Math.abs(pin.mulLucMo - pin.mul) < 1e-9, `×${pin.mulLucMo}`);
    ok('đứng giữa sàn thì không bao giờ kích ra', pin.giua === 0, pin.giua);
    ok('trận dồn góc không lỗi trang', errors.length === 0, errors.slice(0, 2).join(' | '));
    await browser.close();
  }

  /* ================= Horikita ================= */
  {
    const { browser, page, errors } = await openGame('suzune', 'kono');
    const Z = await page.evaluate(() => window.__SUZ);
    ok('form 2 quyết định đúng 75% (cũ 65%)', Z.f2.decOdds === .75, Z.f2.decOdds);
    ok('form 3 quyết định đúng 80% (cũ 70%)', Z.f3.decOdds === .80, Z.f3.decOdds);
    ok('form 3 sẵn 12.5% miễn thương', Z.f3.dmgRes === .125, Z.f3.dmgRes);
    ok('form 3 sẵn 45% tỉ lệ hồi máu', Z.f3.healOdds === .45, Z.f3.healOdds);
    ok('form 3 sẵn 12% kháng hiệu ứng', Z.f3.ccRes === .12, Z.f3.ccRes);
    ok('cộng dồn tối đa 4 bậc (cũ 5)', Z.st.max === 4, Z.st.max);
    ok('Ayanokouji lần 2 có 65% máu hiện tại của Horikita (cũ 35%)', Z.ayaHp === .65, Z.ayaHp);
    ok('đột kích dày hơn: 4.5 -> 3.6 giây người chơi',
      Math.abs(Z.ayaCd * 2 - 3.6) < .01, `${(Z.ayaCd * 2).toFixed(2)}s`);

    /* Form 3 đo lượng hồi theo MÁU TỐI ĐA, form 2 vẫn theo máu HIỆN TẠI — cờ `healMax`
       trong suzTune() là ranh giới, đừng để hai form dùng chung một cách đo. */
    const heal = await page.evaluate(() => {
      const G = window.__G(), f = G.fighters.find(x => x.key === 'suzune');
      f.maxHp = 800;
      f.form = 3; f.stacks = 0;
      const T3 = window.__suzTune(f);
      f.hp = 200; window.__suzHeal(f, T3.healPct, T3.healMax);
      const hoi3 = Math.round(f.hp - 200);
      f.form = 2; f.stacks = 0;
      const T2 = window.__suzTune(f);
      f.hp = 200; window.__suzHeal(f, T2.healPct, T2.healMax);
      return { hoi3, hoi2: Math.round(f.hp - 200), max3: !!T3.healMax, max2: !!T2.healMax };
    });
    ok('form 3 hồi 10% MÁU TỐI ĐA (800 máu ⇒ 80)', heal.hoi3 === 80 && heal.max3, `${heal.hoi3} máu`);
    ok('form 2 vẫn hồi theo máu HIỆN TẠI (200 máu ⇒ 10)', heal.hoi2 === 10 && !heal.max2, `${heal.hoi2} máu`);

    const st4 = await page.evaluate(() => {
      const G = window.__G(), f = G.fighters.find(x => x.key === 'suzune');
      f.maxHp = 800; f.form = 3; f.stacks = 4;
      const T = window.__suzTune(f);
      window.__suzApply(f);
      return { dec: T.decOdds, odds: T.healOdds, pct: T.healPct, res: f.dmgRes, cc: f.ccRes };
    });
    ok('đủ 4 bậc: tỉ lệ hồi máu 85%', Math.abs(st4.odds - .85) < 1e-9, st4.odds.toFixed(2));
    ok('đủ 4 bậc: lượng hồi 34% máu tối đa', Math.abs(st4.pct - .34) < 1e-6, st4.pct.toFixed(2));
    ok('đủ 4 bậc: miễn thương 62.5%', Math.abs(st4.res - .625) < 1e-9, st4.res.toFixed(3));
    ok('đủ 4 bậc: kháng hiệu ứng 62%', Math.abs(st4.cc - .62) < 1e-9, st4.cc.toFixed(2));
    ok('miễn thương vẫn dưới trần .75, không bao giờ chạm 100%', st4.res < .75, st4.res.toFixed(3));
    ok('trận Horikita không lỗi trang', errors.length === 0, errors.slice(0, 2).join(' | '));
    await browser.close();
  }

  console.log(hong ? `\nHONG ${hong} muc` : '\nDAT het');
  process.exit(hong ? 1 : 0);
})();
