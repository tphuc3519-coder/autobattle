from pathlib import Path
import re

P = Path('index.html')
s = P.read_text(encoding='utf-8')


def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n < count:
        raise SystemExit(f'missing marker: {old[:120]!r} (found {n}, need {count})')
    s = s.replace(old, new, count)


def sub(pattern, repl, count=1, flags=0):
    global s
    s2, n = re.subn(pattern, repl, s, count=count, flags=flags)
    if n != count:
        raise SystemExit(f'regex marker failed: {pattern!r} (changed {n}, need {count})')
    s = s2


# ---------- roster / shared data ----------
s = s.replace('Đấu trường đa vũ trụ · 11 đấu thủ · 12 màn', 'Đấu trường đa vũ trụ · 12 đấu thủ · 12 màn')
s = s.replace('Cross-universe arena · 11 fighters · 12 stages', 'Cross-universe arena · 12 fighters · 12 stages')
s = s.replace('11 fighters · 12 stages · auto battle', '12 fighters · 12 stages · auto battle')
rep(
"const SPR={stages:{},kono:{},chichi:{},tsubasa:{},shika:{},suzune:{},ginyu:{},dora:{},superman:{},beatrice:{},tanjiro:{},gojo:{},ayanokouji:{},nara:{},garden:{},goku:{},gohan:{},hyuga:{},misaki:{},wakabayashi:{},ishizaki:{}};",
"const SPR={stages:{},kono:{},chichi:{},tsubasa:{},shika:{},suzune:{},ginyu:{},dora:{},superman:{},beatrice:{},tanjiro:{},gojo:{},conan:{},ayanokouji:{},nara:{},garden:{},goku:{},gohan:{},hyuga:{},misaki:{},wakabayashi:{},ishizaki:{}};"
)
rep(
"const COLORS={kono:'#63B4FF',chichi:'#FF4D6D',tsubasa:'#2ED573',shika:'#9B8CFF',suzune:'#7FC8FF',ginyu:'#A05CFF',dora:'#2B9BE8',superman:'#2E5BD8',beatrice:'#C77DFF',tanjiro:'#39B87F',gojo:'#78D9FF'};",
"const COLORS={kono:'#63B4FF',chichi:'#FF4D6D',tsubasa:'#2ED573',shika:'#9B8CFF',suzune:'#7FC8FF',ginyu:'#A05CFF',dora:'#2B9BE8',superman:'#2E5BD8',beatrice:'#C77DFF',tanjiro:'#39B87F',gojo:'#78D9FF',conan:'#4B8BFF'};"
)
rep(
"const HP={kono:800,chichi:800,tsubasa:800,shika:800,suzune:800,ginyu:800,dora:800,superman:800,beatrice:800,tanjiro:HP_STD,gojo:HP_STD};",
"const HP={kono:800,chichi:800,tsubasa:800,shika:800,suzune:800,ginyu:800,dora:800,superman:800,beatrice:800,tanjiro:HP_STD,gojo:HP_STD,conan:HP_STD};"
)

# Sprite upload slots: all player-facing labels for Conan are English.
sub(
    r"(^\s*\{key:'gojo', name:'Satoru Gojo', poses:.*$)",
    r"\1\n  {key:'conan', name:'Conan Edogawa', poses:[['idle','Idle'],['board','Turbo Engine Skateboard entry'],['jump','Jump off skateboard'],['stop','Stop skateboard with foot'],['adjust','Adjust glasses'],['basic','Soccer Ball Shot'],['kick','Power-Enhancing Kick Shoes'],['watch','Stun-Gun Wristwatch'],['skate','Turbo Engine Skateboard'],['ultimate','One Truth Prevails'],['hurt','Hit reaction'],['win','Victory'],['down','Defeat']]},",
    flags=re.M
)

# Search aliases used by the asset helper.
rep(
"  gojo:['satoru gojo','gojo','satoru'],",
"  gojo:['satoru gojo','gojo','satoru'],\n  conan:['conan edogawa','conan','edogawa','detective conan'],"
)

# ---------- Conan constants ----------
CONAN_CONST = r'''
/* ---------- Conan Edogawa ----------
   Strategist / Controller. All player-facing names, skills, statuses and battle copy for
   Conan stay in English. Maximum HP is deliberately absent here: mkChar() reads the
   shared HP.conan entry, exactly like the other modern fighters. */
const CONAN={
  entranceT:gs(1.5), entrancePh:[gs(.6),gs(1),gs(1.3),gs(1.5)],
  clueMax:4, observeRange:520,
  basicDmg:18, basicCd:gs(.9), basicWind:gs(.16), basicSpeed:490, basicRange:430,
  kickDmg:85, kickCd:gs(7), kickWind:gs(.6), kickSpeed:540, kickStun:gs(.8), kickKb:690,
  needleDmg:5, needleCd:gs(10), needleWind:gs(.32), needleSpeed:610,
  drowsyT:gs(.8), sleepT:gs(2.5), wakeDmg:60, groggyT:gs(2),
  skateCd:gs(9), skateT:gs(1.8), skateMove:2.5, skateTake:.50, skateDmg:35, skatePush:470,
  ultDmg:140, ultCd:gs(12), ultWind:gs(1.2), ultSpeed:560, ultDown:gs(1.5), ultKb:610,
  weakT:gs(5), weakTake:1.20, weakAcc:.75,
  midMin:175, midMax:285
};
'''
rep('const CHARS={', CONAN_CONST + '\nconst CHARS={')

