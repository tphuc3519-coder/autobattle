from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

def rep(old,new,count=1):
    global s
    n=s.count(old)
    if n<count: raise SystemExit(f'missing marker {n}/{count}: {old[:120]!r}')
    s=s.replace(old,new,count)

# Threshold: 8 total clues, with basic hit = 1 and auxiliary clues counting toward the same total.
rep('  clueMax:5,', '  clueMax:8,')
rep('  /* Five landed basics solve a case. Decisive Evidence is the low-damage stun payoff. */',
    '  /* Eight total Clues solve a case. Basic hits are the main source; auxiliary Clues also count. */')

rep("      `<b>Special Mechanic · Detective's Insight</b> Clues now come <b>only from Conan's basic deduction</b>. Every landed basic adds exactly 1 Clue to that enemy. At ${CONAN.clueMax} Clues the target becomes <b>Case Solved</b>; the case is then spent on Decisive Evidence. No skill observation, Wristwatch hit or Skateboard miss can add Clues.`,",
    "      `<b>Special Mechanic · Detective's Insight</b> Every landed basic deduction adds exactly <b>1 Clue</b> to that enemy. <b>Auxiliary Clues count toward the same total</b>: observing that enemy use an active skill in range, landing the Stun-Gun Wristwatch, or making that enemy miss Conan during one Skateboard ride can each add 1 Clue. At ${CONAN.clueMax} total Clues the target becomes <b>Case Solved</b>.`,")
rep("      `<b>Basic · Deduction</b> ${CONAN.basicDmg} damage every ${rts(CONAN.basicCd)}s after a ${rts(CONAN.basicWind)}s thinking beat. No football is created. A landed deduction adds exactly <b>1 Clue</b> to that target; ${CONAN.clueMax} landed deductions create <b>Case Solved</b>.`,",
    "      `<b>Basic · Deduction</b> ${CONAN.basicDmg} damage every ${rts(CONAN.basicCd)}s after a ${rts(CONAN.basicWind)}s thinking beat. No football is created. Every landed deduction adds exactly <b>1 Clue</b>. Case Solved triggers at <b>${CONAN.clueMax} total Clues</b>, including auxiliary Clues.`,")
rep("      `<b>2 · Stun-Gun Wristwatch</b> ${CONAN.needleDmg} damage · ${rts(CONAN.needleCd)}s cooldown. One straight tranquilizer needle stops on the first fighter and applies <b>Drowsy</b> for ${rts(CONAN.drowsyT)}s (−50% move, −30% cast speed), then <b>Asleep</b> for ${rts(CONAN.sleepT)}s. Sleep ends early after ${CONAN.wakeDmg} damage; an early wake applies <b>Groggy</b> for ${rts(CONAN.groggyT)}s. It grants no Clue.`,",
    "      `<b>2 · Stun-Gun Wristwatch</b> ${CONAN.needleDmg} damage · ${rts(CONAN.needleCd)}s cooldown. One straight tranquilizer needle stops on the first fighter, adds <b>1 auxiliary Clue</b>, and applies <b>Drowsy</b> for ${rts(CONAN.drowsyT)}s (−50% move, −30% cast speed), then <b>Asleep</b> for ${rts(CONAN.sleepT)}s. Sleep ends early after ${CONAN.wakeDmg} damage; an early wake applies <b>Groggy</b> for ${rts(CONAN.groggyT)}s.`,")
rep("      `<b>3 · Turbo Engine Skateboard</b> ${rts(CONAN.skateT)}s · ${rts(CONAN.skateCd)}s cooldown. +150% move speed, −50% damage taken and movement ignores slow/root, but Conan is not invulnerable and can still be stunned or knocked down. The first collision deals only ${CONAN.skateDmg} damage and pushes sideways without stun. It grants no Clue.`,",
    "      `<b>3 · Turbo Engine Skateboard</b> ${rts(CONAN.skateT)}s · ${rts(CONAN.skateCd)}s cooldown. +150% move speed, −50% damage taken and movement ignores slow/root, but Conan is not invulnerable and can still be stunned or knocked down. The first collision deals only ${CONAN.skateDmg} damage and pushes sideways without stun. Each enemy can grant at most <b>1 auxiliary Clue per ride</b> if their attack misses Conan during the ride.`,")

rep("      f.conanClues=new Map(); f.conanDamageBy=new Map();",
    "      f.conanClues=new Map(); f.conanSeenCds=new Map(); f.conanDamageBy=new Map();")

