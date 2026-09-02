/* Xoá riêng MỘT ô đã dán nhầm — cả bảng ảnh lẫn bảng tiếng.
   Kiểm: nút ✕ chỉ hiện khi ô có nội dung, xoá đúng một ô (ô bên cạnh còn nguyên),
   kho lưu cũng mất khoá tương ứng, và nút Hoàn tác lấy lại được. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { openGame } = require('./probe');

let loi = [];
const ok = (dk, msg) => { console.log(`${dk ? ' dat  ' : ' HONG '} ${msg}`); if (!dk) loi.push(msg); };

/* một PNG 2x2 và một WAV 0.1s im lặng — đủ để trình duyệt giải mã thật */
function fileAnh() {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'slot-')), 'a.png');
  fs.writeFileSync(p, Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC',
    'base64'));
  return p;
}
function fileTieng() {
  const sr = 8000, n = sr / 10, d = Buffer.alloc(44 + n * 2);
  d.write('RIFF', 0); d.writeUInt32LE(36 + n * 2, 4); d.write('WAVE', 8);
  d.write('fmt ', 12); d.writeUInt32LE(16, 16); d.writeUInt16LE(1, 20); d.writeUInt16LE(1, 22);
  d.writeUInt32LE(sr, 24); d.writeUInt32LE(sr * 2, 28); d.writeUInt16LE(2, 32); d.writeUInt16LE(16, 34);
  d.write('data', 36); d.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) d.writeInt16LE(Math.round(Math.sin(i / 6) * 8000), 44 + i * 2);
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'slot-')), 't.wav');
  fs.writeFileSync(p, d);
  return p;
}

