/* Bong bóng thoại phải nằm TRÊN mọi hiệu ứng chiêu, dù hiệu ứng nổ ra sau.
   Cách chấm: đặt một câu thoại và một băng-rôn tên chiêu (viền vàng) chồng đúng lên nhau,
   vẽ một khung rồi ĐẾM ĐIỂM ẢNH ngay giữa chỗ chồng nhau — thấy nền trắng của bong bóng
   là bong bóng nằm trên, thấy vàng là nó bị đè. */
const { openGame } = require('./probe');

let loi = [];
const ok = (dk, msg) => { console.log(`${dk ? ' dat  ' : ' HONG '} ${msg}`); if (!dk) loi.push(msg); };

/* đọc ô 60x30 quanh tâm sàn: trả về tỉ lệ điểm trắng (nền bong bóng) và điểm vàng
   (viền băng-rôn tên chiêu #FFC542 / #FFF3C4) */
async function dem(page) {
  return page.evaluate(() => {
    const c = window.__CV, S = window.__S, HEADER = window.__HEADER, { W, H } = window.__WH();
    const g = c.getContext('2d');
    const x = Math.round((W / 2 - 30) * S), y = Math.round((HEADER + H / 2 - 15) * S);
    const d = g.getImageData(x, y, Math.round(60 * S), Math.round(30 * S)).data;
    let trang = 0, vang = 0, tong = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      tong++;
      if (r > 235 && gg > 235 && b > 235) trang++;
      if (r > 200 && gg > 140 && gg < 230 && b < 130) vang++;
    }
    return { trang: trang / tong, vang: vang / tong };
  });
}

/* dựng cảnh: câu thoại + băng-rôn tên chiêu chồng lên nhau ngay giữa sàn */
function datCanh(page, themBanner) {
  return page.evaluate(banner => {
    const G = window.__G(), { W, H } = window.__WH();
    G.floats.length = 0; G.callBanner = null;
    G.cam.x = W / 2; G.cam.y = H / 2; G.cam.z = 1;
    // câu thoại vào TRƯỚC, băng-rôn chiêu vào SAU — đúng thứ tự gây lỗi cũ
    G.floats.push({ x: W / 2, y: H / 2, txt: 'What should I do in this situation?',
                    color: '#22304F', life: 99, ml: 99, banner: true, bubble: true, big: true, tilt: 0 });
    G.floats.push({ x: W / 2, y: H / 2, txt: 'RASENGAN!', color: '#FFB020', life: 99, ml: 99,
                    banner: true, bubble: true, gold: true, big: true, tilt: 0 });
    if (banner) G.callBanner = { txt: 'NARA CLAN FOREST', color: '#9B8CFF', life: 99, ml: 99 };
  }, !!themBanner);
}

(async () => {
  const { browser, page, errors } = await openGame('suzune', 'kono');
  await page.waitForTimeout(400);

  await datCanh(page, false);
  await page.waitForTimeout(250);
  const a = await dem(page);
  ok(a.trang > .5, `bong bong nam tren bang-ron ten chieu (nen trang ${(a.trang * 100).toFixed(1)}%)`);
  ok(a.vang < .02, `khong con vien vang cua ten chieu de len cau thoai (${(a.vang * 100).toFixed(1)}%)`);

  await datCanh(page, true);
  await page.waitForTimeout(250);
  const b = await dem(page);
  ok(b.trang > .5, `bong bong nam tren ca bang-ron giua man (nen trang ${(b.trang * 100).toFixed(1)}%)`);
  ok(b.vang < .02, `bang-ron giua man khong de len cau thoai (${(b.vang * 100).toFixed(1)}%)`);

  /* thứ tự ngược lại vẫn phải ra kết quả như nhau: chỗ đứng trong mảng không còn quyết định */
  await page.evaluate(() => {
    const G = window.__G(); const [chat, chieu] = G.floats;
    G.floats.length = 0; G.floats.push(chieu, chat);
  });
  await page.waitForTimeout(250);
  const c = await dem(page);
  ok(c.trang > .5, `dao thu tu trong mang van the (nen trang ${(c.trang * 100).toFixed(1)}%)`);

  /* không có câu thoại thì băng-rôn tên chiêu vẫn phải vẽ như cũ */
  await page.evaluate(() => {
    const G = window.__G(), W = window.__WH().W, H = window.__WH().H;
    G.floats.length = 0; G.callBanner = null;
    G.floats.push({ x: W / 2, y: H / 2, txt: 'RASENGAN!', color: '#FFB020', life: 99, ml: 99,
                    banner: true, bubble: true, gold: true, big: true, tilt: 0 });
  });
  await page.waitForTimeout(250);
  const d = await dem(page);
  ok(d.vang > .01, `khong co thoai thi ten chieu van hien nhu cu (vien vang ${(d.vang * 100).toFixed(1)}%)`);

  ok(errors.length === 0, `khong co loi trang${errors.length ? ': ' + errors[0] : ''}`);
  await browser.close();
  console.log(loi.length ? `\nHONG ${loi.length} muc` : '\nDAT toan bo');
  process.exit(loi.length ? 1 : 0);
})();
