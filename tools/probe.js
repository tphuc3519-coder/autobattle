/* Dựng bản "có móc" của game để chạy test tự động.
   Cả game nằm trong một IIFE nên không biến nào lộ ra window; ở đây chèn thêm
   một dòng gán trước dấu đóng IIFE để test với tới được ruột game. */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');

/* Những thứ test hay cần. Thêm vào đây chứ đừng sửa index.html. */
const HOOKS = `
window.__G=()=>G; window.__ac=ac; window.__RT=RT; window.__SHIKA=SHIKA;
window.__SFXBUF=SFXBUF; window.__sfx=n=>sfx(n); window.__SFXE=SFX_EVENTS;
window.__SFXMAX=SFX_MAXLEN; window.__SFXGROUPS=SFX_GROUPS; window.__SFXALIAS=SFX_ALIAS;
window.__Store=Store; window.__SPR=SPR; window.__SFXSRC=SFXSRC; window.__SLOT=SLOT;
window.__talk=talk; window.__CV=CV; window.__S=S; window.__HEADER=HEADER; window.__WH=()=>({W,H});
/* sfx() nuốt lỗi của synth(), mà switch thiếu case thì cũng không ném — nên muốn biết
   một ô có tiếng tự tạo dự phòng hay không thì phải soi thẳng thân hàm. */
window.__synthSrc=()=>synth.toString();
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
window.__SETS=SETS; window.__getCtx=()=>ctx; window.__sprite=sprite;
/* pickLine() bốc lại cho tới khi ra chỉ số KHÁC lần trước, nên test ghim cứng Math.random
   một hằng số là treo vòng lặp. Gọi cái này trước để lần bốc đầu chắc chắn ăn. */
window.__resetLines=()=>{ lastDecision=-1; lastWrong=-1; };
window.__DECISIONS=SUZ_DECISIONS; window.__WRONGS=SUZ_WRONG;
window.__DORA=DORA; window.__doraEnter=doraEnter; window.__doraEscape=doraEscape;
window.__setTheme=setTheme; window.__doraTime=doraTime; window.__drTimeBack=drTimeBack; window.__drShrink=drShrink;
window.__doraAirCannon=doraAirCannon; window.__doraSmallLight=doraSmallLight;
window.__doraCombo=doraCombo; window.__drAcOdds=drAcOdds; window.__drSlTarget=drSlTarget;
window.__drSlFire=drSlFire; window.__drConeTargets=drConeTargets;
window.__drSafeSpot=drSafeSpot; window.__drCanTime=drCanTime; window.__drStatus=drStatus; window.__statusTick=statusTick;
window.__step=step; window.__doraTick=doraTick; window.__drCopterOn=drCopterOn; window.__drTryEscape=drTryEscape; window.__drInterrupt=drInterrupt; window.__drAcHit=drAcHit;
window.__drDisorient=drDisorient;
window.__counters=counters; window.__melee=melee; window.__chichiCharge=chichiCharge;
window.__KICK={dmg:CHICHI_KICK_DMG,stun:CHICHI_KICK_STUN,cd:CHICHI_DASH_CD}; window.__konoTick=konoTick; window.__miniRasengan=miniRasengan; window.__explode=explode;
window.__kunaiShare=kunaiShare; window.__throwNow=throwNow;
window.__KONO={sdmg:SHURIKEN_DMG,odds:KUNAI_ODDS,kdmg:KUNAI_DMG,r:KUNAI_R,core:KUNAI_CORE,min:KUNAI_MIN,burn:KUNAI_BURN_DPS,burnT:KUNAI_BURN_T,mini:KONO_MINI_DMG,miniT:KONO_MINI_T,miniCd:KONO_MINI_CD,miniKb:KONO_MINI_KB,miniPad:KONO_MINI_PAD};
window.__kameHit=kameHit; window.__masenkoHit=masenkoHit; window.__summonHelp=summonHelp;
window.__KAME={dmg:KAME_DMG,stun:KAME_STUN,slowT:KAME_SLOW_T,move:KAME_SLOW_MOVE,cast:KAME_SLOW_CAST};
window.__MASENKO={dmg:MASENKO_DMG,move:MASENKO_STACK_MOVE,cast:MASENKO_STACK_CAST,max:MASENKO_STACK_MAX,t:MASENKO_STACK_T};
window.__meleeReach=meleeReach; window.__MUSIC=MUSIC; window.__doraVector=doraVector;
window.__GN=GN; window.__ginyuAura=ginyuAura; window.__ginyuState=ginyuState;
window.__ginyuChange=ginyuChange; window.__ginyuPossess=ginyuPossess;
window.__ginyuChangeMiss=ginyuChangeMiss; window.__gnChangeTarget=gnChangeTarget;
window.__ginyuBeam=ginyuBeam; window.__ginyuFlash=ginyuFlash; window.__ginyuStrike=ginyuStrike;
window.__gnChangeOdds=gnChangeOdds; window.__gnChangeFire=gnChangeFire;
window.__gnCanChange=gnCanChange; window.__gnCrowd=gnCrowd; window.__gnDmg=gnDmg;
window.__gnSoulThink=gnSoulThink; window.__gnSoulTick=gnSoulTick; window.__gnSoulCds=gnSoulCds; window.__gnCc=gnCc; window.__statusTick=statusTick;
window.__ginyuTick=ginyuTick; window.__gnAuraDraw=gnAuraDraw; window.__GN_AURA=GN_AURA; window.__gnStatus=gnStatus; window.__gnBeamHit=gnBeamHit; window.__gnFlashHit=gnFlashHit; window.__GN_PROJ=GN_PROJ_BODY; window.__knock=knock;
window.__SUP=SUP; window.__supermanEnter=supermanEnter; window.__supResolve=supResolve;
window.__supFlyOn=supFlyOn; window.__supFlyOff=supFlyOff; window.__supCombo=supCombo;
window.__supermanHeat=supermanHeat; window.__supermanFreeze=supermanFreeze;
window.__supermanMeteor=supermanMeteor; window.__supMsLand=supMsLand; window.__supMsTarget=supMsTarget;
window.__supHvOdds=supHvOdds; window.__supMsOdds=supMsOdds; window.__supQuakeShare=supQuakeShare; window.__supResist=supResist;
window.__supKbTake=supKbTake; window.__supCC=supCC; window.__supFreezeOn=supFreezeOn;
window.__supChill=supChill; window.__supIceBreak=supIceBreak; window.__supBurn=supBurn;
window.__supInterrupt=supInterrupt; window.__supermanTick=supermanTick; window.__supVector=supVector;
window.__supEyeY=f=>supEyeY(f); window.__bindTick=bindTick; window.__supStatus=supStatus;
/* nạp hàng loạt ảnh / tiếng */
window.__bulkSprMatch=bulkSprMatch; window.__bulkSfxMatch=bulkSfxMatch;
window.__bulkSprites=bulkSprites; window.__bulkSfxFiles=bulkSfxFiles;
window.__bulkNames=bulkNames; window.__bulkNorm=bulkNorm;
window.__voicePack=voicePack;
window.__STAGES=STAGES; window.__setStage=k=>{ STAGE=k; }; window.__stageOf=stageOf;
window.__STAGE=()=>STAGE; window.__stageArt=stageArt; window.__arenaFloor=arenaFloor;
window.__stageThumb=stageThumb; window.__packBuild=packBuild; window.__packLoad=packLoad;
window.__ARCADE=()=>ARCADE; window.__groundShadows=groundShadows; window.__running=()=>running;
/* ba chế độ đấu */
window.__PMODE=()=>PMODE; window.__ROSTERS=ROSTERS; window.__PICK=PICK;
window.__buildRoster=buildRoster; window.__spawnSpots=spawnSpots; window.__newGame=newGame;
window.__foeOf=foeOf; window.__nearestFoe=nearestFoe; window.__aliveMains=aliveMains;
window.__aliveTeams=aliveTeams; window.__defeat=defeat; window.__finish=finish;
window.__teamLabel=teamLabel; window.__vsSegments=vsSegments; window.__versusBox=versusBox;
window.__dupColor=dupColor; window.__teamTint=teamTint; window.__setMode=(m,r)=>{
  PMODE=m;
  if(r){ if(r.ffa)ROSTERS.ffa=r.ffa.slice(); if(r.teams)ROSTERS.teams=r.teams.map(a=>a.slice()); }
  newGame();
};
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

/* Bản "có móc" của TRANG CHƠI: dựng lại play.html từ index.html rồi chèn hooks y hệt.
   Dựng lại chứ không đọc file có sẵn — như vậy test luôn soi đúng index.html hiện tại. */
function buildPlay() {
  execFileSync('python3', [path.join(ROOT, 'tools', 'mk_play.py')], { stdio: 'pipe' });
  const s = fs.readFileSync(path.join(ROOT, 'play.html'), 'utf8');
  const i = s.lastIndexOf('})();');
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'autobattle-play-')), 'play.html');
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
  await page.click('#mTabDuel');                      // 1v1: chế độ mặc định
  await page.click(`#listA .cTile[data-key="${keyA}"]`);
  await page.click(`#listB .cTile[data-key="${keyB}"]`);
  await page.click('#cselGo');
  if (o.play !== false) await page.click('#play');
  return { browser, page, errors };
}

