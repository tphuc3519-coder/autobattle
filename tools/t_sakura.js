/* Haruno Sakura — Combat Medic / Crowd-Control Bruiser.
   Phần lớn mục ở đây ĐO THẬT trong trận chứ không soi chuỗi: mấy con số của cô (70% / 30%
   kháng hiệu ứng, 80% shuriken của Konohamaru, 12% máu tối đa) là quan hệ giữa nhiều hằng
   số, soi chuỗi thì đổi một chỗ là test vẫn xanh trong khi game đã sai. */
/* Mọi mục dưới đây soi HẰNG SỐ ĐÃ KHAI (viết theo NHỊP GỐC CŨ rồi bọc gs()), nên quy
   đổi bằng `window.__LRT` chứ không phải hệ số hiển thị `window.__RT` (giờ bằng 1).
   Xem mục 1 của CLAUDE.md: mốc 2x cũ đã thành tốc độ gốc. */
const fs=require('fs');
const assert=require('assert');
const { openGame, openMulti } = require('./probe.js');

const src=fs.readFileSync('index.html','utf8');
let pass=0;
const ok=(c,m)=>{ assert(c,m); console.log('  ok  '+m); pass++; };
const near=(a,b,eps,m)=>ok(Math.abs(a-b)<=eps, `${m} (đo ${a}, mốc ${b})`);

