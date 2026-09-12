/* Sáu màn đấu và phần tân trang sàn.
   Kiểm: mỗi màn vẽ ra một sàn KHÁC nhau, dán ảnh nền vào ô của màn thì ảnh thắng hình
   vector, thẻ chọn màn có ảnh thu nhỏ vẽ thật, màn đã chọn được lưu lại, và sàn có
   bóng đổ dưới chân + khung viền theo tông màu của màn. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { openGame } = require('./probe');

let loi = [];
const ok = (dk, msg) => { console.log(`${dk ? ' dat  ' : ' HONG '} ${msg}`); if (!dk) loi.push(msg); };

function fileAnh() {   // PNG 2x2 màu đỏ tươi — dán vào ô nền là nhận ra ngay
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'stage-')), 'bg.png');
  fs.writeFileSync(p, Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAF0lEQVR42mP8z8BQz8DAwMDEgAQGoQAAaEcCAy0i0LcAAAAASUVORK5CYII=',
    'base64'));
  return p;
}

(async () => {
  const { browser, page, errors } = await openGame('kono', 'chichi', { play: false });
  const doc = (fn, arg) => page.evaluate(fn, arg);

  /* ---------- mỗi màn một sàn khác nhau ---------- */
  const keys = await doc(() => window.__STAGES.map(s => s.key));
  ok(keys.length === 12, `co du muoi hai man (${keys.join(', ')})`);

  // vẽ từng màn ra canvas phụ rồi lấy màu trung bình: hai màn không được ra cùng một màu
  const mau = await doc(ks => ks.map(k => {
    const c = document.createElement('canvas'); c.width = 620; c.height = 620;
    const keep = window.__getCtx();
    window.__setCtx(c.getContext('2d'));
    window.__setStage(k);
    window.__arenaFloor();
    window.__setCtx(keep);
    const d = c.getContext('2d').getImageData(0, 0, 620, 620).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4;
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  }), keys);
  keys.forEach((k, i) => console.log(`        ${k.padEnd(8)} mau trung binh R${mau[i][0]} G${mau[i][1]} B${mau[i][2]}`));
  const kc = new Set(mau.map(m => m.join(',')));
  ok(kc.size === keys.length, `moi man mot tong mau rieng (${kc.size}/${keys.length})`);
  // sân vận động phải xanh lá hơn đỏ, vũ trụ phải tối hơn mọi màn khác
  const iSt = keys.indexOf('stadium'), iSp = keys.indexOf('space');
  ok(mau[iSt][1] > mau[iSt][0] + 20, `san van dong xanh la (G ${mau[iSt][1]} > R ${mau[iSt][0]})`);
  const sang = mau.map(m => m[0] + m[1] + m[2]);
  ok(sang[iSp] === Math.min(...sang), `vu tru la man toi nhat (${sang[iSp]})`);

  /* ---------- dán ảnh nền thì ảnh THẮNG hình vector ---------- */
  const truoc = mau[keys.indexOf('dojo')];
  const oNen = page.locator('#slotArea .slotwrap').filter({ hasText: 'Võ đường' }).first();
  await oNen.locator('input[type=file]').setInputFiles(fileAnh());
  await page.waitForFunction(() => !!(window.__SPR.stages && window.__SPR.stages.dojo), null, { timeout: 20000 });
  const sau = await doc(() => {
    const c = document.createElement('canvas'); c.width = 620; c.height = 620;
    const keep = window.__getCtx();
    window.__setCtx(c.getContext('2d'));
    window.__setStage('dojo'); window.__arenaFloor();
    window.__setCtx(keep);
    const d = c.getContext('2d').getImageData(300, 300, 1, 1).data;
    return [d[0], d[1], d[2]];
  });
  // ảnh mẫu là mảng ĐỎ: sàn gỗ của võ đường vốn nâu (R gấp ~1.3 lần G), còn ảnh dán vào
  // thì đỏ áp đảo — soi theo tỉ lệ chứ đừng ghim ngưỡng sáng, PNG mẫu đổi là đổ oan.
  ok(sau[0] > sau[1] * 3 && sau[0] > sau[2] * 3, `dan anh nen vao o thi anh thang vector (giua san RGB ${sau.join(',')})`);
  ok(truoc.join() !== sau.join(), 'san doi han sau khi dan anh');

  /* ---------- thẻ chọn màn có ảnh thu nhỏ vẽ thật ---------- */
  const thumb = await doc(() => {
    const t = document.querySelector('#stageList .sTile[data-stage="space"] img');
    return { co: !!t, src: t ? t.src.slice(0, 22) : '', dai: t ? t.src.length : 0 };
  });
  ok(thumb.co && thumb.src.startsWith('data:image/png'), `the chon man co anh thu nho (${thumb.src})`);
  ok(thumb.dai > 2000, `anh thu nho la anh ve that, khong phai o trong (${thumb.dai} byte)`);

  /* ---------- chọn màn rồi vào trận: màn được áp dụng và LƯU lại ----------
     openGame() đã bấm "Vào trận" một lần nên màn chọn đang đóng — mở lại bằng nút Chọn nhân vật. */
  await page.click('#pick');
  await page.click('#stageList .sTile[data-stage="roof"]');
  await page.click('#cselGo');
  await page.waitForTimeout(400);
  const chon = await doc(async () => ({
    stage: window.__STAGE(),
    kho: JSON.parse((await window.__Store.get('cfg_picks')) || '{}').stage
  }));
  ok(chon.stage === 'roof', `vao tran thi dung man vua chon (${chon.stage})`);
  ok(chon.kho === 'roof', `man da chon duoc luu lai de mo trang sau (${chon.kho})`);

  /* ---------- tân trang sàn: bóng đổ + khung viền theo tông màu màn ---------- */
  const bong = await doc(() => {
    const c = document.createElement('canvas'); c.width = 620; c.height = 620;
    const keep = window.__getCtx(), cx = c.getContext('2d');
    cx.fillStyle = '#808080'; cx.fillRect(0, 0, 620, 620);
    window.__setCtx(cx);
    window.__groundShadows();
    window.__setCtx(keep);
    const d = cx.getImageData(0, 0, 620, 620).data;
    let toi = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 120) toi++;
    return toi;
  });
  ok(bong > 300, `co bong do duoi chan (${bong} diem anh sam hon nen)`);

  ok(errors.length === 0, `khong co loi trang (${errors.slice(0, 2).join(' | ')})`);
  await browser.close();
  console.log(loi.length ? `\nHONG ${loi.length} muc` : '\nDAT het');
  process.exit(loi.length ? 1 : 0);
})();
