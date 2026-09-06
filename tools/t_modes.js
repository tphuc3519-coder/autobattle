/* Ba chế độ đấu:
     1. 1v1 — đúng như từ trước tới nay: hai người, hai phe 0/1, đứng hai đầu sàn;
     2. hỗn chiến — từ 3 người trở lên, MỖI người một phe, ai còn đứng cuối cùng thì thắng;
     3. đánh theo đội — vẫn hai phe nhưng mỗi phe nhiều người, đội nào còn người thì thắng.
   Chạy: node tools/t_modes.js */
const { openGame, openMulti } = require('./probe');

const out = [];
let fail = 0;
function ok(name, pass, note) {
  out.push(`${pass ? 'DAT ' : 'HONG'}  ${name}${note ? '  — ' + note : ''}`);
  if (!pass) fail++;
}

(async () => {
  /* ================= 1v1 vẫn y như cũ ================= */
  {
    const { browser, page, errors } = await openGame('kono', 'chichi', { play: false });
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const G = window.__G(), WH = window.__WH();
      return {
        mode: window.__PMODE(), n: G.fighters.length,
        teams: G.fighters.map(f => f.team),
        keys: G.fighters.map(f => f.key),
        names: G.fighters.map(f => f.name),
        pos: G.fighters.map(f => [Math.round(f.x), Math.round(f.y)]),
        kc: [G.k.key, G.c.key],
        foe: [G.fighters[0].key === 'kono' && window.__foeOf(G.k).key,
              window.__foeOf(G.c).key],
        W: WH.W, H: WH.H
      };
    });
    ok('1v1 vẫn dựng đúng hai người, phe 0 và phe 1',
      r.mode === 'duel' && r.n === 2 && r.teams.join() === '0,1' && r.keys.join() === 'kono,chichi',
      `${r.n} người · phe ${r.teams.join('/')}`);
    ok('1v1 vẫn đứng đúng hai đầu sàn như bản cũ',
      r.pos[0][0] === r.W / 2 && r.pos[0][1] === 54 + 120 &&
      r.pos[1][0] === r.W / 2 && r.pos[1][1] === r.H - 54 - 120,
      JSON.stringify(r.pos));
    ok('1v1: foeOf vẫn trả về đúng người kia',
      r.foe[0] === 'chichi' && r.foe[1] === 'kono', JSON.stringify(r.foe));
    ok('không trùng nhân vật thì tên KHÔNG bị dán thêm hậu tố',
      r.names.join() === 'Konohamaru,ChiChi', r.names.join(' · '));
    ok('1v1 không lỗi trang', errors.length === 0, errors.join(' | '));
    await browser.close();
  }

  /* ================= hỗn chiến ================= */
  {
    const { browser, page, errors } = await openMulti('ffa', ['kono', 'chichi', 'tsubasa', 'shika'], { play: false });
    await page.waitForTimeout(300);

    const r = await page.evaluate(() => {
      const G = window.__G(), WH = window.__WH(), PAD = 54;
      const inArena = G.fighters.every(f => f.x >= PAD && f.x <= WH.W - PAD && f.y >= PAD && f.y <= WH.H - PAD);
      // không ai chồng lên ai ngay lúc vào trận
      let minD = 1e9;
      for (let i = 0; i < G.fighters.length; i++) for (let j = i + 1; j < G.fighters.length; j++)
        minD = Math.min(minD, Math.hypot(G.fighters[i].x - G.fighters[j].x, G.fighters[i].y - G.fighters[j].y));
      return {
        mode: window.__PMODE(), n: G.fighters.length,
        teams: G.fighters.map(f => f.team),
        keys: G.fighters.map(f => f.key),
        inArena, minD: +minD.toFixed(1),
        seg: window.__vsSegments().filter(s => !s.small).length
      };
    });
    ok('hỗn chiến dựng đủ 4 người',
      r.mode === 'ffa' && r.n === 4 && r.keys.join() === 'kono,chichi,tsubasa,shika', JSON.stringify(r.keys));
    ok('hỗn chiến: MỖI người một phe riêng', r.teams.join() === '0,1,2,3', r.teams.join('/'));
    ok('cả bốn người đứng trong sàn và không chồng lên nhau',
      r.inArena && r.minD > 52, `khoảng cách gần nhất ${r.minD}px`);
    ok('băng-rôn tên liệt kê đủ bốn người', r.seg === 4, `${r.seg} tên`);

    // foeOf luôn là người GẦN NHẤT, và không bao giờ là chính mình
    const fo = await page.evaluate(() => {
      const G = window.__G();
      const [a, b, c, d] = G.fighters;
      a.x = 100; a.y = 100; b.x = 140; b.y = 100; c.x = 400; c.y = 400; d.x = 500; d.y = 500;
      for (const f of G.fighters) { f.foe = null; f.foeT = 0; }
      return G.fighters.map(f => window.__foeOf(f).key + '');
    });
    ok('hỗn chiến: ai cũng nhắm vào người địch gần nhất',
      fo[0] === 'chichi' && fo[1] === 'kono' && fo[2] === 'shika' && fo[3] === 'tsubasa', fo.join(' / '));

    // băng-rôn lúc chưa ai gục: không tên nào bị gạch
    const bangTruoc = await page.evaluate(() => {
      window.__versusBox();
      return window.__vsSegments().filter(s => !s.small).map(s => (s.out ? 'X ' : '') + s.txt);
    });
    ok('chưa ai gục thì băng-rôn không gạch tên nào',
      bangTruoc.length === 4 && bangTruoc.every(t => !t.startsWith('X ')), bangTruoc.join(' | '));

    // hạ một người thì trận CHƯA xong; hạ tới khi còn một người mới xong
    const ko = await page.evaluate(() => {
      const G = window.__G();
      const buoc = [];
      const hp = f => { f.hp = 0; window.__defeat(f, G.fighters[0]); };
      hp(G.fighters[3]);
      buoc.push({ over: G.over, con: window.__aliveMains().length });
      hp(G.fighters[2]);
      buoc.push({ over: G.over, con: window.__aliveMains().length });
      hp(G.fighters[1]);
      buoc.push({ over: G.over, con: window.__aliveMains().length, thang: G.winner && G.winner.key });
      return buoc;
    });
    ok('hạ một người thì hỗn chiến vẫn còn chạy',
      !ko[0].over && ko[0].con === 3 && !ko[1].over && ko[1].con === 2,
      `còn ${ko[0].con} rồi ${ko[1].con} người`);
    // ba người đã gục ở khối trên, chỉ Konohamaru còn đứng
    const bang = await page.evaluate(() => {
      window.__versusBox();          // vẽ thật một lượt để chắc nhánh gạch tên không nổ
      return window.__vsSegments().filter(s => !s.small).map(s => (s.out ? 'X ' : '') + s.txt);
    });
    ok('băng-rôn gạch tên ba người đã bị hạ, giữ nguyên người còn sống',
      bang.length === 4 && !bang[0].startsWith('X ') &&
      bang.slice(1).every(t => t.startsWith('X ')), bang.join(' | '));
    ok('người cuối cùng đứng vững là người thắng',
      ko[2].over === 'KONOHAMARU' && ko[2].con === 1 && ko[2].thang === 'kono',
      `${ko[2].over} · thắng ${ko[2].thang}`);
    ok('hỗn chiến không lỗi trang', errors.length === 0, errors.join(' | '));
    await browser.close();
  }

  /* ================= đánh theo đội ================= */
  {
    const { browser, page, errors } = await openMulti('team',
      { t0: ['kono', 'chichi'], t1: ['tsubasa', 'shika'] }, { play: false });
    await page.waitForTimeout(300);

    const r = await page.evaluate(() => {
      const G = window.__G();
      for (const f of G.fighters) { f.foe = null; f.foeT = 0; }
      return {
        mode: window.__PMODE(), n: G.fighters.length,
        teams: G.fighters.map(f => f.team),
        keys: G.fighters.map(f => f.key),
        // đồng đội không bao giờ là đối thủ của nhau
        foeTeams: G.fighters.map(f => window.__foeOf(f).team),
        nhan: [window.__teamLabel(0), window.__teamLabel(1)],
        // đội 0 đứng nửa trên, đội 1 nửa dưới
        y: G.fighters.map(f => Math.round(f.y))
      };
    });
    ok('đánh đội dựng đúng 2 vs 2, hai phe 0 và 1',
      r.mode === 'team' && r.n === 4 && r.teams.join() === '0,0,1,1', r.teams.join('/'));
    ok('đồng đội không bao giờ là đối thủ của nhau',
      r.foeTeams[0] === 1 && r.foeTeams[1] === 1 && r.foeTeams[2] === 0 && r.foeTeams[3] === 0,
      r.foeTeams.join('/'));
    ok('hai đội đứng hai nửa sàn, mặt đối mặt',
      r.y[0] === r.y[1] && r.y[2] === r.y[3] && r.y[0] < r.y[2], JSON.stringify(r.y));
    ok('tên đội gom tên đồng đội lại',
      r.nhan[0] === 'Konohamaru + ChiChi' && r.nhan[1] === 'Ozora Tsubasa + Shikamaru',
      r.nhan.join(' vs '));

    const ko = await page.evaluate(() => {
      const G = window.__G();
      const t1 = G.fighters.filter(f => f.team === 1);
      const buoc = [];
      t1[0].hp = 0; window.__defeat(t1[0], G.fighters[0]);
      buoc.push({ over: G.over, con: window.__aliveMains().length, phe: window.__aliveTeams().length });
      t1[1].hp = 0; window.__defeat(t1[1], G.fighters[0]);
      buoc.push({ over: G.over, con: window.__aliveMains().length, phe: window.__aliveTeams().length,
                  winTeam: G.winTeam });
      return buoc;
    });
    ok('hạ một người của đội kia thì trận vẫn còn chạy',
      !ko[0].over && ko[0].con === 3 && ko[0].phe === 2, `còn ${ko[0].con} người, ${ko[0].phe} phe`);
    ok('hạ hết đội kia thì đội còn người thắng',
      !!ko[1].over && ko[1].phe === 1 && ko[1].winTeam === 0,
      `${ko[1].over} · phe thắng ${ko[1].winTeam}`);
    ok('băng-rôn thắng ghi tên cả ĐỘI chứ không riêng một người',
      ko[1].over === 'KONOHAMARU + CHICHI', ko[1].over);
    ok('đánh đội không lỗi trang', errors.length === 0, errors.join(' | '));
    await browser.close();
  }

  /* ===== đồng minh và viện binh rời sàn theo chủ khi chủ gục giữa trận ===== */
  {
    const { browser, page, errors } = await openMulti('team',
      { t0: ['suzune', 'chichi'], t1: ['kono', 'shika'] }, { play: false });
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const G = window.__G();
      const suz = G.fighters.find(f => f.key === 'suzune');
      const ke = G.fighters.find(f => f.team === 1);
      // gắn thẳng một đồng minh và một viện binh vào cô rồi hạ cô xuống
      window.__ayaJoin(suz);
      for (let i = 0; i < 400; i++) window.__step(1 / 120);   // chờ hết phân cảnh 1.55s
      const aya = G.fighters.find(f => f.ally);
      ke.tauntBy = aya;
      const truoc = { co: !!aya, n: G.fighters.length };
      suz.hp = 0; window.__defeat(suz, ke);
      return {
        truoc,
        conAya: G.fighters.some(f => f.ally),
        taunt: !!ke.tauntBy,
        over: G.over,
        con: window.__aliveMains().length,
        castBuff: suz.castBuff
      };
    });
    ok('gắn được đồng minh vào sân ở chế độ đánh đội', r.truoc.co, `${r.truoc.n} người trên sàn`);
    ok('chủ gục giữa trận thì đồng minh rời sàn theo, khiêu khích cũng gỡ',
      !r.conAya && !r.taunt, `còn đồng minh: ${r.conAya} · còn khiêu khích: ${r.taunt}`);
    ok('mất một người nhưng đội vẫn còn người nên trận chạy tiếp',
      !r.over && r.con === 3, `còn ${r.con} người${r.over ? ' · ' + r.over : ''}`);
    ok('đồng minh rời sàn thì trả lại castBuff', r.castBuff === 1, String(r.castBuff));
    ok('không lỗi trang', errors.length === 0, errors.join(' | '));
    await browser.close();
  }

  /* ================= trùng nhân vật ================= */
  {
    const { browser, page, errors } = await openMulti('ffa', ['kono', 'kono', 'kono'], { play: false });
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const G = window.__G();
      return { names: G.fighters.map(f => f.name), colors: G.fighters.map(f => f.color) };
    });
    ok('ba bản sao cùng một nhân vật thì tên khác nhau, bản đầu giữ tên gốc',
      r.names.join() === 'Konohamaru,Konohamaru II,Konohamaru III', r.names.join(' · '));
    ok('ba bản sao mang ba màu khác nhau',
      new Set(r.colors.map(c => c.toLowerCase())).size === 3, r.colors.join(' '));
    ok('trùng nhân vật không lỗi trang', errors.length === 0, errors.join(' | '));
    await browser.close();
  }

  /* ================= chạy thật một trận hỗn chiến 6 người ================= */
  {
    const { browser, page, errors } = await openMulti('ffa',
      ['kono', 'chichi', 'tsubasa', 'shika', 'suzune', 'superman']);
    await page.selectOption('#speed', '1');
    const r = await page.evaluate(() => new Promise(res => {
      const G = window.__G(), t0 = G.t;
      let minDist = 1e9, ngoai = 0;
      const id = setInterval(() => {
        for (const f of G.fighters) {
          if (f.summon || !f.alive) continue;
          if (f.x < 40 || f.x > 580 || f.y < 40 || f.y > 620) ngoai++;
        }
        const live = window.__aliveMains();
        for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
          const d = Math.hypot(live[i].x - live[j].x, live[i].y - live[j].y);
          if (!live[i].dash && !live[j].dash) minDist = Math.min(minDist, d);
        }
        if (G.over || G.t - t0 > 55) {
          clearInterval(id);
          res({ over: G.over, t: +(G.t - t0).toFixed(0), con: window.__aliveMains().length,
                phe: window.__aliveTeams().length, ngoai, minDist: +minDist.toFixed(1) });
        }
      }, 30);
    }));
    ok('trận hỗn chiến 6 người chạy được, không ai văng ra ngoài sàn',
      r.ngoai === 0, `${r.ngoai} lần ra ngoài · ${r.t}s trong trận`);
    ok('không ai đứng chồng lên nhau giữa trận hỗn chiến',
      r.minDist > 40, `gần nhất ${r.minDist}px`);
    ok('hỗn chiến kết thúc đúng lúc chỉ còn một phe',
      r.over ? (r.phe === 1 && r.con === 1) : r.phe > 1,
      r.over ? `${r.over} thắng, còn ${r.con} người` : `còn đánh, ${r.con} người / ${r.phe} phe`);
    ok('trận hỗn chiến 6 người không lỗi trang', errors.length === 0, errors.join(' | '));
    await browser.close();
  }

  console.log(out.join('\n'));
  console.log(fail ? `\nHONG ${fail} muc` : '\nDAT tat ca');
  process.exit(fail ? 1 : 0);
})();
