/* Đổi tên game, hai ngôn ngữ Anh–Việt, hồ sơ nhân vật và nhạc nền tự chỉnh.
   Kiểm: tên mới có mặt ở cả hai trang, đổi ngôn ngữ là mọi chữ người chơi thấy đổi theo
   và được nhớ lại, hồ sơ tám nhân vật đủ song ngữ và vẽ ra thẻ thật, nhạc nền mặc định
   TẮT và chạy theo ô nhạc bạn tự nạp. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { openGame, build, buildPlay, playwright, ROOT } = require('./probe');

let loi = [];
const ok = (dk, msg) => { console.log(`${dk ? ' dat  ' : ' HONG '} ${msg}`); if (!dk) loi.push(msg); };

function fileNhac() {
  const sr = 8000, n = sr / 4, d = Buffer.alloc(44 + n * 2);
  d.write('RIFF', 0); d.writeUInt32LE(36 + n * 2, 4); d.write('WAVE', 8);
  d.write('fmt ', 12); d.writeUInt32LE(16, 16); d.writeUInt16LE(1, 20); d.writeUInt16LE(1, 22);
  d.writeUInt32LE(sr, 24); d.writeUInt32LE(sr * 2, 28); d.writeUInt16LE(2, 32); d.writeUInt16LE(16, 34);
  d.write('data', 36); d.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) d.writeInt16LE(Math.round(Math.sin(i / 20) * 6000), 44 + i * 2);
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bgm-')), 'theme.wav');
  fs.writeFileSync(p, d); return p;
}

(async () => {
  /* ---------- tên game ---------- */
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const play = fs.readFileSync(path.join(ROOT, 'play.html'), 'utf8');
  ok(/<title>Multiverse Battler<\/title>/.test(idx), 'xuong doi ten thanh Multiverse Battler');
  ok(idx.includes('MULTIVERSE <span>BATTLER</span>'), 'tieu de trang xuong da doi ten');
  ok(play.includes('MULTIVERSE<b>BATTLER</b>'), 'man tieu de trang choi da doi ten');
  ok(!/ĐẤU TRƯỜNG|CHIBA/.test(idx), 'khong con ten cu o dau trong index.html');

  const { browser, page, errors } = await openGame('kono', 'chichi', { play: false });
  const doc = (fn, a) => page.evaluate(fn, a);

  /* ---------- hồ sơ nhân vật: đủ song ngữ cho cả tám người ---------- */
  const dex = await doc(() => {
    const out = { thieu: [], it: [] };
    for (const k of Object.keys(window.__CHARS)) {
      const d = window.__DEX[k];
      if (!d) { out.thieu.push(k); continue; }
      const st = d.st || {};
      const duSt = ['pow', 'spd', 'rng', 'def', 'tech'].every(x => st[x] >= 1 && st[x] <= 5);
      const duNgu = d.role && d.role.vi && d.role.en && d.bio && d.bio.vi && d.bio.en &&
        (d.skills || []).every(s => s.name && s.vi && s.en);
      if (!duSt || !duNgu || (d.skills || []).length < 4) out.it.push(k);
    }
    out.chars = Object.keys(window.__CHARS).length;
    return out;
  });
  ok(dex.thieu.length === 0, `ca ${dex.chars} nhan vat deu co ho so (thieu: ${dex.thieu.join(',') || 'khong'})`);
  ok(dex.it.length === 0, `ho so nao cung du 5 chi so, 2 ngon ngu va >=4 chieu (${dex.it.join(',') || 'du'})`);

  // năm thanh chỉ số và số liệu thô giờ nằm ở lối xem CHI TIẾT, nên bật nó lên rồi mới đo
  const the = await doc(() => {
    window.__dexView('full');
    const box = document.getElementById('detailA');
    return { pips: box.querySelectorAll('.pips b').length, on: box.querySelectorAll('.pips b.on').length,
             sk: box.querySelectorAll('.sk').length, chiTiet: !!box.querySelector('.dexRaw .cSkills'),
             hp: (box.querySelector('.dexHpIn') || {}).value };
  });
  ok(the.pips === 25, `nam thanh chi so ve du 25 o (${the.pips})`);
  ok(the.on > 0 && the.on < 25, `thanh chi so co day co vong (${the.on}/25)`);
  ok(the.sk >= 4, `the chieu hien ra day du (${the.sk} chieu)`);
  ok(the.chiTiet, 'van con phan "xem chi tiet so lieu" doc mang skills cu');
  ok(the.hp === '800', `o mau chinh duoc, mac dinh dung chuan 800 (${the.hp})`);
  await doc(() => window.__dexView('simple'));

  /* ---------- đổi ngôn ngữ ----------
     openGame() đã bấm "Vào trận" nên màn chọn đang đóng; mở lại mới bấm được nút trong đó. */
  ok(await doc(() => window.__LANG()) === 'vi', 'mac dinh la tieng Viet');
  await page.click('#pick');
  await page.waitForTimeout(200);
  const vi = await doc(() => ({ go: document.getElementById('cselGo').textContent,
                                sk: document.querySelector('#detailA .sk p').textContent,
                                stage: document.querySelector('#stageList .sTile i').textContent }));
  await page.click('#charSelect [data-lang-toggle]');
  await page.waitForTimeout(250);
  const en = await doc(() => ({ lang: document.documentElement.lang,
                                go: document.getElementById('cselGo').textContent,
                                sk: document.querySelector('#detailA .sk p').textContent,
                                stage: document.querySelector('#stageList .sTile i').textContent,
                                head: document.querySelector('#charSelect h2').textContent }));
  ok(en.lang === 'en', 'bam nut la doi sang tieng Anh');
  ok(en.go !== vi.go && /Fight/i.test(en.go), `nut vao tran doi chu (${vi.go} -> ${en.go})`);
  ok(en.sk !== vi.sk && !/[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(en.sk),
     `mo ta chieu doi sang tieng Anh ("${en.sk.slice(0, 46)}…")`);
  ok(en.stage !== vi.stage, `phu de man doi theo (${vi.stage} -> ${en.stage})`);
  ok(/SELECT/i.test(en.head), `tieu de man chon doi theo (${en.head})`);

  const nho = await doc(async () => await window.__Store.get('cfg_lang'));
  ok(nho === 'en', `ngon ngu duoc nho lai trong kho (${nho})`);
  await page.click('#charSelect [data-lang-toggle]');
  await page.waitForTimeout(200);
  ok(await doc(() => window.__LANG()) === 'vi', 'bam lan nua thi ve tieng Viet');

  /* ---------- nhạc nền ----------
     Đóng màn chọn lại: nó phủ kín trang, không bấm được vào bảng ô nhạc phía dưới. */
  await page.click('#cselCancel');
  await page.waitForTimeout(200);
  const m0 = await doc(() => ({ on: window.__MUSIC.on, synth: window.__MUSIC.synth,
                                slots: window.__BGM_SLOTS.length,
                                o: document.getElementById('musicOn').checked }));
  ok(m0.on === false && m0.o === false, 'nhac nen MAC DINH TAT');
  ok(m0.synth === false, 'nhac tu tao cung mac dinh tat');
  ok(m0.slots === 8, `co du 8 o nhac: menu + chung + sau man (${m0.slots})`);

  const oNhac = page.locator('#bgmArea .slotwrap').filter({ hasText: 'Màn Vũ trụ' }).first();
  await oNhac.locator('input[type=file]').setInputFiles(fileNhac());
  await page.waitForFunction(() => !!window.__BGM.src.bgm_space, null, { timeout: 20000 });
  const m1 = await doc(async () => ({
    co: !!window.__BGM.src.bgm_space,
    kho: !!(await window.__Store.get('bgm_space')),
    chonKhiDangOMan: (window.__setStage('space'), window.__bgmPick()),
    chonManKhac: (window.__setStage('dojo'), window.__bgmPick())
  }));
  ok(m1.co && m1.kho, 'nap nhac vao o thi luu duoc vao kho');
  ok(m1.chonKhiDangOMan === 'bgm_space', `dang danh man Vu tru thi chon dung bai cua man do (${m1.chonKhiDangOMan})`);
  ok(m1.chonManKhac === null, `man chua co nhac va chua co bai chung thi im lang (${m1.chonManKhac})`);

  const goi = await doc(() => { const p = window.__packBuild(); return Object.keys(p.bgm || {}); });
  ok(goi.indexOf('bgm_space') >= 0, `goi phat hanh mang theo ca nhac (${goi.join(',')})`);

  ok(errors.length === 0, `khong co loi trang (${errors.slice(0, 2).join(' | ')})`);
  await browser.close();

  /* ---------- trang chơi cũng đổi được ngôn ngữ ---------- */
  const { chromium } = playwright();
  const b2 = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p2 = await b2.newPage({ viewport: { width: 820, height: 980 } });
  await p2.route('**://fonts.*/**', r => r.abort());
  const e2 = []; p2.on('pageerror', e => e2.push(e.message));
  await p2.goto('file://' + buildPlay(), { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(700);
  ok(await p2.locator('#arcTitle [data-lang-toggle]').isVisible(), 'man tieu de co nut doi ngon ngu');
  await p2.click('#arcTitle [data-lang-toggle]');
  await p2.waitForTimeout(200);
  ok(await p2.evaluate(() => document.documentElement.lang) === 'en', 'trang choi doi sang tieng Anh');
  ok(await p2.locator('#musicOn').count() === 1, 'trang choi van co nut bat nhac');
  ok(await p2.evaluate(() => document.querySelectorAll('#bgmArea').length) === 0,
     'nhung KHONG co bang o nhac (do la do nghe cua xuong)');
  ok(e2.length === 0, `trang choi khong co loi (${e2.slice(0, 2).join(' | ')})`);
  await b2.close();

  console.log(loi.length ? `\nHONG ${loi.length} muc` : '\nDAT het');
  process.exit(loi.length ? 1 : 0);
})();