# ---------- Conan roster contract ----------
CONAN_CHAR = r'''
  ,conan:{
    name:'Conan Edogawa', short:'Conan', tag:'Strategist · Controller · Ranged – Analysis – Precision', emoji:'🔎', color:'#4B8BFF', alt:'#FF4A4A',
    role:'ranged', want:225, speed:106, dodge:.78, male:true, spriteH:88,
    skills:[
      `<b>Entrance · Turbo Engine Skateboard</b> Exactly ${rts(CONAN.entranceT)}s: skate in, jump off, stop the board with one foot, then adjust the glasses. Every opponent waits until the sequence ends.`,
      `<b>Special Mechanic · Detective's Insight</b> Conan tracks up to ${CONAN.clueMax} <b>Clue</b> stacks separately on every enemy. A Clue is gained when that enemy uses an active skill inside observation range, when Conan lands three Soccer Ball Shots on that same enemy, when the Stun-Gun Wristwatch hits, or once per Skateboard use when that enemy misses Conan. Clues do not increase damage or apply a debuff. At four stacks: <b>Case Solved</b>.`,
      `<b>Basic · Soccer Ball Shot</b> ${CONAN.basicDmg} damage every ${rts(CONAN.basicCd)}s. The Anywhere Ball Dispensing Belt creates and inflates the ball before Conan kicks it in a straight line. It stops on the first fighter and never stuns or knocks back. Every third landed basic on the same target adds one Clue.`,
      `<b>1 · Power-Enhancing Kick Shoes</b> ${CONAN.kickDmg} damage · ${rts(CONAN.kickCd)}s cooldown. After ${rts(CONAN.kickWind)}s Conan kicks a larger belt-made ball in a fixed straight line. It hits the first fighter, knocks them back about 18% of the arena, stuns for ${rts(CONAN.kickStun)}s and interrupts stationary wind-ups. If Conan is stunned before the kick, the ball disappears and only 50% cooldown remains.`,
      `<b>2 · Stun-Gun Wristwatch</b> ${CONAN.needleDmg} damage · ${rts(CONAN.needleCd)}s cooldown. One straight tranquilizer needle stops on the first fighter. A hit adds one Clue, applies <b>Drowsy</b> for ${rts(CONAN.drowsyT)}s (−50% move, −30% cast speed), then <b>Asleep</b> for ${rts(CONAN.sleepT)}s. Sleep ends early after ${CONAN.wakeDmg} damage; an early wake applies <b>Groggy</b> for ${rts(CONAN.groggyT)}s (−30% move, −20% cast speed).`,
      `<b>3 · Turbo Engine Skateboard</b> ${rts(CONAN.skateT)}s · ${rts(CONAN.skateCd)}s cooldown. +150% move speed, −50% damage taken and movement ignores slow/root, but Conan is not invulnerable and can still be stunned or knocked down. He cannot basic attack or use another gadget while riding. The first collision deals ${CONAN.skateDmg} damage and pushes sideways without stun.`,
      `<b>Ultimate · One Truth Prevails</b> ${CONAN.ultDmg} damage · ${rts(CONAN.ultCd)}s cooldown. <b>Locked – Gather 4 Clues</b>. It can only target an enemy with <b>Case Solved</b>. Conan locks them with Criminal Tracking Glasses, distracts them with the Voice-Changing Bowtie, says “One Truth Prevails!”, then banks a large ball off the arena wall into their blind spot. A hit knocks down for ${rts(CONAN.ultDown)}s and applies <b>Weakness Exposed</b> for ${rts(CONAN.weakT)}s: +20% damage from Conan only and −25% accuracy. Teleport, invulnerability, Absolute Barrier or instant reposition can still avoid it; a block or miss still consumes all four Clues.`
    ],
    init(f){
      f.cds={s1:0,s2:0,s3:0,s4:0,basic:0};
      f.conanEntry=null; f.conanAct=null; f.conanShots=[]; f.conanSkate=null;
      f.conanClues=new Map(); f.conanBasicHits=new Map(); f.conanSeenCds=new Map(); f.conanDamageBy=new Map();
      f.conanWonSaid=false; conanEnter(f);
    },
    think(f,e,d,auto){
      if(f.conanEntry||f.conanAct||f.conanSkate)return;
      e=nearestFoe(f); if(!e)return; d=dist(f,e);
      const solved=conanSolvedTarget(f);
      if(f.cds.s4<=0&&solved&&(auto||keys['u'])){ f.cds.s4=CONAN.ultCd; conanUltimate(f,solved); return; }
      if(f.cds.s2<=0&&d<=CONAN.basicRange&&(auto||keys['k'])){ f.cds.s2=CONAN.needleCd; conanNeedle(f,e); return; }
      if(f.cds.s1<=0&&d<=CONAN.basicRange&&(auto||keys['j'])){ f.cds.s1=CONAN.kickCd; conanKick(f,e); return; }
      if(f.cds.s3<=0&&(auto?d<165:keys['l'])){ f.cds.s3=CONAN.skateCd; conanSkateboard(f,e); return; }
      if(auto&&f.cds.basic<=0&&d<=CONAN.basicRange) conanBasic(f,e);
    },
    gauge:f=>{
      const solved=conanSolvedTarget(f), n=conanBestClueCount(f);
      if(solved){
        const w=Math.max(0,f.cds.s4||0);
        return {pct:w<=0?1:clamp(1-w/CONAN.ultCd,0,1),fill:'#FF4A4A',txt:w<=0?'Case Solved – One Truth Prevails ready':`Case Solved – ${(w*RT).toFixed(1)}s`};
      }
      return {pct:n/CONAN.clueMax,fill:'#4B8BFF',txt:n?`Clue ×${n}`:'Locked – Gather 4 Clues'};
    }
  }
'''
rep('\n};\nconst CKEYS=Object.keys(CHARS);', CONAN_CHAR + '\n};\nconst CKEYS=Object.keys(CHARS);')

