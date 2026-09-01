/* Ghi hình: kiểm đường CFR (WebCodecs + tự dựng MP4) và đường lui MediaRecorder.
   - MP4 xuất ra phải có bảng stts đúng MỘT dòng, mỗi mẫu dài bằng nhau -> CFR thật
   - timescale = fps*1000, mỗi khung 1000 nhịp -> đúng 60 fps
   - track tiếng phải phủ hết độ dài hình (đừng cụt đoạn cuối) VÀ giải mã ra tiếng thật
   - file phải phát lại được, đúng bề ngang/cao đã chọn
   - bỏ WebCodecs thì lui về MediaRecorder và nói rõ là nhịp khung thay đổi */
const { openGame } = require('./probe.js');

/* soi thô MP4: trả về các box cần kiểm */
function parseMp4(buf) {
  const out = { boxes: [], stts: [], mdhd: [], stsd: [], stsz: [], stco: [], cfgBox: [] };
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
      if (type === 'stsd') {
        const kind = buf.toString('latin1', off + 20, off + 24);
        // sample entry nằm ngay sau: soi bên trong xem có hộp mô tả codec không
        const entEnd = off + size, ent = buf.toString('latin1', off + 24, entEnd);
        out.stsd.push(kind);
        out.cfgBox.push(['avcC', 'vpcC', 'esds', 'dOps'].filter(b => ent.includes(b)));
      }
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
    // giải mã thật track tiếng: có mặt trong file chưa chắc đã kêu
    let aud = { err: 'khong co' };
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const ab = await ctx.decodeAudioData(await b.arrayBuffer());
      let peak = 0; const d = ab.getChannelData(0);
      for (let i = 0; i < d.length; i += 17) peak = Math.max(peak, Math.abs(d[i]));
      aud = { dur: ab.duration, ch: ab.numberOfChannels, rate: ab.sampleRate, peak: +peak.toFixed(4) };
    } catch (e) { aud = { err: e.name }; }
    return { type: b.type, size: b.size, b64: btoa(s), play, aud, log: (window.__G().logs.find(l => /^Đã lưu|^Trình duyệt/.test(l.m)) || {}).m };
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
    'nhat ky noi CFR': /CFR/.test(cfr.log || ''),
    'thu tieng qua dau thu PCM': /qua (AudioWorklet|ScriptProcessor)/.test(cfr.log || ''),
    'tieng giai ma duoc': !cfr.aud.err && cfr.aud.dur >= vDur - 0.2,
    'tieng khong cam': !cfr.aud.err && cfr.aud.peak > 0.001,
    'entry hinh co hop mo ta codec': (m.cfgBox[0] || []).length === 1,
    'entry tieng co hop mo ta codec': (m.cfgBox[1] || []).length === 1
  };

  // lột ADTS và tự dựng AudioSpecificConfig (nhánh AAC của Chrome, máy test không có AAC)
  const aac = await page.evaluate(() => {
    const adts = new Uint8Array([0xFF, 0xF1, 0x4C, 0x80, 0x02, 0x1F, 0xFC, 9, 9, 9, 9]);
    const raw = window.__aacRaw([{ data: adts, ts: 0 }])[0].data;
    const keep = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    return { stripped: Array.from(raw), giuNguyen: Array.from(window.__aacRaw([{ data: keep, ts: 0 }])[0].data),
             asc48: Array.from(window.__aacAsc(48000, 2)), asc44: Array.from(window.__aacAsc(44100, 2)) };
  });
  ok['lot dung 7 byte ADTS'] = JSON.stringify(aac.stripped) === JSON.stringify([9, 9, 9, 9]);
  ok['khung khong ADTS thi giu nguyen'] = aac.giuNguyen.length === 10;
  ok['ASC 48k stereo = 11 90'] = JSON.stringify(aac.asc48) === JSON.stringify([0x11, 0x90]);
  ok['ASC 44.1k stereo = 12 10'] = JSON.stringify(aac.asc44) === JSON.stringify([0x12, 0x10]);

  // nhánh AAC không chạy được trên máy test (thiếu codec), nên soi thẳng byte của sample entry
  const ent = Buffer.from(await page.evaluate(() =>
    Array.from(window.__mAudioEntry('mp4a.40.2', 2, 48000, new Uint8Array([0x11, 0x90])))));
  const es = ent.indexOf(Buffer.from('esds'));
  const d = es >= 0 ? ent.subarray(es + 8) : Buffer.alloc(0);   // bỏ 4 byte version/flags
  ok['entry AAC la mp4a'] = ent.toString('latin1', 4, 8) === 'mp4a';
  ok['AAC: co esds'] = es > 0;
  ok['AAC: so kenh & tan so dung'] = ent.readUInt16BE(24) === 2 && ent.readUInt16BE(26) === 16
    && ent.readUInt32BE(32) === 48000 * 65536;
  ok['AAC: ES_Descr 0x03 dung do dai'] = d[0] === 3 && d[1] === d.length - 2;
  ok['AAC: DecoderConfig 0x04 dung do dai'] = d[5] === 4 && d[6] === d.length - 7 - 3;
  ok['AAC: objType 0x40, streamType 0x15'] = d[7] === 0x40 && d[8] === 0x15;
  ok['AAC: DecSpecificInfo mang dung ASC'] = d[20] === 5 && d[21] === 2 && d[22] === 0x11 && d[23] === 0x90;
  ok['AAC: SLConfig 0x06'] = d[24] === 6 && d[25] === 1 && d[26] === 2;

  await page.evaluate(() => { delete window.VideoEncoder; });
  const vfr = await record(page, 2500);
  ok['bo WebCodecs thi lui MediaRecorder'] = /webm|mp4/.test(vfr.type) && /nhịp khung thay đổi/.test(vfr.log || '');

  await browser.close();
  for (const k of Object.keys(ok)) console.log((ok[k] ? 'DAT ' : 'HONG') + '  ' + k);
  console.log(`hinh ${vStts[0][0]} khung / ${vDur.toFixed(2)}s · tieng ${aDur.toFixed(2)}s ` +
    `(giai ma ${cfr.aud.err || cfr.aud.dur.toFixed(2) + 's, dinh ' + cfr.aud.peak}) · ` +
    `${m.stsd.map((k, i) => k + '[' + (m.cfgBox[i] || []).join(',') + ']').join(' + ')} · ${(cfr.size / 1048576).toFixed(1)} MB`);
  console.log('loi trang:', errors.length ? errors : 'khong co');
  process.exit(Object.values(ok).every(Boolean) && !errors.length ? 0 : 1);
})();
