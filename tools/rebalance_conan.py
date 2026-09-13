from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

def rep(old,new,count=1):
    global s
    n=s.count(old)
    if n<count:
        raise SystemExit(f'missing marker ({n}/{count}): {old[:140]!r}')
    s=s.replace(old,new,count)

def sub(pattern,repl,count=1,flags=0):
    global s
    s2,n=re.subn(pattern,repl,s,count=count,flags=flags)
    if n!=count:
        raise SystemExit(f'regex marker failed ({n}/{count}): {pattern!r}')
    s=s2

# ---- slots / labels ----
rep("['basic','Soccer Ball Shot']", "['basic','Deduction / Clue']")
rep("['kick','Power-Enhancing Kick Shoes']", "['kick','Soccer Ball Shot · Power-Enhancing Kick Shoes']")
rep("['ultimate','One Truth Prevails']", "['ultimate','Decisive Evidence · One Truth Prevails']")

# ---- balance constants: far lower sustained damage and slower attack cadence ----
old_const="""const CONAN={
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
};"""
new_const="""const CONAN={
  entranceT:gs(1.5), entrancePh:[gs(.6),gs(1),gs(1.3),gs(1.5)],
  clueMax:5,
  /* Basic is now the clue engine: slow, low-damage deduction checks instead of footballs. */
  basicDmg:6, basicCd:gs(1.6), basicWind:gs(.55), basicRange:360,
  /* The ONLY football attack: exactly once every 15 player seconds when available. */
  kickDmg:85, kickCd:gs(15), kickWind:gs(.6), kickSpeed:540, kickStun:gs(3), kickKb:1300,
  needleDmg:2, needleCd:gs(12), needleWind:gs(.38), needleSpeed:610,
  drowsyT:gs(.8), sleepT:gs(2.5), wakeDmg:60, groggyT:gs(2),
  skateCd:gs(10), skateT:gs(1.8), skateMove:2.5, skateTake:.50, skateDmg:18, skatePush:390,
  /* Five landed basics solve a case. Decisive Evidence is the low-damage stun payoff. */
  ultDmg:38, ultCd:gs(.5), ultWind:gs(.7), ultStun:gs(1.5),
  midMin:175, midMax:285
};"""
rep(old_const,new_const)

# ---- player-facing fighter contract ----
old_skills="""    skills:[
      `<b>Entrance · Turbo Engine Skateboard</b> Exactly ${rts(CONAN.entranceT)}s: skate in, jump off, stop the board with one foot, then adjust the glasses. Every opponent waits until the sequence ends.`,
      `<b>Special Mechanic · Detective's Insight</b> Conan tracks up to ${CONAN.clueMax} <b>Clue</b> stacks separately on every enemy. A Clue is gained when that enemy uses an active skill inside observation range, when Conan lands three Soccer Ball Shots on that same enemy, when the Stun-Gun Wristwatch hits, or once per Skateboard use when that enemy misses Conan. Clues do not increase damage or apply a debuff. At four stacks: <b>Case Solved</b>.`,
      `<b>Basic · Soccer Ball Shot</b> ${CONAN.basicDmg} damage every ${rts(CONAN.basicCd)}s. The Anywhere Ball Dispensing Belt creates and inflates the ball before Conan kicks it in a straight line. It stops on the first fighter and never stuns or knocks back. Every third landed basic on the same target adds one Clue.`,
      `<b>1 · Power-Enhancing Kick Shoes</b> ${CONAN.kickDmg} damage · ${rts(CONAN.kickCd)}s cooldown. After ${rts(CONAN.kickWind)}s Conan kicks a larger belt-made ball in a fixed straight line. It hits the first fighter, knocks them back about 18% of the arena, stuns for ${rts(CONAN.kickStun)}s and interrupts stationary wind-ups. If Conan is stunned before the kick, the ball disappears and only 50% cooldown remains.`,
      `<b>2 · Stun-Gun Wristwatch</b> ${CONAN.needleDmg} damage · ${rts(CONAN.needleCd)}s cooldown. One straight tranquilizer needle stops on the first fighter. A hit adds one Clue, applies <b>Drowsy</b> for ${rts(CONAN.drowsyT)}s (−50% move, −30% cast speed), then <b>Asleep</b> for ${rts(CONAN.sleepT)}s. Sleep ends early after ${CONAN.wakeDmg} damage; an early wake applies <b>Groggy</b> for ${rts(CONAN.groggyT)}s (−30% move, −20% cast speed).`,
      `<b>3 · Turbo Engine Skateboard</b> ${rts(CONAN.skateT)}s · ${rts(CONAN.skateCd)}s cooldown. +150% move speed, −50% damage taken and movement ignores slow/root, but Conan is not invulnerable and can still be stunned or knocked down. He cannot basic attack or use another gadget while riding. The first collision deals ${CONAN.skateDmg} damage and pushes sideways without stun.`,
      `<b>Ultimate · One Truth Prevails</b> ${CONAN.ultDmg} damage · ${rts(CONAN.ultCd)}s cooldown. <b>Locked – Gather 4 Clues</b>. It can only target an enemy with <b>Case Solved</b>. Conan locks them with Criminal Tracking Glasses, distracts them with the Voice-Changing Bowtie, says “One Truth Prevails!”, then banks a large ball off the arena wall into their blind spot. A hit knocks down for ${rts(CONAN.ultDown)}s and applies <b>Weakness Exposed</b> for ${rts(CONAN.weakT)}s: +20% damage from Conan only and −25% accuracy. Teleport, invulnerability, Absolute Barrier or instant reposition can still avoid it; a block or miss still consumes all four Clues.`
    ],"""
