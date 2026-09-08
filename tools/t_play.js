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
  ok(await page.evaluate(() => document.getElementById('charSelect').dataset.page) === 'p1',
     'dung o trang chon NGUOI CHOI 1 truoc');
  ok(!await page.locator('#stageList .sTile').first().isVisible(), 'trang nhan vat thi chua hien luoi man');

  /* Chọn P1 xong mới tới P2 — người dùng bác lối để hai cột cạnh nhau.
     Cột của bên kia phải ĐANG ẨN, không thì vẫn là màn hai cột như cũ. */
  ok(!await page.locator('#colB').isVisible(), 'buoc P1 thi con cua P2 dang an');
  ok(await page.evaluate(() => document.querySelectorAll('.pickChip').length) === 0,
     'buoc P1 chua co dai "da chon"');
  await page.click('#listA .cTile[data-key="ginyu"]');
  await page.click('#cselGo');
  await page.waitForTimeout(250);
  const buoc2 = await page.evaluate(() => ({
    page: document.getElementById('charSelect').dataset.page,
    h2: document.querySelector('#charSelect h2').textContent,
    chips: [...document.querySelectorAll('.pickChip b')].map(x => x.childNodes[0].textContent),
    lui: !document.getElementById('cselBack').classList.contains('off')
  }));
  ok(buoc2.page === 'p2', `bam tiep thi sang buoc chon NGUOI CHOI 2 (${buoc2.page})`);
  ok(/2/.test(buoc2.h2), `tieu de doi theo buoc (${buoc2.h2})`);
  ok(buoc2.chips.length === 2, `hien dai "da chon" de van thay P1 (${buoc2.chips.join(' vs ')})`);
  ok(buoc2.lui, 'co nut quay lai o buoc P2');
  ok(!await page.locator('#colA').isVisible(), 'buoc P2 thi con cua P1 dang an');

  await page.click('#listB .cTile[data-key="dora"]');
  await page.click('#cselGo');
  await page.waitForTimeout(250);
  const trang2 = await page.evaluate(() => ({
    page: document.getElementById('charSelect').dataset.page,
    chay: window.__running(), nhan: document.getElementById('cselGo').textContent
  }));
  ok(trang2.page === 'stage', `chon xong P2 thi sang trang CHON MAN (${trang2.page})`);
  ok(!trang2.chay, 'sang trang chon man thi tran VAN CHUA bat dau');
  ok(/FIGHT/i.test(trang2.nhan), `nut doi chu thanh vao tran (${trang2.nhan})`);
  ok(await page.locator('#stageList .sTile[data-stage="space"]').isVisible(), 'luoi man hien ra');

  await page.click('#cselBack');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.getElementById('charSelect').dataset.page) === 'p2',
     'tu trang chon man bam Quay lai thi ve dung buoc P2');
  await page.click('#cselGo');
  await page.waitForTimeout(200);

  await page.click('#stageList .sTile[data-stage="space"]');
  await page.click('#cselGo');
  await page.waitForTimeout(900);
  const vao = await page.evaluate(() => ({ stage: window.__STAGE(), chay: window.__running(), t: window.__G().t,
    cap: window.__G().fighters.filter(f => !f.summon).map(f => f.key).join(' vs ') }));
  ok(vao.stage === 'space', `vao tran dung man vua chon (${vao.stage})`);
  ok(vao.cap === 'ginyu vs dora', `vao tran dung cap vua chon tung buoc (${vao.cap})`);
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

  /* ---------- 3b. ĐÁNH ĐỘI cũng đi từng đội một, đúng quy trình 1v1 ----------
     Người dùng: "theo đội cũng vậy — chọn đội 1 trước đội 2 sau, quy trình như 1v1 chứ". */
  await page.click('#pick');
  await page.waitForTimeout(250);
  await page.click('#mTabTeam');
  await page.waitForTimeout(300);
  const d1 = await page.evaluate(() => ({
    page: document.getElementById('charSelect').dataset.page,
    step: document.getElementById('charSelect').dataset.step,
    h2: document.querySelector('#charSelect h2').textContent,
    khung: [...document.querySelectorAll('#multiPane .cselCol')].filter(b => !b.classList.contains('off')).length,
    chips: document.querySelectorAll('.pickChip').length,
    go: document.getElementById('cselGo').textContent
  }));
  ok(d1.page === 't0', `danh doi bat dau o buoc DOI 1 (${d1.page})`);
  ok(d1.step === 'pick0', `buoc dau mang data-step pick0 (${d1.step})`);
  ok(/TEAM 1/i.test(d1.h2), `tieu de ghi dang chon doi 1 (${d1.h2})`);
  ok(d1.khung === 1, `chi hien DUNG MOT khung doi hinh (${d1.khung})`);
  ok(d1.chips === 0, 'buoc doi 1 chua co dai "da chon"');
  ok(/Team 2/i.test(d1.go), `nut ghi "Tiep - Doi 2" (${d1.go})`);
  ok(await page.locator('#teamNum').isVisible(), 'buoc doi 1 co hang chon SO DOI');

  await page.click('#cselGo');
  await page.waitForTimeout(300);
  const d2 = await page.evaluate(() => ({
    page: document.getElementById('charSelect').dataset.page,
    h2: document.querySelector('#charSelect h2').textContent,
    khung: [...document.querySelectorAll('#multiPane .cselCol')].filter(b => !b.classList.contains('off')).length,
    nhan: [...document.querySelectorAll('.pickChip i')].map(x => x.textContent).join('|'),
    go: document.getElementById('cselGo').textContent
  }));
  ok(d2.page === 't1', `bam Tiep thi sang buoc DOI 2 (${d2.page})`);
  ok(/TEAM 2/i.test(d2.h2), `tieu de doi theo buoc (${d2.h2})`);
  ok(d2.khung === 1, `buoc doi 2 van chi mot khung (${d2.khung})`);
  ok(/Team 1/i.test(d2.nhan) && /Team 2/i.test(d2.nhan), `dai "da chon" giu doi 1 lai (${d2.nhan})`);
  ok(/Stage/i.test(d2.go), `doi cuoi thi nut ghi "Tiep - Chon man" chu khong phai doi 3 (${d2.go})`);
  ok(!await page.locator('#teamNum').isVisible(), 'tu buoc thu hai tro di giau hang chon so doi');

  /* đổi sang 3 đội thì danh sách bước dài thêm một bước */
  await page.click('#cselBack');
  await page.waitForTimeout(200);
  await page.click('#teamNum button:nth-of-type(2)');   // 2 3 4 -> chọn 3
  await page.waitForTimeout(300);
  const ba = await page.evaluate(() => ({
    doi: window.__G && [...document.querySelectorAll('#teamNum button.on')].map(b => b.textContent).join(''),
    page: document.getElementById('charSelect').dataset.page,
    go: document.getElementById('cselGo').textContent
  }));
  ok(ba.doi === '3', `bam so 3 thi thanh ba doi (${ba.doi})`);
  ok(ba.page === 't0' && /Team 2/i.test(ba.go), `van dung o buoc doi 1 (${ba.page} / ${ba.go})`);
  await page.click('#teamNum button:nth-of-type(1)');   // về lại 2 đội
  await page.waitForTimeout(250);

  await page.click('#cselGo'); await page.waitForTimeout(200);
  await page.click('#cselGo'); await page.waitForTimeout(250);
  ok(await page.evaluate(() => document.getElementById('charSelect').dataset.page) === 'stage',
     'chon xong doi cuoi thi sang trang CHON MAN');
  await page.click('#cselGo');
  await page.waitForTimeout(700);
  const tran = await page.evaluate(() => {
    const g = window.__G(), m = g.fighters.filter(f => !f.summon);
    return { mode: g.mode, nguoi: m.length, phe: [...new Set(m.map(f => f.team))].length };
  });
  ok(tran.mode === 'team' && tran.phe === 2, `vao tran dung che do doi, hai phe (${tran.mode}/${tran.phe})`);
  ok(tran.nguoi >= 2, `co du nguoi tren san (${tran.nguoi})`);

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

  /* ---------- 5. bản dựng GIỐNG GITHUB PAGES: xưởng nằm trong /studio/ ----------
     Đây là chỗ đã hỏng thật: `assets` nằm ở gốc site, mà trang xưởng ở trong thư mục con
     nên đường dẫn tương đối thành /studio/assets/… và ăn 404 IM LẶNG — người dùng dán
     ảnh, xuất gói, đẩy lên repo mà mở trang xưởng vẫn thấy model vector. */
  const site = fs.mkdtempSync(path.join(os.tmpdir(), 'site-'));
  fs.mkdirSync(path.join(site, 'studio'), { recursive: true });
  fs.mkdirSync(path.join(site, 'assets', 'pack'), { recursive: true });
  fs.copyFileSync(buildPlay(), path.join(site, 'index.html'));       // trang chơi ở GỐC
  fs.copyFileSync(build(), path.join(site, 'studio', 'index.html')); // xưởng trong THƯ MỤC CON
  fs.writeFileSync(path.join(site, 'assets', 'pack', 'pack.json'), JSON.stringify({
    v: 1, at: '2026-09-08', spr: { kono: { idle: [PNG] } }, sfx: { punch: wavUrl() }
  }));
  const sv2 = http.createServer((rq, rs) => {
    const p = path.join(site, decodeURIComponent(rq.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!p.startsWith(site) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rs.statusCode = 404; rs.end(); return; }
    rs.setHeader('content-type', mime(p)); rs.end(fs.readFileSync(p));
  });
  await new Promise(r => sv2.listen(0, '127.0.0.1', r));
  const goc = `http://127.0.0.1:${sv2.address().port}`;

  const b3 = await chromium.launch();
  for (const [ten, u, cho] of [['trang choi', goc + '/', 3], ['xuong', goc + '/studio/', 3]]) {
    const p3 = await b3.newPage({ viewport: { width: 820, height: 980 } });
    await p3.route('**://fonts.*/**', r => r.abort());
    const e3 = []; p3.on('pageerror', e => e3.push(e.message));
    await p3.goto(u, { waitUntil: 'domcontentloaded' });
    let n = 0;
    for (let i = 0; i < cho * 4; i++) {
      n = await p3.evaluate(() => ((window.__SPR.kono || {}).idle || []).length);
      if (n) break;
      await p3.waitForTimeout(250);
    }
    ok(n === 1, `${ten}: goi phat hanh o goc site van nap duoc (${n} anh)`);
    ok(e3.length === 0, `${ten}: khong co loi trang (${e3.slice(0, 2).join(' | ')})`);
    await p3.close();
  }
  await b3.close(); sv2.close();

  console.log(loi.length ? `\nHONG ${loi.length} muc` : '\nDAT het');
  process.exit(loi.length ? 1 : 0);
})();
