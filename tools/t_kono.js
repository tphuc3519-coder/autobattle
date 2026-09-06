/* Konohamaru — bốn chỗ vừa buff:
     1. phi tiêu thường 20 -> 25 dmg;
     2. tỉ lệ ra kunai nổ 15% -> 30%;
     3. kunai nổ thành cú AoE thật: đứng giữa ăn đủ, ra rìa nhạt dần, quá mép không dính,
        và ai dính cũng bén lửa 5 dmg/s trong 3 giây người chơi — nổ vào tường cũng vậy;
     4. Mini Rasengan: bị dí sát 2.5 giây người chơi mà không gây được sát thương thì
        xoáy một quả nhỏ 40 dmg, hất bật mọi người đứng quanh ra, hồi chiêu 12 giây.
   Chạy: node tools/t_kono.js */
const { openGame } = require('./probe');

const out = [];
let fail = 0;
function ok(name, pass, note) {
  out.push(`${pass ? 'DAT ' : 'HONG'}  ${name}${note ? '  — ' + note : ''}`);
  if (!pass) fail++;
}

(async () => {
  const { browser, page, errors } = await openGame('kono', 'chichi');
  await page.selectOption('#speed', '1');
  await page.waitForTimeout(600);

  /* ---------- chiêu 1: phi tiêu, tỉ lệ kunai, vụ nổ theo vùng ---------- */
  const r = await page.evaluate(() => {
    const G = window.__G(), K = window.__KONO, WH = window.__WH();
    const k = G.fighters.find(x => x.key === 'kono'), e = G.fighters.find(x => x !== k);

    // đếm 4000 lượt ném xem bao nhiêu lượt ra kunai, và đọc sát thương từng loại
    const dem = { kunai: 0, shuriken: 0 };
    let sdmg = 0, kdmg = 0;
    for (let i = 0; i < 4000; i++) {
      G.proj.length = 0;
      window.__throwNow(k, e);
      const p = G.proj[0];
      if (!p) continue;
      if (p.type === 'kunai') { dem.kunai++; kdmg = p.dmg; } else { dem.shuriken++; sdmg = p.dmg; }
    }
    G.proj.length = 0;

    // vụ nổ: đặt địch ở ba quãng cách rồi đo máu tụt
    const no = (d) => {
      e.hp = 9000; e.maxHp = 9000; e.dots.length = 0; e.stun = 0; e.invuln = 0;
      e.evade = 0; e.prewing = false; e.eagle = false;
      e.x = 200; e.y = 300;
      window.__explode({ x: e.x + d + e.r, y: e.y, team: k.team, owner: k, dmg: K.kdmg });
      return { dmg: Math.round(9000 - e.hp), chay: e.dots.filter(o => o.kunai).length };
    };
    const giua = no(0), riaTrong = no((K.core + K.r) / 2 - 2), ngoai = no(K.r + 12);

    // đúng công thức nhạt dần
    const share = [0, K.core, (K.core + K.r) / 2, K.r - 1, K.r + 5].map(d => +window.__kunaiShare(d).toFixed(3));
    return { dem, sdmg, kdmg, giua, riaTrong, ngoai, share, K, W: WH.W, RT: window.__RT };
  });

  ok('phi tiêu thường lên 25 dmg', r.sdmg === 25, `${r.sdmg} dmg`);
  ok('kunai nổ vẫn 45 dmg ở tâm', r.kdmg === r.K.kdmg, `${r.kdmg} dmg`);
  const ti = r.dem.kunai / (r.dem.kunai + r.dem.shuriken);
  ok('tỉ lệ ném ra kunai nổ bám mốc 30%', Math.abs(ti - r.K.odds) < .03,
    `${(ti * 100).toFixed(1)}% trên ${r.dem.kunai + r.dem.shuriken} lượt ném (mốc ${Math.round(r.K.odds * 100)}%)`);

  ok('đứng giữa vụ nổ thì ăn đủ 45 dmg', r.giua.dmg === r.K.kdmg, `${r.giua.dmg} dmg`);
  ok('đứng xa hơn thì ăn ít hơn hẳn',
    r.riaTrong.dmg > 0 && r.riaTrong.dmg < r.giua.dmg,
    `${r.riaTrong.dmg} dmg so với ${r.giua.dmg} dmg ở tâm`);
  ok('quá mép vùng nổ thì không dính một điểm nào', r.ngoai.dmg === 0, `${r.ngoai.dmg} dmg`);
  ok('phần nhạt dần chạy đúng 100% -> 40% rồi tắt hẳn',
    r.share[0] === 1 && r.share[1] === 1 && r.share[2] > r.K.min && r.share[2] < 1 &&
    Math.abs(r.share[3] - r.K.min) < .02 && r.share[4] === 0,
    `lõi ${r.share[1]} · giữa ${r.share[2]} · sát mép ${r.share[3]} · ngoài ${r.share[4]}`);
  ok('ai dính vụ nổ cũng bén lửa 5 dmg/s trong 3 giây người chơi',
    r.giua.chay === 1 && r.riaTrong.chay === 1 && r.ngoai.chay === 0 &&
    r.K.burn / r.RT === 5 && Math.abs(r.K.burnT * r.RT - 3) < .01,
    `${r.K.burn / r.RT} dmg/s · ${(r.K.burnT * r.RT).toFixed(1)}s`);

  /* ---------- nổ vào tường: người đứng cạnh tường vẫn chịu dmg ---------- */
  const tuong = await page.evaluate(() => {
    const G = window.__G(), K = window.__KONO, WH = window.__WH();
    const k = G.fighters.find(x => x.key === 'kono'), e = G.fighters.find(x => x !== k);
    e.hp = 9000; e.maxHp = 9000; e.dots.length = 0; e.stun = 0; e.invuln = 0; e.evade = 0;
    e.x = 40; e.y = 300;                       // ép sát mép trái
    G.proj.length = 0;
    // đúng viên kunai bay vào tường: nhánh trong vòng duyệt đạn gọi explode() khi chạm mép
    G.proj.push({ type: 'kunai', team: k.team, owner: k, x: 30, y: 300,
                  vx: -260, vy: 0, r: 11, dmg: K.kdmg, life: 3, ang: Math.PI, wob: 0 });
    const truoc = e.hp;
    for (let i = 0; i < 40 && G.proj.length; i++) window.__step(1 / 120);
    return { mat: Math.round(truoc - e.hp), con: G.proj.length, chay: e.dots.filter(o => o.kunai).length };
  });
  ok('kunai nổ khi chạm tường, ai đứng cạnh vẫn chịu sát thương và bén lửa',
    tuong.mat > 0 && tuong.con === 0 && tuong.chay === 1,
    `mất ${tuong.mat} dmg, viên kunai đã tan`);

  /* ---------- Mini Rasengan ---------- */
  const mini = await page.evaluate(() => {
    const G = window.__G(), K = window.__KONO, WH = window.__WH(), dt = 1 / 120;
    const k = G.fighters.find(x => x.key === 'kono'), e = G.fighters.find(x => x !== k);
    k.miniCd = 0; k.miniPress = 0; k.dash = null; k.stun = 0;
    e.hp = 9000; e.maxHp = 9000; e.evade = 0; e.prewing = false; e.eagle = false;
    e.stun = 0; e.invuln = 0; e.kbTake = 1; e.dash = null;
    G.floats.length = 0;

    // đứng XA thì đồng hồ không chạy
    k.x = 200; k.y = 300; e.x = 600; e.y = 300;
    for (let i = 0; i < 400; i++) window.__konoTick(k, dt);
    const xa = +k.miniPress.toFixed(3);

    // dí sát vào: đồng hồ chạy, đủ giờ là nổ ra Mini Rasengan
    e.x = k.x + k.r + e.r + 4;
    let t = 0, ban = -1;
    const hp0 = e.hp;
    for (let i = 0; i < 1200 && ban < 0; i++) {
      window.__konoTick(k, dt); t += dt;
      if (k.miniCd > 0) ban = t;
      e.x = k.x + k.r + e.r + 4; e.y = k.y;      // ghim địch đứng dí sát
    }
    const mat = Math.round(hp0 - e.hp);
    const day = Math.hypot(e.kbx || 0, e.kby || 0) / 6;   // lực đẩy tắt dần exp(-6t)
    const dang = k.pose;
    const cd = +k.miniCd.toFixed(2);

    // gây được sát thương thì đồng hồ bị vây về 0
    k.miniCd = 0; k.miniPress = K.miniT * .8;
    window.__counters(k, e);
    const sauKhiTrung = +k.miniPress.toFixed(3);
    return { xa, ban: +ban.toFixed(2), mat, day: Math.round(day), dang, cd, sauKhiTrung,
             K, W: WH.W, RT: window.__RT };
  });

  ok('đứng xa thì đồng hồ bị vây không chạy', mini.xa === 0);
  ok('bị dí sát đúng 2.5 giây người chơi thì Mini Rasengan bung ra',
    mini.ban > 0 && Math.abs(mini.ban - mini.K.miniT) < .05,
    `bung ra ở giây ${(mini.ban * mini.RT).toFixed(2)} người chơi`);
  ok('Mini Rasengan gây đúng 40 dmg', mini.mat === mini.K.mini, `${mini.mat} dmg`);
  ok(`và hất địch lùi khoảng ${Math.round(mini.K.miniKb * 100)}% chiều dài sàn`,
    Math.abs(mini.day - mini.W * mini.K.miniKb) < mini.W * .04,
    `bay ${mini.day}px (chuẩn ~${Math.round(mini.W * mini.K.miniKb)}px)`);
  ok('dùng lại đúng dáng Rasengan', mini.dang === 'ulti', `dáng "${mini.dang}"`);
  ok('hồi chiêu 12 giây người chơi',
    Math.abs(mini.cd - mini.K.miniCd) < .05, `${(mini.cd * mini.RT).toFixed(1)}s người chơi`);
  ok('gây được sát thương thì đồng hồ bị vây về 0', mini.sauKhiTrung === 0);

  ok('không lỗi trang', errors.length === 0, errors.slice(0, 2).join(' | '));
  await browser.close();

  console.log(out.join('\n'));
  console.log(fail ? `HONG ${fail} muc` : `DAT tat ca ${out.length} muc`);
  process.exit(fail ? 1 : 0);
})();