new_skills="""    skills:[
      `<b>Entrance · Turbo Engine Skateboard</b> Exactly ${rts(CONAN.entranceT)}s: skate in, jump off, stop the board with one foot, then adjust the glasses. Every opponent waits until the sequence ends.`,
      `<b>Special Mechanic · Detective's Insight</b> Clues now come <b>only from Conan's basic deduction</b>. Every landed basic adds exactly 1 Clue to that enemy. At ${CONAN.clueMax} Clues the target becomes <b>Case Solved</b>; the case is then spent on Decisive Evidence. No skill observation, Wristwatch hit or Skateboard miss can add Clues.`,
      `<b>Basic · Deduction</b> ${CONAN.basicDmg} damage every ${rts(CONAN.basicCd)}s after a ${rts(CONAN.basicWind)}s thinking beat. No football is created. A landed deduction adds exactly <b>1 Clue</b> to that target; ${CONAN.clueMax} landed deductions create <b>Case Solved</b>.`,
      `<b>1 · Soccer Ball Shot · Power-Enhancing Kick Shoes</b> ${CONAN.kickDmg} damage · <b>${rts(CONAN.kickCd)}s cooldown</b>. This is Conan's only football attack. After ${rts(CONAN.kickWind)}s he kicks one large belt-made ball in a fixed straight line. The first fighter hit is knocked back about <b>35% of the arena</b> and stunned for <b>${rts(CONAN.kickStun)}s</b>. If Conan is stunned before the kick, the ball disappears and only 50% cooldown remains.`,
      `<b>2 · Stun-Gun Wristwatch</b> ${CONAN.needleDmg} damage · ${rts(CONAN.needleCd)}s cooldown. One straight tranquilizer needle stops on the first fighter and applies <b>Drowsy</b> for ${rts(CONAN.drowsyT)}s (−50% move, −30% cast speed), then <b>Asleep</b> for ${rts(CONAN.sleepT)}s. Sleep ends early after ${CONAN.wakeDmg} damage; an early wake applies <b>Groggy</b> for ${rts(CONAN.groggyT)}s. It grants no Clue.`,
      `<b>3 · Turbo Engine Skateboard</b> ${rts(CONAN.skateT)}s · ${rts(CONAN.skateCd)}s cooldown. +150% move speed, −50% damage taken and movement ignores slow/root, but Conan is not invulnerable and can still be stunned or knocked down. The first collision deals only ${CONAN.skateDmg} damage and pushes sideways without stun. It grants no Clue.`,
      `<b>Case Solved · Decisive Evidence / One Truth Prevails</b> <b>Locked – Gather ${CONAN.clueMax} Clues</b>. When a target reaches Case Solved, Conan spends the case after a ${rts(CONAN.ultWind)}s proof-selection beat and presents the decisive evidence directly — <b>no football</b>. A landed conclusion deals ${CONAN.ultDmg} damage and stuns for ${rts(CONAN.ultStun)}s. A dodge, invulnerability or full barrier still consumes the solved case.`
    ],"""
rep(old_skills,new_skills)

# Start active gadgets on partial cooldown so deduction/basic establishes the fight rhythm first.
rep("      f.cds={s1:0,s2:0,s3:0,s4:0,basic:0};\n      f.conanEntry=null; f.conanAct=null; f.conanShots=[]; f.conanSkate=null;\n      f.conanClues=new Map(); f.conanBasicHits=new Map(); f.conanSeenCds=new Map(); f.conanDamageBy=new Map();",
    "      f.cds={s1:CONAN.kickCd*.65,s2:CONAN.needleCd*.55,s3:CONAN.skateCd*.45,s4:0,basic:0};\n      f.conanEntry=null; f.conanAct=null; f.conanShots=[]; f.conanSkate=null;\n      f.conanClues=new Map(); f.conanDamageBy=new Map();")

