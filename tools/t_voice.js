/* Bộ giọng mẫu dựng sẵn (assets/voice + tools/mk_voice.py).
   Kiểm: file sinh ra khớp với lời thoại trong index.html, hai ô đọc nối tiếp chia đúng
   từng đoạn SUZ_BUBBLE*RT giây, mở trang bằng http thì tự nạp, và ô nào người dùng đã
   tự nạp thì bộ mẫu KHÔNG đè lên. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { build, playwright, ROOT, SRC } = require('./probe');

let loi = [];
const ok = (dk, msg) => { console.log(`${dk ? ' dat  ' : ' HONG '} ${msg}`); if (!dk) loi.push(msg); };

const src = fs.readFileSync(SRC, 'utf8');
const mang = n => {
  const m = src.match(new RegExp('\\b' + n + '\\s*=\\s*\\[(.*?)\\];', 's'));
  return [...m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(x => x[1]);
};
const so = n => parseFloat(src.match(new RegExp('\\b' + n + '\\s*=\\s*([0-9.]+)'))[1]);
const RT = 1 / so('BASE_SPEED'), SEG = so('SUZ_BUBBLE') * RT;

/* ---------- phần tĩnh: file sinh ra có khớp lời thoại không ---------- */
const VOICE = path.join(ROOT, 'assets', 'voice');
const man = JSON.parse(fs.readFileSync(path.join(VOICE, 'manifest.json'), 'utf8'));
const wavSec = f => {
  const b = fs.readFileSync(path.join(VOICE, f));
  return (b.length - 44) / 2 / b.readUInt32LE(24);          // 16-bit mono
};
for (const nm of ['suz_think', 'suz_decide', 'suz_wrong', 'aya_stand', 'aya_join', 'aya_bye',
                  'ginyu_force', 'ginyu_change', 'dora_hi'])
  ok(!!man.slots[nm] && fs.existsSync(path.join(VOICE, nm + '.wav')), `co file cho o 🎙 ${nm}`);

ok(man.slots.suz_decide.lines === mang('SUZ_DECISIONS').length,
   `suz_decide du ${mang('SUZ_DECISIONS').length} cau (${man.slots.suz_decide.lines})`);
ok(man.slots.suz_wrong.lines === mang('SUZ_WRONG').length,
   `suz_wrong du ${mang('SUZ_WRONG').length} cau (${man.slots.suz_wrong.lines})`);
const dDec = wavSec('suz_decide.wav'), mongDec = SEG * mang('SUZ_DECISIONS').length;
ok(Math.abs(dDec - mongDec) < .05, `suz_decide chia dung tung doan ${SEG}s (${dDec.toFixed(1)}s / mong ${mongDec.toFixed(1)}s)`);
const dWr = wavSec('suz_wrong.wav'), mongWr = SEG * mang('SUZ_WRONG').length;
ok(Math.abs(dWr - mongWr) < .05, `suz_wrong chia dung tung doan (${dWr.toFixed(1)}s / mong ${mongWr.toFixed(1)}s)`);
/* mỗi câu đơn phải NGẮN HƠN khung hình đi kèm — luật "tiếng không sống lâu hơn hình" */
const khung = { suz_think: 2.4, aya_stand: so('SUZ_BUBBLE') * 1.4 * RT, aya_join: so('AYA_JOIN_LIFE') * RT,
                aya_bye: so('AYA_BYE_LIFE') * RT, ginyu_force: so('GN_FORCE_LIFE') * RT,
                ginyu_change: so('GN_CHANGE_LIFE') * RT, dora_hi: so('DORA_HI_LIFE') * RT };
for (const nm in khung) {
  const d = wavSec(nm + '.wav');
  ok(d <= khung[nm], `${nm} doc vua khung hinh (${d.toFixed(1)}s <= ${khung[nm].toFixed(1)}s)`);
}

/* ---------- phần chạy thật: mở bằng http thì tự nạp ---------- */
(async () => {
  const dir = path.dirname(build());
  fs.cpSync(VOICE, path.join(dir, 'assets', 'voice'), { recursive: true });
  const mime = f => f.endsWith('.wav') ? 'audio/wav' : f.endsWith('.json') ? 'application/json' : 'text/html';
  const sv = http.createServer((rq, rs) => {
    const p = path.join(dir, decodeURIComponent(rq.url.split('?')[0]));
    if (!p.startsWith(dir) || !fs.existsSync(p)) { rs.statusCode = 404; rs.end(); return; }
    rs.setHeader('content-type', mime(p)); rs.end(fs.readFileSync(p));
  });
  await new Promise(r => sv.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${sv.address().port}/probe.html`;

  const { chromium } = playwright();
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 700, height: 980 } });
  await page.route('**://fonts.*/**', r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__SFXSRC, null, { timeout: 20000 });
  await page.waitForFunction(() => Object.keys(window.__SFXSRC).length >= 9, null, { timeout: 30000 })
    .catch(() => {});
  const daNap = await page.evaluate(() => Object.keys(window.__SFXSRC).sort());
  ok(daNap.length === 9, `mo bang http thi tu nap ca 9 o giong (${daNap.length})`);
  ok(daNap.includes('suz_decide') && daNap.includes('ginyu_force'), 'co suz_decide va ginyu_force');
  const dai = await page.evaluate(() => window.__SFXBUF.suz_decide.duration);
  ok(Math.abs(dai - mongDec) < .2, `file suz_decide giai ma ra dung ${mongDec.toFixed(1)}s (${dai.toFixed(1)}s)`);
  ok(await page.evaluate(() => /♪ .* ✓/.test(document.querySelector('#sfxArea .slot span').textContent) ||
     !!window.__SFXSRC.suz_think), 'o giong bat dau ✓ tren bang tieng');

  /* ô người dùng tự nạp thì bộ mẫu không được đè lên */
  const giu = await page.evaluate(async () => {
    window.__SFXSRC.suz_decide = 'data:cua-nguoi-dung';
    const n = await window.__voicePack(true);
    return { con: window.__SFXSRC.suz_decide, n, note: document.getElementById('sfxStatus').textContent };
  });
  ok(giu.con === 'data:cua-nguoi-dung', 'file nguoi dung tu nap khong bi de len');
  ok(/bỏ qua/.test(giu.note), `dong bao co noi da bo qua o do (${giu.note})`);

  ok(errors.length === 0, `khong co loi trang (${errors.slice(0, 2).join(' | ')})`);
  await browser.close(); sv.close();
  console.log(loi.length ? `\nHONG ${loi.length} muc` : '\nDAT het');
  process.exit(loi.length ? 1 : 0);
})();