# ---------- character detail / power chart ----------
CONAN_DEX = r'''
  ,conan:{ role:{vi:'Strategist · Controller',en:'Strategist · Controller'}, st:{pow:3,spd:4,rng:4,def:2},
    pw:{dmg:58,dur:46,mob:82,as:76,rng:78,cc:88,uti:94,con:72,cmb:20},
    bio:{vi:'A ranged strategist who wins by reading opponents rather than overpowering them. Clues are tracked per enemy; four unlock Case Solved and the conditional One Truth Prevails finisher. No low-HP transformation, healing or resurrection.',
         en:'A ranged strategist who wins by reading opponents rather than overpowering them. Clues are tracked per enemy; four unlock Case Solved and the conditional One Truth Prevails finisher. No low-HP transformation, healing or resurrection.'},
    skills:[
      {tag:'P',name:"Detective's Insight",vi:'Tracks Clues separately on every enemy. Active-skill reads, three landed basic shots, a Wristwatch hit or one Skateboard miss-read can add a Clue. At four: Case Solved.',en:'Tracks Clues separately on every enemy. Active-skill reads, three landed basic shots, a Wristwatch hit or one Skateboard miss-read can add a Clue. At four: Case Solved.'},
      {tag:'1',name:'Soccer Ball Shot',vi:`A straight ${CONAN.basicDmg}-damage projectile every ${rts(CONAN.basicCd)}s. No stun and no knockback; every third landed shot on the same enemy adds one Clue.`,en:`A straight ${CONAN.basicDmg}-damage projectile every ${rts(CONAN.basicCd)}s. No stun and no knockback; every third landed shot on the same enemy adds one Clue.`},
      {tag:'1',name:'Power-Enhancing Kick Shoes',vi:`A ${CONAN.kickDmg}-damage straight shot after ${rts(CONAN.kickWind)}s, with knockback and ${rts(CONAN.kickStun)}s stun. A pre-release stun cancels it for half cooldown.`,en:`A ${CONAN.kickDmg}-damage straight shot after ${rts(CONAN.kickWind)}s, with knockback and ${rts(CONAN.kickStun)}s stun. A pre-release stun cancels it for half cooldown.`},
      {tag:'2',name:'Stun-Gun Wristwatch',vi:`One needle for ${CONAN.needleDmg}; Drowsy → Asleep. Sleep breaks after ${CONAN.wakeDmg} damage and then becomes Groggy. A landed needle adds one Clue.`,en:`One needle for ${CONAN.needleDmg}; Drowsy → Asleep. Sleep breaks after ${CONAN.wakeDmg} damage and then becomes Groggy. A landed needle adds one Clue.`},
      {tag:'3',name:'Turbo Engine Skateboard',vi:`For ${rts(CONAN.skateT)}s Conan moves at 2.5× base speed and takes half damage. Slow/root cannot stop the board, but stun and knockdown still can.`,en:`For ${rts(CONAN.skateT)}s Conan moves at 2.5× base speed and takes half damage. Slow/root cannot stop the board, but stun and knockdown still can.`},
      {tag:'U',name:'One Truth Prevails',vi:`Locked until one enemy reaches ${CONAN.clueMax} Clues. A banked blind-spot shot deals ${CONAN.ultDmg}, knocks down and applies Weakness Exposed for ${rts(CONAN.weakT)}s. A miss still spends the case.`,en:`Locked until one enemy reaches ${CONAN.clueMax} Clues. A banked blind-spot shot deals ${CONAN.ultDmg}, knocks down and applies Weakness Exposed for ${rts(CONAN.weakT)}s. A miss still spends the case.`}
    ]}
'''
rep('\n};\n\n\n/* lưu ảnh: dùng kho của Claude nếu có, không thì IndexedDB của trình duyệt */', CONAN_DEX + '\n};\n\n\n/* lưu ảnh: dùng kho của Claude nếu có, không thì IndexedDB của trình duyệt */')

# All match copy stays English whenever Conan participates.
rep(
"  const englishMatch=G.fighters.some(f=>(f.key==='tanjiro'||f.key==='gojo')&&!f.summon);",
"  const englishMatch=G.fighters.some(f=>(f.key==='tanjiro'||f.key==='gojo'||f.key==='conan')&&!f.summon);"
)

# ---------- shared combat hooks ----------
# Weakness Exposed lowers the attacker's accuracy; a Skateboard evade/miss grants at most one Clue per attacker.
old_evade = "  if(tryEvade(t,kind,opening?Math.min(TAN.threadDodgeMul,accuracyMul===undefined?1:accuracyMul):(accuracyMul===undefined?1:accuracyMul)))return false;"
new_evade = """  let acc=accuracyMul===undefined?1:accuracyMul;
  if(src&&src.conanWeak>0) acc*=CONAN.weakAcc;
  if(tryEvade(t,kind,opening?Math.min(TAN.threadDodgeMul,acc):acc)){
    if(t.key==='conan'&&!t.swapAs&&t.conanSkate&&src&&src.team!==t.team) conanSkateMiss(t,src);
    return false;
  }"""
rep(old_evade, new_evade)

# Damage modifiers: skateboard defense and Weakness Exposed damage amplification are deliberately narrow.
rep(
"  if(t.key==='tanjiro'&&t.tanUlt) amt*=dm(TAN.ultTake);",
"  if(t.key==='tanjiro'&&t.tanUlt) amt*=dm(TAN.ultTake);\n  if(t.key==='conan'&&!t.swapAs&&t.conanSkate) amt*=CONAN.skateTake;\n  if(t.conanWeak>0&&src&&t.conanWeakBy===src) amt*=CONAN.weakTake;"
)
rep(
"  t.hp=Math.max(0,t.hp-amt);",
"  t.hp=Math.max(0,t.hp-amt);\n  if(t.key==='conan'&&!t.swapAs&&src&&src.team!==t.team) conanRecordIncoming(t,src,amt);\n  conanSleepDamage(t,amt);"
)

# Status chain is last so skateboard motion ignores slow/root and the sleep/groggy multipliers win over earlier modifiers.
rep(
"function statusTick(f,dt){ gnStatus(f,dt); summonStatus(f,dt); drStatus(f,dt); supStatus(f,dt); beaStatus(f,dt); tanStatus(f,dt); gojoStatus(f,dt); }",
"function statusTick(f,dt){ gnStatus(f,dt); summonStatus(f,dt); drStatus(f,dt); supStatus(f,dt); beaStatus(f,dt); tanStatus(f,dt); gojoStatus(f,dt); conanStatus(f,dt); }"
)

# Entrance waits with every other entrance sequence.
rep(
"const introOn=()=>!!G&&G.fighters.some(o=>o&&(o.gnEntry||o.drEntry||o.supEntry||o.beaEntry||o.tanEntry||o.gojoEntry));",
"const introOn=()=>!!G&&G.fighters.some(o=>o&&(o.gnEntry||o.drEntry||o.supEntry||o.beaEntry||o.tanEntry||o.gojoEntry||o.conanEntry));"
)

# Movement and action gates: Asleep cannot move/basic/use skills.
rep(
"    if(f.stun>0||f.lock>0||f.dash||f.lazy||f.infoOverload>0) v={x:0,y:0};",
"    if(f.stun>0||f.lock>0||f.dash||f.lazy||f.infoOverload>0||f.conanSleep>0) v={x:0,y:0};"
)
rep(
"    if(!f.alive||f.stun>0||f.lock>0||f.infoOverload>0)continue;",
"    if(!f.alive||f.stun>0||f.lock>0||f.infoOverload>0||f.conanSleep>0)continue;"
)

# Run Conan's own timer/projectile/observation engine each frame.
rep(
"    if(f.key==='gojo'&&!f.summon&&f.alive&&!f.swapAs) gojoTick(f,dt);",
"    if(f.key==='gojo'&&!f.summon&&f.alive&&!f.swapAs) gojoTick(f,dt);\n    if(f.key==='conan'&&!f.summon&&f.alive&&!f.swapAs) conanTick(f,dt);"
)

# Normal Conan movement is ranged/analytical; skateboard itself moves in conanTick().
rep(
"  /* Gojo patrols a mid-range band with the same waypoint/jitter language as the rest of",
"  if(f.key==='conan'&&!f.summon){\n    const ce=nearestFoe(f)||e,cd0=dist(f,ce)||1,cux=(ce.x-f.x)/cd0,cuy=(ce.y-f.y)/cd0;\n    if(cd0>CONAN.midMax){ x+=cux*.75; y+=cuy*.75; }\n    else if(cd0<CONAN.midMin){ x-=cux*.70; y-=cuy*.70; }\n    else { x+=-cuy*f.strafe*.64; y+=cux*f.strafe*.64; }\n    x+=wxu*.45+f.jx*.30; y+=wyu*.45+f.jy*.30;\n    const cdv=dodgeVec(f); x+=cdv.x; y+=cdv.y;\n    return {x,y};\n  }\n  /* Gojo patrols a mid-range band with the same waypoint/jitter language as the rest of"
)