# Basic first, then long-cooldown gadgets. Evidence spends Case Solved and has only a tiny safety cooldown.
old_think="""      const solved=conanSolvedTarget(f);
      if(f.cds.s4<=0&&solved&&(auto||keys['u'])){ f.cds.s4=CONAN.ultCd; conanUltimate(f,solved); return; }
      if(f.cds.s2<=0&&d<=CONAN.basicRange&&(auto||keys['k'])){ f.cds.s2=CONAN.needleCd; conanNeedle(f,e); return; }
      if(f.cds.s1<=0&&d<=CONAN.basicRange&&(auto||keys['j'])){ f.cds.s1=CONAN.kickCd; conanKick(f,e); return; }
      if(f.cds.s3<=0&&(auto?d<165:keys['l'])){ f.cds.s3=CONAN.skateCd; conanSkateboard(f,e); return; }
      if(auto&&f.cds.basic<=0&&d<=CONAN.basicRange) conanBasic(f,e);"""
new_think="""      const solved=conanSolvedTarget(f);
      if(f.cds.s4<=0&&solved&&(auto||keys['u'])){ f.cds.s4=CONAN.ultCd; conanUltimate(f,solved); return; }
      if(f.cds.basic<=0&&d<=CONAN.basicRange&&auto){ conanBasic(f,e); return; }
      if(f.cds.s1<=0&&d<=CONAN.basicRange&&(auto||keys['j'])){ f.cds.s1=CONAN.kickCd; conanKick(f,e); return; }
      if(f.cds.s2<=0&&d<=CONAN.basicRange&&(auto||keys['k'])){ f.cds.s2=CONAN.needleCd; conanNeedle(f,e); return; }
      if(f.cds.s3<=0&&(auto?d<165:keys['l'])){ f.cds.s3=CONAN.skateCd; conanSkateboard(f,e); return; }"""
rep(old_think,new_think)
rep("return {pct:w<=0?1:clamp(1-w/CONAN.ultCd,0,1),fill:'#FF4A4A',txt:w<=0?'Case Solved – One Truth Prevails ready':`Case Solved – ${(w*RT).toFixed(1)}s`};",
    "return {pct:w<=0?1:clamp(1-w/CONAN.ultCd,0,1),fill:'#FF4A4A',txt:w<=0?'Case Solved – Decisive Evidence ready':`Case Solved – ${(w*RT).toFixed(1)}s`};")
rep("return {pct:n/CONAN.clueMax,fill:'#4B8BFF',txt:n?`Clue ×${n}`:'Locked – Gather 4 Clues'};",
    "return {pct:n/CONAN.clueMax,fill:'#4B8BFF',txt:n?`Clue ×${n}`:`Locked – Gather ${CONAN.clueMax} Clues`};")

# ---- clue engine: ONLY landed basics add clues ----
sub(r"function conanWatchSkills\(f\)\{.*?\n\}\nfunction conanOnBasicHit\(f,t\)\{.*?\n\}\nfunction conanSkateMiss\(f,src\)\{.*?\n\}\n",
    "function conanOnBasicHit(f,t){\n  conanAddClue(f,t,'DEDUCTION');\n}\n", flags=re.S)

# Basic is a direct deduction hit, not a projectile/football.
rep("function conanBasic(f,e){\n  if(!e||!e.alive)return; f.cds.basic=CONAN.basicCd;\n  f.conanAct={kind:'basic',t:0,target:e,fired:false}; setPose(f,'basic',CONAN.basicWind); aim(f,e,.25);\n}",
    "function conanBasic(f,e){\n  if(!e||!e.alive)return; f.cds.basic=CONAN.basicCd;\n  f.conanAct={kind:'basic',t:0,target:e,fired:false}; setPose(f,'adjust',CONAN.basicWind); aim(f,e,.15);\n}")

# Case Solved now means direct Decisive Evidence, no wall-bank football.
old_ult="""function conanUltimate(f,t){
  if(!t||!foeOk(f,t)||(conanMap(f,'conanClues').get(t)||0)<CONAN.clueMax)return;
  conanSetClues(f,t,0);
  const wallX=t.x>W/2?W-PAD-8:PAD+8;
  f.conanAct={kind:'ultimate',t:0,target:t,wallX,voice:false,fired:false};
  setPose(f,'ultimate',CONAN.ultWind); aim(f,t,.2);
}"""
new_ult="""function conanUltimate(f,t){
  if(!t||!foeOk(f,t)||(conanMap(f,'conanClues').get(t)||0)<CONAN.clueMax)return;
  conanSetClues(f,t,0);
  f.conanAct={kind:'ultimate',t:0,target:t,voice:false,fired:false};
  setPose(f,'ultimate',CONAN.ultWind); aim(f,t,.1);
  G.floats.push({x:f.x,y:f.y-112,txt:'DECISIVE EVIDENCE',color:'#E9F1FF',life:1,ml:1,banner:true,gold:true,sc:.55});
}"""
rep(old_ult,new_ult)

