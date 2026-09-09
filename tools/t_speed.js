/* Tiếng KHÔNG chạy theo thanh tốc độ.

   Bản trước nhân `playbackRate` theo `speedMul` và rút ngắn quãng ngân của tiếng tự
   tạo cho khớp nhịp trận. Người dùng bác: ở mốc "Nhanh 2x" tiếng méo hẳn — file thu
   sẵn đọc gấp đôi thì cao giọng lên như tua băng, tiếng tự tạo thì cụt và chói.
   Giờ mọi tiếng phát đúng cao độ, đúng độ dài gốc ở cả bốn mốc; nhạc nền thì vốn đã
   đứng ngoài chuyện này từ trước.

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

  /* ---------- 1. thanh tốc độ vẫn đổi nhịp TRẬN như cũ ----------
     Bỏ phần tiếng chạy theo tốc độ không được đụng tới chính thanh tốc độ. */
  for (const [v, m] of [['0.35', .35], ['0.5', .5], ['0.75', .75], ['1', 1]]) {
    await doiToc(v);
    gan(await page.evaluate(() => window.__speedMul()), m, .001, `thanh toc do ${v} => speedMul ${m}`);
  }

  /* ---------- 2. tiếng tự tạo: quãng ngân Y NGUYÊN ở mọi mốc ---------- */
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
  gan(await ngan('0.75'), goc, .01, 'tieng tu tao o 1.5x NGAN Y NGUYEN');
  gan(await ngan('1'), goc, .01, 'tieng tu tao o 2x NGAN Y NGUYEN (khong bi cut)');
  gan(await ngan('0.35'), goc, .01, 'tieng tu tao o 0.7x NGAN Y NGUYEN');

  /* ---------- 3. file thu sẵn: playbackRate luôn là 1 ----------
     Đây chính là chỗ làm tiếng méo ở 2x — đọc buffer gấp đôi thì cao giọng lên hẳn. */
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
  for (const v of ['0.5', '0.75', '1', '0.35'])
    gan(await rateCua(v), 1, .001, `file thu san o ${v} doc voi playbackRate 1 (khong meo tieng)`);

  /* ---------- 4. ô có trần độ dài: cắt y hệt nhau ở mọi mốc ----------
     `SFX_MAXLEN` đo bằng giây của file, mà file giờ đọc ở tốc độ 1 nên quãng phát THẬT
     cũng đúng bằng bấy nhiêu — kéo thanh tốc độ không được rút ngắn nó lại. */
  const oMax = await page.evaluate(() => Object.keys(window.__SFXMAX)[0]);
  await nhetBuffer(page, oMax, 12);
  const catCua = async v => {
    await doiToc(v);
    await don(page);
    await page.evaluate(n => window.__sfx(n), oMax);
    await page.waitForTimeout(120);
    const s = await lay(page);
    const b = s.buf.filter(x => x.t0 !== null && x.t1 !== null && x.dur > 10);
    return b.length ? { that: b[b.length - 1].t1 - b[b.length - 1].t0, len: b[b.length - 1].len, rate: b[b.length - 1].rate } : null;
  };
  const c1 = await catCua('0.5'), c2 = await catCua('1');
  ok(c1 && c2, `o "${oMax}" co tran do dai duoc phat va bi cat`);
  if (c1 && c2) {
    gan(c2.len, c1.len, .01, 'phan noi dung doc ra van y nguyen (khong cat bot loi thoai)');
    gan(c2.that, c1.that, .01, 'quang phat THAT o 2x cung y nguyen');
    gan(c2.rate, 1, .001, 'o co tran do dai cung doc voi playbackRate 1');
  }

  /* ---------- 5. không còn dấu vết của lối cũ trong nguồn ---------- */
  const nguon = require('fs').readFileSync(require('path').join(require('./probe').ROOT, 'index.html'), 'utf8');
  ok(!/sfxRate/.test(nguon), 'khong con ham sfxRate() nao trong game');
  ok(!/bgmRate/.test(nguon), 'khong con ham bgmRate() nao trong game');

  /* ---------- 6. nhạc nền vẫn giữ nhịp gốc như trước ---------- */
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
