/* Nhịp vẽ — canh chừng mấy chỗ đắt đỏ lặng lẽ bò vào lượt vẽ.

   Lý do có bộ này: vệt bóng mờ (ghost) từng vẽ bằng ctx.filter='brightness(0) invert(1)'
   đặt ngay tại chỗ. Bộ lọc canvas dựng một mặt vẽ phụ cho TỪNG lệnh vẽ, mà nhánh vector
   gọi tới hơn ba chục lệnh fill/stroke — đo được MỘT vệt tốn 371ms. Superman nhả vệt mỗi
   0.05~0.07 giây suốt màn chào sân, quãng bay và cú Meteor Strike nên lúc nào cũng có
   4~6 vệt trên sàn: người dùng báo "chào sân với thi triển skill bị lag".

   Máy chạy test không có GPU nên CON SỐ TUYỆT ĐỐI của draw() vô nghĩa. Vì vậy mọi mục ở
   đây đo phần ĐỘI THÊM so với chính lượt vẽ nền của cùng máy đó, và mốc để rất rộng —
   nó bắt cái sai KIỂU 371ms, không đi soi từng mili giây. */
const { openGame } = require('./probe');

let dat = 0, hong = 0;
const ok = (c, s, m) => { c ? dat++ : hong++; console.log((c ? 'DAT  ' : 'HONG ') + ' ' + s + (m ? '  — ' + m : '')); };

const DO = () => {
  const G = window.__G(), draw = window.__draw;
  const f = G.fighters.find(x => !x.summon) || G.fighters[0];
  const mkGhost = () => ({ type: 'ghost', x: f.x, y: f.y, face: f.face, key: f.key,
                           pose: 'meteor', h: f.spriteH, life: .3, ml: .3 });
  const ms = (n) => {
    G.fx.length = 0;
    for (let i = 0; i < n; i++) G.fx.push(mkGhost());
    for (let i = 0; i < 8; i++) draw();                          // làm nóng
    const t = performance.now();
    for (let i = 0; i < 40; i++) { for (const g of G.fx) g.life = .3; draw(); }
    window.__getCtx().getImageData(0, 0, 1, 1);                  // ép xả hàng đợi
    return (performance.now() - t) / 40;
  };
  const nen = ms(0), tam = ms(8);
  G.fx.length = 0;
  const sil = window.__ghostSil(f.key, 'meteor', f.spriteH);
  return { nen, tam, moiVet: (tam - nen) / 8, w: sil.width, h: sil.height };
};

(async () => {
  const { page, browser, errors } = await openGame('superman', 'kono');
  await page.waitForTimeout(2600);                               // qua màn chào sân
  const r = await page.evaluate(DO);

  /* Mốc 8ms: bản hỏng đo được 371ms/vệt, bản đã sửa 0.59ms. Khoảng giữa rộng mênh mông
     nên để 8ms là vừa — máy test chậm cỡ nào cũng không chạm, mà ai lỡ đặt lại ctx.filter
     vào nhánh ghost thì vọt qua ngay lập tức. */
  ok(r.moiVet < 8, 'một vệt bóng mờ không được tốn quá 8ms',
     `${r.moiVet.toFixed(2)}ms mỗi vệt (nền ${r.nen.toFixed(1)}ms · 8 vệt ${r.tam.toFixed(1)}ms)`);
  ok(r.tam < r.nen * 3, 'tám vệt trên sàn không được làm lượt vẽ nặng gấp ba',
     `${(r.tam / r.nen).toFixed(2)}×`);
  /* Bóng nướng sẵn phải được CẮT SÁT mép phần vẽ được. Ô nướng để rộng 240×260 phòng áo
     choàng với tóc, blit lại nguyên ô rỗng thì mỗi vệt phải trộn hơn sáu vạn điểm ảnh
     trong suốt — đo được 6.85ms mỗi vệt, cắt xong còn 0.59ms. */
  ok(r.w < 200 && r.h < 220, 'bóng nướng sẵn được cắt sát mép, không blit cả ô rỗng',
     `${r.w}×${r.h}`);

  /* Nhánh ghost tuyệt đối không được đặt lại ctx.filter — đó chính là chỗ đã hỏng.
     Soi phần CHẠY THẬT thôi: mấy dòng ghi chú kể lại lỗi cũ có nhắc đúng hai cái tên đó,
     để nguyên thì test tự đổ vì chính lời giải thích của mình. */
  const boCmt = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const src = boCmt(require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8'));
  const i = src.indexOf("e.type==='ghost'");
  const than = i < 0 ? '' : src.slice(i, src.indexOf("e.type==='burst'", i));
  ok(i > 0 && !/ctx\.filter/.test(than), 'nhánh vẽ ghost không đặt ctx.filter');
  ok(!/brightness\(0\) invert\(1\)/.test(src), 'không còn bộ lọc brightness/invert nào trong phần chạy thật');

  if (errors.length) { hong++; console.log('HONG  lỗi trang: ' + errors.join(' | ')); }
  else ok(true, 'không lỗi trang');

  await browser.close();
  console.log(hong ? `\nHONG ${hong}/${dat + hong} muc` : `\nDAT tat ca ${dat} muc`);
  process.exit(hong ? 1 : 0);
})();
