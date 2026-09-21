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
      c.hp = c.maxHp; c.invuln = 0; c.evade = 0;
      hurt(c, 40, k, false);                       // đòn thường
      hurt(c, 60, k, 'AIR CANNON!', 'big');        // có băng-rôn tên chiêu
      hurt(c, 25, k, 'AIR CANNON!', 'big');
      let tong = 0; for (const x in k.moves) tong += k.moves[x];
      return { dealt: k.dmgDealt, tong, moves: Object.assign({}, k.moves) };
    });
    ok(Math.abs(r.tong - r.dealt) < .01,
      `sổ chiêu cộng lại = dmgDealt (${r.tong.toFixed(1)} / ${r.dealt.toFixed(1)})`);
    const basic = r.moves['\u0000basic'], ac = r.moves['AIR CANNON'];
    ok(basic > 0 && ac > 0, `tách được đòn thường (${Math.round(basic)}) và AIR CANNON (${Math.round(ac)})`);
    ok(Math.round(ac) === 85, `hai cú cùng chiêu thì CỘNG DỒN, không tách hai dòng (${Math.round(ac)})`);
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
      G.k.moves = { '\u0000basic': 200, 'RASENGAN': 440 };
      G.c.hp = 0; G.c.dmgDealt = 388; G.c.healGot = 0; G.c.moves = { 'FLYING KICK': 388 };
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
        n: f.name, dmg: Math.round(f.dmgDealt || 0),
        mv: Object.entries(f.moves || {}).map(([k, v]) => [k, Math.round(v)])
      }));
      return rows;
    });
    const co = r.filter(x => x.dmg > 0);
    ok(co.length > 0, `đánh thật 9 giây: có người gây sát thương (${r.map(x => x.n + ' ' + x.dmg).join(' · ')})`);
    for (const x of co) {
      const tong = x.mv.reduce((a, b) => a + b[1], 0);
      ok(Math.abs(tong - x.dmg) <= 2,
        `${x.n}: sổ chiêu khớp dmgDealt (${tong} / ${x.dmg}) — ${x.mv.map(m => (m[0] === '\u0000basic' ? 'Đòn thường' : m[0]) + ' ' + m[1]).join(', ')}`);
    }
    // Tên chiêu phải ĐỌC RA ĐƯỢC, không phải một đống 'undefined' hay khoá rỗng
    const xau = r.some(x => x.mv.some(m => !m[0] || m[0] === 'undefined' || m[0] === 'null'));
    ok(!xau, 'không có tên chiêu nào ra undefined / rỗng');
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
        mains[i].dmgDealt = 100 * i; mains[i].moves = { '\u0000basic': 100 * i };
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
    await br.close();
  }

  console.log(loi.length ? `\nHONG ${loi.length} muc` : '\nDAT het');
  process.exit(loi.length ? 1 : 0);
})();