# Projectile factory only serves the 15s football and tranquilizer needle.
old_shot="""function conanShot(f,type,t){
  if(!t||!t.alive)return;
  let a=Math.atan2(bodyCY(t)-(f.y-22),t.x-f.x), speed=CONAN.basicSpeed, r=8;
  if(type==='kick'){speed=CONAN.kickSpeed;r=13;}
  if(type==='needle'){speed=CONAN.needleSpeed;r=3;}
  f.conanShots.push({type,x:f.x+Math.cos(a)*23,y:f.y-22+Math.sin(a)*23,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r,life:gs(2),target:t});
}
function conanUltimateShot(f,A){
  const dx=A.wallX-f.x,dy=(A.target&&A.target.alive?A.target.y:f.y)-f.y,m=Math.hypot(dx,dy*.25)||1;
  f.conanShots.push({type:'ultimate',stage:0,x:f.x,y:f.y-20,vx:dx/m*CONAN.ultSpeed,vy:dy*.25/m*CONAN.ultSpeed,r:16,life:gs(3),target:A.target,wallX:A.wallX});
}"""
new_shot="""function conanShot(f,type,t){
  if(!t||!t.alive)return;
  const a=Math.atan2(bodyCY(t)-(f.y-22),t.x-f.x);
  const speed=type==='needle'?CONAN.needleSpeed:CONAN.kickSpeed, r=type==='needle'?3:13;
  f.conanShots.push({type,x:f.x+Math.cos(a)*23,y:f.y-22+Math.sin(a)*23,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r,life:gs(2),target:t});
}"""
rep(old_shot,new_shot)

# Remove old Clue sources and old Weakness Exposed amplifier hooks from generic combat.
rep("  if(src&&src.conanWeak>0) acc*=CONAN.weakAcc;\n","")
rep("  if(tryEvade(t,kind,opening?Math.min(TAN.threadDodgeMul,acc):acc)){\n    if(t.key==='conan'&&!t.swapAs&&t.conanSkate&&src&&src.team!==t.team) conanSkateMiss(t,src);\n    return false;\n  }",
    "  if(tryEvade(t,kind,opening?Math.min(TAN.threadDodgeMul,acc):acc))return false;")
rep("  if(t.conanWeak>0&&src&&t.conanWeakBy===src) amt*=CONAN.weakTake;\n","")
rep("  if(f.conanWeak>0) f.conanWeak=Math.max(0,f.conanWeak-dt);\n","")

# Remove obsolete wall-bank ultimate projectile steering.
sub(r"    if\(p\.type==='ultimate'&&p\.stage===0\)\{.*?\n    \}\n    if\(!gone\)\{", "    if(!gone){", flags=re.S)

# Only kick/needle are projectiles. Each landed basic gives exactly one clue; Wristwatch gives none.
old_hits="""        if(p.type==='basic'){
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
        }"""
new_hits="""        if(p.type==='kick'){
          const hit=hurt(o,CONAN.kickDmg,f,'SOCCER BALL SHOT','conanKick');
          if(hit){knock(o,p.vx,p.vy,CONAN.kickKb);stunFx(o,CONAN.kickStun,'spin');}
        }else if(p.type==='needle'){
          const hit=hurt(o,CONAN.needleDmg,f,false,'conanNeedle');
          if(hit){
            o.conanDrowsy=CONAN.drowsyT; o.conanSleep=0; o.conanGroggy=0;
            G.floats.push({x:o.x,y:o.y-104,txt:'DROWSY',color:'#AFC3EE',life:.9,ml:.9,banner:true,sc:.52});
          }
        }"""
rep(old_hits,new_hits)

# Remove skill-observation calls; direct basic resolution + direct evidence resolution in tick.
rep("    if(E.t>=CONAN.entranceT){f.conanEntry=null;f.pose='idle';f.lock=0;conanWatchSkills(f);}",
    "    if(E.t>=CONAN.entranceT){f.conanEntry=null;f.pose='idle';f.lock=0;}")