# Restore the two auxiliary clue engines around the basic clue hook.
needle="""function conanOnBasicHit(f,t){
  conanAddClue(f,t,'DEDUCTION');
}
"""
aux="""function conanWatchSkills(f){
  const M=conanMap(f,'conanSeenCds');
  for(const o of G.fighters){
    if(!foeOk(f,o)||dist(f,o)>360)continue;
    const c=o.cds||{}, now=[c.s1||0,c.s2||0,c.s3||0,c.s4||0], prev=M.get(o);
    if(prev){
      let used=false;
      for(let i=0;i<4;i++) if(now[i]>prev[i]+gs(.18)){used=true;break;}
      if(used) conanAddClue(f,o,'ACTIVE SKILL READ');
    }
    M.set(o,now);
  }
}
function conanOnBasicHit(f,t){
  conanAddClue(f,t,'DEDUCTION');
}
function conanSkateMiss(f,src){
  const S=f.conanSkate;if(!S)return;
  if(!(S.missed instanceof Set))S.missed=new Set();
  const who=src&&src.summon?src.master:src;
  if(!who||who.team===f.team||S.missed.has(who))return;
  S.missed.add(who);conanAddClue(f,who,'SKATEBOARD READ');
}
"""
rep(needle,aux)

# Observe active skills again after the entrance and during the fight.
rep("    if(E.t>=CONAN.entranceT){f.conanEntry=null;f.pose='idle';f.lock=0;}",
    "    if(E.t>=CONAN.entranceT){f.conanEntry=null;f.pose='idle';f.lock=0;conanWatchSkills(f);}")
rep('  conanShotsTick(f,dt);', '  conanWatchSkills(f);\n  conanShotsTick(f,dt);', 1)

# Skateboard miss auxiliary clue in the generic evasion path.
rep("  if(tryEvade(t,kind,opening?Math.min(TAN.threadDodgeMul,acc):acc))return false;",
    "  if(tryEvade(t,kind,opening?Math.min(TAN.threadDodgeMul,acc):acc)){\n    if(t.key==='conan'&&!t.swapAs&&t.conanSkate&&src&&src.team!==t.team) conanSkateMiss(t,src);\n    return false;\n  }")

# Wristwatch hit auxiliary clue.
rep("          if(hit){\n            o.conanDrowsy=CONAN.drowsyT; o.conanSleep=0; o.conanGroggy=0;",
    "          if(hit){\n            conanAddClue(f,o,'STUN-GUN WRISTWATCH');\n            o.conanDrowsy=CONAN.drowsyT; o.conanSleep=0; o.conanGroggy=0;")

# DEX copy.
rep("bio:{vi:'A slower controller built around deduction rather than damage. Every landed basic adds one Clue; five solve the case and unlock a low-damage Decisive Evidence stun. His only football attack is the 15-second Soccer Ball Shot.',\n         en:'A slower controller built around deduction rather than damage. Every landed basic adds one Clue; five solve the case and unlock a low-damage Decisive Evidence stun. His only football attack is the 15-second Soccer Ball Shot.'},",
    "bio:{vi:'A slower controller built around deduction rather than damage. Every landed basic adds one Clue; auxiliary reads also count, and eight total Clues solve the case. His only football attack is the 15-second Soccer Ball Shot.',\n         en:'A slower controller built around deduction rather than damage. Every landed basic adds one Clue; auxiliary reads also count, and eight total Clues solve the case. His only football attack is the 15-second Soccer Ball Shot.'},")
rep("      {tag:'P',name:\"Detective's Insight\",vi:`Only landed basics add Clues: +1 per hit, ${CONAN.clueMax} Clues = Case Solved. Other gadgets never add Clues.`,en:`Only landed basics add Clues: +1 per hit, ${CONAN.clueMax} Clues = Case Solved. Other gadgets never add Clues.`},",
    "      {tag:'P',name:\"Detective's Insight\",vi:`Every landed basic gives +1 Clue. Auxiliary Clues from active-skill reads, Wristwatch hits and one Skateboard miss-read per enemy/ride count toward the same ${CONAN.clueMax}-Clue Case Solved threshold.`,en:`Every landed basic gives +1 Clue. Auxiliary Clues from active-skill reads, Wristwatch hits and one Skateboard miss-read per enemy/ride count toward the same ${CONAN.clueMax}-Clue Case Solved threshold.`},")
rep("      {tag:'1',name:'Deduction',vi:`A slow ${CONAN.basicDmg}-damage basic every ${rts(CONAN.basicCd)}s. No ball; every landed deduction adds exactly one Clue.`,en:`A slow ${CONAN.basicDmg}-damage basic every ${rts(CONAN.basicCd)}s. No ball; every landed deduction adds exactly one Clue.`},",
    "      {tag:'1',name:'Deduction',vi:`A slow ${CONAN.basicDmg}-damage basic every ${rts(CONAN.basicCd)}s. No ball; every landed deduction adds exactly one Clue toward ${CONAN.clueMax}.`,en:`A slow ${CONAN.basicDmg}-damage basic every ${rts(CONAN.basicCd)}s. No ball; every landed deduction adds exactly one Clue toward ${CONAN.clueMax}.`},")
rep("      {tag:'2',name:'Stun-Gun Wristwatch',vi:`Only ${CONAN.needleDmg} damage; Drowsy → Asleep. Sleep breaks after ${CONAN.wakeDmg} damage and then becomes Groggy. Grants no Clue.`,en:`Only ${CONAN.needleDmg} damage; Drowsy → Asleep. Sleep breaks after ${CONAN.wakeDmg} damage and then becomes Groggy. Grants no Clue.`},",
    "      {tag:'2',name:'Stun-Gun Wristwatch',vi:`Only ${CONAN.needleDmg} damage; a landed needle adds 1 auxiliary Clue, then Drowsy → Asleep. Sleep breaks after ${CONAN.wakeDmg} damage and becomes Groggy.`,en:`Only ${CONAN.needleDmg} damage; a landed needle adds 1 auxiliary Clue, then Drowsy → Asleep. Sleep breaks after ${CONAN.wakeDmg} damage and becomes Groggy.`},")