(async () => {
  const { browser, page, errors } = await openGame('kono', 'chichi', { play: false });
  const doc = (fn, arg) => page.evaluate(fn, arg);

  /* ---------------- bảng ảnh ---------------- */
  const oA = '#slotArea .slotwrap:has(input[type=file])';
  const wrapA = page.locator(oA).first();          // ô đầu tiên của Konohamaru
  const wrapB = page.locator(oA).nth(1);
  ok(!await wrapA.locator('.slotdel').isVisible(), 'o anh trong thi chua hien nut ✕');

  await wrapA.locator('input[type=file]').setInputFiles(fileAnh());
  await wrapB.locator('input[type=file]').setInputFiles(fileAnh());
  await page.waitForFunction(() => {
    const S = window.__SPR, k = Object.keys(S.kono || {});
    return k.length >= 2;
  }, null, { timeout: 20000 });
  const daNap = await doc(() => Object.keys(window.__SPR.kono));
  ok(daNap.length === 2, `nap duoc anh vao 2 o (${daNap.join(', ')})`);
  ok(await wrapA.locator('.slotdel').isVisible(), 'o co anh thi nut ✕ hien ra');

  await wrapA.locator('.slotdel').click();
  await page.waitForFunction(t => !window.__SPR.kono[t], daNap[0], { timeout: 20000 });
  const sauXoa = await doc(async ([a, b]) => {
    const kho = await window.__Store.get('spr_kono');
    const d = kho ? JSON.parse(kho) : {};
    return { conA: !!window.__SPR.kono[a], conB: !!window.__SPR.kono[b],
             khoA: !!(d[a] && d[a].length), khoB: !!(d[b] && d[b].length),
             lop: window.__SLOT.kono[a].el.className, chu: window.__SLOT.kono[a].cap.textContent,
             nhan: window.__SLOT.kono[a].label };
  }, daNap);
  ok(!sauXoa.conA && sauXoa.conB, 'xoa dung mot o, o ben canh con nguyen');
  ok(!sauXoa.khoA && sauXoa.khoB, 'kho luu cung chi mat anh cua o vua xoa');
  ok(!/set/.test(sauXoa.lop) && sauXoa.chu === sauXoa.nhan, `o ve lai trang thai trong ("${sauXoa.chu}")`);
  ok(!await wrapA.locator('.slotdel').isVisible(), 'o trong roi thi nut ✕ an di');

  await page.click('#sprUndo');
  await page.waitForFunction(t => !!window.__SPR.kono[t], daNap[0], { timeout: 20000 });
  const sauHoan = await doc(async a => {
    const kho = await window.__Store.get('spr_kono');
    const d = kho ? JSON.parse(kho) : {};
    return { con: !!window.__SPR.kono[a], kho: !!(d[a] && d[a].length),
             an: document.getElementById('sprUndo').style.display === 'none' };
  }, daNap[0]);
  ok(sauHoan.con && sauHoan.kho, 'hoan tac lay lai duoc anh, ca trong kho luu');
  ok(sauHoan.an, 'hoan tac xong thi nut Hoan tac an di');

  /* ---------------- bảng tiếng ---------------- */
  // khu nạp tiếng mặc định gập lại; không mở ra thì mọi thứ bên trong đều "không nhìn thấy"
  await doc(() => { document.getElementById('sfxArea').closest('details').open = true; });
  const oT = '#sfxArea .slotwrap';
  const tA = page.locator(oT).first(), tB = page.locator(oT).nth(1);
  const tenA = await doc(() => window.__SFXE[0][0]), tenB = await doc(() => window.__SFXE[1][0]);
  ok(!await tA.locator('.slotdel').isVisible(), 'o tieng trong thi chua hien nut ✕');

  await tA.locator('input[type=file]').setInputFiles(fileTieng());
  await tB.locator('input[type=file]').setInputFiles(fileTieng());
  await page.waitForFunction(([a, b]) => window.__SFXSRC[a] && window.__SFXSRC[b], [tenA, tenB], { timeout: 20000 });
  ok(await tA.locator('.slotdel').isVisible(), 'o co tieng thi nut ✕ hien ra');
  const dauTich = await doc(a => window.__SFXBUF[a] ? 1 : 0, tenA);
  ok(dauTich === 1, 'file tieng giai ma duoc that');

  await tA.locator('.slotdel').click();
  await page.waitForFunction(a => !window.__SFXSRC[a], tenA, { timeout: 20000 });
  const tSau = await doc(async ([a, b]) => {
    return { conA: !!window.__SFXSRC[a], conB: !!window.__SFXSRC[b],
             bufA: !!window.__SFXBUF[a], bufB: !!window.__SFXBUF[b],
             khoA: !!(await window.__Store.get('sfx_' + a)), khoB: !!(await window.__Store.get('sfx_' + b)),
             hienUndo: document.getElementById('sfxUndo').style.display !== 'none' };
  }, [tenA, tenB]);
  ok(!tSau.conA && tSau.conB, 'xoa dung mot o tieng, o ben canh con nguyen');
  ok(!tSau.bufA && tSau.bufB, 'o vua xoa khong con buffer -> quay ve tieng tu tao');
  ok(!tSau.khoA && tSau.khoB, 'kho luu cung chi mat file cua o vua xoa');
  ok(!await tA.locator('.slotdel').isVisible(), 'o tieng trong roi thi nut ✕ an di');
  ok(tSau.hienUndo, 'nut Hoan tac xoa hien ra');

  await page.click('#sfxUndo');
  await page.waitForFunction(a => !!window.__SFXSRC[a], tenA, { timeout: 20000 });
  const tHoan = await doc(async a => ({ con: !!window.__SFXSRC[a], buf: !!window.__SFXBUF[a],
                                        kho: !!(await window.__Store.get('sfx_' + a)) }), tenA);
  ok(tHoan.con && tHoan.buf && tHoan.kho, 'hoan tac lay lai duoc file tieng, ca trong kho luu');

  /* xoá ô chưa có gì thì chỉ nhắc, không nổ */
  const nhac = await doc(() => {
    const w = document.querySelectorAll('#sfxArea .slotwrap');
    for (const x of w) { if (!x.classList.contains('set')) { x.querySelector('.slotdel').click(); break; } }
    return document.getElementById('sfxStatus').textContent;
  });
  ok(/chưa nạp file nào/.test(nhac), `bam ✕ o o trong thi chi nhac ("${nhac}")`);

  /* xoá cả bộ ảnh: có hỏi lại, và vẫn hoàn tác được */
  page.on('dialog', d => d.accept());
  await page.click('#sprClear');
  await page.waitForFunction(() => Object.keys(window.__SPR.kono || {}).length === 0, null, { timeout: 20000 });
  const sachTron = await doc(async () => ({ con: Object.keys(window.__SPR.kono).length,
                                            kho: !!(await window.__Store.get('spr_kono')) }));
  ok(sachTron.con === 0 && !sachTron.kho, 'nut xoa ca bo van don sach nhu cu');
  await page.click('#sprUndo');
  await page.waitForFunction(() => Object.keys(window.__SPR.kono || {}).length === 2, null, { timeout: 20000 });
  const troLai = await doc(async () => {
    const kho = await window.__Store.get('spr_kono');
    return { con: Object.keys(window.__SPR.kono).length, kho: kho ? Object.keys(JSON.parse(kho)).length : 0 };
  });
  ok(troLai.con === 2 && troLai.kho === 2, `hoan tac lay lai duoc ca bo (${troLai.con} o)`);

  ok(errors.length === 0, `khong co loi trang${errors.length ? ': ' + errors[0] : ''}`);
  await browser.close();
  console.log(loi.length ? `\nHONG ${loi.length} muc` : '\nDAT toan bo');
  process.exit(loi.length ? 1 : 0);
})();