rep("  conanWatchSkills(f);\n","")
rep("  if(A.kind==='basic'&&A.t>=CONAN.basicWind&&!A.fired){A.fired=true;conanShot(f,'basic',A.target);f.conanAct=null;f.pose='idle';f.lock=0;return;}",
    "  if(A.kind==='basic'&&A.t>=CONAN.basicWind&&!A.fired){\n    A.fired=true; const t=A.target;\n    if(t&&foeOk(f,t)&&hurt(t,CONAN.basicDmg,f,false,'conanDeduction')) conanOnBasicHit(f,t);\n    f.conanAct=null;f.pose='idle';f.lock=0;return;\n  }")
old_tick_ult="""  if(A.kind==='ultimate'){
    if(!A.voice&&A.t>=gs(.35)){A.voice=true;if(A.target&&A.target.alive)A.target.lock=Math.max(A.target.lock,gs(.18));}
    if(A.t>=CONAN.ultWind&&!A.fired){A.fired=true;conanUltimateShot(f,A);f.conanAct=null;f.pose='idle';f.lock=0;return;}
  }"""
new_tick_ult="""  if(A.kind==='ultimate'){
    if(!A.voice&&A.t>=gs(.35)){A.voice=true;if(A.target&&A.target.alive)A.target.lock=Math.max(A.target.lock,gs(.18));}
    if(A.t>=CONAN.ultWind&&!A.fired){
      A.fired=true; const t=A.target;
      if(t&&foeOk(f,t)){
        const hit=hurt(t,CONAN.ultDmg,f,'DECISIVE EVIDENCE','conanEvidence');
        if(hit){stunFx(t,CONAN.ultStun,'spin'); ring(t.x,t.y-22,72,'#E9F1FF',.32);}
      }
      f.conanAct=null;f.pose='idle';f.lock=0;return;
    }
  }"""
rep(old_tick_ult,new_tick_ult)

# ---- power chart / short DEX ----
old_dex="""  ,conan:{ role:{vi:'Strategist · Controller',en:'Strategist · Controller'}, st:{pow:3,spd:4,rng:4,def:2},
    pw:{dmg:58,dur:46,mob:82,as:76,rng:78,cc:88,uti:94,con:72,cmb:20},
    bio:{vi:'A ranged strategist who wins by reading opponents rather than overpowering them. Clues are tracked per enemy; four unlock Case Solved and the conditional One Truth Prevails finisher. No low-HP transformation, healing or resurrection.',
         en:'A ranged strategist who wins by reading opponents rather than overpowering them. Clues are tracked per enemy; four unlock Case Solved and the conditional One Truth Prevails finisher. No low-HP transformation, healing or resurrection.'},
    skills:[
      {tag:'P',name:\"Detective's Insight\",vi:'Tracks Clues separately on every enemy. Active-skill reads, three landed basic shots, a Wristwatch hit or one Skateboard miss-read can add a Clue. At four: Case Solved.',en:'Tracks Clues separately on every enemy. Active-skill reads, three landed basic shots, a Wristwatch hit or one Skateboard miss-read can add a Clue. At four: Case Solved.'},
      {tag:'1',name:'Soccer Ball Shot',vi:`A straight ${CONAN.basicDmg}-damage projectile every ${rts(CONAN.basicCd)}s. No stun and no knockback; every third landed shot on the same enemy adds one Clue.`,en:`A straight ${CONAN.basicDmg}-damage projectile every ${rts(CONAN.basicCd)}s. No stun and no knockback; every third landed shot on the same enemy adds one Clue.`},
      {tag:'1',name:'Power-Enhancing Kick Shoes',vi:`A ${CONAN.kickDmg}-damage straight shot after ${rts(CONAN.kickWind)}s, with knockback and ${rts(CONAN.kickStun)}s stun. A pre-release stun cancels it for half cooldown.`,en:`A ${CONAN.kickDmg}-damage straight shot after ${rts(CONAN.kickWind)}s, with knockback and ${rts(CONAN.kickStun)}s stun. A pre-release stun cancels it for half cooldown.`},
      {tag:'2',name:'Stun-Gun Wristwatch',vi:`One needle for ${CONAN.needleDmg}; Drowsy → Asleep. Sleep breaks after ${CONAN.wakeDmg} damage and then becomes Groggy. A landed needle adds one Clue.`,en:`One needle for ${CONAN.needleDmg}; Drowsy → Asleep. Sleep breaks after ${CONAN.wakeDmg} damage and then becomes Groggy. A landed needle adds one Clue.`},
      {tag:'3',name:'Turbo Engine Skateboard',vi:`For ${rts(CONAN.skateT)}s Conan moves at 2.5× base speed and takes half damage. Slow/root cannot stop the board, but stun and knockdown still can.`,en:`For ${rts(CONAN.skateT)}s Conan moves at 2.5× base speed and takes half damage. Slow/root cannot stop the board, but stun and knockdown still can.`},
      {tag:'U',name:'One Truth Prevails',vi:`Locked until one enemy reaches ${CONAN.clueMax} Clues. A banked blind-spot shot deals ${CONAN.ultDmg}, knocks down and applies Weakness Exposed for ${rts(CONAN.weakT)}s. A miss still spends the case.`,en:`Locked until one enemy reaches ${CONAN.clueMax} Clues. A banked blind-spot shot deals ${CONAN.ultDmg}, knocks down and applies Weakness Exposed for ${rts(CONAN.weakT)}s. A miss still spends the case.`}
    ]}"""
