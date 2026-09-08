/* Nạp hàng loạt ảnh và tiếng: thả cả một nắm file, game tự chia về đúng ô theo TÊN FILE.
   Kiểm: bảng đoán tên (thư mục thắng tên file, alias dài thắng alias ngắn, số ở đuôi là
   số khung chứ không phải tên ô), nạp thật qua ô chọn file, file đoán không ra thì được
   báo tên, và danh sách tên file tải về có đủ mọi ô. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { openGame } = require('./probe');

let loi = [];
const ok = (dk, msg) => { console.log(`${dk ? ' dat  ' : ' HONG '} ${msg}`); if (!dk) loi.push(msg); };

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bulk-'));
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC',
  'base64');
function anh(ten) { const p = path.join(TMP, ten); fs.writeFileSync(p, PNG); return p; }
function tieng(ten) {
  const sr = 8000, n = sr / 10, d = Buffer.alloc(44 + n * 2);
  d.write('RIFF', 0); d.writeUInt32LE(36 + n * 2, 4); d.write('WAVE', 8);
  d.write('fmt ', 12); d.writeUInt32LE(16, 16); d.writeUInt16LE(1, 20); d.writeUInt16LE(1, 22);
  d.writeUInt32LE(sr, 24); d.writeUInt32LE(sr * 2, 28); d.writeUInt16LE(2, 32); d.writeUInt16LE(16, 34);
  d.write('data', 36); d.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) d.writeInt16LE(Math.round(Math.sin(i / 6) * 8000), 44 + i * 2);
  const p = path.join(TMP, ten); fs.writeFileSync(p, d); return p;
}

(async () => {
  const { browser, page, errors } = await openGame('kono', 'chichi', { play: false });
  const doc = (fn, arg) => page.evaluate(fn, arg);

  /* ---------- bảng đoán tên ảnh ---------- */
  const mau = [
    ['kono_idle.png', 'kono/idle/0'],
    ['kono_idle_2.png', 'kono/idle/2'],
    ['Konohamaru/Phi tiêu.PNG', 'kono/atk1/0'],
    ['suzune/punch3.png', 'suzune/punch3/0'],
    ['superman_punch2.png', 'superman/punch2/0'],
    ['sup_punch.jpg', 'superman/punch/0'],
    ['ginyu-dance1.webp', 'ginyu/dance1/0'],
    ['bo anh/dora/Take-copter.png', 'dora/copter/0'],
    ['shika/idle.png', 'shika/idle/0'],           // thư mục quyết định nhân vật
    ['anh linh tinh.png', null],
  ];
  const raSpr = await doc(list => list.map(([p]) => {
    const m = window.__bulkSprMatch(p);
    return m ? `${m.ck}/${m.pk}/${m.frame}` : null;
  }), mau);
  mau.forEach(([p, mong], i) => ok(raSpr[i] === mong, `doan ten anh "${p}" -> ${raSpr[i]} (mong ${mong})`));

  /* ---------- bảng đoán tên tiếng ---------- */
  const mauS = [
    ['ginyu_force.mp3', 'ginyu_force'],
    ['shika_stab_hit.wav', 'shika_stab_hit'],     // alias dai thang alias ngan
    ['shika/shika_stab.wav', 'shika_stab'],
    ['punch.mp3', 'punch'],
    ['sup_freeze.ogg', 'sup_freeze'],
    ['tieng gi day.mp3', null],
  ];
  const raSfx = await doc(list => list.map(([p]) => window.__bulkSfxMatch(p)), mauS);
  mauS.forEach(([p, mong], i) => ok(raSfx[i] === mong, `doan ten tieng "${p}" -> ${raSfx[i]} (mong ${mong})`));

  /* ---------- nạp thật một nắm ảnh ---------- */
  await page.setInputFiles('#sprBulk', [
    anh('kono_idle.png'), anh('kono_atk1_1.png'), anh('kono_atk1_2.png'),
    anh('superman_punch2.png'), anh('rac-khong-doan-duoc.png'),
  ]);
  await page.waitForFunction(() => window.__SPR.kono.idle && window.__SPR.superman.punch2,
    null, { timeout: 25000 });
  const sau = await doc(async () => {
    const kho = JSON.parse((await window.__Store.get('spr_kono')) || '{}');
    return {
      idle: (window.__SPR.kono.idle || []).length,
      atk1: (window.__SPR.kono.atk1 || []).length,
      sup: (window.__SPR.superman.punch2 || []).length,
      khoIdle: (kho.idle || []).length, khoAtk1: (kho.atk1 || []).length,
      lop: window.__SLOT.kono.idle.wrap.className,
      chu: window.__SLOT.kono.atk1.cap.textContent,
      note: document.getElementById('sprBulkNote').textContent,
    };
  });
  ok(sau.idle === 1, `mot anh vao o idle (${sau.idle})`);
  ok(sau.atk1 === 2, `hai khung _1 _2 gom vao MOT o atk1 (${sau.atk1})`);
  ok(sau.sup === 1, `anh cua Superman vao dung o punch2 (${sau.sup})`);
  ok(sau.khoIdle === 1 && sau.khoAtk1 === 2, `da luu vao kho (idle ${sau.khoIdle} · atk1 ${sau.khoAtk1})`);
  ok(/\bset\b/.test(sau.lop), `o idle bat co .set (${sau.lop})`);
  ok(/×2/.test(sau.chu), `nhan o atk1 ghi so khung (${sau.chu})`);
  ok(/rac-khong-doan-duoc/.test(sau.note), 'file doan khong ra duoc bao ten ra man hinh');
  ok(/3 o/.test(sau.note) || /3 ô/.test(sau.note), `dong tong ket dem dung so o (${sau.note.slice(0, 60)})`);

  /* ---------- nạp thật một nắm tiếng ---------- */
  await page.setInputFiles('#sfxBulk', [
    tieng('ginyu_force.wav'), tieng('punch.wav'), tieng('sup_freeze.wav'), tieng('vo-danh.wav'),
  ]);
  await page.waitForFunction(() => window.__SFXSRC.ginyu_force && window.__SFXSRC.sup_freeze,
    null, { timeout: 25000 });
  const sauS = await doc(async () => ({
    co: ['ginyu_force', 'punch', 'sup_freeze'].filter(k => !!window.__SFXSRC[k]),
    kho: !!(await window.__Store.get('sfx_ginyu_force')),
    note: document.getElementById('sfxBulkNote').textContent,
  }));
  ok(sauS.co.length === 3, `nap dung ba o tieng (${sauS.co.join(', ')})`);
  ok(sauS.kho, 'tieng da luu vao kho, mo lai trang van con');
  ok(/vo-danh/.test(sauS.note), 'file tieng doan khong ra duoc bao ten ra man hinh');

  /* ---------- danh sách tên file ---------- */
  const ds = await doc(() => {
    const spr = window.__bulkNames('spr'), sfx = window.__bulkNames('sfx');
    let thieuA = 0, thieuS = 0;
    for (const s of window.__SETS) for (const [pk] of s.poses)
      if (!spr.includes(`${s.key}_${pk}.png`)) thieuA++;
    for (const [nm] of window.__SFXE) if (!sfx.includes(`${nm}.mp3`)) thieuS++;
    return { thieuA, thieuS, dongA: spr.split('\n').length, dongS: sfx.split('\n').length };
  });
  ok(ds.thieuA === 0, `danh sach ten anh du moi o (thieu ${ds.thieuA}, ${ds.dongA} dong)`);
  ok(ds.thieuS === 0, `danh sach ten tieng du moi o (thieu ${ds.thieuS}, ${ds.dongS} dong)`);

  ok(errors.length === 0, `khong co loi trang (${errors.slice(0, 2).join(' | ')})`);
  await browser.close();
  console.log(loi.length ? `\nHONG ${loi.length} muc` : '\nDAT het');
  process.exit(loi.length ? 1 : 0);
})();
