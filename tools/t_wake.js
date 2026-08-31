/* Đo lúc Shikamaru bật dậy: tiếng than thở phải câm ngay, bong bóng phải biến
   mất, rồi phải chờ đủ SHIKA.wakeDelay giây người chơi mới ra đòn. */
const { openGame } = require('./probe');

(async () => {
  const { browser, page, errors } = await openGame('shika', 'chichi');
  const r = await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const G = window.__G(), c = window.__ac(), RT = window.__RT, S = window.__SHIKA;
    const k = G.fighters.find(f => f.key === 'shika');

    // nạp một file dài vào ô than thở để chắc chắn tiếng vẫn đang phát lúc bật dậy
    const bf = c.createBuffer(1, Math.ceil(c.sampleRate * 12), c.sampleRate);
    const d = bf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.sin(i / 40) * 0.05;
    window.__SFXBUF.shika_lazy = bf;

    // theo dõi stop() để biết tiếng có bị cắt không
    let stopped = 0;
    const origStop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.stop = function (...a) { stopped++; return origStop.apply(this, a); };

    // chờ tới lúc có bong bóng than thở đang treo
    await new Promise(res => {
      const id = setInterval(() => {
        k.hp = k.maxHp; k.lazyTalk = Math.min(k.lazyTalk, .1);
        if (G.floats.some(f => f.grumble)) { clearInterval(id); res(); }
      }, 20);
    });
    const bubbleTruoc = G.floats.filter(f => f.grumble).length;
    const stopTruoc = stopped;

    k.hp = k.maxHp * (S.wakeHp - 0.01);      // chọc cho bật dậy ngay
    await wait(120);
    const out = {
      bubbleTruoc,
      bubbleSau: G.floats.filter(f => f.grumble).length,
      tiengBiCat: stopped > stopTruoc,
      choGiay: +(k.wakeT * RT).toFixed(2),
      moc: S.wakeDelay
    };

    // đếm từ lúc đứng dậy tới đòn đánh đầu tiên (theo giờ trong trận)
    const t0 = G.t; let tDanh = null;
    await new Promise(res => {
      const id = setInterval(() => {
        if (tDanh === null && (G.proj.some(q => q.owner === k) || k.dash || k.bind)) tDanh = G.t - t0;
        if (tDanh !== null || G.t - t0 > 6) { clearInterval(id); res(); }
      }, 20);
    });
    out.giayToiDonDau = tDanh === null ? null : +(tDanh * RT).toFixed(2);
    AudioBufferSourceNode.prototype.stop = origStop;
    return out;
  });

  console.log(`bong bong than tho : ${r.bubbleTruoc} truoc -> ${r.bubbleSau} sau`);
  console.log(`tieng bi cat ngay  : ${r.tiengBiCat}`);
  console.log(`nhip cho sau khi dung len: ${r.choGiay}s  (moc ${r.moc}s, doc tre 120ms nen hut mot chut)`);
  console.log(`don danh dau tien sau    : ${r.giayToiDonDau}s  (dai hon moc vi con phai di vao tam)`);
  console.log('loi trang:', errors.length ? errors.slice(0, 3) : 'khong co');
  await browser.close();
  const ok = r.bubbleSau === 0 && r.tiengBiCat && r.choGiay > r.moc - .3 && !errors.length;
  console.log(ok ? 'DAT' : 'HONG');
  process.exit(ok ? 0 : 1);
})();