new_dex="""  ,conan:{ role:{vi:'Strategist · Controller',en:'Strategist · Controller'}, st:{pow:2,spd:3,rng:4,def:2},
    pw:{dmg:42,dur:46,mob:82,as:48,rng:74,cc:92,uti:90,con:72,cmb:20},
    bio:{vi:'A slower controller built around deduction rather than damage. Every landed basic adds one Clue; five solve the case and unlock a low-damage Decisive Evidence stun. His only football attack is the 15-second Soccer Ball Shot.',
         en:'A slower controller built around deduction rather than damage. Every landed basic adds one Clue; five solve the case and unlock a low-damage Decisive Evidence stun. His only football attack is the 15-second Soccer Ball Shot.'},
    skills:[
      {tag:'P',name:\"Detective's Insight\",vi:`Only landed basics add Clues: +1 per hit, ${CONAN.clueMax} Clues = Case Solved. Other gadgets never add Clues.`,en:`Only landed basics add Clues: +1 per hit, ${CONAN.clueMax} Clues = Case Solved. Other gadgets never add Clues.`},
      {tag:'1',name:'Deduction',vi:`A slow ${CONAN.basicDmg}-damage basic every ${rts(CONAN.basicCd)}s. No ball; every landed deduction adds exactly one Clue.`,en:`A slow ${CONAN.basicDmg}-damage basic every ${rts(CONAN.basicCd)}s. No ball; every landed deduction adds exactly one Clue.`},
      {tag:'1',name:'Soccer Ball Shot',vi:`The only football attack: ${CONAN.kickDmg} damage every ${rts(CONAN.kickCd)}s, ${rts(CONAN.kickStun)}s stun and about 35% arena knockback.`,en:`The only football attack: ${CONAN.kickDmg} damage every ${rts(CONAN.kickCd)}s, ${rts(CONAN.kickStun)}s stun and about 35% arena knockback.`},
      {tag:'2',name:'Stun-Gun Wristwatch',vi:`Only ${CONAN.needleDmg} damage; Drowsy → Asleep. Sleep breaks after ${CONAN.wakeDmg} damage and then becomes Groggy. Grants no Clue.`,en:`Only ${CONAN.needleDmg} damage; Drowsy → Asleep. Sleep breaks after ${CONAN.wakeDmg} damage and then becomes Groggy. Grants no Clue.`},
      {tag:'3',name:'Turbo Engine Skateboard',vi:`For ${rts(CONAN.skateT)}s Conan moves at 2.5× base speed and takes half damage. First collision is only ${CONAN.skateDmg}; no Clue.`,en:`For ${rts(CONAN.skateT)}s Conan moves at 2.5× base speed and takes half damage. First collision is only ${CONAN.skateDmg}; no Clue.`},
      {tag:'U',name:'Decisive Evidence · One Truth Prevails',vi:`At ${CONAN.clueMax} Clues Conan spends Case Solved on direct evidence: ${CONAN.ultDmg} damage and ${rts(CONAN.ultStun)}s stun. No football.`,en:`At ${CONAN.clueMax} Clues Conan spends Case Solved on direct evidence: ${CONAN.ultDmg} damage and ${rts(CONAN.ultStun)}s stun. No football.`}
    ]}"""
rep(old_dex,new_dex)

# ---- FX: ball only during kick and in kick projectile; evidence gets a document-like panel ----
old_fx="""    const A=f.conanAct;
    if(A&&['basic','kick','ultimate'].includes(A.kind)){
      const wind=A.kind==='kick'?CONAN.kickWind:(A.kind==='ultimate'?CONAN.ultWind:CONAN.basicWind);
      const q=clamp(A.t/wind,0,1), rr=(A.kind==='kick'||A.kind==='ultimate'?13:8)*(.25+.75*q);
      ctx.globalAlpha=.9;ctx.fillStyle='#EEF3FA';ctx.beginPath();ctx.arc(f.x+8,f.y-24,rr,0,7);ctx.fill();ctx.strokeStyle='#8794A5';ctx.stroke();
    }"""