/* Mở một trận nhiều người qua ĐÚNG màn chọn nhân vật, không gọi tắt vào ruột game:
   mode = 'ffa' (một mảng keys) hoặc 'team' (mảng CÁC ĐỘI, mỗi đội một mảng keys). */
async function openMulti(mode, picks, opt) {
  const o = opt || {};
  const { chromium } = playwright();
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 700, height: 980 } });
  await page.route('**://fonts.*/**', r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('crash', () => errors.push('TRANG SUP (renderer crash)'));
  await page.goto('file://' + (o.file || build()), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await page.click(mode === 'ffa' ? '#mTabFfa' : '#mTabTeam');
  const sides = mode === 'ffa' ? [picks] : picks;
  // số đội mặc định là 2; thêm hoặc bớt cho khớp đội hình muốn dựng
  if (mode === 'team') {
    for (let i = 0; i < 6 && await page.$$eval('#multiPane .cselCol:not(.off)', b => b.length) > sides.length; i++)
      await page.click('#multiPane .cselCol:not(.off) .grpBtn:not(.on)');
    for (let i = 0; i < 6 && await page.$$eval('#multiPane .cselCol:not(.off)', b => b.length) < sides.length; i++)
      await page.click('#multiPane .grpBtn.on');
  }
  const groups = sides.map((keys, i) => [`#grpSlots${i}`, `#grpList${i}`, keys]);
  for (const [slots, list, keys] of groups) {
    // dọn sạch đội hình mặc định rồi mới bấm thêm đúng những người cần
    for (let i = 0; i < 12; i++) {
      const n = await page.$$eval(slots + ' .cChip button', b => b.length);
      if (!n) break;
      await page.click(slots + ' .cChip button');
    }
    for (const k of keys) await page.click(`${list} .cTile[data-key="${k}"]`);
  }
  await page.click('#cselGo');
  if (o.play !== false) await page.click('#play');
  return { browser, page, errors };
}

module.exports = { build, buildPlay, openGame, openMulti, playwright, SRC, ROOT };
