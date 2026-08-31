/* Drive Shot của Tsubasa:
   - bình thường: vọt lên trời (rise>0) theo hướng ngẫu nhiên rồi mới ngoặt xuống
   - trong Wings of the Eagle: bay thẳng vào đối phương, không rise, không homing
   Đo bằng cách gọi thẳng driveShot() qua móc trong tools/probe.js. */
const { openGame } = require('./probe.js');

(async () => {
  const { browser, page, errors } = await openGame('tsubasa', 'kono');
  const r = await page.evaluate(async () => {
    const G = window.__G();
    const t = G.fighters.find(f => f.key === 'tsubasa');
    const e = G.fighters.find(f => f.key !== 'tsubasa');
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const out = { normal: [], eagle: [] };

    // đóng băng vị trí hai bên để đo góc cho chính xác
    const shot = async bucket => {
      G.proj.length = 0;
      const x0 = t.x, y0 = t.y, ex = e.x, ey = e.y;
      window.__driveShot(t, e);
      for (let i = 0; i < 40; i++) {           // chờ quả bóng thật sự bay ra
        await wait(50);
        const p = G.proj.find(q => q.type === 'drive');
        if (!p) continue;
        const want = Math.atan2(ey - y0, ex - x0), cur = Math.atan2(p.vy, p.vx);
        const off = Math.abs(Math.atan2(Math.sin(want - cur), Math.cos(want - cur))) * 180 / Math.PI;
        out[bucket].push({ straight: !!p.straight, rise: +p.rise.toFixed(2), homing: !!p.homing, off: +off.toFixed(1) });
        return;
      }
      out[bucket].push({ missing: true });
    };

    for (let i = 0; i < 4; i++) await shot('normal');

    t.hp = t.maxHp * .09;
    window.__eagleAwaken(t);
    for (let i = 0; i < 40 && !t.eagle; i++) await wait(200);
    out.eagleOn = !!t.eagle;
    t.eagleBurn = 0;                            // khỏi cháy hết máu giữa chừng
    for (let i = 0; i < 4; i++) { t.hp = t.maxHp * .09; await shot('eagle'); }
    return out;
  });
  await browser.close();

  const okNormal = r.normal.length === 4 && r.normal.every(p => !p.straight && p.rise > 0);
  // 20° dung sai: hai bên vẫn di chuyển trong 0.42s chờ tung bóng
  const okEagle = r.eagle.length === 4 && r.eagle.every(p => p.straight && p.rise === 0 && !p.homing && p.off < 20);
  console.log('thuong :', JSON.stringify(r.normal));
  console.log('eagle  :', JSON.stringify(r.eagle));
  console.log(`thuong ${okNormal ? 'DAT' : 'HONG'} | eagle ${okEagle ? 'DAT' : 'HONG'} | eagleOn ${r.eagleOn} | loi ${errors.length}`);
  process.exit(okNormal && okEagle && r.eagleOn && !errors.length ? 0 : 1);
})();