new_fx="""    const A=f.conanAct;
    if(A&&A.kind==='kick'){
      const q=clamp(A.t/CONAN.kickWind,0,1), rr=13*(.25+.75*q);
      ctx.globalAlpha=.9;ctx.fillStyle='#EEF3FA';ctx.beginPath();ctx.arc(f.x+8,f.y-24,rr,0,7);ctx.fill();ctx.strokeStyle='#8794A5';ctx.stroke();
    }else if(A&&A.kind==='ultimate'){
      const q=clamp(A.t/CONAN.ultWind,0,1);
      ctx.globalAlpha=.55+.35*q;ctx.fillStyle='#F7F4E8';ctx.strokeStyle='#4B8BFF';ctx.lineWidth=1.6;
      ctx.fillRect(f.x+14,f.y-66,35,25);ctx.strokeRect(f.x+14,f.y-66,35,25);
      ctx.strokeStyle='#68758A';ctx.lineWidth=1;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(f.x+20,f.y-60+i*6);ctx.lineTo(f.x+43,f.y-60+i*6);ctx.stroke();}
    }"""
rep(old_fx,new_fx)
rep("        ctx.globalAlpha=.96;ctx.fillStyle=p.type==='ultimate'?'#F8FBFF':'#EEF2F6';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill();\n        ctx.strokeStyle=p.type==='ultimate'?'#FF4A4A':'#657180';ctx.lineWidth=1.3;ctx.stroke();",
    "        ctx.globalAlpha=.96;ctx.fillStyle='#EEF2F6';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill();\n        ctx.strokeStyle='#657180';ctx.lineWidth=1.3;ctx.stroke();")
rep("    if(o.conanWeak>0){ctx.globalAlpha=.35;ctx.strokeStyle='#FF6262';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(o.x,o.y-22,30,46,0,0,7);ctx.stroke();}\n","")

# ---- README ----
r=Path('README.md').read_text(encoding='utf-8')
r=r.replace('Mười đấu thủ từ nhiều vũ trụ', 'Mười hai đấu thủ từ nhiều vũ trụ')
r=r.replace('**11 đấu thủ**', '**12 đấu thủ**')
old_r="""Conan is a **Strategist / Controller** built around **Detective's Insight**. Clues are stored per enemy (0–4), and four Clues create **Case Solved**, which is the only state that unlocks **One Truth Prevails**. The implementation intentionally has no low-HP awakening, healing, resurrection, lethal weapon, homing football, or hard-coded maximum HP.

Core values: Soccer Ball Shot 18 / 0.9s; Power-Enhancing Kick Shoes 85 / 7s / 0.8s stun; Stun-Gun Wristwatch 5 / 10s with Drowsy → 2.5s Sleep and 60-damage early wake; Turbo Engine Skateboard 1.8s / 9s; One Truth Prevails 140 / 12s, conditional on four Clues."""
new_r="""Conan is a **Strategist / Controller** built around a deliberately slow clue loop. Clues are stored per enemy (0–5), and **only landed basic Deduction attacks add them**: one hit = one Clue, five Clues = **Case Solved**. Case Solved is spent on **Decisive Evidence / One Truth Prevails**, a low-damage stun with no football involved.

Core values: Deduction 6 damage / 1.6s and +1 Clue on hit; Soccer Ball Shot is the **only football attack**, 85 damage / 15s / 3s stun / about 35% arena knockback; Stun-Gun Wristwatch 2 / 12s with Drowsy → 2.5s Sleep and 60-damage early wake; Turbo Engine Skateboard collision 18 / 10s; Decisive Evidence 38 damage + 1.5s stun after five Clues. No low-HP awakening, healing, resurrection, lethal weapon, or hard-coded maximum HP."""
if old_r not in r: raise SystemExit('README Conan block marker missing')
r=r.replace(old_r,new_r)
Path('README.md').write_text(r,encoding='utf-8')

