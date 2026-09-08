/* Hai trang, một engine: `index.html` là XƯỞNG, `play.html` là TRANG CHƠI công khai.
   Kiểm: play.html đúng bằng bản dựng lại từ index.html, đã cắt sạch bảng xưởng, luồng
   arcade chạy đủ ba bước (tiêu đề → nhân vật → màn → đánh), hết trận thì hiện dải nút,
   gói phát hành assets/pack/pack.json được nạp, và xưởng vẫn vào trận bằng MỘT cú bấm. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const { build, buildPlay, playwright, ROOT } = require('./probe');

let loi = [];
const ok = (dk, msg) => { console.log(`${dk ? ' dat  ' : ' HONG '} ${msg}`); if (!dk) loi.push(msg); };

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAF0lEQVR42mP8z8BQz8DAwMDEgAQGoQAAaEcCAy0i0LcAAAAASUVORK5CYII=';
function wavUrl() {
  const sr = 8000, n = sr / 10, d = Buffer.alloc(44 + n * 2);
  d.write('RIFF', 0); d.writeUInt32LE(36 + n * 2, 4); d.write('WAVE', 8);
  d.write('fmt ', 12); d.writeUInt32LE(16, 16); d.writeUInt16LE(1, 20); d.writeUInt16LE(1, 22);
  d.writeUInt32LE(sr, 24); d.writeUInt32LE(sr * 2, 28); d.writeUInt16LE(2, 32); d.writeUInt16LE(16, 34);
  d.write('data', 36); d.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) d.writeInt16LE(Math.round(Math.sin(i / 6) * 8000), 44 + i * 2);
  return 'data:audio/wav;base64,' + d.toString('base64');
}

(async () => {
  /* ---------- 1. play.html trong repo có đúng là bản dựng từ index.html không ---------- */
  const truoc = fs.existsSync(path.join(ROOT, 'play.html'))
    ? fs.readFileSync(path.join(ROOT, 'play.html'), 'utf8') : '';
  execFileSync('python3', [path.join(ROOT, 'tools', 'mk_play.py')], { stdio: 'pipe' });
  const sau = fs.readFileSync(path.join(ROOT, 'play.html'), 'utf8');
  ok(truoc === sau, 'play.html trong repo dung bang ban dung lai tu index.html (dung sua tay)');

  /* ---------- 2. đã cắt sạch bảng xưởng, engine thì còn nguyên ---------- */
  for (const id of ['slotArea', 'sfxArea', 'testGoku', 'hpK', 'colK', 'rec', 'packExport'])
    ok(!sau.includes(`id="${id}"`), `trang choi khong con o xuong id="${id}"`);
  for (const id of ['arena', 'charSelect', 'stageList', 'arcTitle', 'arcOver', 'play'])
    ok(sau.includes(`id="${id}"`), `trang choi van con id="${id}"`);
  ok(sau.includes('window.ARCADE=1'), 'trang choi bat co ARCADE');

  /* ---------- 3. luồng arcade chạy thật, kèm gói phát hành ---------- */
  const dir = path.dirname(buildPlay());
  fs.mkdirSync(path.join(dir, 'assets', 'pack'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'assets', 'pack', 'pack.json'), JSON.stringify({
    v: 1, at: '2026-09-08', spr: { kono: { idle: [PNG] } }, sfx: { punch: wavUrl() }
  }));
  const mime = f => f.endsWith('.json') ? 'application/json' : f.endsWith('.wav') ? 'audio/wav' : 'text/html';
  const sv = http.createServer((rq, rs) => {
    const p = path.join(dir, decodeURIComponent(rq.url.split('?')[0]));
    if (!p.startsWith(dir) || !fs.existsSync(p)) { rs.statusCode = 404; rs.end(); return; }
    rs.setHeader('content-type', mime(p)); rs.end(fs.readFileSync(p));
  });
  await new Promise(r => sv.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${sv.address().port}/play.html`;

  const { chromium } = playwright();
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 820, height: 980 } });
  await page.route('**://fonts.*/**', r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);

  ok(await page.evaluate(() => window.__ARCADE()), 'trang choi chay o che do arcade');
  ok(await page.locator('#arcTitle').isVisible(), 'vao trang la thay man tieu de PRESS START');
  ok(!await page.locator('#charSelect').isVisible(), 'chua bam start thi chua mo man chon');

  await page.click('#arcStart');
  await page.waitForTimeout(300);
  ok(await page.locator('#charSelect').isVisible(), 'bam START thi mo man chon nhan vat');
  ok(await page.evaluate(() => document.getElementById('charSelect').dataset.page) === 'chars',
     'dung o trang chon NHAN VAT truoc');
  ok(!await page.locator('#stageList .sTile').first().isVisible(), 'trang nhan vat thi chua hien luoi man');

  await page.click('#cselGo');
  await page.waitForTimeout(250);
  const trang2 = await page.evaluate(() => ({
    page: document.getElementById('charSelect').dataset.page,
    chay: window.__running(), nhan: document.getElementById('cselGo').textContent
  }));
  ok(trang2.page === 'stage', `bam tiep thi sang trang CHON MAN (${trang2.page})`);
  ok(!trang2.chay, 'sang trang chon man thi tran VAN CHUA bat dau');
  ok(/VÀO TRẬN/.test(trang2.nhan), `nut doi chu thanh vao tran (${trang2.nhan})`);
  ok(await page.locator('#stageList .sTile[data-stage="space"]').isVisible(), 'luoi man hien ra');

  await page.click('#stageList .sTile[data-stage="space"]');
  await page.click('#cselGo');
  await page.waitForTimeout(900);
  const vao = await page.evaluate(() => ({ stage: window.__STAGE(), chay: window.__running(), t: window.__G().t }));
  ok(vao.stage === 'space', `vao tran dung man vua chon (${vao.stage})`);
  ok(vao.chay, 'tran tu chay ngay, khong bat nguoi choi bam them nut');
  await page.waitForTimeout(600);
  const t2 = await page.evaluate(() => window.__G().t);
  ok(t2 > vao.t, `dong ho tran chay that (${vao.t.toFixed(2)} -> ${t2.toFixed(2)})`);

  /* gói phát hành: ảnh và tiếng trong pack.json phải vào đúng ô.
     Chờ hẳn bằng waitForFunction — nạp gói còn phải giải mã ảnh và âm thanh. */
  await page.waitForFunction(() => (window.__SPR.kono.idle || []).length > 0, null, { timeout: 25000 })
    .catch(() => {});
  const pack = await page.evaluate(() => ({
    anh: (window.__SPR.kono.idle || []).length, tieng: !!window.__SFXSRC.punch
  }));
  ok(pack.anh === 1, `anh trong goi phat hanh vao dung o (${pack.anh})`);
  ok(pack.tieng, 'tieng trong goi phat hanh cung duoc nap');

  /* hết trận thì hiện dải nút chơi lại */
  await page.evaluate(() => { const g = window.__G(); window.__finish(g.fighters[0]); });
  await page.waitForTimeout(600);
  ok(await page.locator('#arcOver').isVisible(), 'het tran thi hien dai nut Danh lai / Doi nhan vat');
  await page.click('#arcAgain');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => window.__running() && !window.__G().over), 'bam Danh lai thi vao tran moi');

  ok(errors.length === 0, `trang choi khong co loi (${errors.slice(0, 2).join(' | ')})`);
  await browser.close(); sv.close();

  /* ---------- 4. xưởng KHÔNG dính vỏ arcade: một cú bấm là vào trận ---------- */
  const b2 = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p2 = await b2.newPage({ viewport: { width: 820, height: 980 } });
  await p2.route('**://fonts.*/**', r => r.abort());
  const e2 = []; p2.on('pageerror', e => e2.push(e.message));
  await p2.goto('file://' + build(), { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(700);
  ok(!await p2.evaluate(() => window.__ARCADE()), 'xuong khong bat che do arcade');
  ok(!await p2.locator('#arcTitle').isVisible(), 'xuong khong co man tieu de');
  ok(await p2.locator('#charSelect').isVisible(), 'xuong mo thang man chon nhan vat');
  await p2.click('#cselGo');
  await p2.waitForTimeout(300);
  ok(!await p2.locator('#charSelect').isVisible(), 'xuong: mot cu bam #cselGo la vao tran (test cu van chay)');
  ok(e2.length === 0, `xuong khong co loi (${e2.slice(0, 2).join(' | ')})`);
  await b2.close();

  console.log(loi.length ? `\nHONG ${loi.length} muc` : '\nDAT het');
  process.exit(loi.length ? 1 : 0);
})();
