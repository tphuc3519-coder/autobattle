/* Tiếng chạy theo thanh tốc độ.

   Chọn "Nhanh 2x" thì một giây trong trận chỉ còn nửa giây thật — bong bóng thoại,
   băng-rôn, cả trận đều trôi nhanh gấp đôi. Tiếng mà giữ nhịp cũ thì lạc quẻ, và tiếng
   nói còn sống lâu hơn cái bong bóng đi kèm (phạm luật số 1 của "Luật về tiếng").

   Đo ngay ở tầng WebAudio: `sfx()` nằm trong IIFE nên không bọc từ ngoài được, nhưng
   mọi tiếng đều đi qua `createOscillator` / `createBufferSource` của AudioContext.
   Bọc hai cái đó rồi ghi lại `playbackRate` cùng mốc start/stop là biết đủ. */
const { openGame, playwright, build } = require('./probe');

let loi = [];
const ok = (dk, msg) => { console.log(`${dk ? ' dat  ' : ' HONG '} ${msg}`); if (!dk) loi.push(msg); };
const gan = (a, b, sai, msg) => ok(Math.abs(a - b) <= sai, `${msg} (do duoc ${a.toFixed(3)}, moc ${b})`);

/* Bọc AudioContext trước khi trang chạy: ghi lại mọi nguồn tiếng cùng quãng ngân của nó. */
const BOC = () => {
  window.__snd = { osc: [], buf: [] };
  const A = window.AudioContext || window.webkitAudioContext;
  const co = A.prototype.createOscillator, cb = A.prototype.createBufferSource;
  A.prototype.createOscillator = function () {
    const o = co.call(this), st = o.start.bind(o), sp = o.stop.bind(o);
    const rec = { t0: null, t1: null };
    window.__snd.osc.push(rec);
    o.start = t => { rec.t0 = t === undefined ? this.currentTime : t; return st(rec.t0); };
    o.stop = t => { rec.t1 = t === undefined ? this.currentTime : t; return sp(rec.t1); };
    return o;
  };
  A.prototype.createBufferSource = function () {
    const n = cb.call(this), st = n.start.bind(n), sp = n.stop.bind(n);
    const rec = { rate: 1, t0: null, t1: null, len: null, dur: null };
    window.__snd.buf.push(rec);
    n.start = (t, off, len) => {
      rec.rate = n.playbackRate.value; rec.len = len === undefined ? null : len;
      rec.dur = n.buffer ? n.buffer.duration : null;
      rec.t0 = t === undefined ? this.currentTime : t;
      return st(rec.t0, off, len);
    };
    n.stop = t => { rec.t1 = t === undefined ? this.currentTime : t; return sp(rec.t1); };
    return n;
  };
};
const don = p => p.evaluate(() => { window.__snd = { osc: [], buf: [] }; });
const lay = p => p.evaluate(() => window.__snd);

