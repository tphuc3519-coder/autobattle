/* Lãnh địa Nara sau khi sửa: trói MỌI đối thủ trên sàn, và sát thương loãng dần
   theo thứ tự bị trói (người thứ 2, thứ 3, thứ 4...). Cũng kiểm luôn trần chakra
   của quãng ngồi lười là 650.

   Cách đo: ghim Math.random về .5 rồi gọi thẳng domainTick() đúng một nhịp .25s,
   nhờ vậy dps là hằng số và tỉ lệ giữa các nạn nhân đọc ra sạch sẽ — chứ đo bằng
   đánh thật thì rnd(35,215) nhiễu quá, phải chạy hàng trăm nhịp mới thấy. */
const { openGame } = require('./probe');

(async () => {
  const { browser, page, errors } = await openGame('shika', 'chichi');
  await page.waitForTimeout(500);

  const r = await page.evaluate(() => {
    const G = window.__G(), S = window.__SHIKA;
    const k = G.fighters.find(f => f.key === 'shika' && !f.summon);
    const c = G.fighters.find(f => f.key === 'chichi' && !f.summon);

    // thêm hai viện binh cho phe địch: sàn có ba đối thủ cùng lúc
    for (const [key, dx] of [['kono', -70], ['tsubasa', 70]]) {
      const s = window.__mkChar(key, c.team, c.x + dx, c.y);
      s.summon = true; s.master = c; s.name = 'Viện binh ' + key;
      G.fighters.push(s);
    }
    const foes = G.fighters.filter(f => f !== k);

    k.chakra = 2000;
    window.__naraDomain(k);
    const D = k.domain;

    const rnd0 = Math.random;
    Math.random = () => .5;                 // dps thành hằng số: (lo+hi)/2

    // nhịp 1: cả ba bị tóm, đo sát thương từng người
    for (const f of foes) { f.hp = f.maxHp; f.lock = 0; f.exhaust = 0; f.outCut = 0; }
    const kHp0 = k.hp;
    D.acc = 0;
    window.__domainTick(k, .25);
    const hit = foes.map(f => +(f.maxHp - f.hp).toFixed(4));
    const hang = D.order.map(f => f.name);          // chốt hàng ngay lúc này: phía dưới còn cho gục rồi sống lại
    const state = foes.map(f => ({ lock: +f.lock.toFixed(3), outCut: f.outCut, exhaust: +f.exhaust.toFixed(2) }));

    // người đầu hàng gục thì người sau nhích lên bậc 1, ăn đủ sát thương
    foes[0].alive = false;
    for (const f of foes) { f.hp = f.maxHp; }
    D.acc = 0;
    window.__domainTick(k, .25);
    const hit2 = foes.map(f => +(f.maxHp - f.hp).toFixed(4));
    foes[0].alive = true;

    // miễn khống chế (ChiChi lúc lao tới) thì thoát cái dây, nhưng vẫn ăn bom
    for (const f of foes) { f.hp = f.maxHp; f.lock = 0; }
    foes[1].dash = { guard: true, kind: 'charge' };
    D.acc = 0;
    window.__domainTick(k, .25);
    const ccLock = +foes[1].lock.toFixed(3), ccHit = +(foes[1].maxHp - foes[1].hp).toFixed(4);
    foes[1].dash = null;

    Math.random = rnd0;

    return {
      cap: S.lazyCap, fall: S.domainFall, floor: S.domainFallMin,
      soNguoi: D.order.length,
      hang,
      hit, hit2, state,
      mul: [0, 1, 2, 3, 8].map(i => +window.__domainMul(i).toFixed(4)),
      shikaMatMau: +(kHp0 - k.hp).toFixed(4),
      shikaLock: +k.lock.toFixed(3),
      ccLock, ccHit
    };
  });

  const ti = (a, b) => +(a / b).toFixed(3);
  console.log(`tran chakra ngoi luoi : ${r.cap}`);
  console.log(`so nguoi bi troi      : ${r.soNguoi}  (${r.hang.join(' · ')})`);
  console.log(`sat thuong moi nguoi  : ${r.hit.join(' / ')}`);
  console.log(`ti le so voi nguoi dau: 1 / ${ti(r.hit[1], r.hit[0])} / ${ti(r.hit[2], r.hit[0])}`
            + `  (mong doi 1 / ${r.fall} / ${+(r.fall * r.fall).toFixed(3)})`);
  console.log(`nguoi dau guc -> dồn lên: ${r.hit2.join(' / ')}`);
  console.log(`trang thai bi troi    : ${r.state.map(s => `lock ${s.lock} · outCut ${s.outCut} · exhaust ${s.exhaust}`).join(' | ')}`);
  console.log(`bac loang domainMul   : ${r.mul.join(' / ')}`);
  console.log(`mien khong che        : lock ${r.ccLock} (phai la 0) · van an bom ${r.ccHit}`);
  console.log(`Shikamaru tu an dan?  : mat ${r.shikaMatMau} mau, lock ${r.shikaLock}`);
  console.log('loi trang:', errors.length ? errors.slice(0, 3) : 'khong co');

  const gan = (a, b) => Math.abs(a - b) < .01;
  const ok = r.cap === 650
    && r.soNguoi === 3
    && r.hit.every(h => h > 0)
    && gan(ti(r.hit[1], r.hit[0]), r.fall)
    && gan(ti(r.hit[2], r.hit[0]), r.fall * r.fall)
    && gan(r.hit2[1], r.hit[0]) && gan(r.hit2[2], r.hit[1])   // dồn lên một bậc
    && r.state.every(s => s.lock > 0 && s.outCut === .5 && s.exhaust >= .6)
    && r.mul[4] === r.floor                                   // sàn của bậc loãng
    && r.ccLock === 0 && r.ccHit > 0
    && r.shikaMatMau === 0 && r.shikaLock === 0
    && !errors.length;

  await browser.close();
  console.log(ok ? '\nDAT' : '\nHONG');
  process.exit(ok ? 0 : 1);
})();