# ---------- Conan engine ----------
CONAN_FUNCS = r'''
/* ================= Conan Edogawa ================= */
function conanEnter(f){
  const fromLeft=f.x<W/2;
  f.conanEntry={t:0,sx:fromLeft?PAD-82:W-PAD+82,sy:f.y,ex:f.x,ey:f.y};
  f.x=f.conanEntry.sx; f.pose='board'; f.poseT=0;
}
function conanMap(f,key){
  if(!(f[key] instanceof Map)) f[key]=new Map();
  return f[key];
}
function conanAddClue(f,t,reason){
  if(!f||!t||!foeOk(f,t))return false;
  const M=conanMap(f,'conanClues'), before=M.get(t)||0, after=Math.min(CONAN.clueMax,before+1);
  if(after===before)return false;
  M.set(t,after);
  G.floats.push({x:t.x,y:t.y-110,txt:after>=CONAN.clueMax?'CASE SOLVED':`CLUE ×${after}`,color:after>=CONAN.clueMax?'#FF4A4A':'#78B4FF',life:1.05,ml:1.05,banner:true,sc:.52});
  if(after>=CONAN.clueMax) ring(t.x,t.y-20,58,'#FF3E4D',.5);
  return true;
}
function conanSetClues(f,t,n){ conanMap(f,'conanClues').set(t,Math.max(0,Math.min(CONAN.clueMax,n|0))); }
function conanBestClueCount(f){
  let n=0; for(const [t,v] of conanMap(f,'conanClues')) if(t&&t.alive&&v>n)n=v; return n;
}
function conanSolvedTarget(f){
  const M=conanMap(f,'conanClues'), D=conanMap(f,'conanDamageBy');
  const a=G.fighters.filter(o=>foeOk(f,o)&&(M.get(o)||0)>=CONAN.clueMax);
  a.sort((x,y)=>(D.get(y)||0)-(D.get(x)||0)||dist(f,x)-dist(f,y)||x.hp-y.hp);
  return a[0]||null;
}
function conanRecordIncoming(f,src,amt){
  if(!src||src.summon)src=src&&src.master;
  if(!src||src.team===f.team)return;
  const M=conanMap(f,'conanDamageBy'); M.set(src,(M.get(src)||0)+Math.max(0,amt||0));
}
function conanWatchSkills(f){
  const M=conanMap(f,'conanSeenCds');
  for(const o of G.fighters){
    if(!foeOk(f,o)||dist(f,o)>CONAN.observeRange)continue;
    const c=o.cds||{}, now=[c.s1||0,c.s2||0,c.s3||0,c.s4||0], prev=M.get(o);
    if(prev){
      let used=false;
      for(let i=0;i<4;i++) if(now[i]>prev[i]+gs(.18)){ used=true; break; }
      if(used) conanAddClue(f,o,'ACTIVE SKILL');
    }
    M.set(o,now);
  }
}
function conanOnBasicHit(f,t){
  const M=conanMap(f,'conanBasicHits'), n=(M.get(t)||0)+1;
  if(n>=3){ M.set(t,0); conanAddClue(f,t,'THREE BASIC HITS'); }
  else M.set(t,n);
}
function conanSkateMiss(f,src){
  const S=f.conanSkate; if(!S)return;
  if(!(S.missed instanceof Set))S.missed=new Set();
  const who=src.summon?src.master:src;
  if(!who||S.missed.has(who))return;
  S.missed.add(who); conanAddClue(f,who,'SKATEBOARD MISS');
}
function conanBasic(f,e){
  if(!e||!e.alive)return; f.cds.basic=CONAN.basicCd;
  f.conanAct={kind:'basic',t:0,target:e,fired:false}; setPose(f,'basic',CONAN.basicWind); aim(f,e,.25);
}
function conanKick(f,e){
  if(!e||!e.alive)return;
  f.conanAct={kind:'kick',t:0,target:e,fired:false}; setPose(f,'kick',CONAN.kickWind); aim(f,e,.4);
}
function conanNeedle(f,e){
  if(!e||!e.alive)return;
  f.conanAct={kind:'needle',t:0,target:e,fired:false}; setPose(f,'watch',CONAN.needleWind); aim(f,e,.25);
}
function conanSkateboard(f,e){
  if(!e||!e.alive)return;
  const dx=e.x-f.x,dy=e.y-f.y,m=Math.hypot(dx,dy)||1, ux=dx/m,uy=dy/m;
  const side=(f.x<e.x?1:-1), px=-uy*side,py=ux*side;
  let tx=clamp(e.x+ux*120+px*82,PAD+18,W-PAD-18), ty=clamp(e.y+uy*120+py*82,PAD+24,H-PAD-18);
  let vx=tx-f.x,vy=ty-f.y,vm=Math.hypot(vx,vy)||1;
  f.conanSkate={t:CONAN.skateT,vx:vx/vm,vy:vy/vm,hit:false,missed:new Set()};
  f.pose='skate'; f.poseT=CONAN.skateT;
}
function conanUltimate(f,t){
  if(!t||!foeOk(f,t)||(conanMap(f,'conanClues').get(t)||0)<CONAN.clueMax)return;
  conanSetClues(f,t,0);
  const wallX=t.x>W/2?W-PAD-8:PAD+8;
  f.conanAct={kind:'ultimate',t:0,target:t,wallX,voice:false,fired:false};
  setPose(f,'ultimate',CONAN.ultWind); aim(f,t,.2);
}
function conanInterrupt(f){
  const A=f&&f.conanAct; if(!A||A.kind!=='kick'||A.fired)return false;
  f.cds.s1=CONAN.kickCd*.50; f.conanAct=null; f.pose='hurt'; f.poseT=.24;
  G.floats.push({x:f.x,y:f.y-104,txt:'KICK CANCELLED',color:'#D8D5E7',life:.9,ml:.9,banner:true,sc:.50});
  return true;
}
function conanShot(f,type,t){
  if(!t||!t.alive)return;
  let a=Math.atan2(bodyCY(t)-(f.y-22),t.x-f.x), speed=CONAN.basicSpeed, r=8;
  if(type==='kick'){speed=CONAN.kickSpeed;r=13;}
  if(type==='needle'){speed=CONAN.needleSpeed;r=3;}
  f.conanShots.push({type,x:f.x+Math.cos(a)*23,y:f.y-22+Math.sin(a)*23,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r,life:gs(2),target:t});
}
function conanUltimateShot(f,A){
  const dx=A.wallX-f.x,dy=(A.target&&A.target.alive?A.target.y:f.y)-f.y,m=Math.hypot(dx,dy*.25)||1;
  f.conanShots.push({type:'ultimate',stage:0,x:f.x,y:f.y-20,vx:dx/m*CONAN.ultSpeed,vy:dy*.25/m*CONAN.ultSpeed,r:16,life:gs(3),target:A.target,wallX:A.wallX});
}
function conanSleepDamage(t,amt){
  if(!t||!(t.conanSleep>0)||amt<=0)return;
  t.conanSleepDmg=(t.conanSleepDmg||0)+amt;
  if(t.conanSleepDmg+1e-6>=CONAN.wakeDmg){
    t.conanSleep=0; t.conanSleepDmg=0; t.conanGroggy=CONAN.groggyT;
    G.floats.push({x:t.x,y:t.y-104,txt:'GROGGY',color:'#A9B7D0',life:.95,ml:.95,banner:true,sc:.52});
  }
}
function conanStatus(f,dt){
  if(f.conanWeak>0) f.conanWeak=Math.max(0,f.conanWeak-dt);
  if(f.conanDrowsy>0){
    const before=f.conanDrowsy; f.conanDrowsy=Math.max(0,f.conanDrowsy-dt);
    f.moveMul*=.50; f.castMul*=.70;
    if(before>0&&f.conanDrowsy<=0){
      f.conanSleep=CONAN.sleepT; f.conanSleepDmg=0;
      G.floats.push({x:f.x,y:f.y-104,txt:'ASLEEP',color:'#91A6D8',life:1,ml:1,banner:true,sc:.55});
    }
  }
  if(f.conanSleep>0){
    f.conanSleep=Math.max(0,f.conanSleep-dt); f.moveMul=0; f.castMul=0;
    f.stun=Math.max(f.stun||0,Math.min(gs(.08),f.conanSleep));
  }
  if(f.conanGroggy>0){ f.conanGroggy=Math.max(0,f.conanGroggy-dt); f.moveMul*=.70; f.castMul*=.80; }
  if(f.key==='conan'&&!f.swapAs&&f.conanSkate){
    /* Skateboard movement is authored here, outside moveMul, so slow/root cannot pin it.
       Stun/knockdown still freeze Conan because we simply stop advancing while stunned. */
    f.moveMul=Math.max(f.moveMul,1);
  }
}
function conanShotsTick(f,dt){
  if(!Array.isArray(f.conanShots))f.conanShots=[];
  for(let i=f.conanShots.length-1;i>=0;i--){
    const p=f.conanShots[i]; p.life-=dt;
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    let gone=p.life<=0||p.y<PAD-20||p.y>H-PAD+20||p.x<PAD-35||p.x>W-PAD+35;
    if(p.type==='ultimate'&&p.stage===0){
      const reached=(p.wallX<W/2?p.x<=p.wallX:p.x>=p.wallX);
      if(reached){
        p.x=p.wallX; p.stage=1;
        const t=p.target;
        if(!t||!t.alive){gone=true;}
        else{
          const dx=t.x-p.x,dy=bodyCY(t)-p.y,m=Math.hypot(dx,dy)||1;
          p.vx=dx/m*CONAN.ultSpeed;p.vy=dy/m*CONAN.ultSpeed;
          ring(p.x,p.y,38,'#E9F1FF',.25);
        }
      }
    }
    if(!gone){
      for(const o of G.fighters){
        if(!foeOk(f,o)||!hitsBody(p,o))continue;
        if(p.type==='basic'){
          if(hurt(o,CONAN.basicDmg,f,false,'conanBall')) conanOnBasicHit(f,o);
        }else if(p.type==='kick'){
          const hit=hurt(o,CONAN.kickDmg,f,'POWER KICK','conanKick');
          if(hit){knock(o,p.vx,p.vy,CONAN.kickKb);stunFx(o,CONAN.kickStun,'spin');}
        }else if(p.type==='needle'){
          const hit=hurt(o,CONAN.needleDmg,f,false,'conanNeedle');
          if(hit){
            conanAddClue(f,o,'STUN-GUN WRISTWATCH'); o.conanDrowsy=CONAN.drowsyT; o.conanSleep=0; o.conanGroggy=0;
            G.floats.push({x:o.x,y:o.y-104,txt:'DROWSY',color:'#AFC3EE',life:.9,ml:.9,banner:true,sc:.52});
          }
        }else if(p.type==='ultimate'){
          if(o===p.target){
            const hit=hurt(o,CONAN.ultDmg,f,'ONE TRUTH PREVAILS','conanUltimate',undefined,false,0);
            if(hit){
              knock(o,p.vx,p.vy,CONAN.ultKb); stunFx(o,CONAN.ultDown,'down');
              o.conanWeak=CONAN.weakT; o.conanWeakBy=f;
              G.floats.push({x:o.x,y:o.y-112,txt:'WEAKNESS EXPOSED',color:'#FF6464',life:1.15,ml:1.15,banner:true,gold:true,sc:.54});
            }
          }else{
            G.floats.push({x:o.x,y:o.y-98,txt:'SHOT BLOCKED',color:'#D8D5E7',life:.8,ml:.8,banner:true,sc:.46});
          }
        }
        gone=true; break;
      }
    }
    if(gone)f.conanShots.splice(i,1);
  }
}
function conanTick(f,dt){
  const E=f.conanEntry;
  if(E){
    for(const o of G.fighters)if(o!==f&&o.team!==f.team)o.lock=Math.max(o.lock,.3);
    f.lock=Math.max(f.lock,.3); E.t+=dt;
    if(E.t<CONAN.entrancePh[0]){
      const q=clamp(E.t/CONAN.entrancePh[0],0,1); f.x=E.sx+(E.ex-E.sx)*q; f.y=E.sy; f.pose='board';
    }else if(E.t<CONAN.entrancePh[1]){f.x=E.ex;f.y=E.ey;f.pose='jump';}
    else if(E.t<CONAN.entrancePh[2]){f.x=E.ex;f.y=E.ey;f.pose='stop';}
    else {f.x=E.ex;f.y=E.ey;f.pose='adjust';}
    if(E.t>=CONAN.entranceT){f.conanEntry=null;f.pose='idle';f.lock=0;conanWatchSkills(f);}
    return;
  }
  conanWatchSkills(f);
  conanShotsTick(f,dt);
  if(f.conanSkate){
    const S=f.conanSkate; S.t-=dt; f.lock=Math.max(f.lock,.06); f.pose='skate';
    if(f.stun<=0){
      const sp=f.speed*CONAN.skateMove;
      f.x=clamp(f.x+S.vx*sp*dt,PAD+10,W-PAD-10); f.y=clamp(f.y+S.vy*sp*dt,PAD+18,H-PAD-12);
      if(!S.hit){
        for(const o of G.fighters){
          if(!foeOk(f,o)||dist(f,o)>f.r+o.r+12)continue;
          if(hurt(o,CONAN.skateDmg,f,false,'conanSkate')) knock(o,-S.vy,S.vx,CONAN.skatePush);
          S.hit=true; break;
        }
      }
    }
    if(S.t<=0){f.conanSkate=null;f.pose='idle';f.lock=0;}
    return;
  }
  const A=f.conanAct;if(!A)return;
  A.t+=dt; f.lock=Math.max(f.lock,.06);
  if(A.kind==='kick'&&f.stun>0&&!A.fired){conanInterrupt(f);return;}
  if(A.kind==='basic'&&A.t>=CONAN.basicWind&&!A.fired){A.fired=true;conanShot(f,'basic',A.target);f.conanAct=null;f.pose='idle';f.lock=0;return;}
  if(A.kind==='kick'&&A.t>=CONAN.kickWind&&!A.fired){A.fired=true;conanShot(f,'kick',A.target);f.conanAct=null;f.pose='idle';f.lock=0;return;}
  if(A.kind==='needle'&&A.t>=CONAN.needleWind&&!A.fired){A.fired=true;conanShot(f,'needle',A.target);f.conanAct=null;f.pose='idle';f.lock=0;return;}
  if(A.kind==='ultimate'){
    if(!A.voice&&A.t>=gs(.35)){A.voice=true;if(A.target&&A.target.alive)A.target.lock=Math.max(A.target.lock,gs(.18));}
    if(A.t>=CONAN.ultWind&&!A.fired){A.fired=true;conanUltimateShot(f,A);f.conanAct=null;f.pose='idle';f.lock=0;return;}
  }
}
'''
rep('/* ---------- Tanjiro Kamado ---------- */', CONAN_FUNCS + '\n/* ---------- Tanjiro Kamado ---------- */')

