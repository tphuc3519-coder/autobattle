/* Dựng bản "có móc" của game để chạy test tự động.
   Cả game nằm trong một IIFE nên không biến nào lộ ra window; ở đây chèn thêm
   một dòng gán trước dấu đóng IIFE để test với tới được ruột game. */
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');

/* Những thứ test hay cần. Thêm vào đây chứ đừng sửa index.html. */
const HOOKS = `
window.__G=()=>G; window.__ac=ac; window.__RT=RT; window.__SHIKA=SHIKA;
window.__SFXBUF=SFXBUF; window.__sfx=n=>sfx(n); window.__SFXE=SFX_EVENTS;
window.__CHARS=CHARS; window.__hurt=hurt; window.__shikaStabHit=shikaStabHit;
window.__gs=gs; window.__rts=rts;
window.__vector=vector; window.__drawFighter=drawFighter;
window.__setCtx=c=>{ ctx=c; };            // ctx khai bằng let chính vì để mượn thế này
window.__hurt=hurt; window.__stunFx=stunFx; window.__explode=explode;
window.__sexy=sexy; window.__shadowBind=shadowBind; window.__tryEvade=tryEvade;
window.__driveShot=driveShot; window.__eagleAwaken=eagleAwaken;
window.__recCanvas=()=>RECV; window.__recFrame=()=>recFrame(); window.__CFR=()=>CFR;
window.__aacRaw=aacRaw; window.__aacAsc=aacAsc; window.__mAudioEntry=mAudioEntry;
window.__domainTargets=domainTargets; window.__domainShare=domainShare;
window.__SUZ=SUZ; window.__suzTune=suzTune; window.__suzCp=suzCp;
window.__ayaShield=ayaShield; window.__ayaJoin=ayaJoin; window.__ayaLeave=ayaLeave;
window.__suzForm2=suzForm2; window.__suzForm3=suzForm3; window.__suzDecide=suzDecide;
window.__suzStrike=suzStrike; window.__aimTarget=aimTarget; window.__suzThink=suzThink;
window.__SUZ_ASK=()=>SUZ_ASK;
window.__suzDecisionHit=suzDecisionHit; window.__ayaStrike=ayaStrike; window.__suzHeal=suzHeal;
window.__suzTier=suzTier; window.__SUZ_TIERS=SUZ_TIERS;
window.__ayaGuardKick=ayaGuardKick; window.__ayaGuardKickHit=ayaGuardKickHit;
window.__SETS=SETS; window.__getCtx=()=>ctx;
/* pickLine() bốc lại cho tới khi ra chỉ số KHÁC lần trước, nên test ghim cứng Math.random
   một hằng số là treo vòng lặp. Gọi cái này trước để lần bốc đầu chắc chắn ăn. */
window.__resetLines=()=>{ lastDecision=-1; lastWrong=-1; };
window.__DECISIONS=SUZ_DECISIONS; window.__WRONGS=SUZ_WRONG;
`;

/* Trả về đường dẫn file probe. Ghi ra thư mục tạm để không bẩn repo. */
function build() {
  const s = fs.readFileSync(SRC, 'utf8');
  const i = s.lastIndexOf('})();');
  if (i < 0) throw new Error('không tìm thấy dấu đóng IIFE trong index.html');
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'autobattle-')), 'probe.html');
  fs.writeFileSync(out, s.slice(0, i) + HOOKS + s.slice(i));
  return out;
}

function playwright() {
  try { return require('playwright'); }
  catch (e) { return require('/opt/node22/lib/node_modules/playwright'); }
}

/* Mở một trận: chọn hai nhân vật rồi bấm vào trận và chạy.
   keyA/keyB lấy trong CHARS: kono | chichi | tsubasa | shika */
async function openGame(keyA, keyB, opt) {
  const o = opt || {};
  const { chromium } = playwright();
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 700, height: 980 } });
  await page.route('**://fonts.*/**', r => r.abort());   // khỏi chờ font mạng
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // trang chết giữa chừng thì báo cho rõ là CHẾT chứ không phải test viết sai.
  // (Đừng gom console.error vào đây: cú chặn font mạng ở trên luôn in một dòng
  //  ERR_FAILED, gom vào là mọi test đều báo hỏng oan.)
  page.on('crash', () => errors.push('TRANG SUP (renderer crash)'));
  await page.goto('file://' + (o.file || build()), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await page.click(`#listA .cTile[data-key="${keyA}"]`);
  await page.click(`#listB .cTile[data-key="${keyB}"]`);
  await page.click('#cselGo');
  if (o.play !== false) await page.click('#play');
  return { browser, page, errors };
}

module.exports = { build, openGame, playwright, SRC, ROOT };
