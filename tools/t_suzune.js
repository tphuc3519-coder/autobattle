/* Ba form của Horikita Suzune, đi hết một lượt như trong trận thật:
     form 1 sợ không dám đánh -> Ayanokouji đỡ thay 4s -> form 2 -> đủ 150 điểm lớp
     -> Ayanokouji vào sân làm đồng minh -> anh cạn máu và RỜI SÀN (không chết) -> form 3.
   Kiểm luôn mấy con số dễ trôi: 15/20 dmg mỗi đòn, 15/20 điểm lớp, quyết định đúng tích
   đúng bằng sát thương, quyết định sai âm điểm thì tự ăn dmg rồi reset về 0.
   Chạy: node tools/t_suzune.js */
const { openGame } = require('./probe');

const loi = [];
const ok = (dk, msg) => { console.log(`${dk ? ' dat ' : ' HONG'}  ${msg}`); if (!dk) loi.push(msg); };
const gan = (a, b, eps, msg) => ok(Math.abs(a - b) <= eps, `${msg} (do ${typeof a === 'number' ? a.toFixed(3) : a}, mong ${b})`);

(async () => {
  const { browser, page, errors } = await openGame('suzune', 'kono');
  await page.selectOption('#speed', '1');
  await page.waitForTimeout(200);

  /* Chờ theo GIỜ TRONG TRẬN, đừng chờ theo đồng hồ thật: chạy headless thì mỗi giây
     thật chỉ trôi được một phần giây trong trận. */
  const doi = (giay, tran = 40000) => page.evaluate(([g, tr]) => new Promise((res, rej) => {
    const G = window.__G(), t0 = G.t;
    const id = setInterval(() => { if (window.__G().t - t0 >= g) { clearInterval(id); res(window.__G().t - t0); } }, 25);
    setTimeout(() => { clearInterval(id); rej(new Error('qua gio cho ' + g + 's trong tran')); }, tr);
  }), [giay, tran]);

  const doc = fn => page.evaluate(fn);

  /* ---- form 1: có đánh, nhưng đòn nhẹ, nhịp chậm và chưa có chiêu 2 ---- */
  const f1 = await doc(() => {
    const G = window.__G(), f = G.fighters.find(x => x.key === 'suzune');
    f.hp = f.maxHp;                       // giữ trên ngưỡng 85% để chưa sang form
    return { form: f.form, cd: f.cds.s1 };
  });
  ok(f1.form === 1, 'vao tran la form 1');

  const f1hit = await doc(() => {
    const G = window.__G(), S = window.__SUZ;
    const f = G.fighters.find(x => x.key === 'suzune'), e = G.fighters.find(x => x.key === 'kono');
    f.hp = f.maxHp; f.cp = 0; e.hp = e.maxHp; e.evade = 0;
    const truoc = e.hp;
    window.__suzStrike(f, e);
    return { dmg: truoc - e.hp, cp: f.cp, hp: f.hp,
             cd: window.__suzTune(f).atkCd, cd2: S.atkCd };
  });
  gan(f1hit.dmg, 10, 0.001, 'form 1: don dam/da chi an 10 dmg');
  gan(f1hit.cd / f1hit.cd2, 1.6, 0.001, 'form 1: ra don cham hon form 2 dung 1.6 lan');
  ok(f1hit.cp === 0, 'form 1 chua tich duoc diem lop nao');

  // chiêu 2 chưa mở: hồi chiêu về 0 mà gọi think() vẫn không có ai đứng lại suy nghĩ
  const f1dec = await doc(() => {
    const G = window.__G(), C = window.__CHARS;
    const f = G.fighters.find(x => x.key === 'suzune'), e = G.fighters.find(x => x.key === 'kono');
    f.hp = f.maxHp; f.cds.s2 = 0; f.decT = 0; f.lock = 0;
    G.proj.length = 0;
    for (let i = 0; i < 40; i++) C.suzune.think(f, e, 999, true);
    return { decT: f.decT, proj: G.proj.filter(p => p.type === 'decision').length };
  });
  ok(f1dec.decT === 0 && f1dec.proj === 0, 'form 1 chua co chieu 2 Decision Making');

  await doi(4);
  const f1b = await doc(() => {
    const G = window.__G(), f = G.fighters.find(x => x.key === 'suzune');
    f.hp = f.maxHp;
    return { cp: f.cp, form: f.form };
  });
  ok(f1b.cp === 0 && f1b.form === 1, 'danh mot hoi o form 1 van khong tich duoc diem lop');

  /* ---- ngưỡng 85%: Ayanokouji nhảy vào đỡ thay ---- */
  const g0 = await doc(() => {
    const G = window.__G(), f = G.fighters.find(x => x.key === 'suzune');
    f.hp = f.maxHp * window.__SUZ.guardHp;       // chạm đúng ngưỡng
    return 1;
  });
  await doi(0.4);
  const g1 = await doc(() => {
    const G = window.__G(), f = G.fighters.find(x => x.key === 'suzune');
    return { co: !!f.ayaG, t: f.ayaG ? f.ayaG.t : 0, form: f.form,
             thoai: G.floats.some(fl => /stand\s+up\s+and\s+fight/i.test(fl.txt || '')) };
  });
  ok(g1.co, 'cham 85% mau thi Ayanokouji hien ra do don thay');
  ok(g1.form === 1, 'trong luc anh do thi Horikita van con o form 1');

  /* thời lượng đỡ đúng 4 giây người chơi, và trong quãng đó cô không mất máu */
  const chan = await doc(() => {
    const G = window.__G(), f = G.fighters.find(x => x.key === 'suzune');
    const truoc = f.hp;
    const tra = window.__hurt(f, 500, null, false);      // đòn nặng ném thẳng vào cô
    return { tra, mat: truoc - f.hp, hits: f.ayaG ? f.ayaG.hits : -1,
             tong: f.ayaG ? f.ayaG.taken : -1, du: f.ayaG ? f.ayaG.t * window.__RT : -1 };
  });
  ok(chan.tra === false, 'don danh vao Horikita bi Ayanokouji chan lai (hurt tra ve false)');
  gan(chan.mat, 0, 0.001, 'Horikita khong mat mot giot mau nao trong luc duoc do');
  ok(chan.hits === 1 && Math.abs(chan.tong - 500) < .01, 'don do duoc ghi lai dung so luong');
  ok(chan.du <= 5.01 && chan.du > 4, `quang do keo dai 5 giay nguoi choi (con ${chan.du.toFixed(2)}s)`);

  // Đồng hồ 5 giây chỉ chạy SAU phân cảnh đóng băng (step() return sớm lúc G.freeze>0),
  // nên phải chờ cả 1.6s phân cảnh lẫn 2.5s trong trận của quãng đỡ. Bắt luôn cú cước
  // chia tay: máu địch tụt đúng 150 và dính choáng 2 giây người chơi.
  const cuoc = await page.evaluate(() => new Promise((res, rej) => {
    const G = window.__G(), S = window.__SUZ, RT = window.__RT;
    const f = G.fighters.find(x => x.key === 'suzune'), e = G.fighters.find(x => x.key === 'kono');
    e.hp = e.maxHp; e.evade = 0; e.stun = 0;
    /* Đo CÚ SỤT LỚN NHẤT trong một nhịp, đừng cộng dồn: Horikita vẫn đấm 10 dmg ở form 1
       nên tổng máu địch mất trong cùng cửa sổ đo có thể ra 160 dù cú cước đúng 150. */
    let truoc = e.hp, sut = 0, stun = 0, pha = null;
    const id = setInterval(() => {
      if (f.ayaG && f.ayaG.ph !== 'guard') pha = f.ayaG.ph;
      if (e.hp < truoc) {
        const d = truoc - e.hp;
        if (d > sut) { sut = d; stun = e.stun * RT; }
      }
      truoc = e.hp;
      if (sut >= S.guardKickDmg - .5) { clearInterval(id); res({ mat: Math.round(sut), stun: +stun.toFixed(2), pha }); }
    }, 16);
    setTimeout(() => { clearInterval(id); rej(new Error('khong thay cu cuoc chia tay')); }, 40000);
  }));
  ok(!!cuoc.pha, 'het 5 giay thi Ayanokouji chuyen sang pha tung cuoc');
  gan(cuoc.mat, 150, 0.5, 'cuoc chia tay an dung 150 dmg');
  gan(cuoc.stun, 2, 0.06, 'cuoc chia tay choang dung 2 giay nguoi choi (doc tre mot khung)');

  await doi(2.2);
  const f2 = await doc(() => {
    const G = window.__G(), f = G.fighters.find(x => x.key === 'suzune');
    return { form: f.form, aya: !!f.ayaG };
  });
  ok(!f2.aya, 'tung cuoc xong thi Ayanokouji lui ra');
  ok(f2.form === 2, 'het quang do thi Horikita sang form 2');

  /* ---- form 2: đòn tay 15 dmg / 15 điểm, quyết định đúng tích bằng sát thương ---- */
  const s1 = await doc(() => {
    const G = window.__G(), S = window.__SUZ;
    const f = G.fighters.find(x => x.key === 'suzune'), e = G.fighters.find(x => x.key === 'kono');
    f.cp = 0; e.hp = e.maxHp; e.evade = 0; f.hp = f.maxHp;      // chặn hồi máu làm nhiễu số
    const r = Math.random; Math.random = () => .99;             // trượt cửa hồi máu
    const truoc = e.hp;
    window.__suzStrike(f, e);
    Math.random = r;
    return { dmg: truoc - e.hp, cp: f.cp, cd: S.atkCd, atkCd2: S.atkCd };
  });
  gan(s1.dmg, 15, 0.001, 'form 2: moi don tay an 15 dmg');
  gan(s1.cp, 15, 0.001, 'form 2: moi don tay tich 15 diem lop');
  // ChiChi đánh mỗi cm(.25); Horikita phải chậm hơn đúng 2.5 lần
  const nhip = await doc(() => window.__SUZ.atkCd);
  gan(nhip / (0.25 * 1.8), 2.5, 0.001, 'nhip danh cham hon ChiChi dung 2.5 lan');

  const dung = await doc(() => {
    const G = window.__G();
    const f = G.fighters.find(x => x.key === 'suzune'), e = G.fighters.find(x => x.key === 'kono');
    f.cp = 0; f.hp = f.maxHp; e.hp = e.maxHp; e.evade = 0;
    G.proj.length = 0;
    const r = Math.random; Math.random = () => .1;              // .1 < .65 -> quyet dinh dung
    window.__suzDecide(f, e);
    Math.random = r;
    const p = G.proj.find(x => x.type === 'decision');
    return { co: !!p, dmg: p ? p.dmg : 0, txt: p ? p.txt : '', cp: f.cp,
             tier: p ? p.tier : '', odds: window.__suzTune(f).decOdds,
             lo: window.__suzTune(f).decLo, hi: window.__suzTune(f).decHi };
  });
  gan(dung.odds, .65, 0.001, 'form 2: ti le quyet dinh dung 65%');
  gan(dung.lo, 30, 0.001, 'form 2: san sat thuong quyet dinh la 30');
  gan(dung.hi, 80, 0.001, 'form 2: tran sat thuong quyet dinh la 80');
  ok(dung.co, 'quyet dinh dung sinh ra mot bong bong phong thang vao dich');
  ok(dung.dmg >= 30 && dung.dmg <= 80, `sat thuong quyet dinh nam trong 30~80 (duoc ${dung.dmg})`);
  ok(/DECISION$/.test(dung.tier || ''), `quyet dinh duoc cham muc do: "${dung.tier}"`);
  ok(dung.txt.length > 0, 'bong bong mang mot cau thoai');
  ok(dung.cp === 0, 'chua cham nguoi thi chua tich diem');

  const trung = await doc(() => {
    const G = window.__G();
    const f = G.fighters.find(x => x.key === 'suzune'), e = G.fighters.find(x => x.key === 'kono');
    const p = G.proj.find(x => x.type === 'decision');
    f.cp = 0; e.hp = e.maxHp; e.evade = 0; f.hp = f.maxHp;
    const r = Math.random; Math.random = () => .99;             // truot cua hoi mau
    const truoc = e.hp;
    window.__suzDecisionHit ? window.__suzDecisionHit(p, e) : 0;
    Math.random = r;
    return { dmg: truoc - e.hp, cp: f.cp, pd: p.dmg };
  }).catch(() => null);
  if (trung) {
    gan(trung.dmg, trung.pd, 0.001, 'quyet dinh trung dung bang sat thuong da boc');
    gan(trung.cp, trung.pd, 0.001, 'tich dung bang luong sat thuong vua gay');
  }

  const sai = await doc(() => {
    const G = window.__G();
    const f = G.fighters.find(x => x.key === 'suzune'), e = G.fighters.find(x => x.key === 'kono');
    f.cp = 10; f.hp = f.maxHp;
    G.proj.length = 0;
    // .9 > .50 -> quyet dinh sai; rnd(5,60) voi .9 ra 54.5 -> lam tron 55
    const r = Math.random; Math.random = () => .9;
    const truoc = f.hp;
    window.__suzDecide(f, e);
    Math.random = r;
    return { cp: f.cp, tuAn: truoc - f.hp, proj: G.proj.filter(x => x.type === 'decision').length };
  });
  ok(sai.proj === 0, 'quyet dinh sai thi khong ban gi ca');
  gan(sai.cp, 0, 0.001, 'diem lop thung xuong am thi reset ve 0');
  gan(sai.tuAn, 45, 0.001, 'am 45 diem thi tu chiu dung 45 dmg (10 - 55)');

  /* ---- thang chấm mức độ quyết định, cả hai form ---- */
  const thang = await doc(() => {
    const G = window.__G(), f = G.fighters.find(x => x.key === 'suzune');
    const goc = f.form;
    const doc1 = (form, ds) => { f.form = form; return ds.map(d => window.__suzTier(f, d).ten); };
    const r = {
      f2: doc1(2, [30, 40, 41, 60, 61, 70, 71, 80]),
      f3: doc1(3, [40, 70, 71, 90, 91, 110, 111, 120])
    };
    f.form = goc;
    return r;
  });
  const mong2 = ['ACCEPTABLE DECISION','ACCEPTABLE DECISION','GOOD DECISION','GOOD DECISION',
                 'GREAT DECISION','GREAT DECISION','BEST DECISION','BEST DECISION'];
  ok(JSON.stringify(thang.f2) === JSON.stringify(mong2),
     `form 2: 30-40 acceptable, 41-60 good, 61-70 great, 71-80 best (${thang.f2.join(' / ')})`);
  ok(JSON.stringify(thang.f3) === JSON.stringify(mong2),
     `form 3: 40-70 acceptable, 71-90 good, 91-110 great, 111-120 best (${thang.f3.join(' / ')})`);

  /* ---- cú cước chia tay không được nện vào lớp miễn thương ----
     Konohamaru tự miễn thương 0.75 giây người chơi mỗi lần tung Sexy no Jutsu; cú cước
     rơi trúng quãng đó thì hurt() trả false và mất sạch 150 dmg lẫn 2 giây choáng. */
  const mien = await doc(() => {
    const G = window.__G(), S = window.__SUZ;
    const f = G.fighters.find(x => x.key === 'suzune'), e = G.fighters.find(x => x.key === 'kono');
    const goc = f.form;
    e.hp = e.maxHp; e.alive = true; e.evade = 0; e.stun = 0; e.invuln = 0.2;
    f.ayaG = { ph: 'kick', t: 0, x: e.x - 40, y: e.y, face: 1, flash: 0, hits: 0, taken: 0,
               born: 0, ghost: 0, tx: e.x - 40, ty: e.y, kickT0: 0 };
    const truoc = e.hp;
    window.__ayaGuardKickHit(f);                       // địch đang miễn thương: phải treo lại
    const cho = { ph: f.ayaG.ph, mat: truoc - e.hp };
    e.invuln = 0;
    f.ayaG.born = 0.01;
    window.__ayaGuardKickHit(f);                       // hết miễn thương: tung thật
    const tung = { ph: f.ayaG ? f.ayaG.ph : 'null', mat: truoc - e.hp, stun: e.stun * window.__RT };
    // dọn sạch để phần sau chạy tiếp như cũ
    G.timers.length = 0; G.freeze = 0; f.ayaG = null; f.form = goc; e.stun = 0; e.hp = e.maxHp;
    return { cho, tung };
  });
  ok(mien.cho.ph === 'kick' && mien.cho.mat === 0,
     'dich dang mien thuong thi cu cuoc treo lai cho, chua tung');
  gan(mien.tung.mat, 150, 0.5, 'het mien thuong thi cu cuoc an dung 150 dmg');
  gan(mien.tung.stun, 2, 0.02, 'va van choang dung 2 giay nguoi choi');
  ok(mien.tung.ph === 'done', 'tung xong thi chuyen sang pha ket');

  /* ---- form 3 có ô dán ảnh thủ thế riêng, và dáng vector cũng khác form 2 ---- */
  const oAnh = await doc(() => {
    const S = window.__SETS.find(s => s.key === 'suzune');
    const nhan = k => (S.poses.find(x => x[0] === k) || [])[1];
    return { stand3: nhan('stand3'), punch3: nhan('punch3'), kick3: nhan('kick3'),
             think3: nhan('think3'), idle: nhan('idle'), think: nhan('think') };
  });
  for (const [k, mong] of [['stand3', 'Thủ thế'], ['punch3', 'Đấm'], ['kick3', 'Đá'], ['think3', 'Đứng suy nghĩ']])
    ok(!!oAnh[k] && /form 3/.test(oAnh[k]) && oAnh[k].indexOf(mong) === 0,
       `co o dan anh rieng '${k}' cho form 3 ("${oAnh[k]}")`);
  ok(/form 2/.test(oAnh.idle || ''), `o dung cu ghi ro la cua form 2 ("${oAnh.idle}")`);
  ok(/form 2/.test(oAnh.think || ''), `o dung nghi cu ghi ro la cua form 2 ("${oAnh.think}")`);

  /* Bốn dáng form 3 phải vẽ ra KHÁC hẳn form 2 — nếu ai đó lỡ xoá nhánh vẽ thì chỗ này
     đổ ngay, chứ nhìn bằng mắt trong trận thì rất dễ bỏ sót. */
  const dang = await doc(() => {
    const G = window.__G(), f = G.fighters.find(x => x.key === 'suzune');
    const cv = document.createElement('canvas'); cv.width = 160; cv.height = 160;
    const c2 = cv.getContext('2d');
    const cu = window.__getCtx(), goc = f.form, gocPose = f.pose, gocT = f.poseT, gocMove = f.moving;
    const ve = (form, pose) => {                 // vẽ cùng một khung hình, chỉ đổi form
      f.form = form; f.pose = pose; f.poseT = .5; f.moving = false;
      c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, 160, 160);
      c2.save(); c2.translate(80, 110); window.__setCtx(c2); window.__vector(f); c2.restore();
      return Array.from(c2.getImageData(0, 0, 160, 160).data);
    };
    const r = {};
    for (const pose of ['idle', 'punch', 'kick', 'think']) {
      const a = ve(2, pose), b = ve(3, pose);
      let khac = 0;
      for (let i = 3; i < a.length; i += 4) if (a[i] !== b[i]) khac++;   // đếm điểm ảnh lệch nhau
      r[pose] = { khac, day: a.filter((v, i) => i % 4 === 3 && v > 0).length };
    }
    window.__setCtx(cu); f.form = goc; f.pose = gocPose; f.poseT = gocT; f.moving = gocMove;
    return r;
  });
  for (const [pose, ten] of [['idle', 'the thu'], ['punch', 'dam'], ['kick', 'da'], ['think', 'dung suy nghi']]) {
    ok(dang[pose].day > 200, `ve duoc dang ${ten} cua Horikita ra canvas phu`);
    ok(dang[pose].khac > 40, `${ten} form 3 nhin khac han form 2 (${dang[pose].khac} diem anh lech)`);
  }

  /* ---- 150 điểm lớp: Ayanokouji vào sân làm đồng minh thật ---- */
  const join = await doc(() => {
    const G = window.__G(), S = window.__SUZ;
    const f = G.fighters.find(x => x.key === 'suzune');
    f.hp = Math.round(f.maxHp * .8);
    f.cp = 0;
    window.__suzCp(f, S.cpMax);
    return { cp: f.cp, roi: f.ayaDone, mongHp: Math.round(f.hp * S.ayaHp) };
  });
  ok(join.roi, 'cham 150 diem lop thi goi Ayanokouji ra san');
  await doi(2.4);
  const ally = await doc(() => {
    const G = window.__G();
    const f = G.fighters.find(x => x.key === 'suzune');
    const a = G.fighters.find(x => x.ally);
    return { co: !!a, hp: a ? a.maxHp : 0, cast: f.castBuff, chet: a ? a.summon : null,
             mong: Math.round(f.hp * window.__SUZ.ayaHp) };
  });
  ok(ally.co, 'Ayanokouji dung tren san nhu mot nhan vat that');
  ok(ally.hp > 0 && Math.abs(ally.hp - join.mongHp) <= 2, `mau anh bang 35% mau Horikita luc do (${ally.hp} vs ${join.mongHp})`);
  gan(ally.cast, 2, 0.001, 'Horikita duoc buff +100% toc ra chieu');

  /* đòn đột kích: 40 dmg + choáng 1.25 giây người chơi */
  const dk = await doc(() => {
    const G = window.__G();
    const a = G.fighters.find(x => x.ally), e = G.fighters.find(x => x.key === 'kono');
    e.hp = e.maxHp; e.evade = 0; e.stun = 0; e.eagle = false; e.prewing = false; e.ccRes = 0;
    const truoc = e.hp;
    window.__ayaStrike ? window.__ayaStrike(a, e) : (a.strikeCd = 0);
    return { dmg: truoc - e.hp, stun: e.stun * window.__RT };
  }).catch(() => null);
  if (dk && dk.dmg > 0) {
    gan(dk.dmg, 40, 0.001, 'don dot kich an 40 dmg');
    gan(dk.stun, 1.25, 0.02, 'don dot kich choang 1.25 giay nguoi choi');
  } else {
    // chưa móc được ayaStrike thì chờ đúng chu kỳ 4.5 giây người chơi cho anh tự tung
    const tu = await doc(() => {
      const G = window.__G(), a = G.fighters.find(x => x.ally), e = G.fighters.find(x => x.key === 'kono');
      e.hp = e.maxHp; e.evade = 0; a.strikeCd = 0.02;
      return e.hp;
    });
    await doi(0.6);
    const sau = await doc(() => window.__G().fighters.find(x => x.key === 'kono').hp);
    ok(tu - sau >= 39, `don dot kich tu tung an it nhat 40 dmg (duoc ${(tu - sau).toFixed(1)})`);
  }

  /* ---- anh cạn máu: RỜI SÀN chứ không chết, rồi Horikita sang form 3 ---- */
  await doc(() => { const a = window.__G().fighters.find(x => x.ally); a.hp = 0; });
  await doi(0.3);
  const roi = await doc(() => {
    const G = window.__G(), a = G.fighters.find(x => x.ally);
    return { con: !!a, dangDi: a ? a.leaving > 0 : false, song: a ? a.alive : false,
             thoai: G.floats.some(fl => /take\s+my\s+leave/i.test(fl.txt || '')),
             thua: !!G.over };
  });
  ok(roi.con && roi.dangDi, 'het mau thi anh chuyen sang trang thai roi san');
  ok(roi.song, 'anh van "alive" — day khong phai hieu ung chet');
  ok(!roi.thua, 'anh nga khong lam trandau ket thuc');
  ok(roi.thoai, 'anh noi cau chao truoc khi di');

  const flip = await page.evaluate(() => new Promise((res, rej) => {
    const G = window.__G(), f = G.fighters.find(x => x.key === 'suzune');
    const id = setInterval(() => {
      if (f.form >= 3) { clearInterval(id); res({ cp: f.cp, stacks: f.stacks }); }
    }, 8);
    setTimeout(() => { clearInterval(id); rej(new Error('khong thay form 3')); }, 40000);
  }));
  ok(flip.cp === 0 && flip.stacks === 0, 'ngay luc vao form 3 thi diem lop tinh lai tu 0');
  await doi(1);
  const f3 = await doc(() => {
    const G = window.__G(), S = window.__SUZ;
    const f = G.fighters.find(x => x.key === 'suzune');
    const T = window.__suzTune(f);
    return { form: f.form, con: !!G.fighters.find(x => x.ally), cast: f.castBuff,
             hit: T.hit, cp: T.cp, dec: T.decOdds, heal: T.healOdds, pct: T.healPct,
             lo: T.decLo, hi: T.decHi,
             res: f.dmgRes, cc: f.ccRes, cpNow: f.cp, stacks: f.stacks,
             thoai: G.floats.some(fl => /my\s+own\s+goal/i.test(fl.txt || '')) };
  });
  ok(!f3.con, 'anh da di khoi san');
  ok(f3.form === 3, 'Horikita sang form 3');
  gan(f3.cast, 1, 0.001, 'buff toc ra chieu tat theo anh');
  gan(f3.hit, 20, 0.001, 'form 3: don tay len 20 dmg');
  gan(f3.cp, 20, 0.001, 'form 3: moi don tich 20 diem lop');
  gan(f3.dec, .70, 0.001, 'form 3: quyet dinh dung 70%');
  gan(f3.lo, 40, 0.001, 'form 3: san sat thuong quyet dinh len 40');
  gan(f3.hi, 120, 0.001, 'form 3: tran sat thuong quyet dinh len 120');
  gan(f3.heal, .35, 0.001, 'form 3: ti le hoi mau 35%');
  gan(f3.pct, .08, 0.001, 'form 3: hoi 8% mau hien tai');
  gan(f3.res, .10, 0.001, 'form 3: +10% mien thuong');
  gan(f3.cc, .10, 0.001, 'form 3: +10% khang hieu ung');
  ok(f3.stacks === 0, 'vua vao form 3 thi chua co bac cong don nao');

  /* ---- form 3: cứ 150 điểm lớp là lên một bậc ---- */
  const bac = await doc(() => {
    const G = window.__G(), S = window.__SUZ;
    const f = G.fighters.find(x => x.key === 'suzune');
    f.cp = 0; f.stacks = 0;
    window.__suzCp(f, S.cpMax + 10);
    const T = window.__suzTune(f);
    return { stacks: f.stacks, du: f.cp, dec: T.decOdds, heal: T.healOdds, pct: T.healPct,
             res: f.dmgRes, cc: f.ccRes };
  });
  ok(bac.stacks === 1, 'du 150 diem lop o form 3 thi len mot bac');
  gan(bac.du, 10, 0.001, 'phan du duoc giu lai de tich tiep');
  gan(bac.dec, .75, 0.001, 'moi bac +5% ti le quyet dinh dung');
  gan(bac.heal, .40, 0.001, 'moi bac +5% ti le hoi mau');
  gan(bac.pct, .14, 0.001, 'moi bac +6% luong hoi mau');
  gan(bac.res, .18, 0.001, 'moi bac +8% mien thuong');
  gan(bac.cc, .18, 0.001, 'moi bac +8% khang hieu ung');

  /* ---- miễn thương và kháng hiệu ứng có ăn thật vào hurt()/stunFx() không ---- */
  const thuc = await doc(() => {
    const G = window.__G();
    const f = G.fighters.find(x => x.key === 'suzune');
    f.hp = f.maxHp; f.stun = 0; f.evade = 0; f.invuln = 0; f.ayaG = null;
    f.dmgRes = .10; f.ccRes = .10; f.stacks = 0;
    const truoc = f.hp;
    window.__hurt(f, 100, null, false);
    const mat = truoc - f.hp;
    window.__stunFx(f, 1, 'spark');
    return { mat, stun: f.stun };
  });
  gan(thuc.mat, 90, 0.001, 'mien thuong 10% an that vao hurt()');
  gan(thuc.stun, .9, 0.001, 'khang hieu ung 10% an that vao stunFx()');

  ok(errors.length === 0, `khong co loi trang${errors.length ? ': ' + errors[0] : ''}`);
  await browser.close();
  console.log(loi.length ? `\nHONG ${loi.length} muc` : '\nDAT toan bo');
  process.exit(loi.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