(async()=>{
  /* ---------- 1. đăng ký và khung dữ liệu ---------- */
  ok(src.includes('sakura:{}'),'ô dán ảnh đã đăng ký');
  ok(src.includes("sakura:'#FF6FA5'"),'màu đã đăng ký');
  ok(src.includes('sakura:HP_STD'),'máu đọc HP_STD, không cắm cứng');
  assert(!/const SAK=\{[^}]*\bhp:/s.test(src),'SAK không được khai Maximum HP riêng');
  ok(true,'SAK không cắm cứng Maximum HP — mkChar() vẫn đọc HP.sakura');
  ok(src.includes("{key:'sakura', name:'Haruno Sakura'"),'có nhóm ô dán ảnh riêng');
  ok(src.includes("sak_shuriken:'Haruno Sakura'"),'có nhóm ô dán tiếng riêng');

  /* Mọi chữ HIỆN RA trong game của cô phải là tiếng Anh. Quét mảng skills + DEX.en. */
  const sk=src.match(/skills:\[([\s\S]*?)\n    \],\n    init\(f\)\{\n      f\.cds=\{s1:gs\(2\)/);
  assert(sk,'không tìm thấy mảng skills của Sakura');
  ok(!/[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(sk[1]),
     'bảng kỹ năng của Sakura không lẫn chữ tiếng Việt có dấu');

  /* Mười ô tiếng, mỗi ô một `case` dự phòng trong synth() — luật mục 4 của CLAUDE.md. */
  const slots=['sak_shuriken','sak_bleed','sak_focus','sak_quake','sak_crack','sak_dash',
               'sak_impact','sak_heal','sak_tick','sak_seal','sak_katsuyu','sak_exhaust'];
  for(const s of slots) assert(src.includes(`['${s}',`),'thiếu ô tiếng '+s);
  for(const s of slots) assert(src.includes(`case '${s}':`),'thiếu case synth() cho '+s);
  ok(true,`đủ ${slots.length} ô tiếng và ${slots.length} case tiếng tự tạo`);

  /* Đấm đá mượn tiếng của ChiChi, đúng lối đã chốt cho Horikita / Ginyu / Doraemon. */
  ok(/function sakStrike[\s\S]{0,400}sfx\('punch'\)/.test(src),"đấm đá mượn sfx('punch') của ChiChi");

  /* ---------- 2. đo trong trận: nội tại, đòn thường ---------- */
  {
    const {browser,page,errors}=await openGame('sakura','kono');
    await page.waitForTimeout(1200);
    const r=await page.evaluate(()=>{
      const G=window.__G(),RT=window.__LRT,SAK=window.__SAK,o={};
      const s=G.fighters.find(f=>f.key==='sakura'), e=G.fighters.find(f=>f.key==='kono');
      const cut=d=>window.__sakCut(d);
      o.burn5=+((cut(5/RT))*RT).toFixed(2);
      o.exh8 =+((cut(8/RT))*RT).toFixed(2);
      o.slow4=+((cut(4/RT))*RT).toFixed(2);
      o.floor=+((cut(.3/RT))*RT).toFixed(2);
      o.tiny =+((cut(.2/RT))*RT).toFixed(2);
      s.stun=0; window.__stunFx(s,3/RT,'spin'); o.stun3=+(s.stun*RT).toFixed(2);
      s.stun=0; window.__stunFx(s,1/RT,'spin'); o.stun1=+(s.stun*RT).toFixed(2);
      /* debuff THẬT do người khác dán, đi qua đúng cửa quét */
      s.stun=0; s.exhaust=8/RT; window.__sakResTick(s,1/120); o.exhaustReal=+(s.exhaust*RT).toFixed(2);
      s.dis=3/RT; window.__sakResTick(s,1/120); o.disReal=+(s.dis*RT).toFixed(2);
      /* sát thương duy trì: dps GIỮ NGUYÊN, chỉ số nhịp giảm */
      s.dots.length=0; s.dots.push({dps:5*RT,left:5/RT,acc:0,src:e,tint:'red'});
      window.__sakResTick(s,1/120);
      o.dotDps=+(s.dots[0].dps/RT).toFixed(2); o.dotLeft=+(s.dots[0].left*RT).toFixed(2);
      /* làm mới không bao giờ tụt dưới phần đang còn */
      s.exhaust=6/RT; window.__sakResTick(s,1/120); const keep=s.exhaust;
      s.exhaust=Math.max(s.exhaust,1/RT); window.__sakResTick(s,1/120);
      o.refreshNoDrop=s.exhaust>=keep-1e-9;
      /* KHÔNG đụng tới lực đẩy: knock() ra đúng lực như người khác */
      s.kbx=0; window.__G(); o.kbTake=s.kbTake;
      o.shurDmg=window.__sakShurDmg(); o.konoDmg=window.__SHURIKEN_DMG();
      o.cdRatio=+(window.__cm(1.35)/window.__sakShurCd()).toFixed(3);
      o.speed=s.speed; o.chichi=window.__CHARS.chichi.speed;
      o.meleeIn=SAK.meleeIn; o.meleeOut=SAK.meleeOut;
      /* mốc đổi thế đánh có ĐỘ TRỄ: vào trong thì đấm, phải ra hẳn ngoài mới ném lại */
      s.sakMelee=false;
      o.m1=window.__sakMode(s,SAK.meleeIn-1);        // vào tầm -> đấm
      o.m2=window.__sakMode(s,SAK.meleeIn+6);        // giữa hai mốc -> VẪN đấm
      o.m3=window.__sakMode(s,SAK.meleeOut+2);       // ra hẳn -> ném
      o.m4=window.__sakMode(s,SAK.meleeIn+6);        // giữa hai mốc -> VẪN ném
      return o;
    });
    near(r.burn5,1.5,.01,'Burning 5s người chơi rút còn 1.5s');
    near(r.exh8,2.4,.01,'Exhausted 8s rút còn 2.4s');
    near(r.slow4,1.2,.01,'Slowed 4s rút còn 1.2s');
    near(r.floor,.25,.01,'sàn 0.25s: hiệu ứng 0.3s không tụt xuống dưới');
    near(r.tiny,.2,.01,'hiệu ứng vốn ngắn hơn sàn thì KHÔNG bị kéo dài ra');
    near(r.stun3,2.1,.01,'Stun 3s chỉ rút còn 2.1s (30%, không phải 70%)');
    near(r.stun1,.7,.01,'Stun 1s chỉ rút còn 0.7s');
    near(r.exhaustReal,2.4,.02,'debuff thật dán lên cô cũng bị cắt đúng 70%');
    near(r.disReal,.9,.02,'Disoriented của Doraemon cũng bị cắt đúng 70%');
    near(r.dotDps,5,.01,'sát thương duy trì GIỮ NGUYÊN dmg mỗi nhịp');
    near(r.dotLeft,1.5,.02,'sát thương duy trì chỉ bị cắt SỐ NHỊP');
    ok(r.refreshNoDrop,'dán lại debuff yếu hơn không cắt ngắn phần đang còn');
    near(r.kbTake,1,.001,'kháng hiệu ứng KHÔNG đụng tới lực đẩy');
    ok(r.shurDmg===Math.round(r.konoDmg*.8),`shuriken bằng 80% Konohamaru (${r.shurDmg}/${r.konoDmg})`);
    near(r.cdRatio,1.15,.005,'ném nhanh hơn Konohamaru đúng 15%');
    near(r.speed/r.chichi,.95,.006,'tốc chạy thấp hơn ChiChi khoảng 5%');
    near(r.meleeIn,78,.01,'mốc vào cận chiến = 1.5 lần đường kính thân');
    near(r.meleeOut,93.6,.01,'mốc ra tầm xa = 1.8 lần đường kính thân');
    ok(r.m1===true&&r.m2===true&&r.m3===false&&r.m4===false,
       'hai thế đánh có ĐỘ TRỄ — đứng giữa hai mốc thì giữ nguyên thế, không nhấp nháy');
    assert(!errors.length,'lỗi trang: '+errors.join(' | '));
    await browser.close();
  }

  /* ---------- 3. đo trong trận: ba chiêu ---------- */
  {
    const {browser,page,errors}=await openGame('sakura','kono');
    await page.waitForTimeout(1200);
    const r=await page.evaluate(()=>{
      const G=window.__G(),RT=window.__LRT,SAK=window.__SAK,o={};
      const s=G.fighters.find(f=>f.key==='sakura'), e=G.fighters.find(f=>f.key==='kono');
      const reset=()=>{ G.over=null;G.endT=0;G.kos.length=0;G.freeze=0;
        s.alive=e.alive=true;s.stun=e.stun=0;s.lock=e.lock=0;
        s.dots.length=0;e.dots.length=0;s.sakAct=null;s.sakCrack=null;s.dash=null;
        s.sakHeal=null;s.sakGap=0;
        e.evade=0;e.invuln=0;e.sakDisrupt=0;e.sakDisruptAfter=0;e.sakHamper=0;
        e.moveMul=1;e.castMul=1; s.cds={s1:0,s2:0,s3:0,basic:0}; s.sakGap=0; s.sakHeal=null; };

      o.cdBurst=+(SAK.cbCd*RT).toFixed(0); o.cdPunch=+(SAK.cpCd*RT).toFixed(0); o.cdHeal=+(SAK.mnCd*RT).toFixed(0);
      reset(); s.x=160;s.y=300;e.x=420;e.y=300;e.hp=800;
      window.__sakBurst(s,e); o.cbCast=+(s.sakAct.t*RT).toFixed(2);
      s.sakAct.t=0; window.__sakuraTick(s,1/120);
      let g=0; while(s.sakCrack&&g++<4000) window.__sakCrackTick(s,1/120);
      o.cbDmg=800-Math.round(e.hp); o.cbStun=+(e.stun*RT).toFixed(2);
      /* cắt ngang lúc gồng: mất chiêu nhưng chỉ chờ một phần hồi chiêu */
      /* đi đúng đường của think(): nạp đủ hồi chiêu TRƯỚC rồi mới gồng chiêu */
      reset(); s.cds.s1=SAK.cbCd; window.__sakBurst(s,e);
      s.stun=1; window.__sakuraTick(s,1/120);
      o.cbBroken=(s.sakAct===null); o.cbBreakCd=+(s.cds.s1*RT).toFixed(2);
      reset(); s.cds.s3=SAK.mnCd; window.__sakMedical(s);
      s.stun=1; window.__sakuraTick(s,1/120);
      o.mnBroken=(s.sakAct===null); o.mnBreakCd=+(s.cds.s3*RT).toFixed(2);

      reset(); e.hp=800; s.x=200;s.y=300;e.x=260;e.y=300;
      window.__sakChargeHit(s,e);
      o.cpDmg=800-Math.round(e.hp); o.cpStun=+(e.stun*RT).toFixed(2);
      const ib=e.dots.find(d=>d.sakIb);
      o.cpIbDps=+(ib.dps/RT).toFixed(2); o.cpIbT=+(ib.left*RT).toFixed(2);
      o.disruptQueued=+(e.sakDisruptAfter*RT).toFixed(2); o.disruptEarly=e.sakDisrupt;
      e.stun=0; window.__sakStatus(e,1/120); o.disruptOpen=+(e.sakDisrupt*RT).toFixed(2);
      e.moveMul=1;e.castMul=1; window.__sakStatus(e,1/120);
      o.disMove=+e.moveMul.toFixed(2); o.disCast=+e.castMul.toFixed(2);
      /* cú lao KHÔNG miễn khống chế */
      reset(); window.__sakPunch(s,e); o.dashGuard=!!(s.dash&&s.dash.guard);
      o.dashSpd=s.dash.spd; o.chichiDash=320;
      s.cds.s2=SAK.cpCd;
      s.stun=1; window.__sakuraTick(s,1/120); o.dashBroken=(s.dash===null);
      o.cdBroke=+(s.cds.s2*RT).toFixed(2); o.brokeFlag=!!s.sakCpBroke;
      /* KHÔNG lao nửa đường: quãng lao tính từ khoảng cách thật, nên từ tầm xa nhất
         (`cpRange`) cú lao vẫn chạm được người. Ghim chân đối thủ rồi chạy tay từng bước. */
      o.reach=[];
      for(const gap of [120,240,320,SAK.cpRange]){
        reset();
        s.x=120; s.y=300; e.x=120+gap; e.y=300; e.lock=999; e.hp=e.maxHp;
        const hp0=e.hp;
        s.cds.s2=SAK.cpCd; window.__sakPunch(s,e);
        let g=0; while(s.dash&&g++<900) window.__step(1/120);
        o.reach.push({gap:Math.round(gap), trung:e.hp<hp0});
      }
      /* đánh trúng thì cờ tắt ⇒ hồi chiêu trở về mức ban đầu */
      reset(); s.sakCpBroke=true;
      s.x=120;s.y=300;e.x=270;e.y=300;e.lock=999;
      s.cds.s2=SAK.cpCd; window.__sakPunch(s,e);
      let gh=0; while(s.dash&&gh++<900) window.__step(1/120);
      o.afterHit=!!s.sakCpBroke;
      /* Internal Bleeding: bản yếu không ghi đè bản mạnh, không cộng dồn */
      reset(); window.__sakIbOn(e,s,SAK.cpIbDps,SAK.cpIbT);
      window.__sakIbOn(e,s,SAK.ibDps,SAK.ibT);
      const ib2=e.dots.find(d=>d.sakIb);
      o.ibKeepStrong=+(ib2.dps/RT).toFixed(2); o.ibCount=e.dots.filter(d=>d.sakIb).length;
      /* Hampered chỉ giảm tốc CHẠY, không đụng tốc thi triển */
      reset(); window.__sakHamperOn(e,s);
      e.moveMul=1;e.castMul=1; window.__sakStatus(e,1/120);
      o.hampMove=+e.moveMul.toFixed(2); o.hampCast=+e.castMul.toFixed(2);

      /* ---- nhịp nghỉ giữa Cherry Blossom Burst và Chakra-Enhanced Punch ---- */
      o.gapWant=+(SAK.skillGap*RT).toFixed(2);
      /* đồng hồ ĐỨNG YÊN khi còn đang gồng, và chỉ trôi khi cô đã rảnh tay */
      reset(); s.sakGap=SAK.skillGap; s.sakAct={kind:'burst',t:9,e};
      for(let i=0;i<60;i++) window.__sakuraTick(s,1/120);
      o.gapFrozen=+(s.sakGap-SAK.skillGap).toFixed(4);
      s.sakAct=null; s.lock=0;
      for(let i=0;i<60;i++) window.__sakuraTick(s,1/120);
      o.gapRuns=+(SAK.skillGap-s.sakGap).toFixed(3);   // giây TRONG TRẬN, không nhân LRT
      /* đo THẬT trong trận: hai chiêu lớn không bao giờ dính vào nhau */
      reset(); s.x=200;s.y=300;e.x=330;e.y=300;e.lock=999;
      e.maxHp=99999;e.hp=99999; s.hp=s.maxHp;
      s.cds={s1:0,s2:0,s3:999,basic:0};
      {
        let t=0,minGap=99,pB=false,pD=false,endAt=-99,starts=0;
        for(let i=0;i<3000;i++){
          window.__step(1/120); t+=1/120; s.hp=s.maxHp; s.cds.s3=999;
          const B=!!s.sakAct, D=!!(s.dash&&s.dash.kind==='sakcharge');
          if((B&&!pB)||(D&&!pD)){ starts++; if(endAt>-90) minGap=Math.min(minGap,t-endAt); }
          if((!B&&pB)||(!D&&pD)) endAt=t;
          pB=B; pD=D;
        }
        o.gapStarts=starts; o.gapMin=minGap>90?null:+(minGap*RT).toFixed(2);
      }

      /* ---- Medical Ninjutsu ghim chân suốt cả chiêu ---- */
      reset(); s.x=200;s.y=300;e.x=460;e.y=300;e.lock=999;
      s.hp=300;s.maxHp=800; s.cds={s1:999,s2:999,s3:999,basic:0};
      window.__sakMedicalGo(s);
      {
        /* Dọn sạch đạn CŨ trước đã: một mũi shuriken ném ra TRƯỚC lúc kết ấn vẫn còn nằm
           trong `G.proj` với `owner===s`, đếm nó là đổ oan. Dot trên người địch cũng vậy. */
        G.proj.length=0; e.dots.length=0;
        /* Đo làm HAI CHẶNG. Chặng đầu cô còn trượt đà — `lock` chỉ tắt vector ĐIỀU KHIỂN,
           còn `dvx/dvy` ease về 0 theo `dt*5.5`, nên cô giảm tốc chứ không đâm vào tường;
           mọi chiêu ghim chân trong game đều vậy (Ginyu Beam, Doraemon ngắm, El Minya),
           ĐỪNG đi tắt vận tốc riêng cho mình cô. Chặng sau mới là thứ cần đo: hết đà thì
           phải ĐỨNG IM HẲN. Đo kiểu này không phụ thuộc lúc trước cô đang chạy nhanh cỡ
           nào — gỡ `lock` ra là cô đi tiếp suốt và mục này đổ ngay. */
        let px=s.x,py=s.y,shot=false,n=0; const fh=e.hp, buoc=[];
        while(s.sakHeal&&n++<3000){
          window.__step(1/120);
          buoc.push(Math.hypot(s.x-px,s.y-py)); px=s.x; py=s.y;
          if(G.proj.some(p=>p.owner===s)) shot=true;
        }
        /* Cắt ở NỬA SAU của chuỗi nhịp, không cắt theo số tick: đà tắt trong chừng 0.4
           giây (`dvx` bị snap về 0 khi dưới 1.5px/s), mà mốc theo tick thì rơi vào đúng
           giữa quãng trượt và đo lẫn cả phần đang giảm tốc. */
        const cut=Math.floor(buoc.length/2);
        o.healCoast=+buoc.slice(0,cut).reduce((a,b)=>a+b,0).toFixed(2);
        o.healStill=+buoc.slice(cut).reduce((a,b)=>a+b,0).toFixed(2);
        o.healShot=shot; o.healFrames=n;
        o.healFoeLost=Math.round(fh-e.hp); o.healLockGone=+s.lock.toFixed(3);
        o.healDone=!s.sakHeal;
      }

      reset(); s.hp=400;s.maxHp=800; s.sakHeal=null;
      window.__sakMedicalGo(s);
      o.mnTick=Math.round(s.sakHeal.self); o.mnN=s.sakHeal.left;
      o.mnSolo=SAK.mnSolo; o.mnShare=SAK.mnShare; o.mnTicks=SAK.mnTicks;
      /* lượng hồi KHÔNG được ăn theo máu đang thiếu nữa */
      s.hp=600; s.sakHeal=null; window.__sakMedicalGo(s); o.mnFlatLow=Math.round(s.sakHeal.self);
      s.hp=100; s.sakHeal=null; window.__sakMedicalGo(s); o.mnFlatHigh=Math.round(s.sakHeal.self);
      s.hp=400; s.sakHeal=null; window.__sakMedicalGo(s);
      const h0=s.hp; let g2=0; while(s.sakHeal&&g2++<6000) window.__sakHealTick(s,1/120);
      o.mnTotal=Math.round(s.hp-h0);
      /* không overheal */
      s.hp=s.maxHp-5; s.sakHeal=null; window.__sakMedicalGo(s);
      let g3=0; while(s.sakHeal&&g3++<6000) window.__sakHealTick(s,1/120);
      o.noOverheal=s.hp<=s.maxHp;
      return o;
    });
    near(r.cbCast,.75,.01,'Cherry Blossom Burst gồng đúng 0.75s');
    ok(r.cdBurst===11&&r.cdPunch===13&&r.cdHeal===18,
       `hồi chiêu đã nới: burst ${r.cdBurst}s · punch ${r.cdPunch}s · heal ${r.cdHeal}s`);
    ok(r.cdHeal>=2*9,`Medical Ninjutsu hồi chiêu GẤP ĐÔI bản đầu (9s ⇒ ${r.cdHeal}s) — hết hồi máu liên tục`);
    ok(r.cbDmg===25,`Cherry Blossom Burst gây đúng 25 dmg (đo ${r.cbDmg})`);
    near(r.cbStun,3,.02,'Cherry Blossom Burst choáng 3s');
    ok(r.cbBroken,'bị choáng lúc gồng thì Cherry Blossom Burst đứt');
    near(r.cbBreakCd,4,.02,'Cherry Blossom Burst đứt thì chỉ chờ 4s chứ không phải cả 11s');
    ok(r.mnBroken,'bị choáng lúc kết ấn thì Medical Ninjutsu đứt');
    near(r.mnBreakCd,4,.02,'Medical Ninjutsu đứt thì chỉ chờ 4s chứ không phải cả 18s');
    ok(r.cpDmg===30,`Chakra-Enhanced Punch gây đúng 30 dmg (đo ${r.cpDmg})`);
    near(r.cpStun,3.5,.02,'Chakra-Enhanced Punch choáng 3.5s');
    near(r.cpIbDps,5,.01,'Internal Bleeding của chiêu 2 là 5 dmg/s');
    near(r.cpIbT,5,.02,'Internal Bleeding của chiêu 2 kéo 5s');
    near(r.disruptQueued,6,.02,'Chakra Disruption xếp hàng 6s');
    ok(r.disruptEarly===0,'Chakra Disruption CHƯA chạy khi còn đang choáng');
    near(r.disruptOpen,6,.02,'hết choáng thì Chakra Disruption mới mở ra');
    near(r.disMove,.5,.01,'Chakra Disruption −50% tốc chạy');
    near(r.disCast,.6,.01,'Chakra Disruption −40% tốc thi triển');
    ok(r.dashGuard===false,'cú lao KHÔNG miễn khống chế (không có cờ guard)');
    near(r.dashSpd/r.chichiDash,1.2,.001,'cú lao nhanh bằng 120% dash của ChiChi');
    ok(r.dashBroken,'dính choáng giữa cú lao thì bị chặn đứng');
    near(r.cdBroke,13*.5,.05,`bị ngắt thì lần sau chỉ chờ nửa hồi chiêu (đo ${r.cdBroke}s trên 13s)`);
    ok(r.brokeFlag,'bị ngắt thì bật cờ sakCpBroke');
    ok(r.reach.every(x=>x.trung),
       `cú lao TỚI ĐƯỢC địch ở mọi tầm, không lao nửa đường (${r.reach.map(x=>x.gap+'px'+(x.trung?'✓':'✗')).join(' · ')})`);
    ok(r.afterHit===false,'đánh trúng thì cờ tắt — hồi chiêu trở về mức ban đầu');
    near(r.ibKeepStrong,5,.01,'bản Internal Bleeding yếu KHÔNG ghi đè bản mạnh');
    ok(r.ibCount===1,'Internal Bleeding không cộng dồn — chỉ một lớp');
    near(r.hampMove,.75,.01,'Hampered −25% tốc chạy');
    near(r.hampCast,1,.01,'Hampered KHÔNG đụng tốc thi triển');
    ok(r.gapFrozen===0,'nhịp nghỉ ĐỨNG YÊN trong lúc còn đang gồng chiêu');
    near(r.gapRuns,.5,.02,'nhịp nghỉ chỉ trôi khi cô đã rảnh tay (0.5s trong trận)');
    ok(r.gapStarts>=2,`hai chiêu lớn có tung ra thật trong lúc đo (${r.gapStarts} lượt)`);
    ok(r.gapMin!==null&&r.gapMin>=r.gapWant-.05,
       `Cherry Blossom Burst và Chakra-Enhanced Punch không bao giờ dính nhau — cách nhau ít nhất ${r.gapWant}s (đo ${r.gapMin}s)`);
    /* Vài pixel trượt đà là chuyện bình thường của mọi chiêu ghim chân trong game: `lock`
       chỉ tắt vector ĐIỀU KHIỂN, còn `dvx/dvy` thì ease về 0 theo `dt*5.5` — cô dừng lại
       chứ không đâm vào tường. Mọi chiêu ghim chân trong game đều trượt đà y như vậy
       (Ginyu Beam, Doraemon ngắm, El Minya), nên ĐỪNG đi tắt riêng vận tốc cho mình cô:
       làm thế là cô khựng lại kiểu khác hẳn cả bảng. Cái cần đo là cô KHÔNG BƯỚC ĐI, nên
       so với chính cô lúc rảnh chân trong cùng bấy nhiêu nhịp — gỡ `lock` ra là hai con số
       bằng nhau và mục này đổ. */
    ok(r.healStill<.5,     // dưới nửa pixel: đó là nhiễu số thực, không phải bước chân
       `hết đà là ĐỨNG IM HẲN tới cuối chiêu (trượt đà ${r.healCoast}px rồi đi thêm đúng ${r.healStill}px trong ${r.healFrames} nhịp)`);
    ok(r.healShot===false&&r.healFoeLost===0,'đang hồi máu thì không ném, không đánh, không tung chiêu');
    ok(r.healDone&&r.healLockGone===0,'nhịp cuối rơi xuống là cởi khoá ngay, không ghim chân thừa');
    const pc=v=>+(v*100).toFixed(1);
    ok(r.mnTick===Math.round(800*r.mnSolo)&&r.mnN===r.mnTicks,
       `Medical Ninjutsu ${r.mnTicks} nhịp × ${pc(r.mnSolo)}% MÁU TỐI ĐA (đo ${r.mnTick}/nhịp trên thanh 800)`);
    ok(r.mnTotal===Math.round(800*r.mnSolo*r.mnTicks),
       `Medical Ninjutsu hồi tổng ${pc(r.mnSolo*r.mnTicks)}% máu tối đa (đo ${r.mnTotal}/800)`);
    /* Lối cũ đo theo máu ĐANG THIẾU nên càng sắp gục càng hồi mạnh — đúng chỗ đã cắt.
       Giờ con số phải PHẲNG: thiếu 400 hay thiếu 700 cũng bấy nhiêu. */
    ok(r.mnFlatLow===r.mnFlatHigh,
       `lượng hồi PHẲNG, không ăn theo máu đang thiếu (thiếu 200 ⇒ ${r.mnFlatLow}/nhịp · thiếu 700 ⇒ ${r.mnFlatHigh}/nhịp)`);
    ok(+(r.mnShare*2).toFixed(4)===+r.mnSolo.toFixed(4),
       `phần chia cho đồng đội đúng bằng NỬA phần hồi một mình (${pc(r.mnShare)}% × 2 = ${pc(r.mnSolo)}%)`);
    ok(r.noOverheal,'Medical Ninjutsu không bao giờ overheal');
    assert(!errors.length,'lỗi trang: '+errors.join(' | '));
    await browser.close();
  }

  /* ---------- 4. Strength of a Hundred Seal ---------- */
  {
    const {browser,page,errors}=await openGame('sakura','kono');
    await page.waitForTimeout(1200);
    const r=await page.evaluate(()=>{
      const G=window.__G(),RT=window.__LRT,SAK=window.__SAK,o={};
      const s=G.fighters.find(f=>f.key==='sakura'), e=G.fighters.find(f=>f.key==='kono');
      const reset=()=>{ G.over=null;G.endT=0;G.kos.length=0;G.freeze=0;
        s.alive=e.alive=true;s.stun=0;s.lock=0;s.dots.length=0;s.sakAct=null;
        s.dash=null;s.invuln=0;s.moveMul=1;s.castMul=1;s.dmgTake=1;s.katsuyu=0; };
      reset(); s.hp=60;s.maxHp=800;s.sakSealDone=false;s.sakSeal=0;
      window.__hurt(s,500,e);
      o.hp=Math.round(s.hp); o.want=Math.floor(800*.12);
      o.dur=+(s.sakSeal*RT).toFixed(1); o.freeze=+(G.freeze*RT).toFixed(2);
      o.invuln=s.invuln; o.alive=s.alive;
      /* máu tối đa LẺ: phải floor để chạm đúng mốc model tơi tả */
      s.sakSealDone=false;s.sakSeal=0;s.maxHp=999;s.hp=5; window.__sakSealOn(s);
      o.odd=Math.round(s.hp); o.oddUnder=s.hp<=s.maxHp*.20; s.maxHp=800;
      /* Byakugo */
      s.hp=800;s.dmgTake=1; window.__hurt(s,100,e,false,'big'); o.take=Math.round(800-s.hp);
      s.stun=0; o.ccImmune=(window.__stunFx(s,3,'spin')===false&&s.stun===0);
      s.moveMul=1;s.castMul=1; window.__sakStatus(s,1/120);
      o.move=+s.moveMul.toFixed(2);
      o.cast=+(1/window.__sakCastMul(s)).toFixed(2); o.cdUntouched=+s.castMul.toFixed(2);
      s.exhaust=4;s.sakHamper=3;s.dots.push({dps:9,left:4,acc:0,src:e,tint:'red'});
      window.__sakResTick(s,1/120);
      o.clean=(s.exhaust===0&&s.sakHamper===0&&s.dots.length===0);
      s.hp=400;s.maxHp=800;s.katsuyu=10;s.katsuyuOwner=s;
      const b=s.hp; window.__sakRegenTick(s,1/RT); o.regen=+(s.hp-b).toFixed(2);
      /* Mốc đọc THẲNG từ hằng số, đừng ghim con số: Katsuyu theo máu TỐI ĐA cộng Byakugo
         theo máu ĐANG THIẾU, cả hai đo bằng giây NGƯỜI CHƠI nên phải nhân RT. */
      o.regenWant=+((800*SAK.katsuyu+400*SAK.byakugo)/RT).toFixed(2);
      /* combo NHIỀU HIT vẫn giết được — không có lớp chặn thứ hai */
      reset(); s.hp=50;s.sakSealDone=false;s.sakSeal=0;
      window.__hurt(s,400,e); o.first=Math.round(s.hp);
      window.__hurt(s,400,e); o.dead=(s.alive===false&&s.hp<=0);
      /* chỉ một lần mỗi trận */
      G.over=null;G.endT=0;G.kos.length=0;s.alive=true;s.hp=800;
      o.again=window.__sakCanSeal(s);

      /* ---- Chakra Exhaustion: cái giá của Byakugo ---- */
      reset(); s.hp=300;s.maxHp=800;s.sakSealDone=false;s.sakSeal=0;s.sakExh=0;
      window.__sakSealOn(s); s.sakSealAnim=0;
      s.sakSeal=.001; window.__sakuraTick(s,.002);      // ép dấu ấn hết
      o.exhStart=+(s.sakExh*RT).toFixed(1); o.sealGone=s.sakSeal;
      s.moveMul=1;s.castMul=1; window.__sakStatus2(s,1/120);
      o.exhMove=+s.moveMul.toFixed(2); o.exhCast=+s.castMul.toFixed(2);
      o.exhWind=+window.__sakCastMul(s).toFixed(2);     // 2 = quãng gồng dài gấp đôi
      /* KHÔNG được để chính Medical Expertise cắt 70% hình phạt của mình */
      o.exhInList=window.__SAK_DEBUFFS.indexOf('sakExh')>=0;
      window.__sakResTick(s,1/120);
      o.exhAfterRes=+(s.sakExh*RT).toFixed(1);
      /* chỉ còn đòn thường + Chakra-Enhanced Punch */
      const C=window.__CHARS.sakura;
      e.x=s.x+200; e.y=s.y; e.alive=true;
      s.cds={s1:0,s2:0,s3:0,basic:0}; s.sakGap=0; s.sakHeal=null; s.hp=200; s.sakAct=null; s.sakCrack=null; s.dash=null; s.sakHeal=null;
      C.think(s,e,200,true);
      o.exhBurstOff=(s.sakCrack===null&&s.sakAct===null&&s.cds.s1===0);
      s.cds={s1:0,s2:0,s3:0,basic:0}; s.sakGap=0; s.sakHeal=null; s.sakAct=null; s.dash=null;
      C.think(s,e,200,true);
      o.exhHealOff=!s.sakHeal;
      o.exhPunchOn=!!s.dash||s.cds.s2>0;
      /* hết tê liệt thì VỀ BÌNH THƯỜNG, không phải chờ thêm */
      s.sakExh=.001; window.__sakuraTick(s,.002);
      s.moveMul=1;s.castMul=1; window.__sakStatus2(s,1/120);
      o.backMove=+s.moveMul.toFixed(2); o.backCast=+s.castMul.toFixed(2);
      s.cds={s1:0,s2:0,s3:0,basic:0}; s.sakGap=0; s.sakHeal=null; s.sakAct=null; s.sakCrack=null; s.hp=200;
      C.think(s,e,200,true);
      o.backBurst=(s.cds.s1>0||!!s.sakAct);
      return o;
    });
    ok(r.hp===r.want,`máu về ĐÚNG 12% máu tối đa (đo ${r.hp})`);
    near(r.dur,10,.05,'Byakugo chạy 10s');
    ok(r.freeze>0,`có phân cảnh FOCUS lúc mở dấu ấn (đóng băng ${r.freeze}s)`);
    ok(r.invuln===0,'KHÔNG có khung bất tử sau khi dấu ấn mở');
    ok(r.odd===119&&r.oddUnder,'máu tối đa lẻ thì floor, vẫn chạm mốc model tơi tả');
    ok(r.take===65,`Byakugo giảm 35% sát thương (100 raw ⇒ ${r.take})`);
    ok(r.ccImmune,'Byakugo miễn khống chế 100%');
    near(r.move,2,.01,'Byakugo tốc chạy gấp đôi');
    near(r.cast,2.75,.01,'Byakugo tốc thi triển 275%');
    near(r.cdUntouched,1,.01,'tốc thi triển KHÔNG ăn vào hồi chiêu');
    ok(r.clean,'Byakugo gạt sạch mọi debuff mới');
    /* Nới một nhịp: Byakugo tính theo máu ĐANG THIẾU mà Katsuyu vừa hồi một phần trong
       cùng lượt gọi, nên số đo hụt mốc lý thuyết chừng 0.2 máu. */
    near(r.regen,r.regenWant,.5,
         `Katsuyu ${+(r.regenWant).toFixed(2)} máu mỗi giây = % máu tối đa + % máu đang thiếu`);
    ok(r.first===96&&r.dead,'combo NHIỀU HIT vẫn giết được ngay sau khi dấu ấn mở');
    ok(r.again===false,'Strength of a Hundred Seal chỉ dùng được một lần mỗi trận');
    near(r.exhStart,10,.05,'hết Byakugo là rơi THẲNG vào Chakra Exhaustion 10s');
    ok(r.sealGone===0,'dấu ấn tắt hẳn khi quãng tê liệt bắt đầu');
    near(r.exhMove,.5,.01,'Chakra Exhaustion −50% tốc chạy');
    near(r.exhCast,.5,.01,'Chakra Exhaustion −50% tốc thi triển');
    near(r.exhWind,2,.01,'quãng gồng của chính cô dài gấp đôi khi cạn chakra');
    ok(r.exhInList===false,'`sakExh` KHÔNG nằm trong SAK_DEBUFFS — hình phạt của chính cô');
    near(r.exhAfterRes,10,.05,'Medical Expertise KHÔNG tự cắt ngắn quãng tê liệt của mình');
    ok(r.exhBurstOff,'cạn chakra thì Cherry Blossom Burst không tung được');
    ok(r.exhHealOff,'cạn chakra thì Medical Ninjutsu không tung được');
    ok(r.exhPunchOn,'cạn chakra vẫn còn đòn thường và Chakra-Enhanced Punch');
    ok(r.backMove===1&&r.backCast===1,'hết tê liệt là hệ số về đúng bình thường');
    ok(r.backBurst,'hết tê liệt thì mở lại đủ bộ chiêu, không phải chờ thêm');
    assert(!errors.length,'lỗi trang: '+errors.join(' | '));
    await browser.close();
  }

  /* ---------- 5. đánh đội: chia đôi hồi máu, Katsuyu Fragment ---------- */
  {
    const {browser,page,errors}=await openMulti('team',[['sakura','tsubasa'],['kono','chichi']]);
    await page.waitForTimeout(1500);
    const r=await page.evaluate(()=>{
      const G=window.__G(),RT=window.__LRT,SAK=window.__SAK,o={};
      const s=G.fighters.find(f=>f.key==='sakura'), a=G.fighters.find(f=>f.key==='tsubasa');
      G.over=null;G.endT=0;G.kos.length=0;s.alive=a.alive=true;
      s.hp=400;s.maxHp=800;a.hp=200;a.maxHp=800;s.sakHeal=null;
      o.low=(window.__sakLowAlly(s)||{}).key;
      window.__sakMedicalGo(s);
      o.selfTick=Math.round(s.sakHeal.self); o.allyTick=Math.round(s.sakHeal.allyAmt);
      o.share=SAK.mnShare; o.ticks=SAK.mnTicks;
      const h0=s.hp,a0=a.hp; let g=0;
      while(s.sakHeal&&g++<6000) window.__sakHealTick(s,1/120);
      o.selfTotal=Math.round(s.hp-h0); o.allyTotal=Math.round(a.hp-a0);
      s.hp=400;a.hp=200;a.alive=true;s.sakHeal=null; window.__sakMedicalGo(s);
      window.__sakHealTick(s,999); a.alive=false;
      const a1=a.hp; let g2=0; while(s.sakHeal&&g2++<6000) window.__sakHealTick(s,1/120);
      o.deadGains=Math.round(a.hp-a1);
      s.sakSealDone=false;s.sakSeal=0;s.hp=80;a.alive=true;a.hp=300;
      window.__sakSealOn(s);
      o.kSelf=+(s.katsuyu*RT).toFixed(1); o.kAlly=+(a.katsuyu*RT).toFixed(1);
      const ab=a.hp; window.__sakRegenTick(a,1/RT); o.allyRegen=+(a.hp-ab).toFixed(2);
      /* Mốc đọc THẲNG từ hằng số: đồng đội CHỈ nhận Katsuyu (theo máu tối đa), tuyệt đối
         không nhận Byakugo (theo máu đang thiếu) — nên mốc không có vế máu thiếu nào. */
      o.allyWant=+(a.maxHp*SAK.katsuyu/RT).toFixed(2);
      s.sakSeal=0; const ab2=a.hp; window.__sakRegenTick(a,1/RT);
      o.afterEnd=+(a.hp-ab2).toFixed(2); o.gone=a.katsuyu;
      return o;
    });
    ok(r.low==='tsubasa','Medical Ninjutsu chọn đồng đội có tỉ lệ máu thấp nhất');
    ok(r.selfTick===Math.round(800*r.share)&&r.allyTick===Math.round(800*r.share),
       `hệ số ${+(r.share*100).toFixed(1)}% chia đôi, tính theo máu TỐI ĐA của từng người (${r.selfTick} / ${r.allyTick})`);
    ok(r.selfTotal===Math.round(800*r.share*r.ticks)&&r.allyTotal===Math.round(800*r.share*r.ticks),
       `mỗi người nhận đủ ${+(r.share*r.ticks*100).toFixed(1)}% máu tối đa của chính mình (${r.selfTotal} / ${r.allyTotal})`);
    ok(r.deadGains===0,'đồng đội chết giữa chừng thì phần hồi của họ mất hẳn, không dồn sang ai');
    ok(r.kSelf===10&&r.kAlly===10,'Katsuyu bên Sakura và Katsuyu Fragment bên đồng đội');
    near(r.allyRegen,r.allyWant,.2,
         `đồng đội CHỈ nhận Katsuyu (${r.allyWant} máu/giây theo máu tối đa), không nhận Byakugo`);
    ok(r.afterEnd===0&&r.gone===0,'Byakugo hết là Katsuyu biến mất, hồi máu đồng đội dừng ngay');
    assert(!errors.length,'lỗi trang: '+errors.join(' | '));
    await browser.close();
  }

  /* ---------- 6. đánh thật một trận, và bản dựng play.html ---------- */
  {
    const {browser,page,errors}=await openGame('sakura','chichi');
    await page.waitForTimeout(9000);
    const r=await page.evaluate(()=>{
      const G=window.__G(); const s=G.fighters.find(f=>f.key==='sakura');
      return {t:+G.t.toFixed(1),dealt:Math.round(s.dmgDealt||0),moved:s.x!==undefined};
    });
    ok(r.t>0&&r.dealt>0,`đánh thật một trận: ${r.t}s trong trận, gây ${r.dealt} dmg, không lỗi trang`);

    /* Ô dán ảnh: Byakugo có hai ô RIÊNG (đứng tạo dáng và ra đòn), tách hẳn khỏi ô
       `seal` vốn chỉ là khoảnh khắc mở dấu ấn, và khỏi ô `heal` là dáng kết ấn. */
    const sl=await page.evaluate(()=>{
      const S=window.__SETS.find(x=>x.key==='sakura');
      const G=window.__G(), s=G.fighters.find(f=>f.key==='sakura'), o={};
      o.poses=S?S.poses.map(p=>p[0]):null;
      /* dấu ấn mở ⇒ đứng không thì đổi sang dáng riêng của form; hết dấu ấn thì trả lại */
      s.sakSeal=0;s.sakSealDone=false;s.sakAct=null;s.dash=null;s.sakSealAnim=0;
      s.pose='idle';s.poseT=0; s.sakSeal=5;
      window.__sakuraTick(s,1/120); o.inSeal=s.pose;
      s.pose='punch'; window.__sakuraTick(s,1/120); o.keepsAtk=s.pose;
      s.pose='byakugo'; s.sakSeal=1/240; window.__sakuraTick(s,1/120); o.afterSeal=s.pose;
      return o;
    });
    ok(sl.poses&&['heal','seal','byakugo','sealatk'].every(k=>sl.poses.includes(k)),
       `có ô dán ảnh riêng cho kết ấn, lúc mở dấu ấn, và cả hai dáng của form Byakugo (${sl.poses?sl.poses.join(','):'không có'})`);
    ok(sl.inSeal==='byakugo',`đứng không trong Byakugo thì dùng dáng riêng của form (đo ${sl.inSeal})`);
    ok(sl.keepsAtk==='punch','đang ra đòn thì KHÔNG bị dáng form đè lên — animation đánh nhau còn nguyên');
    ok(sl.afterSeal==='idle',`hết dấu ấn là trả lại thế thủ thường (đo ${sl.afterSeal})`);
    assert(!errors.length,'lỗi trang: '+errors.join(' | '));
    await browser.close();
  }
  const play=fs.readFileSync('play.html','utf8');
  ok(src.includes('pw:{dmg:40,dur:82,mob:40,as:42,rng:70,cc:72,uti:84,con:76,cmb:84}'),
     'power chart đã kéo xuống theo đợt nerf: dur 82 · mob 40 · as 42 · cc 72 · uti 84 · con 76 · cmb 84');
  ok(play.includes("name:'Haruno Sakura'"),'bản dựng play.html có Sakura');
  ok(play.includes('function sakResTick'),'bản dựng play.html có cửa kháng hiệu ứng');

  console.log(`\nHaruno Sakura: PASS (${pass} mục)`);
})().catch(e=>{ console.error('\nFAIL:',e.message); process.exit(1); });