# ---------- vector model / FX ----------
CONAN_VECTOR = r'''
function conanVector(f){
  const P=f.pose||'idle', y=-15, down=P==='down', win=P==='win';
  ctx.save(); if(down){ctx.rotate(.72);ctx.translate(0,9);} else if(P==='hurt')ctx.rotate(.12);
  /* Child proportions, blue jacket, white shirt, red bowtie, grey shorts and red shoes. */
  ctx.fillStyle='#676B78';ctx.fillRect(-10,y+14,8,13);ctx.fillRect(3,y+14,8,13);
  ctx.fillStyle='#D93A3A';ctx.fillRect(-12,y+26,10,5);ctx.fillRect(3,y+26,10,5);
  ctx.fillStyle='#2F73D8';ctx.fillRect(-16,y-12,32,31);
  ctx.fillStyle='#F7F8FA';ctx.fillRect(-7,y-9,14,22);
  ctx.fillStyle='#D92F39';ctx.beginPath();ctx.moveTo(-7,y-7);ctx.lineTo(0,y-3);ctx.lineTo(7,y-7);ctx.lineTo(4,y);ctx.lineTo(-4,y);ctx.closePath();ctx.fill();
  ctx.fillStyle='#2A3038';ctx.fillRect(-15,y+12,30,5);ctx.fillStyle='#8B9AA8';ctx.fillRect(8,y+11,6,6);
  ctx.fillStyle='#F0D0B8';
  if(P==='watch'){ctx.fillRect(10,y-10,18,5);ctx.fillRect(-19,y-8,7,15);}
  else if(P==='kick'||P==='basic'||P==='ultimate'){ctx.fillRect(-19,y-7,7,15);ctx.fillRect(12,y-8,7,15);}
  else if(win){ctx.fillRect(11,y-8,21,5);ctx.fillRect(-18,y-8,7,15);}
  else {ctx.fillRect(-19,y-7,7,15);ctx.fillRect(12,y-7,7,15);}
  if(P==='watch'){ctx.fillStyle='#3C4652';ctx.fillRect(18,y-12,7,8);}
  head(0,y-25,13);
  /* black spiky hair */
  ctx.fillStyle='#10131A';ctx.beginPath();ctx.arc(0,y-31,13,Math.PI,2*Math.PI);ctx.fill();
  for(let i=0;i<7;i++){const x=-12+i*4;ctx.beginPath();ctx.moveTo(x,y-32);ctx.lineTo(x+2,y-44-(i%2)*3);ctx.lineTo(x+5,y-31);ctx.fill();}
  /* round glasses */
  ctx.strokeStyle='#1B2028';ctx.lineWidth=1.7;ctx.beginPath();ctx.arc(-5,y-25,5,0,7);ctx.arc(6,y-25,5,0,7);ctx.moveTo(0,y-25);ctx.lineTo(1,y-25);ctx.stroke();
  if(P==='adjust'||P==='ultimate'||win){ctx.fillStyle='#F0D0B8';ctx.beginPath();ctx.arc(13,y-28,3.2,0,7);ctx.fill();}
  /* skateboard under entry/ride poses */
  if(['board','stop','skate'].includes(P)){
    ctx.fillStyle='#D8A23C';ctx.fillRect(-25,y+31,50,5);ctx.fillStyle='#1B2028';ctx.beginPath();ctx.arc(-17,y+38,4,0,7);ctx.arc(17,y+38,4,0,7);ctx.fill();
  }
  if(P==='jump')ctx.translate(0,-5);
  if(P==='kick'){ctx.save();ctx.rotate(-.72);ctx.fillStyle='#676B78';ctx.fillRect(4,y+15,8,25);ctx.fillStyle='#D93A3A';ctx.fillRect(3,y+37,12,5);ctx.restore();}
  if(win){ctx.fillStyle='#ECEFF5';ctx.beginPath();ctx.arc(-16,y+31,7,0,7);ctx.fill();ctx.strokeStyle='#9AA5B2';ctx.stroke();}
  ctx.restore();
}
'''
rep('function vector(f){\n  const t=G.t*10, y=-18, sw=f.moving?Math.sin(t)*3:0;\n  if(f.key===\'tanjiro\'){ tanVector(f); return; }\n  if(f.key===\'gojo\'){ gojoVector(f); return; }',
    CONAN_VECTOR + "\nfunction vector(f){\n  const t=G.t*10, y=-18, sw=f.moving?Math.sin(t)*3:0;\n  if(f.key==='tanjiro'){ tanVector(f); return; }\n  if(f.key==='gojo'){ gojoVector(f); return; }\n  if(f.key==='conan'){ conanVector(f); return; }")