/* Một file WAV giả để nhét thẳng vào SFXBUF — khỏi phải nạp qua ô chọn file. */
async function nhetBuffer(page, ten, giay) {
  await page.evaluate(async ([ten, giay]) => {
    const c = window.__ac();
    const b = c.createBuffer(1, Math.round(c.sampleRate * giay), c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.sin(i / 30) * .3;
    window.__SFXBUF[ten] = b;
  }, [ten, giay]);
}

(async () => {
  const { browser, page, errors } = await openGame('kono', 'chichi', {
    play: false,
    init: BOC
  });

  const doiToc = async v => {
    await page.selectOption('#speed', v);
    await page.waitForTimeout(60);
  };
  const heSo = () => page.evaluate(() => window.__sfxRate());

  /* ---------- 1. thanh tốc độ ra đúng hệ số ---------- */
  for (const [v, r] of [['0.35', .7], ['0.5', 1], ['0.75', 1.5], ['1', 2]]) {
    await doiToc(v);
    gan(await heSo(), r, .001, `thanh toc do ${v} => he so tieng x${r}`);
  }

  /* ---------- 2. tiếng tự tạo: quãng ngân rút đúng bấy nhiêu lần ---------- */
  const ngan = async v => {
    await doiToc(v);
    await don(page);
    await page.evaluate(() => window.__sfx('rasengan'));
    await page.waitForTimeout(120);
    const s = await lay(page);
    const os = s.osc.filter(o => o.t0 !== null && o.t1 !== null);
    return Math.max(...os.map(o => o.t1 - o.t0));
  };
  const goc = await ngan('0.5');
  const nhanh15 = await ngan('0.75');
  const nhanh2 = await ngan('1');
  const cham = await ngan('0.35');
  gan(nhanh15, goc / 1.5, .02, 'tieng tu tao o 1.5x ngan lai dung 1.5 lan');
  gan(nhanh2, goc / 2, .02, 'tieng tu tao o 2x ngan lai dung 2 lan');
  gan(cham, goc / .7, .03, 'tieng tu tao o 0.7x keo dai ra dung 0.7 lan');

  /* ---------- 3. file thu sẵn: playbackRate ăn theo thanh tốc độ ---------- */
  await nhetBuffer(page, 'punch', 1.2);
  const rateCua = async v => {
    await doiToc(v);
    await don(page);
    await page.evaluate(() => window.__sfx('punch'));
    await page.waitForTimeout(120);
    const s = await lay(page);
    const b = s.buf.filter(x => x.t0 !== null && x.dur > 1);
    return b.length ? b[b.length - 1].rate : 0;
  };
  gan(await rateCua('0.5'), 1, .001, 'file thu san o 1x doc voi playbackRate 1');
  gan(await rateCua('0.75'), 1.5, .001, 'file thu san o 1.5x doc voi playbackRate 1.5');
  gan(await rateCua('1'), 2, .001, 'file thu san o 2x doc voi playbackRate 2');

  /* ---------- 4. ô có trần độ dài: cắt đúng bằng bong bóng đi kèm ----------
     `SFX_MAXLEN` đo bằng GIÂY CỦA FILE, mà bong bóng ở 2x chỉ sống nửa quãng thời gian
     THẬT — nên quãng phát thật cũng phải ngắn đi đúng một nửa, chứ không phải cắt bớt
     nội dung. Đo bằng mốc stop() so với mốc start(). */
  const oMax = await page.evaluate(() => Object.keys(window.__SFXMAX)[0]);
  await nhetBuffer(page, oMax, 12);
  const catCua = async v => {
    await doiToc(v);
    await don(page);
    await page.evaluate(n => window.__sfx(n), oMax);
    await page.waitForTimeout(120);
    const s = await lay(page);
    const b = s.buf.filter(x => x.t0 !== null && x.t1 !== null && x.dur > 10);
    return b.length ? { that: b[b.length - 1].t1 - b[b.length - 1].t0, len: b[b.length - 1].len } : null;
  };
  const c1 = await catCua('0.5'), c2 = await catCua('1');
  ok(c1 && c2, `o "${oMax}" co tran do dai duoc phat va bi cat`);
  if (c1 && c2) {
    gan(c2.len, c1.len, .01, 'phan noi dung doc ra van y nguyen (khong cat bot loi thoai)');
    gan(c2.that, c1.that / 2, .05, 'quang phat THAT o 2x chi con mot nua, khop voi bong bong');
  }

  /* ---------- 5. nhạc nền ĐỨNG NGOÀI chuyện này ----------
     Người dùng chốt riêng: *"bỏ nhạc nền luôn đi"*. Chỉ tiếng động chạy theo thanh tốc
     độ, còn nhạc — cả file lẫn nhạc tự sinh — giữ nguyên nhịp gốc. */
  const nguon = require('fs').readFileSync(require('path').join(require('./probe').ROOT, 'index.html'), 'utf8');
  ok(!/bgmRate/.test(nguon), 'khong con ham bgmRate() nao trong game');
  await page.evaluate(() => {
    window.__BGM.el = document.createElement('audio');
    window.__BGM.el.playbackRate = 1;
  });
  await doiToc('1');
  await page.evaluate(() => window.__musicStart());
  const nhac = await page.evaluate(() => window.__BGM.el.playbackRate);
  gan(nhac, 1, .001, 'keo thanh toc do len 2x thi nhac nen VAN giu nhip goc');

  const loiTrang = errors.filter(e => !/favicon|fonts/.test(e));
  ok(loiTrang.length === 0, `khong co loi trang (${loiTrang.slice(0, 2).join(' | ') || 'sach'})`);

  await browser.close();
  console.log(loi.length ? `\nHONG ${loi.length} muc` : '\nDAT het');
  process.exit(loi.length ? 1 : 0);
})();