rep("      {tag:'3',name:'Turbo Engine Skateboard',vi:`For ${rts(CONAN.skateT)}s Conan moves at 2.5× base speed and takes half damage. First collision is only ${CONAN.skateDmg}; no Clue.`,en:`For ${rts(CONAN.skateT)}s Conan moves at 2.5× base speed and takes half damage. First collision is only ${CONAN.skateDmg}; no Clue.`},",
    "      {tag:'3',name:'Turbo Engine Skateboard',vi:`For ${rts(CONAN.skateT)}s Conan moves at 2.5× base speed and takes half damage. First collision is only ${CONAN.skateDmg}; one miss-read per enemy/ride can add an auxiliary Clue.`,en:`For ${rts(CONAN.skateT)}s Conan moves at 2.5× base speed and takes half damage. First collision is only ${CONAN.skateDmg}; one miss-read per enemy/ride can add an auxiliary Clue.`},")

# README / internal contract.
r=Path('README.md').read_text(encoding='utf-8')
r=r.replace('Clues are stored per enemy (0–5), and **only landed basic Deduction attacks add them**: one hit = one Clue, five Clues = **Case Solved**. Case Solved is spent on **Decisive Evidence / One Truth Prevails**, a low-damage stun with no football involved.',
            'Clues are stored per enemy (0–8). Every landed basic Deduction gives one Clue; auxiliary Clues from reading an enemy active skill, landing the Wristwatch, or making that enemy miss during one Skateboard ride count toward the same total. **8 total Clues = Case Solved**. Case Solved is spent on **Decisive Evidence / One Truth Prevails**, a low-damage stun with no football involved.')
r=r.replace('Core values: Deduction 6 damage / 1.6s and +1 Clue on hit; Soccer Ball Shot is the **only football attack**, 85 damage / 15s / 3s stun / about 35% arena knockback; Stun-Gun Wristwatch 2 / 12s with Drowsy → 2.5s Sleep and 60-damage early wake; Turbo Engine Skateboard collision 18 / 10s; Decisive Evidence 38 damage + 1.5s stun after five Clues.',
            'Core values: Deduction 6 damage / 1.6s and +1 Clue on hit; Case Solved at 8 total Clues including auxiliary Clues; Soccer Ball Shot is the **only football attack**, 85 damage / 15s / 3s stun / about 35% arena knockback; Stun-Gun Wristwatch 2 / 12s and +1 auxiliary Clue on hit with Drowsy → 2.5s Sleep and 60-damage early wake; Turbo Engine Skateboard collision 18 / 10s with one miss-read Clue per enemy/ride; Decisive Evidence 38 damage + 1.5s stun.')
Path('README.md').write_text(r,encoding='utf-8')

c=Path('CLAUDE.md').read_text(encoding='utf-8')
c=c.replace('- Clues are per enemy and cap at five. **Only a landed basic Deduction adds a Clue: one hit = one Clue.** Active-skill observation, Wristwatch and Skateboard never add Clues.\n- Five Clues = Case Solved.',
            '- Clues are per enemy and cap at eight. A landed basic Deduction always adds exactly one Clue. Auxiliary Clues from an observed enemy active skill, a landed Wristwatch, and at most one Skateboard miss-read per enemy/ride count toward the same total.\n- Eight total Clues = Case Solved.')
Path('CLAUDE.md').write_text(c,encoding='utf-8')

# Update test contract.
t=Path('tools/t_conan.js').read_text(encoding='utf-8')
t=t.replace("has('clueMax:5','five clues');", "has('clueMax:8','eight total clues');")
t=t.replace("has(\"function conanOnBasicHit(f,t){\\n  conanAddClue(f,t,'DEDUCTION');\",'one basic hit = one clue');",
            "has(\"function conanOnBasicHit(f,t){\\n  conanAddClue(f,t,'DEDUCTION');\",'one basic hit = one clue');\nhas('function conanWatchSkills','active skill auxiliary clue');\nhas('function conanSkateMiss','skate miss auxiliary clue');\nhas(\"conanAddClue(f,o,'STUN-GUN WRISTWATCH')\",'wristwatch auxiliary clue');")
t=t.replace("lacks('function conanWatchSkills','skill observation no longer grants clues');\nlacks('function conanSkateMiss','skate misses no longer grant clues');\nlacks(\"conanAddClue(f,o,'STUN-GUN WRISTWATCH')\",'wristwatch no clue');\n","")
Path('tools/t_conan.js').write_text(t,encoding='utf-8')

p.write_text(s,encoding='utf-8')
print('Conan updated to 8 total clues with auxiliary clue sources')
