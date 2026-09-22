/* MATCH RECAP — thẻ tổng kết sau trận.
   Người dùng: *"Sau trận, hiện một thẻ gọn gồm: thời lượng, HP còn lại, sát thương gây ra,
   hồi máu thực tế và chiêu đóng góp nhiều nhất"*, kèm hai điều kiện: *"Thẻ này chỉ xuất
   hiện sau trận, giữ arena thoáng"* và nó phải giúp nhận ra *"nhân vật thắng nhờ gì"*.

   Phần lớn mục ở đây ĐO THẬT trong trận chứ không đọc hằng số. */
const { openGame, openMulti } = require('./probe');

let loi = [];
const ok = (dk, msg) => { console.log(`${dk ? ' dat  ' : ' HONG '} ${msg}`); if (!dk) loi.push(msg); };

(async () => {
  /* ---------- Trận 1: sổ sát thương và sổ chiêu ---------- */
  let { browser, page, errors } = await openGame('kono', 'chichi');
  await page.waitForTimeout(300);

  // 1. Suốt trận thì thẻ phải TẮT — sàn đấu vẫn thoáng, đúng điều kiện người dùng nêu.
  {
    const r = await page.evaluate(() => {
      const G = window.__G(), box = document.getElementById('recapCard');
      return { co: !!box, off: box && box.classList.contains('off'), recap: !!G.recap, t: G.t };
    });
    ok(r.co, 'thẻ #recapCard có mặt trong trang');
    ok(r.off && !r.recap, `đang đánh thì thẻ TẮT và chưa có sổ (G.t=${r.t.toFixed(1)})`);
  }

  // 2. Sổ chiêu cộng lại phải BẰNG ĐÚNG dmgDealt — cùng một cửa, cùng một con số.
  {
    const r = await page.evaluate(async () => {
      const G = window.__G(), hurt = window.__hurt;
      const k = G.k, c = G.c;
      k.dmgDealt = 0; k.moves = null;
      c.hp = c.maxHp; c.invuln = 0; c.evade = 0; c.taken = null; c.dmgTaken = 0;
      hurt(c, 40, k, false);                       // đòn thường
      hurt(c, 60, k, 'AIR CANNON!', 'big');        // có băng-rôn tên chiêu
      hurt(c, 25, k, 'AIR CANNON!', 'big');
      let tong = 0; for (const x in k.moves) tong += k.moves[x].d;
      return { dealt: k.dmgDealt, tong, moves: JSON.parse(JSON.stringify(k.moves)),
        taken: c.dmgTaken, tk: JSON.parse(JSON.stringify(c.taken)) };
    });
    ok(Math.abs(r.tong - r.dealt) < .01,
      `sổ chiêu cộng lại = dmgDealt (${r.tong.toFixed(1)} / ${r.dealt.toFixed(1)})`);
    const basic = r.moves['\u0000basic'], ac = r.moves['AIR CANNON'];
    ok(basic && ac, `tách được đòn thường (${basic && Math.round(basic.d)}) và AIR CANNON (${ac && Math.round(ac.d)})`);
    ok(Math.round(ac.d) === 85, `hai cú cùng chiêu thì CỘNG DỒN, không tách hai dòng (${Math.round(ac.d)})`);
    ok(ac.n === 2 && Math.round(ac.mx) === 60,
      `và đếm đủ SỐ ĐÒN (${ac.n}) cùng ĐÒN NẶNG NHẤT (${Math.round(ac.mx)})`);
    ok(Math.round(r.taken) === 125, `người bị đánh có sổ SÁT THƯƠNG PHẢI CHỊU riêng (${Math.round(r.taken)})`);
    ok(r.tk['AIR CANNON'] && Math.round(r.tk['AIR CANNON'].d) === 85,
      `sổ phải chịu chia theo đúng từng chiêu (AIR CANNON ${r.tk['AIR CANNON'] && Math.round(r.tk['AIR CANNON'].d)})`);
  }

  // 3. recapMove(): bốn nấc tra tên, nấc nào có trước thì thắng.
  {
    const r = await page.evaluate(() => {
      const mv = window.__recapMove, tag = window.__setMoveTag;
      const out = {};
      tag(null); out.basic = mv(false, undefined);
      out.label = mv('METEOR STRIKE!', 'big');           // nhãn băng-rôn thắng
      out.kind = mv(false, 'conanKick');                 // kind riêng của nhân vật mới
      tag('HEAT VISION'); out.tagWin = mv(false, 'big'); // MOVE_TAG thắng kind
      out.labelWin = mv('GINYU FLASH!', 'big');          // nhãn vẫn thắng cả MOVE_TAG
      tag(null);
      out.critBool = mv(true, undefined);                // crit=true chỉ là chí mạng, không phải tên chiêu
      out.edge = window.__recapTidy('BOOM · EDGE');
      out.tier = window.__recapTidy('GREAT DECISION');
      return out;
    });
    ok(r.basic === null, 'không nhãn, không tag, không kind ⇒ đòn thường (null)');
    ok(r.label === 'METEOR STRIKE', 'nhãn băng-rôn thắng, và bỏ dấu than');
    ok(r.kind === 'SOCCER BALL SHOT', "kind 'conanKick' tra ra tên chiêu");
    ok(r.tagWin === 'HEAT VISION', 'MOVE_TAG thắng kind');
    ok(r.labelWin === 'GINYU FLASH', 'nhãn băng-rôn thắng cả MOVE_TAG');
    ok(r.critBool === null, 'crit=true (chí mạng đòn thường) KHÔNG biến thành tên chiêu');
    ok(r.edge === 'EXPLOSIVE KUNAI', 'BOOM · EDGE gộp về cùng một chiêu với BOOM');
    ok(r.tier === 'DECISION MAKING', 'bốn mức DECISION của Horikita gộp về một dòng');
  }

  // 4. Máu hồi THẬT SỰ — ghi trên người được hồi, và không bao giờ tính phần hồi tràn.
  {
    const r = await page.evaluate(() => {
      const G = window.__G(), f = G.k;
      f.healGot = 0; f.maxHp = 800; f.hp = 700;
      window.__recapHeal(f, Math.min(f.maxHp - f.hp, 50)); f.hp += 50;
      const giua = f.healGot;
      // cửa hồi máu trong game đều kẹp min(maxHp-hp, …) trước khi gọi vào đây
      const con = Math.min(f.maxHp - f.hp, 400);
      window.__recapHeal(f, con); f.hp += con;
      return { giua, cuoi: f.healGot, hp: f.hp, max: f.maxHp };
    });
    ok(r.giua === 50, `hồi 50 ⇒ sổ ghi 50 (${r.giua})`);
    ok(r.cuoi === 100 && r.hp === r.max,
      `hồi tràn thì chỉ ghi phần THẬT SỰ vào (${r.cuoi} chứ không phải 450)`);
  }

  // 5. Sakura hồi máu trong trận thật ⇒ sổ phải nhích lên.
  {
    const r = await page.evaluate(async () => {
      const G = window.__G();
      const s = G.k; s.healGot = 0; s.maxHp = 800; s.hp = 300;
      // mượn cửa hồi của Horikita: đi qua đúng đường suzHeal() thật, không gọi tắt
      window.__suzHeal(s, .25, true);
      return { heal: s.healGot, hp: Math.round(s.hp) };
    });
    ok(r.heal > 0, `cửa hồi máu THẬT của game ghi vào sổ (+${Math.round(r.heal)} máu)`);
  }

  // 6. Kết trận thật: sổ dựng ra đủ, hàng xếp người thắng lên đầu.
  {
    const r = await page.evaluate(async () => {
      const G = window.__G();
      G.t = 47.5;                                   // 47.5 giây TRONG TRẬN
      G.k.hp = 412; G.k.dmgDealt = 640; G.k.healGot = 88;
      G.k.moves = { '\u0000basic': { d: 200, n: 10, mx: 25 }, 'RASENGAN': { d: 440, n: 4, mx: 150 } };
      G.k.dmgTaken = 388; G.k.taken = { 'FLYING KICK': { d: 388, n: 8, mx: 60 } };
      G.c.hp = 0; G.c.dmgDealt = 388; G.c.healGot = 0;
      G.c.moves = { 'FLYING KICK': { d: 388, n: 8, mx: 60 } };
      G.c.dmgTaken = 640; G.c.taken = { '\u0000basic': { d: 200, n: 10, mx: 25 }, 'RASENGAN': { d: 440, n: 4, mx: 150 } };
      window.__finish(G.k);
      const R = G.recap;
      return {
        dur: R.dur, win: R.win, n: R.rows.length,
        a: R.rows[0], b: R.rows[1]
      };
    });
    ok(r.n === 2 && r.win === r.a.name, `thẻ dựng đủ ${r.n} hàng, người thắng đứng đầu (${r.win})`);
    ok(r.a.dmg === 640 && r.a.heal === 88 && r.a.hp === 412,
      `hàng người thắng: dmg ${r.a.dmg} · heal ${r.a.heal} · hp ${r.a.hp}`);
    ok(r.a.top === 'RASENGAN' && r.a.topDmg === 440,
      `chiêu chủ lực đọc ra đúng: ${r.a.top} ${r.a.topDmg}`);
    ok(r.b.hp === 0 && r.b.top === 'FLYING KICK', 'hàng người thua vẫn còn đủ số liệu');
    ok(Math.abs(r.dur - 47.5) < .01, `thời lượng chụp theo G.t (${r.dur})`);
  }

  // 7. Thẻ hiện ra SAU trận, và chỉ sau mốc giữ màn WINNER.
  {
    const som = await page.evaluate(() => {
      const G = window.__G(); G.endT = .4; window.__recapTick();
      return document.getElementById('recapCard').classList.contains('off');
    });
    ok(som, 'ngay lúc vừa hạ gục (endT 0.4) thẻ vẫn TẮT — nhường màn WINNER');
    const r = await page.evaluate(() => {
      const G = window.__G(); G.endT = 2.4; window.__recapTick();
      const box = document.getElementById('recapCard');
      const st = getComputedStyle(box);
      return {
        off: box.classList.contains('off'),
        txt: box.textContent,
        rows: box.querySelectorAll('.recapRow:not(.head)').length,
        pe: st.pointerEvents,
        z: +st.zIndex,
        anim: st.animationIterationCount
      };
    });
    ok(!r.off && r.rows === 2, `qua mốc 2s thì thẻ BẬT với ${r.rows} hàng`);
    /* RT = 1 ở nhịp gốc mới, nên 47.5 giây trong trận CŨNG LÀ 47.5 giây thật ⇒ 0:48.
       Vẫn phải bọc rts() chứ đừng in thẳng G.t (mục 1, luật 2): đổi nhịp gốc là dòng này
       tự đúng theo. */
    ok(/0:48/.test(r.txt), `thời lượng in ra theo giây người chơi 0:48 (rts của 47.5)`);
    ok(/RASENGAN/.test(r.txt) && /440/.test(r.txt), 'thẻ in tên chiêu chủ lực và con số của nó');
    ok(/640/.test(r.txt) && /88/.test(r.txt) && /412/.test(r.txt), 'thẻ in đủ dmg · heal · máu còn');
    ok(r.pe === 'none', 'cả khối pointer-events:none — không chặn dải nút bên dưới');
    ok(r.z < 65, `z-index ${r.z} nằm DƯỚI dải nút (.arcOver = 65)`);
    ok(r.anim === '1', 'cú hiện ra chạy đúng MỘT lần, không animation lặp mãi (mục 9)');

    /* Dải diễn biến của thẻ gọn: MỘT biểu đồ chung, không phải mỗi hàng một cái. Gắn
       vào từng hàng thì thẻ cao thêm chừng 12px mỗi hàng, mà cái đáng đọc lại là so
       các đường VỚI NHAU. */
    const fl = await page.evaluate(() => {
      const box = document.getElementById('recapCard');
      return {
        strip: box.querySelectorAll('.recapFlow').length,
        svg: box.querySelectorAll('.recapFlow .chSvg').length,
        paths: box.querySelectorAll('.recapFlow .chLn').length,
        h: box.getBoundingClientRect().height
      };
    });
    ok(fl.strip === 1 && fl.svg === 1, 'thẻ gọn có ĐÚNG MỘT dải diễn biến chung cho cả thẻ');
    ok(fl.paths >= 1, `dải đó vẽ ra đường thật (${fl.paths})`);
    ok(fl.h < 320, `thêm dải mà thẻ vẫn GỌN: ${Math.round(fl.h)}px`);
  }

  // 8. Đổi ngôn ngữ thì nhãn đổi, TÊN CHIÊU giữ nguyên (luật TÊN RIÊNG, mục 2f).
  {
    const r = await page.evaluate(async () => {
      const box = document.getElementById('recapCard');
      await window.__setLang('en'); const en = box.textContent;
      await window.__setLang('vi'); const vi = box.textContent;
      return { en, vi };
    });
    ok(/MATCH RECAP/.test(r.en) && /Damage/.test(r.en), 'bản tiếng Anh: nhãn đổi theo');
    ok(/TỔNG KẾT TRẬN/.test(r.vi) && /Sát thương/.test(r.vi), 'bản tiếng Việt: nhãn đổi theo');
    ok(/RASENGAN/.test(r.en) && /RASENGAN/.test(r.vi), 'tên chiêu GIỮ NGUYÊN ở cả hai ngôn ngữ');
  }

  // 9. Lớp phủ nào mở thì thẻ giấu đi.
  {
    const r = await page.evaluate(() => {
      const box = document.getElementById('recapCard'), csel = document.getElementById('charSelect');
      csel.classList.remove('off'); window.__recapTick();
      const che = box.classList.contains('off');
      csel.classList.add('off'); window.__recapTick();
      return { che, lai: !box.classList.contains('off') };
    });
    ok(r.che, 'mở màn chọn nhân vật thì thẻ giấu đi');
    ok(r.lai, 'đóng lại thì thẻ hiện lại');
  }

  // 10. Đánh lại thì sổ về 0.
  {
    const r = await page.evaluate(() => {
      window.__newGame();
      const G = window.__G();
      return { recap: G.recap, dead: (G.recapDead || []).length,
        dmg: G.k.dmgDealt, heal: G.k.healGot, mv: G.k.moves };
    });
    ok(!r.recap && r.dead === 0, 'trận mới: sổ thẻ xoá sạch');
    ok(!r.dmg && !r.heal && !r.mv, 'trận mới: dmgDealt / healGot / sổ chiêu đều về 0');
  }

  ok(errors.length === 0, `không lỗi trang (${errors.length})`);
  await browser.close();

  /* ---------- Trận 2: đánh thật, không ghim số nào ---------- */
  ({ browser, page, errors } = await openGame('tsubasa', 'shika'));
  await page.evaluate(() => { const s = document.getElementById('speed'); if (s) { s.value = '1'; s.dispatchEvent(new Event('change')); } });
  await page.waitForTimeout(9000);
  {
    const r = await page.evaluate(() => {
      const G = window.__G();
      const rows = G.fighters.filter(f => !f.summon).map(f => ({
        n: f.name, dmg: Math.round(f.dmgDealt || 0), taken: Math.round(f.dmgTaken || 0),
        mv: Object.entries(f.moves || {}).map(([k, v]) => [k, Math.round(v.d), v.n])
      }));
      return rows;
    });
    const co = r.filter(x => x.dmg > 0);
    ok(co.length > 0, `đánh thật 9 giây: có người gây sát thương (${r.map(x => x.n + ' ' + x.dmg).join(' · ')})`);
    for (const x of co) {
      const tong = x.mv.reduce((a, b) => a + b[1], 0);
      ok(Math.abs(tong - x.dmg) <= 2,
        `${x.n}: sổ chiêu khớp dmgDealt (${tong} / ${x.dmg}) — ${x.mv.map(m => (m[0] === '\u0000basic' ? 'Đòn thường' : m[0]) + ' ' + m[2] + 'x ' + m[1]).join(', ')}`);
      ok(x.mv.every(m => m[2] > 0), `${x.n}: chiêu nào cũng có số đòn trúng > 0`);
    }
    /* Sổ GÂY RA của người này phải bằng sổ PHẢI CHỊU của người kia — đấu tay đôi thì hai
       sổ soi gương nhau, nên lệch là một trong hai cửa ghi sót. */
    if (r.length === 2) {
      const [a, b] = r;
      ok(a.dmg === b.taken && b.dmg === a.taken,
        `sổ gây ra soi gương sổ phải chịu (${a.dmg}/${b.taken} · ${b.dmg}/${a.taken})`);
    }
    // Tên chiêu phải ĐỌC RA ĐƯỢC, không phải một đống 'undefined' hay khoá rỗng
    const xau = r.some(x => x.mv.some(m => !m[0] || m[0] === 'undefined' || m[0] === 'null'));
    ok(!xau, 'không có tên chiêu nào ra undefined / rỗng');

    /* ---- DÒNG THỜI GIAN nuôi mấy biểu đồ: đo trong một trận THẬT ---- */
    const tl = await page.evaluate(() => {
      const G = window.__G(), M = G.fighters.filter(f => !f.summon);
      return {
        t: G.t, gap: window.__RECAP_DT, cap: window.__RECAP_LOG_MAX,
        f: M.map(f => ({
          n: f.name, len: (f.hpLog || []).length,
          t0: f.hpLog && f.hpLog.length ? f.hpLog[0][0] : -1,
          tz: f.hpLog && f.hpLog.length ? f.hpLog[f.hpLog.length - 1][0] : -1,
          /* mốc thời gian phải TĂNG DẦN và máu không bao giờ âm hay vượt trần */
          tang: (f.hpLog || []).every((p, i, A) => i === 0 || p[0] >= A[i - 1][0]),
          hpOk: (f.hpLog || []).every(p => p[1] >= 0 && p[1] <= f.maxHp),
          /* sát thương cộng dồn thì chỉ được TĂNG, không bao giờ tụt */
          dmgTang: (f.hpLog || []).every((p, i, A) => i === 0 || p[2] >= A[i - 1][2]),
          low: f.hpLow, hp: f.hp, cc: f.ccTime, dist: f.dist
        }))
      };
    });
    for (const f of tl.f) {
      ok(f.len > 3, `${f.n}: có chụp dòng thời gian (${f.len} mẫu trong ${tl.t.toFixed(1)}s trong trận)`);
      ok(f.len <= tl.cap + 2, `${f.n}: số mẫu có TRẦN (${f.len} ≤ ${tl.cap}) — trận dài không phình bộ nhớ`);
      ok(f.tang, `${f.n}: mốc thời gian tăng dần`);
      ok(f.hpOk, `${f.n}: máu trong mẫu không âm, không vượt trần`);
      ok(f.dmgTang, `${f.n}: sát thương cộng dồn chỉ tăng, không bao giờ tụt`);
      ok(f.tz > 0 && Math.abs(f.tz - tl.t) < 2,
        `${f.n}: mẫu cuối bám sát hiện tại (${f.tz.toFixed(1)} / ${tl.t.toFixed(1)})`);
      ok(f.low != null && f.low <= f.hp + 1,
        `${f.n}: máu thấp nhất (${Math.round(f.low)}) không cao hơn máu hiện tại (${Math.round(f.hp)})`);
      ok(f.dist > 0, `${f.n}: có đo quãng đường đi (${Math.round(f.dist)}px)`);
      ok(f.cc >= 0, `${f.n}: thời gian bị khống chế đọc ra được (${f.cc.toFixed(2)}s)`);
    }
    /* Làm thưa: nhồi quá trần thì mảng phải CO LẠI và bước lấy mẫu nhân đôi, chứ không
       cắt cụt mất đoạn đầu — đoạn đầu chính là lúc trận còn đang mở. */
    const thin = await page.evaluate(() => {
      const G = window.__G(), f = G.fighters.find(x => !x.summon);
      const cap = window.__RECAP_LOG_MAX;
      const t0 = f.hpLog[0][0], gap0 = f.hpLogGap;
      for (let i = 0; i < cap + 40; i++) { G.t += .4; window.__recapMark(f); }
      return { len: f.hpLog.length, cap, gap0, gap: f.hpLogGap, t0, keptT0: f.hpLog[0][0] };
    });
    ok(thin.len <= thin.cap, `nhồi quá trần thì mảng co lại (${thin.len} ≤ ${thin.cap})`);
    ok(thin.gap > thin.gap0, `bước lấy mẫu nhân lên theo (${thin.gap0} → ${thin.gap})`);
    ok(Math.abs(thin.keptT0 - thin.t0) < .01, 'và vẫn giữ mẫu ĐẦU TIÊN — đoạn mở trận không bị cắt');
  }
  ok(errors.length === 0, `trận 2 không lỗi trang (${errors.length})`);
  await browser.close();

  /* ---------- Trận 3: hỗn chiến — chụp lúc ngã, và thẻ vẫn GỌN ---------- */
  ({ browser, page, errors } = await openMulti('ffa', ['kono', 'chichi', 'tsubasa', 'shika', 'suzune', 'ginyu']));
  {
    const r = await page.evaluate(() => {
      const G = window.__G();
      const mains = G.fighters.filter(f => !f.summon);
      // hạ lần lượt bốn người, người cuối cùng còn đứng là người thắng
      for (let i = 1; i < mains.length; i++) {
        mains[i].dmgDealt = 100 * i;
        mains[i].moves = { '\u0000basic': { d: 100 * i, n: i, mx: 100 } };
        window.__defeat(mains[i], mains[0]);
      }
      const R = G.recap;
      return { n: R ? R.rows.length : 0, ten: R ? R.rows.map(x => x.name) : [],
        song: mains[0].name };
    });
    ok(r.n === 6, `hỗn chiến 6 người: thẻ giữ đủ ${r.n} hàng dù cái xác đã bị gỡ khỏi sàn`);
    ok(r.ten[0] === r.song, `người thắng (${r.song}) vẫn đứng đầu`);
    const v = await page.evaluate(() => {
      const G = window.__G(); G.endT = 2.4; window.__recapTick();
      const box = document.getElementById('recapCard');
      return { rows: box.querySelectorAll('.recapRow:not(.head)').length,
        more: box.querySelector('.recapMore') ? box.querySelector('.recapMore').textContent : '',
        h: box.getBoundingClientRect().height };
    });
    ok(v.rows === 4, `thẻ vẫn GỌN: chỉ vẽ ${v.rows} hàng dù có 6 người`);
    ok(/2/.test(v.more), `và nói rõ còn bao nhiêu người nữa ("${v.more.trim()}")`);
    ok(v.h > 0 && v.h < 320, `chiều cao thẻ ${Math.round(v.h)}px — không nuốt cả sàn đấu`);
  }
  ok(errors.length === 0, `trận 3 không lỗi trang (${errors.length})`);
  await browser.close();

  /* ---------- Trận 4: BẢNG THÔNG SỐ — phân tích MỌI sát thương ---------- */
  ({ browser, page, errors } = await openGame('kono', 'chichi'));
  await page.waitForTimeout(300);
  {
    // dựng một trận có đủ thứ để phân tích: nhiều chiêu, cháy dai, hồi máu
    await page.evaluate(() => {
      const G = window.__G(), hurt = window.__hurt, k = G.k, c = G.c;
      for (const f of [k, c]) { f.dmgDealt = 0; f.moves = null; f.taken = null; f.dmgTaken = 0; f.healGot = 0; }
      c.hp = c.maxHp; c.invuln = 0; c.evade = 0; c.dmgRes = 0;
      k.hp = k.maxHp; k.invuln = 0; k.evade = 0; k.dmgRes = 0;
      for (let i = 0; i < 6; i++) hurt(c, 20, k, false);              // đòn thường ×6
      hurt(c, 45, k, 'BOOM!', 'big');                                 // kunai nổ
      hurt(c, 18, k, 'BOOM · EDGE', 'big');                           // rìa vụ nổ, GỘP chung
      hurt(c, 150, k, 'RASENGAN!', 'ult');                            // ultimate
      for (let i = 0; i < 4; i++) hurt(k, 30, c, false);              // ChiChi đấm lại
      hurt(k, 45, c, 'FLYING KICK!', 'big');
      window.__recapHeal(k, 60);
      /* Dòng thời gian: chạy TAY recapSample() qua mấy mốc thay vì ghim thẳng hp rồi
         gọi finish(). Ghim thẳng thì sổ không có mẫu nào và mấy phép đo bên dưới (vạch
         máu thấp nhất, dấu ✕ chỗ gục) đo phải một trận chưa từng diễn ra. */
      for (const [tt, ka, kb] of [[0, 800, 800], [9, 700, 540], [18, 600, 300],
                                  [27, 470, 140], [36, 512, 60]]) {
        G.t = tt; k.hp = ka; c.hp = kb; window.__recapSample(.4);
      }
      G.t = 40; k.hp = 512; c.hp = 0;
      window.__defeat(c, k);            // qua ĐÚNG cửa thật: đặt koAt, chốt mẫu cuối, rồi finish()
    });
    const r = await page.evaluate(() => {
      const R = window.__G().recap, a = R.rows[0], b = R.rows[1];
      return {
        aName: a.name, aDmg: a.dmg, aTaken: a.taken, aHeal: a.heal, aHits: a.hits,
        aMv: a.mv.map(m => [m.k, m.d, m.n, m.mx]),
        aTk: a.tk.map(m => [m.k, m.d, m.n]),
        bMv: b.mv.map(m => [m.k, m.d, m.n])
      };
    });
    // 11. mọi chiêu đều có dòng riêng, xếp NẶNG TRƯỚC
    const ten = r.aMv.map(m => m[0]);
    ok(ten.length === 3, `liệt kê ĐỦ MỌI chiêu, không cắt bớt (${ten.length} dòng: ${ten.join(' · ')})`);
    ok(ten[0] === 'RASENGAN', `xếp nặng trước — dòng đầu là ${ten[0]} ${r.aMv[0][1]}`);
    const kunai = r.aMv.find(m => m[0] === 'EXPLOSIVE KUNAI');
    ok(kunai && kunai[1] === 63 && kunai[2] === 2,
      `lõi và rìa cùng một vụ nổ thì GỘP một dòng (${kunai && kunai[1]} qua ${kunai && kunai[2]} đòn)`);
    const bas = r.aMv.find(m => m[0] === '\u0000basic');
    ok(bas && bas[2] === 6 && bas[3] === 20,
      `đòn thường: ${bas && bas[2]} đòn, nặng nhất ${bas && bas[3]}`);
    ok(r.aHits === 9, `tổng số đòn trúng cộng lại đúng (${r.aHits})`);
    // 6×20 + 45 + 18 + 150 = 333 gây ra; 4×30 + 45 = 165 phải chịu
    ok(r.aDmg === 333 && r.aTaken === 165 && r.aHeal === 60,
      `gây ra ${r.aDmg} · phải chịu ${r.aTaken} · hồi ${r.aHeal}`);
    // 12. sổ phải chịu là chiều NGƯỢC LẠI, không phải bản sao
    // xếp nặng trước nên đòn thường (4×30) đứng trên FLYING KICK (45)
    ok(r.aTk.length === 2 && r.aTk.some(x => x[0] === 'FLYING KICK') && r.aTk[0][1] === 120,
      `sổ PHẢI CHỊU đọc ra chiêu của đối thủ (${r.aTk.map(x => x[0] + ' ' + x[1]).join(' · ')})`);
    ok(JSON.stringify(r.aTk.map(x => x[0])) === JSON.stringify(r.bMv.map(x => x[0])),
      'sổ phải chịu của người này khớp sổ gây ra của người kia');

    // 13. bảng vẽ ra thật
    const v = await page.evaluate(() => {
      window.__statsOpen();
      const box = document.getElementById('statsBoard');
      return {
        on: window.__statsOn(),
        rows: box.querySelectorAll('.stCard').length,
        tabs: box.querySelectorAll('.stTab').length,
        lines: box.querySelectorAll('.stTab tbody tr').length,
        kpi: box.querySelectorAll('.stTop .stKpi').length,
        lead: box.querySelectorAll('.stTop .stKpi.lead').length,
        // biểu đồ: hai đường (máu · sát thương cộng dồn) + thanh hai chiều + thanh chồng
        lines: 0,
        svg: box.querySelectorAll('.chFig .chSvg').length,
        paths: box.querySelectorAll('.chFig .chLn').length,
        ko: box.querySelectorAll('.chFig .chKo').length,
        leg: box.querySelectorAll('.chLeg .chChip').length,
        dv: box.querySelectorAll('.dvRow').length,
        dvZero: box.querySelectorAll('.dvRow .dvZero').length,
        stack: box.querySelectorAll('.chBar').length,
        spark: box.querySelectorAll('.stSpark .spk').length,
        lowMk: box.querySelectorAll('.stHp .stLow').length,
        dash: [...box.querySelectorAll('.chFig line,.chFig path')]
          .some(e => (e.getAttribute('stroke-dasharray') || '') !== ''),
        txt: box.textContent.replace(/\s+/g, ' ')
      };
    });
    v.lines = await page.evaluate(() =>
      document.getElementById('statsBoard').querySelectorAll('.stTab tbody tr').length);
    ok(v.on, 'statsOpen() mở bảng ra');
    ok(v.rows === 2, `mỗi đấu thủ một khối (${v.rows})`);
    ok(v.tabs === 4, `mỗi người hai bảng: gây ra và phải chịu (${v.tabs})`);
    ok(v.lines === 10, `đủ mọi dòng chiêu của cả hai chiều (${v.lines})`);
    ok(v.kpi === 5, `dòng tổng quan có ${v.kpi} ô (tổng · thời lượng · đấu thủ · đòn nặng nhất · tổng hồi)`);
    ok(v.lead === 1, 'đúng MỘT ô được nhấn làm ô dẫn dắt, không phải ô nào cũng vàng');
    ok(/498/.test(v.txt), 'in ra TỔNG sát thương cả trận (333 + 165 = 498)');
    ok(/RASENGAN/.test(v.txt) && /Basic Attack|Đòn thường/.test(v.txt),
      'tên chiêu in ra, đòn thường thì dịch');
    ok(/0:40/.test(v.txt), 'thời lượng bọc rts() — 0:40');
    ok(/8\.3/.test(v.txt) && /4\.1/.test(v.txt), 'có cột sát thương mỗi giây (333/40 và 165/40)');

    // 13b. BIỂU ĐỒ — có vẽ ra thật, và vẽ đúng dạng cho đúng việc
    ok(v.svg === 2, `dòng thời gian là HAI khung riêng (${v.svg}) — máu và sát thương `
      + 'khác đơn vị nên không bao giờ chung một khung hai thang đo');
    ok(v.paths >= 4, `đủ đường cho cả hai người ở cả hai khung (${v.paths})`);
    ok(v.ko >= 1, `người gục có dấu ✕ trên đường kẻ (${v.ko}) — "chạm đáy" và "kết thúc sớm" `
      + 'nhìn giống hệt nhau nếu không đánh dấu');
    ok(v.leg === 2, `chú giải MỘT hàng dùng chung cho cả hai khung (${v.leg} chip)`);
    ok(!v.dash, 'lưới và trục là nét LIỀN, không nét đứt');
    ok(v.dv === 2, `thanh hai chiều: mỗi người một hàng (${v.dv})`);
    ok(v.dvZero === 2, 'mỗi hàng có vạch 0 ở giữa để đọc được chiều nào là chiều nào');
    ok(v.stack === 2, `mỗi người một thanh chồng "sát thương đến từ đâu" (${v.stack})`);
    ok(v.spark === 2, `mỗi thẻ đấu thủ có một đường tí hon (${v.spark})`);
    ok(v.lowMk >= 1, `thanh máu có vạch "thấp nhất chạm tới" (${v.lowMk})`);

    // 13c. mấy thước đo MỚI có in ra
    const th = await page.evaluate(() => {
      const box = document.getElementById('statsBoard');
      const lab = [...box.querySelectorAll('.stKpis span')].map(e => e.textContent);
      return { lab, n: box.querySelectorAll('.stCard:first-child .stKpis>div').length };
    });
    ok(th.n === 12, `mỗi đấu thủ có ${th.n} ô số`);
    for (const k of ['Biggest hit', 'Lowest HP', 'Survived', 'Time stunned', 'Distance run', 'Overkill'])
      ok(th.lab.includes(k), `ô số mới: ${k}`);

    // 13d. rê chuột lên biểu đồ thì ra vạch dọc + tooltip, và nó BỎ SUNG chứ không
    //      phải cửa duy nhất đọc số (mấy ô KPI ở trên vẫn nói đủ)
    const hv = await page.evaluate(async () => {
      const w = document.querySelector('#statsBoard .chWrap');
      const b = w.getBoundingClientRect();
      w.dispatchEvent(new PointerEvent('pointermove',
        { clientX: b.left + b.width * .5, clientY: b.top + b.height * .5, bubbles: true }));
      const tip = w.querySelector('.chTip'), cross = w.querySelector('.chCross');
      const hien = tip.style.display !== 'none' && cross.style.display !== 'none';
      const txt = tip.textContent;
      w.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      return { hien, txt, tat: tip.style.display === 'none' };
    });
    ok(hv.hien, 'rê chuột: hiện vạch dọc và tooltip');
    ok(/:/.test(hv.txt), `tooltip nói rõ mốc thời gian ("${hv.txt.slice(0, 28)}…")`);
    ok(hv.tat, 'rời chuột ra thì tắt');

    // 14. đóng lại được, và thẻ gọn nhường chỗ lúc bảng đang mở
    const c = await page.evaluate(() => {
      const G = window.__G(); G.endT = 2.4; window.__recapTick();
      const che = document.getElementById('recapCard').classList.contains('off');
      window.__statsClose();
      window.__recapTick();
      return { che, dong: !window.__statsOn(), lai: !document.getElementById('recapCard').classList.contains('off') };
    });
    ok(c.che, 'bảng thông số mở thì thẻ gọn giấu đi, không chồng lên nhau');
    ok(c.dong && c.lai, 'đóng bảng thì thẻ gọn hiện lại');

    // 15. đổi ngôn ngữ lúc bảng đang mở
    const lg = await page.evaluate(async () => {
      window.__statsOpen();
      await window.__setLang('vi'); const vi = document.getElementById('statsBoard').textContent;
      await window.__setLang('en'); const en = document.getElementById('statsBoard').textContent;
      window.__statsClose();
      return { vi, en };
    });
    ok(/Sát thương GÂY RA/.test(lg.vi) && /Damage DEALT/.test(lg.en),
      'nhãn bảng đổi theo ngôn ngữ');
    ok(/RASENGAN/.test(lg.vi) && /RASENGAN/.test(lg.en), 'tên chiêu giữ nguyên ở cả hai');
  }
  ok(errors.length === 0, `trận 4 không lỗi trang (${errors.length})`);
  await browser.close();

  /* ---------- Trang chơi cũng phải có thẻ ---------- */
  {
    const { buildPlay, playwright } = require('./probe');
    const { chromium } = playwright();
    const br = await chromium.launch();
    const pg = await br.newPage({ viewport: { width: 1000, height: 900 } });
    await pg.route('**://fonts.*/**', r => r.abort());
    await pg.goto('file://' + buildPlay(), { waitUntil: 'domcontentloaded' });
    await pg.waitForTimeout(500);
    const co = await pg.evaluate(() => !!document.getElementById('recapCard'));
    ok(co, 'trang chơi (play.html) cũng có thẻ — nó là thứ của NGƯỜI XEM');

    /* Nút 📊 phải là một tuỳ chọn NGANG HÀNG với 🏠 trong dải nút sau trận, và bấm được
       thật — người dùng chốt: "1 tùy chọn chung với tùy chọn về lại sảnh". */
    await pg.click('#arcStart'); await pg.waitForTimeout(250);
    await pg.click('#whoAuto'); await pg.waitForTimeout(250);
    await pg.click('#cselGo'); await pg.waitForTimeout(250);
    await pg.click('#listA .cTile[data-key="kono"]'); await pg.click('#cselGo'); await pg.waitForTimeout(200);
    await pg.click('#listB .cTile[data-key="chichi"]'); await pg.click('#cselGo'); await pg.waitForTimeout(200);
    await pg.click('#cselGo'); await pg.waitForTimeout(3600);
    // ép trận kết thúc cho nhanh, khỏi ngồi đánh đủ
    await pg.evaluate(() => {
      const G = window.__G();
      G.k.dmgDealt = 300; G.k.moves = { 'RASENGAN': { d: 300, n: 2, mx: 150 } };
      G.c.dmgTaken = 300; G.c.taken = { 'RASENGAN': { d: 300, n: 2, mx: 150 } };
      G.t = 25; G.c.hp = 0; window.__finish(G.k); G.endT = 2.4;
    });
    await pg.waitForTimeout(600);
    const nut = await pg.evaluate(() => {
      const home = document.getElementById('arcGoHome'), st = document.getElementById('arcStats');
      const hb = home.getBoundingClientRect(), sb = st.getBoundingClientRect();
      return {
        co: !!st, hien: getComputedStyle(st).display !== 'none',
        chuHome: home.textContent.trim(), chu: st.textContent.trim(),
        // "ngang hàng": cùng một dải, cùng chiều cao, cạnh nhau
        cungHang: Math.abs(hb.top - sb.top) < 2 && Math.abs(hb.height - sb.height) < 2,
        canh: sb.left >= hb.right - 1 && sb.left - hb.right < 40
      };
    });
    ok(nut.co && nut.hien, `nút "${nut.chu}" có mặt trong dải nút sau trận`);
    ok(nut.cungHang, `và nằm NGANG HÀNG với "${nut.chuHome}" — cùng dải, cùng chiều cao`);
    ok(nut.canh, 'đứng ngay cạnh nút về sảnh, không lạc đi đâu');

    await pg.click('#arcStats');
    await pg.waitForTimeout(400);
    const mo = await pg.evaluate(() => {
      const b = document.getElementById('statsBoard');
      return {
        on: !b.classList.contains('off'),
        cards: b.querySelectorAll('.stCard').length,
        co300: /300/.test(b.textContent),
        // dải nút phải nhường chỗ, không nằm chình ình giữa bảng
        over: getComputedStyle(document.getElementById('arcOver')).display
      };
    });
    ok(mo.on && mo.cards === 2, `bấm nút thì bảng mở ra với ${mo.cards} khối đấu thủ`);
    ok(mo.co300, 'và in đúng con số của trận vừa xong');
    ok(mo.over === 'none', 'dải nút nhường chỗ khi bảng đang mở');

    await pg.click('#statsClose');
    await pg.waitForTimeout(300);
    const dong = await pg.evaluate(() => ({
      off: document.getElementById('statsBoard').classList.contains('off'),
      over: getComputedStyle(document.getElementById('arcOver')).display !== 'none'
    }));
    ok(dong.off, 'bấm ✕ thì bảng đóng lại');
    ok(dong.over, 'và dải nút hiện lại');
    await br.close();
  }

  console.log(loi.length ? `\nHONG ${loi.length} muc` : '\nDAT het');
  process.exit(loi.length ? 1 : 0);
})();
