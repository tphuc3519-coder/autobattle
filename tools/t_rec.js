/* Ghi hình: kiểm đường CFR (WebCodecs + tự dựng MP4) và đường lui MediaRecorder.
   - MP4 xuất ra phải có bảng stts đúng MỘT dòng, mỗi mẫu dài bằng nhau -> CFR thật
   - timescale = fps*1000, mỗi khung 1000 nhịp -> đúng 60 fps
   - track tiếng phải phủ hết độ dài hình (đừng cụt đoạn cuối)
   - file phải phát lại được, đúng bề ngang/cao đã chọn
   - bỏ WebCodecs thì lui về MediaRecorder và nói rõ là nhịp khung thay đổi */
const { openGame } = require('./probe.js');

/* soi thô MP4: trả về các box cần kiểm */
function parseMp4(buf) {
  const out = { boxes: [], stts: [], mdhd: [], stsd: [], stsz: [], stco: [] };
  (function walk(off, end, path) {
    while (off + 8 <= end) {
      const size = buf.readUInt32BE(off), type = buf.toString('latin1', off + 4, off + 8);
      if (size < 8 || off + size > end) throw new Error('box hong: ' + path + '/' + type);
      out.boxes.push(path + '/' + type);
      if (type === 'stts') {
        const n = buf.readUInt32BE(off + 12), ent = [];
        for (let e = 0; e < n; e++) ent.push([buf.readUInt32BE(off + 16 + e * 8), buf.readUInt32BE(off + 20 + e * 8)]);
        out.stts.push(ent);
      }
      if (type === 'mdhd') out.mdhd.push({ timescale: buf.readUInt32BE(off + 20), duration: buf.readUInt32BE(off + 24) });
      if (type === 'stsd') out.stsd.push(buf.toString('latin1', off + 20, off + 24));
      if (type === 'stsz') out.stsz.push(buf.readUInt32BE(off + 16));
      if (type === 'stco') out.stco.push(buf.readUInt32BE(off + 16));
      if (['moov', 'trak', 'mdia', 'minf', 'stbl', 'dinf', 'edts'].includes(type)) walk(off + 8, off + size, path + '/' + type);
      off += size;
    }
  })(0, buf.length, '');
  return out;
}

async function record(page, ms) {
  await page.evaluate(() => { window.__blobObj = null; });
  await page.click('#rec');
  await page.waitForTimeout(ms);
  await page.click('#rec');
  await page.waitForFunction(() => window.__blobObj !== null, null, { timeout: 30000 });
  return page.evaluate(async () => {
    const b = window.__blobObj;
    const u = new Uint8Array(await b.arrayBuffer());
    let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
    const play = await new Promise(res => {
      const v = document.createElement('video'); v.muted = true;
      v.onloadedmetadata = () => res({ w: v.videoWidth, h: v.videoHeight, dur: v.duration });
      v.onerror = () => res({ err: 'khong phat lai duoc' });
      v.src = URL.createObjectURL(b);
      setTimeout(() => res({ err: 'het gio' }), 8000);
    });
    return { type: b.type, size: b.size, b64: btoa(s), play, log: (window.__G().logs.find(l => /^Đã lưu|^Trình duyệt/.test(l.m)) || {}).m };
  });
}

(async () => {
  const { browser, page, errors } = await openGame('tsubasa', 'shika');
  await page.evaluate(() => {
    const orig = URL.createObjectURL.bind(URL);
    URL.createObjectURL = b => { if (b instanceof Blob && b.type.includes('video')) window.__blobObj = b; return orig(b); };
    document.addEventListener('click', e => { if (e.target.tagName === 'A') e.preventDefault(); }, true);
  });

  await page.selectOption('#rec916', '720');
  const cfr = await record(page, 4000);
  const m = parseMp4(Buffer.from(cfr.b64, 'base64'));
  const [vStts, aStts] = m.stts;
  const vDur = m.mdhd[0].duration / m.mdhd[0].timescale;
  const aDur = m.mdhd[1] ? m.mdhd[1].duration / m.mdhd[1].timescale : 0;

  const ok = {
    'file la mp4': cfr.type === 'video/mp4',
    'stts hinh dung 1 dong': vStts.length === 1,
    'moi khung 1000 nhip': vStts[0][1] === 1000,
    'timescale = 60*1000': m.mdhd[0].timescale === 60000,
    'so mau khop stsz': vStts[0][0] === m.stsz[0],
    'co track tieng': m.stsd.length === 2,
    'stts tieng deu nhip': !aStts || aStts.length <= 2,
    'tieng phu het hinh': aDur >= vDur - 0.15,
    'stco nam trong file': m.stco.every(o => o < cfr.size),
    'phat lai duoc 720x1280': cfr.play.w === 720 && cfr.play.h === 1280,
    'nhat ky noi CFR': /CFR/.test(cfr.log || '')
  };

  await page.evaluate(() => { delete window.VideoEncoder; });
  const vfr = await record(page, 2500);
  ok['bo WebCodecs thi lui MediaRecorder'] = /webm|mp4/.test(vfr.type) && /nhịp khung thay đổi/.test(vfr.log || '');

  await browser.close();
  for (const k of Object.keys(ok)) console.log((ok[k] ? 'DAT ' : 'HONG') + '  ' + k);
  console.log(`hinh ${vStts[0][0]} khung / ${vDur.toFixed(2)}s · tieng ${aDur.toFixed(2)}s · ${m.stsd.join('+')} · ${(cfr.size / 1048576).toFixed(1)} MB`);
  console.log('loi trang:', errors.length ? errors : 'khong co');
  process.exit(Object.values(ok).every(Boolean) && !errors.length ? 0 : 1);
})();