# Sprite fallback rules for Conan.
rep(
"    else if(f.key==='gojo'&&pk==='down') arr=set.down||set.injured||set.hurt||set.idle;",
"    else if(f.key==='gojo'&&pk==='down') arr=set.down||set.injured||set.hurt||set.idle;\n    else if(f.key==='conan'&&['board','jump','stop','adjust','basic','kick','watch','skate','ultimate'].includes(pk)) arr=set[pk]||set.idle;\n    else if(f.key==='conan'&&pk==='win') arr=set.win||set.adjust||set.idle;\n    else if(f.key==='conan'&&pk==='down') arr=set.down||set.hurt||set.idle;"
)

CONAN_DRAW = r'''
function drawConanFx(){
  ctx.save();ctx.lineCap='round';
  for(const f of G.fighters){
    if(!f||f.key!=='conan'||f.swapAs)continue;
    const A=f.conanAct;
    if(A&&['basic','kick','ultimate'].includes(A.kind)){
      const wind=A.kind==='kick'?CONAN.kickWind:(A.kind==='ultimate'?CONAN.ultWind:CONAN.basicWind);
      const q=clamp(A.t/wind,0,1), rr=(A.kind==='kick'||A.kind==='ultimate'?13:8)*(.25+.75*q);
      ctx.globalAlpha=.9;ctx.fillStyle='#EEF3FA';ctx.beginPath();ctx.arc(f.x+8,f.y-24,rr,0,7);ctx.fill();ctx.strokeStyle='#8794A5';ctx.stroke();
    }
    for(const p of f.conanShots||[]){
      if(p.type==='needle'){
        ctx.globalAlpha=.9;ctx.strokeStyle='#D9E8FF';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x-p.vx*.025,p.y-p.vy*.025);ctx.lineTo(p.x,p.y);ctx.stroke();
      }else{
        ctx.globalAlpha=.96;ctx.fillStyle=p.type==='ultimate'?'#F8FBFF':'#EEF2F6';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill();
        ctx.strokeStyle=p.type==='ultimate'?'#FF4A4A':'#657180';ctx.lineWidth=1.3;ctx.stroke();
      }
    }
    const M=conanMap(f,'conanClues');
    for(const [o,n] of M){
      if(!o||!o.alive||n<=0)continue;
      ctx.font='700 9px "Space Mono",monospace';ctx.textAlign='center';ctx.globalAlpha=.92;
      ctx.fillStyle=n>=CONAN.clueMax?'#FF636B':'#9CC9FF';ctx.fillText(n>=CONAN.clueMax?'CASE SOLVED':`CLUE ×${n}`,o.x,o.y-104);
      if(n>=CONAN.clueMax){
        ctx.strokeStyle='#FF3E4D';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(o.x,o.y-23,31+Math.sin(G.t*5)*2,0,7);ctx.stroke();
        ctx.beginPath();ctx.moveTo(o.x-39,o.y-23);ctx.lineTo(o.x-24,o.y-23);ctx.moveTo(o.x+24,o.y-23);ctx.lineTo(o.x+39,o.y-23);ctx.stroke();
      }
    }
  }
  for(const o of G.fighters){
    if(!o||!o.alive)continue;
    if(o.conanDrowsy>0){ctx.globalAlpha=.45;ctx.fillStyle='#B7C9EE';ctx.beginPath();ctx.arc(o.x+18,o.y-60,4,0,7);ctx.fill();}
    if(o.conanSleep>0){ctx.globalAlpha=.8;ctx.font='900 13px "Space Mono",monospace';ctx.fillStyle='#D9E4FF';ctx.fillText('Z',o.x+18,o.y-66);}
    if(o.conanWeak>0){ctx.globalAlpha=.35;ctx.strokeStyle='#FF6262';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(o.x,o.y-22,30,46,0,0,7);ctx.stroke();}
  }
  ctx.restore();
}
'''
rep('function draw(){\n  ctx.setTransform(S,0,0,S,0,0);', CONAN_DRAW + '\nfunction draw(){\n  ctx.setTransform(S,0,0,S,0,0);')
rep('  drawGojoFx();\n  drawTanjiroFx();', '  drawGojoFx();\n  drawConanFx();\n  drawTanjiroFx();')