# ---- CLAUDE contract ----
c=Path('CLAUDE.md').read_text(encoding='utf-8')
old_c="""### Conan Edogawa contract

- All Conan-facing game text is English; Japanese character audio may be supplied later.
- Never hard-code Conan's Maximum HP inside `CONAN`; use the shared `HP.conan` value.
- Clues are per enemy and cap at four. They never directly increase damage or apply a debuff.
- No low-HP awakening, comeback buff, healing, resurrection, Shinichi transformation, firearm or lethal weapon.
- Soccer Ball Shot never stuns/knocks back. Wristwatch damage stays at 5. Sleep wakes early at 60 damage and then applies Groggy.
- Skateboard is not invulnerability. Slow/root cannot pin its own movement, but stun/knockdown still can.
- One Truth Prevails requires Case Solved and spends the four Clues even if the bank shot is blocked or misses.
"""
new_c="""### Conan Edogawa contract

- All Conan-facing game text is English; Japanese character audio may be supplied later.
- Never hard-code Conan's Maximum HP inside `CONAN`; use the shared `HP.conan` value.
- Clues are per enemy and cap at five. **Only a landed basic Deduction adds a Clue: one hit = one Clue.** Active-skill observation, Wristwatch and Skateboard never add Clues.
- Five Clues = Case Solved. Case Solved is consumed by Decisive Evidence / One Truth Prevails: 38 damage + 1.5s stun, and it uses evidence rather than a football.
- The only football attack is Soccer Ball Shot through the Power-Enhancing Kick Shoes: 85 damage, 15s cooldown, 3s stun, about 35% arena knockback.
- Conan's sustained damage and attack speed are intentionally low: Deduction is 6 damage every 1.6s; Wristwatch is 2 damage; Skateboard collision is 18 damage.
- No low-HP awakening, comeback buff, healing, resurrection, Shinichi transformation, firearm or lethal weapon.
- Skateboard is not invulnerability. Slow/root cannot pin its own movement, but stun/knockdown still can.
"""
if old_c not in c: raise SystemExit('CLAUDE Conan contract marker missing')
c=c.replace(old_c,new_c)
Path('CLAUDE.md').write_text(c,encoding='utf-8')

# ---- contract test ----
t="""const fs=require('fs');
const assert=require('assert');
const s=fs.readFileSync('index.html','utf8');
const p=fs.readFileSync('play.html','utf8');
function has(x,msg){assert(s.includes(x),msg||x)}
function lacks(x,msg){assert(!s.includes(x),msg||('unexpected: '+x))}
has(\"conan:{},ayanokouji\",'sprite registration');
has(\"conan:'#4B8BFF'\",'color registration');
has('conan:HP_STD','shared HP registration');
has('clueMax:5','five clues');
has('basicDmg:6, basicCd:gs(1.6), basicWind:gs(.55), basicRange:360','slow basic');
has('kickDmg:85, kickCd:gs(15), kickWind:gs(.6), kickSpeed:540, kickStun:gs(3), kickKb:1300','15s football / 3s stun / 35% knockback tuning');
has('needleDmg:2, needleCd:gs(12)','lower wristwatch damage');
has('skateCd:gs(10), skateT:gs(1.8), skateMove:2.5, skateTake:.50, skateDmg:18','lower skateboard damage');
has('ultDmg:38, ultCd:gs(.5), ultWind:gs(.7), ultStun:gs(1.5)','decisive evidence values');
has(\"name:'Conan Edogawa'\",'roster entry');
has('<b>Basic · Deduction</b>','basic is deduction');
has('This is Conan\\'s only football attack','only football skill copy');
has('Locked – Gather ${CONAN.clueMax} Clues','five clue lock');
has('Case Solved – Decisive Evidence ready','case solved gauge');
has(\"function conanOnBasicHit(f,t){\\n  conanAddClue(f,t,'DEDUCTION');\",'one basic hit = one clue');
has(\"hurt(t,CONAN.basicDmg,f,false,'conanDeduction')\",'basic direct hit');
has(\"hurt(t,CONAN.ultDmg,f,'DECISIVE EVIDENCE','conanEvidence')\",'evidence direct hit');
has('stunFx(t,CONAN.ultStun','evidence stun');
lacks('function conanWatchSkills','skill observation no longer grants clues');
lacks('function conanSkateMiss','skate misses no longer grant clues');
lacks(\"conanAddClue(f,o,'STUN-GUN WRISTWATCH')\",'wristwatch no clue');
lacks(\"conanShot(f,'basic'\",'basic is not a football projectile');
lacks('function conanUltimateShot','ultimate is not a football bank shot');
lacks('conanWeak','Weakness Exposed removed for lower damage');
has(\"pw:{dmg:42,dur:46,mob:82,as:48,rng:74,cc:92,uti:90,con:72,cmb:20}\",'power chart rebalance');
has('CONAN EDOGAWA WINS!','victory text');
assert(!/const CONAN=\\{[^}]*maxHp/s.test(s),'CONAN must not hard-code Maximum HP');
assert(p.includes(\"name:'Conan Edogawa'\"),'play build contains Conan');
assert(p.includes(\"kickCd:gs(15)\"),'play build contains 15s football');
console.log('Conan rebalance contract: PASS');
"""
Path('tools/t_conan.js').write_text(t,encoding='utf-8')

p.write_text(s,encoding='utf-8')
print('Conan clue rework applied')
