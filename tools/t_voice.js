/* Bộ giọng mẫu dựng sẵn (assets/voice + tools/mk_voice.py).
   Kiểm: file sinh ra khớp với lời thoại trong index.html, hai ô đọc nối tiếp chia đúng
   từng đoạn SUZ_BUBBLE*RT giây, mở trang bằng http thì tự nạp, và ô nào người dùng đã
   tự nạp thì bộ mẫu KHÔNG đè lên. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const { build, playwright, ROOT, SRC } = require('./probe');

// một file wav bé xíu để thử đường "thảy file vào repo"
function fileWav() {
  const sr = 16000, n = sr / 8, d = Buffer.alloc(44 + n * 2);
  d.write('RIFF', 0); d.writeUInt32LE(36 + n * 2, 4); d.write('WAVE', 8);
  d.write('fmt ', 12); d.writeUInt32LE(16, 16); d.writeUInt16LE(1, 20); d.writeUInt16LE(1, 22);
  d.writeUInt32LE(sr, 24); d.writeUInt32LE(sr * 2, 28); d.writeUInt16LE(2, 32); d.writeUInt16LE(16, 34);
  d.write('data', 36); d.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) d.writeInt16LE(Math.round(Math.sin(i / 9) * 7000), 44 + i * 2);
  return d;
}

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

  /* ---------- thảy file thẳng vào repo: mọi ô tiếng, không riêng chín ô giọng ----------
     `tools/mk_manifest.py` quét thư mục rồi ghi danh sách; `voicePack()` nạp mọi ô có tên
     trong đó. Nhờ vậy đổi một tiếng không phải xuất lại cả gói mấy chục MB. */
  const dir2 = path.dirname(build());
  const vc = path.join(dir2, 'assets', 'voice');
  fs.cpSync(VOICE, vc, { recursive: true });
  fs.writeFileSync(path.join(vc, 'punch.wav'), fileWav());      // đúng tên ô -> phải vào ô punch
  fs.writeFileSync(path.join(vc, 'tieng la.wav'), fileWav());   // sai tên -> phải bị báo ra
  const ra = execFileSync('python3', [path.join(ROOT, 'tools', 'mk_manifest.py')],
    { encoding: 'utf8', env: Object.assign({}, process.env, { VOICE_DIR: vc }) });
  ok(/punch\s+<- punch\.wav/.test(ra), 'mk_manifest doan dung ten o cho file tha vao');
  ok(/KHONG DOAN RA TEN O.*tieng la\.wav/.test(ra), 'file sai ten thi bao ra chu khong im lang');
  const man2 = JSON.parse(fs.readFileSync(path.join(vc, 'manifest.json'), 'utf8')).slots;
  ok(!!man2.punch && !!man2.suz_decide, 'manifest giu ca o giong may lan o moi tha vao');
  ok(man2.suz_decide.lines === man.slots.suz_decide.lines, 'giu nguyen phan mo ta cua o cu');

  const sv2 = http.createServer((rq, rs) => {
    const p = path.join(dir2, decodeURIComponent(rq.url.split('?')[0]));
    if (!p.startsWith(dir2) || !fs.existsSync(p)) { rs.statusCode = 404; rs.end(); return; }
    rs.setHeader('content-type', mime(p)); rs.end(fs.readFileSync(p));
  });
  await new Promise(r => sv2.listen(0, '127.0.0.1', r));
  const b2 = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p2 = await b2.newPage({ viewport: { width: 700, height: 980 } });
  await p2.route('**://fonts.*/**', r => r.abort());
  const e2 = []; p2.on('pageerror', e => e2.push(e.message));
  await p2.goto(`http://127.0.0.1:${sv2.address().port}/probe.html`, { waitUntil: 'domcontentloaded' });
  await p2.waitForFunction(() => window.__SFXSRC && Object.keys(window.__SFXSRC).length >= 10,
    null, { timeout: 30000 }).catch(() => {});
  const co = await p2.evaluate(() => Object.keys(window.__SFXSRC).sort());
  ok(co.includes('punch'), `o tieng thuong tha vao repo cung nap duoc (${co.length} o)`);
  ok(co.length === 10, `nap du ca 9 o giong lan o moi (${co.length})`);
  ok(e2.length === 0, `khong co loi trang (${e2.slice(0, 2).join(' | ')})`);
  await b2.close(); sv2.close();
  console.log(loi.length ? `\nHONG ${loi.length} muc` : '\nDAT het');
  process.exit(loi.length ? 1 : 0);
})();