# ---------- win / defeat presentation ----------
rep(
"  if(loser.key==='gojo'&&!loser.swapAs){\n    loser.pose='down'; loser.gojoAct=null; loser.gojoShots=[]; loser.gojoDomain=0;\n    loser.infinity=0; ring(loser.x,loser.y-22,105,'#DDF8FF',.46);\n    sfx('gojo_down');\n  }",
"  if(loser.key==='gojo'&&!loser.swapAs){\n    loser.pose='down'; loser.gojoAct=null; loser.gojoShots=[]; loser.gojoDomain=0;\n    loser.infinity=0; ring(loser.x,loser.y-22,105,'#DDF8FF',.46);\n    sfx('gojo_down');\n  }\n  if(loser.key==='conan'&&!loser.swapAs){\n    loser.pose='down'; loser.conanAct=null; loser.conanSkate=null; loser.conanShots=[];\n    ring(loser.x,loser.y-14,70,'#7CA8FF',.35);\n  }"
)
rep(
"      :t.key==='gojo'?`Satoru Gojo is defeated — ${left} fighter${left===1?'':'s'} remain.`",
"      :t.key==='gojo'?`Satoru Gojo is defeated — ${left} fighter${left===1?'':'s'} remain.`\n      :t.key==='conan'?`Conan Edogawa is defeated — ${left} fighter${left===1?'':'s'} remain.`"
)
rep(
"  if(win&&win.key==='gojo')say('SATORU GOJO WINS!','g');\n  else say(win&&win.key==='tanjiro'?'TANJIRO WINS!':G.over+' thắng!','g');",
"  if(win&&win.key==='gojo')say('SATORU GOJO WINS!','g');\n  else if(win&&win.key==='conan')say('CONAN EDOGAWA WINS!','g');\n  else say(win&&win.key==='tanjiro'?'TANJIRO WINS!':G.over+' thắng!','g');"
)
rep(
"          :((w.key==='dora'||w.key==='superman'||w.key==='beatrice'||w.key==='tanjiro'||w.key==='gojo')&&!w.swapAs?'win':'idle');",
"          :((w.key==='dora'||w.key==='superman'||w.key==='beatrice'||w.key==='tanjiro'||w.key==='gojo'||w.key==='conan')&&!w.swapAs?'win':'idle');"
)
rep(
"      if(w.alive&&w.key==='gojo'&&!w.swapAs&&!w.gojoWonSaid){ w.gojoWonSaid=true; sfx('gojo_win'); }",
"      if(w.alive&&w.key==='gojo'&&!w.swapAs&&!w.gojoWonSaid){ w.gojoWonSaid=true; sfx('gojo_win'); }\n      if(w.alive&&w.key==='conan'&&!w.swapAs) w.pose='win';"
)
rep(
"  const gojo=w.key==='gojo'&&!w.swapAs;",
"  const gojo=w.key==='gojo'&&!w.swapAs;\n  const conan=w.key==='conan'&&!w.swapAs;"
)
rep(
"    :(dora?'DORAEMON WINS!':(sup?'SUPERMAN WINS!':(bea?'BEATRICE WINS!':(tan?'TANJIRO WINS!':(gojo?'SATORU GOJO WINS!':w.name.toUpperCase())))));",
"    :(dora?'DORAEMON WINS!':(sup?'SUPERMAN WINS!':(bea?'BEATRICE WINS!':(tan?'TANJIRO WINS!':(gojo?'SATORU GOJO WINS!':(conan?'CONAN EDOGAWA WINS!':w.name.toUpperCase()))))));"
)
rep(
"  let bsize=(team&&team.length>1)?34:(dora||sup||bea||tan||gojo?38:46);",
"  let bsize=(team&&team.length>1)?34:(dora||sup||bea||tan||gojo||conan?38:46);"
)

