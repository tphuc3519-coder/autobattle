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
    /* pickLine() boc lai cho toi khi ra chi so KHAC lan truoc, nen Math.random ghim cung
       mot hang so se TREO vong lap. Reset con tro cau thoai truoc thi lan boc dau chac an. */
    window.__resetLines();
    const r = Math.random; Math.random = () => .1;              // .1 < .65 -> quyet dinh dung
    window.__suzDecide(f, e);
    Math.random = r;
    const p = G.proj.find(x => x.type === 'decision');
    return { co: !!p, dmg: p ? p.dmg : 0, txt: p ? p.txt : '', cp: f.cp, pose: f.pose,
             tier: p ? p.tier : '', odds: window.__suzTune(f).decOdds,
             lo: window.__suzTune(f).decLo, hi: window.__suzTune(f).decHi };
  });
  ok(dung.pose === 'right', `chot dung thi doi sang dang 'right' (dang "${dung.pose}")`);
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
    window.__resetLines();                                     // xem chu thich pickLine o tren
    const r = Math.random; Math.random = () => .9;
    const truoc = f.hp;
    window.__suzDecide(f, e);
    Math.random = r;
    return { cp: f.cp, tuAn: truoc - f.hp, proj: G.proj.filter(x => x.type === 'decision').length };
  });
  ok(sai.proj === 0, 'quyet dinh sai thi khong ban gi ca');
  gan(sai.cp, 0, 0.001, 'diem lop thung xuong am thi reset ve 0');
  gan(sai.tuAn, 45, 0.001, 'am 45 diem thi tu chiu dung 45 dmg (10 - 55)');

  // Quyết định sai mà điểm lớp chưa thủng xuống âm thì dáng phải giữ nguyên 'wrong';
  // thủng xuống âm mới bị 'hurt' đè lên (như mục ngay trên, cp 10 - 55).
  const saiDang = await doc(() => {
    const G = window.__G();
    const f = G.fighters.find(x => x.key === 'suzune'), e = G.fighters.find(x => x.key === 'kono');
    f.cp = 140; f.hp = f.maxHp;
    window.__resetLines();
    const r = Math.random; Math.random = () => .9;              // .9 > .35 -> quyet dinh sai
    window.__suzDecide(f, e);
    Math.random = r;
    const d = { pose: f.pose, cp: f.cp };
    f.cp = 0;
    return d;
  });
  ok(saiDang.pose === 'wrong', `chot trat thi doi sang dang 'wrong' (dang "${saiDang.pose}")`);

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
             think3: nhan('think3'), idle: nhan('idle'), think: nhan('think'),
             right2: nhan('right2'), wrong2: nhan('wrong2'),
             right3: nhan('right3'), wrong3: nhan('wrong3'), decide: nhan('decide'),
             injured2: nhan('injured2'), injured3: nhan('injured3'), injured: nhan('injured') };
  });
  for (const [k, mong] of [['stand3', 'Thủ thế'], ['punch3', 'Đấm'], ['kick3', 'Đá'], ['think3', 'Đứng suy nghĩ'],
                           ['right3', 'Quyết định đúng'], ['wrong3', 'Quyết định sai'],
                           ['injured3', 'Tơi tả']])
    ok(!!oAnh[k] && /form 3/.test(oAnh[k]) && oAnh[k].indexOf(mong) === 0,
       `co o dan anh rieng '${k}' cho form 3 ("${oAnh[k]}")`);
  for (const [k, mong] of [['right2', 'Quyết định đúng'], ['wrong2', 'Quyết định sai']])
    ok(!!oAnh[k] && /form 2/.test(oAnh[k]) && oAnh[k].indexOf(mong) === 0,
       `co o dan anh rieng '${k}' cho form 2 ("${oAnh[k]}")`);
  ok(!!oAnh.injured2 && /form 1\/2/.test(oAnh.injured2),
     `o toi ta cua form 1-2 la 'injured2' ("${oAnh.injured2}")`);
  ok(!!oAnh.decide, `o 'decide' cu van con lam o lui chung ("${oAnh.decide}")`);
  ok(!!oAnh.injured, `o 'injured' cu van con lam o lui chung ("${oAnh.injured}")`);
  ok(/form 2/.test(oAnh.idle || ''), `o dung cu ghi ro la cua form 2 ("${oAnh.idle}")`);
  ok(/form 2/.test(oAnh.think || ''), `o dung nghi cu ghi ro la cua form 2 ("${oAnh.think}")`);

  /* Bốn dáng form 3 phải vẽ ra KHÁC hẳn form 2 — nếu ai đó lỡ xoá nhánh vẽ thì chỗ này
     đổ ngay, chứ nhìn bằng mắt trong trận thì rất dễ bỏ sót. */
  const dang = await doc(() => {
    const G = window.__G(), f = G.fighters.find(x => x.key === 'suzune');
    const cv = document.createElement('canvas'); cv.width = 160; cv.height = 160;
    const c2 = cv.getContext('2d');
    const cu = window.__getCtx(), goc = f.form, gocPose = f.pose, gocT = f.poseT, gocMove = f.moving;
    const gocInj = f.injured;
    const ve = (form, pose, inj) => {            // vẽ cùng một khung hình, chỉ đổi form
      f.form = form; f.pose = pose; f.poseT = .5; f.moving = false; f.injured = !!inj;
      c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, 160, 160);
      c2.save(); c2.translate(80, 110); window.__setCtx(c2); window.__vector(f); c2.restore();
      return Array.from(c2.getImageData(0, 0, 160, 160).data);
    };
    /* Đếm điểm ảnh lệch nhau — phải soi cả BỐN kênh RGBA. Chỉ soi kênh alpha thì mấy vết
       thương vẽ đè lên thân người (vốn đã đục) gần như không đổi gì, đo ra 3 điểm. */
    const dem = (a, b) => {
      let k = 0;
      for (let i = 0; i < a.length; i += 4)
        if (a[i] !== b[i] || a[i+1] !== b[i+1] || a[i+2] !== b[i+2] || a[i+3] !== b[i+3]) k++;
      return k;
    };
    const r = {};
    for (const pose of ['idle', 'punch', 'kick', 'think', 'right', 'wrong']) {
      const a = ve(2, pose), b = ve(3, pose);
      r[pose] = { khac: dem(a, b), day: a.filter((v, i) => i % 4 === 3 && v > 0).length };
    }
    // tơi tả: so form 2 với form 3, và so từng form lúc lành lặn với lúc tơi tả
    const l2 = ve(2, 'idle', false), t2 = ve(2, 'idle', true);
    const l3 = ve(3, 'idle', false), t3 = ve(3, 'idle', true);
    r.injured = { khac: dem(t2, t3), day: t2.filter((v, i) => i % 4 === 3 && v > 0).length };
    r.vet2 = dem(l2, t2); r.vet3 = dem(l3, t3);
    window.__setCtx(cu);
    f.form = goc; f.pose = gocPose; f.poseT = gocT; f.moving = gocMove; f.injured = gocInj;
    return r;
  });
  for (const [pose, ten] of [['idle', 'the thu'], ['punch', 'dam'], ['kick', 'da'], ['think', 'dung suy nghi'],
                             ['right', 'quyet dinh dung'], ['wrong', 'quyet dinh sai'],
                             ['injured', 'toi ta duoi 20% mau']]) {
    ok(dang[pose].day > 200, `ve duoc dang ${ten} cua Horikita ra canvas phu`);
    ok(dang[pose].khac > 40, `${ten} form 3 nhin khac han form 2 (${dang[pose].khac} diem anh lech)`);
  }

  ok(dang.vet2 > 20 && dang.vet3 > 20,
     `ca hai form deu ve them dau vet luc duoi 20% mau (${dang.vet2} / ${dang.vet3} diem anh)`);
  ok(dang.vet3 > dang.vet2,
     `form 3 toi ta nang hon form 1-2 (${dang.vet3} > ${dang.vet2} diem anh)`);

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

  /* ---- khiêu khích: anh còn đứng đó thì mọi đòn của địch đều nhắm vào anh ---- */
  await doc(() => {                                  // đẩy địch ra thật xa, ngoài tầm cận chiến
    const G = window.__G(), e = G.fighters.find(x => x.key === 'kono');
    const f = G.fighters.find(x => x.key === 'suzune');
    e.x = 60; e.y = 60; f.x = 520; f.y = 900; e.stun = 0;
  });
  await doi(0.35);
  const keo = await doc(() => {
    const G = window.__G(), a = G.fighters.find(x => x.ally);
    const e = G.fighters.find(x => x.key === 'kono');
    const f = G.fighters.find(x => x.key === 'suzune');
    // viện binh của địch (Goku / Gohan / phân thân) không có khiêu khích riêng: phải nhắm
    // theo đúng người đang khiêu khích chủ của nó
    const vien = { team: e.team, master: e, summon: true, alive: true, hp: 100, x: e.x, y: e.y };
    return { tauntBy: !!a && G.fighters.find(x => x.key === 'kono').tauntBy === a,
             nham: window.__aimTarget(e) === a,
             vienNham: window.__aimTarget(vien) === a,
             coNham: window.__aimTarget(f) === e,
             xa: Math.round(Math.hypot(e.x - f.x, e.y - f.y)) };
  });
  ok(keo.tauntBy, `dich xa ${keo.xa}px van bi anh khieu khich (khong doi ap sat nua)`);
  ok(keo.nham, 'moi don cua dich deu nham vao Ayanokouji chu khong vao Horikita');
  ok(keo.vienNham, 'vien binh cua dich cung nham vao Ayanokouji');
  ok(keo.coNham, 'Horikita van nham vao dich, khong bi anh keo nham');

  /* ---- Sexy no Jutsu: anh miễn nhiễm hoàn toàn ---- */
  const khoi = await doc(() => {
    const G = window.__G(), a = G.fighters.find(x => x.ally);
    const e = G.fighters.find(x => x.key === 'kono');
    const f = G.fighters.find(x => x.key === 'suzune');
    a.dots.length = 0; a.stun = 0; a.hp = a.maxHp;
    f.dots.length = 0; f.stun = 0; f.ayaG = null;
    a.x = e.x + 40; a.y = e.y + 20;                  // đứng ngay trong làn khói
    f.x = e.x + 130; f.y = e.y + 90;                 // cô cũng đứng trong tầm khói
    const truoc = a.hp;
    window.__sexy(e, a);
    return { dot: a.dots.length, stun: a.stun, mat: truoc - a.hp, coDot: f.dots.length };
  });
  ok(khoi.dot === 0, 'khoi hong khong bam duoc vao Ayanokouji (0 dot)');
  gan(khoi.stun, 0, 0.001, 'Ayanokouji khong dung hinh du la nam');
  gan(khoi.mat, 0, 0.001, 'Ayanokouji khong mat mot giot mau nao');
  ok(khoi.coDot > 0, 'khoi hong van an vao Horikita nhu thuong');

  /* đòn đột kích: 40 dmg + choáng 1.25 giây người chơi */
  const dk = await doc(() => {
    const G = window.__G();
    const a = G.fighters.find(x => x.ally), e = G.fighters.find(x => x.key === 'kono');
    e.hp = e.maxHp; e.evade = 0; e.stun = 0; e.eagle = false; e.prewing = false; e.ccRes = 0;
    e.invuln = 0;                                    // vừa tung Sexy no Jutsu xong nên còn miễn thương
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
  const het = await doc(() => {
    const G = window.__G(), e = G.fighters.find(x => x.key === 'kono');
    const f = G.fighters.find(x => x.key === 'suzune');
    return { sach: !e.tauntBy, nham: window.__aimTarget(e) === f };
  });
  ok(het.sach && het.nham, 'anh di roi thi dich nham lai vao Horikita');
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

  /* ---- lãnh địa Nara trói CẢ HAI: khiêu khích của Ayanokouji không kéo nổi một cái vùng ---- */
  const g2 = await openGame('shika', 'suzune');
  const doc2 = fn => g2.page.evaluate(fn);
  const doi2 = (giay, tran = 40000) => g2.page.evaluate(([g, tr]) => new Promise((res, rej) => {
    const G = window.__G(), t0 = G.t;
    const id = setInterval(() => { if (window.__G().t - t0 >= g) { clearInterval(id); res(window.__G().t - t0); } }, 25);
    setTimeout(() => { clearInterval(id); rej(new Error('qua gio cho ' + g + 's trong tran')); }, tr);
  }), [giay, tran]);
  await g2.page.selectOption('#speed', '1');
  await g2.page.waitForTimeout(200);

  await doc2(() => {
    const G = window.__G(), f = G.fighters.find(x => x.key === 'suzune');
    f.ayaG = null; f.ayaShieldDone = true;
    window.__suzForm2(f);
    window.__ayaJoin(f);
  });
  await doi2(2.6);
  // nút #testForest chỉ nạp tạm 400 chakra = 4 giây người chơi = 2 giây trong trận, đo
  // chưa xong thì rừng đã khép. Nạp hẳn cho đủ dài rồi mới mở.
  await doc2(() => {
    const k = window.__G().fighters.find(x => x.key === 'shika');
    k.chakra = 4000; k.lazy = false; k.awake = true;
  });
  await g2.page.click('#testForest');
  // naraDomain() đóng băng 1.8 giây phân cảnh; step() return sớm trong quãng đó nên lãnh
  // địa chưa đập nhịp nào. Chờ hết phân cảnh rồi mới lấy mốc đo.
  await g2.page.waitForFunction(() => window.__G().freeze <= 0, null, { timeout: 60000 });
  await doi2(0.2);
  const truoc2 = await doc2(() => {
    const G = window.__G(), k = G.fighters.find(x => x.key === 'shika');
    const f = G.fighters.find(x => x.key === 'suzune'), a = G.fighters.find(x => x.ally);
    // nới máu cho cả hai để không ai gục giữa chừng, và bỏ né để đo cho sạch
    for (const x of [f, a]) { if (x) { x.maxHp = 9000; x.hp = 9000; x.evade = 0; x.dmgRes = 0; } }
    return { rung: !!k.domain, con: k.domain ? k.domain.t : 0, co: !!a, hpF: f.hp, hpA: a ? a.hp : -1,
             nham: window.__aimTarget(k) === a };
  });
  ok(truoc2.rung && truoc2.con > 2, `mo duoc khu rung nha Nara (con ${truoc2.con.toFixed(1)}s trong tran)`);
  ok(truoc2.co, 'Ayanokouji dang dung tren san luc rung mo');
  ok(truoc2.nham, 'anh van khieu khich duoc Shikamaru (don thuong van vao anh)');

  /* danh sách bị trói và bậc sát thương: đấu thủ chính đứng đầu, người sau nhẹ dần */
  const dsach = await doc2(() => {
    const G = window.__G(), S = window.__SHIKA;
    const k = G.fighters.find(x => x.key === 'shika');
    const ds = window.__domainTargets(k);
    return { so: ds.length, dau: ds[0] ? ds[0].key : '', hai: ds[1] ? !!ds[1].ally : false,
             p0: window.__domainShare(0), p1: window.__domainShare(1), p2: window.__domainShare(2),
             giam: S.domainFalloff };
  });
  ok(dsach.so === 2 && dsach.dau === 'suzune' && dsach.hai,
     `rung troi ca ${dsach.so} nguoi, dau thu chinh dung dau roi toi Ayanokouji`);
  gan(dsach.p0, 1, 0.001, 'nguoi thu nhat an du sat thuong');
  gan(dsach.p1, dsach.giam, 0.001, `nguoi thu hai chi an ${Math.round(dsach.giam * 100)}%`);
  gan(dsach.p2, dsach.giam * dsach.giam, 0.001, 'nguoi thu ba nhe tiep mot bac nua');

  await doi2(4);
  const sau2 = await doc2(() => {
    const G = window.__G();
    const f = G.fighters.find(x => x.key === 'suzune'), a = G.fighters.find(x => x.ally);
    return { hpF: f.hp, hpA: a ? a.hp : -1,
             cutF: f.outCut, cutA: a ? a.outCut : -1,
             metF: f.exhaust, metA: a ? a.exhaust : -1 };
  });
  ok(sau2.hpF > 0 && truoc2.hpF - sau2.hpF > 0, `Horikita van an bom trong rung (mat ${(truoc2.hpF - sau2.hpF).toFixed(1)} mau)`);
  ok(sau2.hpA > 0 && truoc2.hpA - sau2.hpA > 0, `Ayanokouji cung an bom trong rung (mat ${(truoc2.hpA - sau2.hpA).toFixed(1)} mau)`);
  ok(sau2.cutF > 0 && sau2.cutA > 0, `ca hai deu bi cat sat thuong gay ra (${sau2.cutF} / ${sau2.cutA})`);
  ok(sau2.metF > 0 && sau2.metA > 0, 'ca hai deu bi kiet suc trong rung');
  const matF = truoc2.hpF - sau2.hpF, matA = truoc2.hpA - sau2.hpA;
  ok(matA < matF, `nguoi bi troi thu hai an nhe hon nguoi thu nhat (${matA.toFixed(1)} < ${matF.toFixed(1)})`);
  ok(g2.errors.length === 0, `khong co loi trang o tran thu hai${g2.errors.length ? ': ' + g2.errors[0] : ''}`);
  await g2.browser.close();
  console.log(loi.length ? `\nHONG ${loi.length} muc` : '\nDAT toan bo');
  process.exit(loi.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