# Collisions do not shove fighters during Conan's committed gadget animations; skateboard handles its own first collision.
rep(
"    if(a.gnEntry||b.gnEntry||a.gnChange||b.gnChange||a.tanEntry||b.tanEntry||a.tanAct||b.tanAct||a.gojoEntry||b.gojoEntry||a.gojoAct||b.gojoAct)continue;",
"    if(a.gnEntry||b.gnEntry||a.gnChange||b.gnChange||a.tanEntry||b.tanEntry||a.tanAct||b.tanAct||a.gojoEntry||b.gojoEntry||a.gojoAct||b.gojoAct||a.conanEntry||b.conanEntry||a.conanAct||b.conanAct||a.conanSkate||b.conanSkate)continue;"
)

# ---------- documentation ----------
readme = Path('README.md').read_text(encoding='utf-8')
if '## Conan Edogawa' not in readme:
    readme += r'''

## Conan Edogawa

Conan is a **Strategist / Controller** built around **Detective's Insight**. Clues are stored per enemy (0–4), and four Clues create **Case Solved**, which is the only state that unlocks **One Truth Prevails**. The implementation intentionally has no low-HP awakening, healing, resurrection, lethal weapon, homing football, or hard-coded maximum HP.

Core values: Soccer Ball Shot 18 / 0.9s; Power-Enhancing Kick Shoes 85 / 7s / 0.8s stun; Stun-Gun Wristwatch 5 / 10s with Drowsy → 2.5s Sleep and 60-damage early wake; Turbo Engine Skateboard 1.8s / 9s; One Truth Prevails 140 / 12s, conditional on four Clues.
'''
Path('README.md').write_text(readme, encoding='utf-8')

claude = Path('CLAUDE.md').read_text(encoding='utf-8')
if '### Conan Edogawa contract' not in claude:
    claude += r'''

### Conan Edogawa contract

- All Conan-facing game text is English; Japanese character audio may be supplied later.
- Never hard-code Conan's Maximum HP inside `CONAN`; use the shared `HP.conan` value.
- Clues are per enemy and cap at four. They never directly increase damage or apply a debuff.
- No low-HP awakening, comeback buff, healing, resurrection, Shinichi transformation, firearm or lethal weapon.
- Soccer Ball Shot never stuns/knocks back. Wristwatch damage stays at 5. Sleep wakes early at 60 damage and then applies Groggy.
- Skateboard is not invulnerability. Slow/root cannot pin its own movement, but stun/knockdown still can.
- One Truth Prevails requires Case Solved and spends the four Clues even if the bank shot is blocked or misses.
'''
Path('CLAUDE.md').write_text(claude, encoding='utf-8')

# ---------- contract test ----------
test = r'''const fs=require('fs');
const assert=require('assert');
const s=fs.readFileSync('index.html','utf8');
const p=fs.readFileSync('play.html','utf8');
function has(x,msg){assert(s.includes(x),msg||x)}
has("conan:{},ayanokouji",'sprite registration');
has("conan:'#4B8BFF'",'color registration');
has('conan:HP_STD','shared HP registration');
has('const CONAN={','constants');
has('clueMax:4','four clues');
has('basicDmg:18, basicCd:gs(.9)','basic values');
has('kickDmg:85, kickCd:gs(7), kickWind:gs(.6)','kick values');
has('needleDmg:5, needleCd:gs(10)','needle values');
has('drowsyT:gs(.8), sleepT:gs(2.5), wakeDmg:60, groggyT:gs(2)','sleep chain');
has('skateCd:gs(9), skateT:gs(1.8), skateMove:2.5, skateTake:.50','skate values');
has('ultDmg:140, ultCd:gs(12), ultWind:gs(1.2)','ultimate values');
has("name:'Conan Edogawa'",'roster entry');
has("tag:'Strategist · Controller · Ranged – Analysis – Precision'",'role');
has("Locked – Gather 4 Clues",'locked text');
has("Case Solved – One Truth Prevails ready",'case solved text');
has('function conanAddClue','clue engine');
has('function conanWatchSkills','active-skill observation');
has('function conanSleepDamage','60 damage wake');
has('function conanSkateMiss','skate miss clue');
has('function conanSolvedTarget','ultimate target priority');
has("o.conanWeak=CONAN.weakT; o.conanWeakBy=f",'weakness exposed');
has("if(t.key==='conan'&&!t.swapAs&&t.conanSkate) amt*=CONAN.skateTake",'skate defense');
has("if(src&&src.conanWeak>0) acc*=CONAN.weakAcc",'weakness accuracy');
has('CONAN EDOGAWA WINS!','victory text');
assert(!/const CONAN=\{[^}]*maxHp/s.test(s),'CONAN must not hard-code Maximum HP');
assert(p.includes("name:'Conan Edogawa'"),'play build contains Conan');
assert(p.includes('function conanAddClue'),'play build contains Conan engine');
console.log('Conan contract: PASS');
'''
Path('tools/t_conan.js').write_text(test, encoding='utf-8')

P.write_text(s, encoding='utf-8')
print('Conan patch applied')
