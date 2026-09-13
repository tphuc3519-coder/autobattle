const fs=require('fs');
const {build,playwright}=require('./probe');

const OPP=['gojo','tanjiro','dora','ginyu','suzune','shika','superman','beatrice'];
const N=16;                 // 8 starts on each side, enough for a first balance read
const MAX_SIM=120;          // game seconds
const DT=1/60;
const CONCURRENCY=8;

(async()=>{
  const file=build();
  const {chromium}=playwright();
  const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});

  async function one(opp,i){
    const conanA=i%2===0;
    const a=conanA?'conan':opp, b=conanA?opp:'conan';
    const page=await browser.newPage({viewport:{width:700,height:960}});
    await page.route('**://fonts.*/**',r=>r.abort());
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    try{
      await page.goto('file://'+file,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(220);
      await page.click('#mTabDuel');
      await page.click(`#listA .cTile[data-key="${a}"]`);
      await page.click(`#listB .cTile[data-key="${b}"]`);
      await page.click('#cselGo');
      await page.selectOption('#speed','1');
      await page.click('#play');
      // Let the VS splash finish through the normal RAF once, then pause and fast-forward
      // the actual combat deterministically through the same step() engine.
      await page.waitForTimeout(1500);
      await page.click('#play').catch(()=>{});
      const r=await page.evaluate(({dt,maxSim})=>{
        const G=window.__G();
        const t0=G.t;
        let loops=0;
        while(!G.over && G.t-t0<maxSim && loops<maxSim/dt+120){
          window.__step(dt); loops++;
        }
        const mains=G.fighters.filter(f=>f&&!f.summon&&!f.swapAs);
        const alive=mains.filter(f=>f.alive&&f.hp>0);
        let winner=null;
        if(alive.length===1)winner=alive[0].key;
        else if(G.winner&&G.winner.key)winner=G.winner.key;
        else if(G.over){
          // team/duel end sometimes leaves the winning main in G.winner only later in draw();
          // use remaining HP as a last-resort tie-break solely for a completed duel.
          const ranked=mains.slice().sort((x,y)=>(y.hp||0)-(x.hp||0));
          if(ranked.length&&ranked[0].hp>ranked[1].hp)winner=ranked[0].key;
        }
        const c=mains.find(f=>f.key==='conan');
        const o=mains.find(f=>f.key!== 'conan');
        return {winner,over:!!G.over,t:+(G.t-t0).toFixed(2),conanHp:c?+c.hp.toFixed(1):null,oppHp:o?+o.hp.toFixed(1):null,
          conanDmg:c?+(c.dmgDealt||0).toFixed(1):null,oppDmg:o?+(o.dmgDealt||0).toFixed(1):null,
          clueMax:window.__CHARS.conan?8:null};
      },{dt:DT,maxSim:MAX_SIM});
      return {opp,i,side:conanA?'A':'B',...r,errors};
    }finally{await page.close();}
  }

  const jobs=[]; for(const opp of OPP)for(let i=0;i<N;i++)jobs.push([opp,i]);
  const rows=[];
  for(let i=0;i<jobs.length;i+=CONCURRENCY){
    rows.push(...await Promise.all(jobs.slice(i,i+CONCURRENCY).map(([o,n])=>one(o,n))));
    console.log(`progress ${Math.min(i+CONCURRENCY,jobs.length)}/${jobs.length}`);
  }
  await browser.close();

  const summary={generatedAt:new Date().toISOString(),matchesPerOpponent:N,maxGameSeconds:MAX_SIM,matchups:{},errors:[]};
  for(const opp of OPP){
    const a=rows.filter(r=>r.opp===opp), wins=a.filter(r=>r.winner==='conan').length,
      losses=a.filter(r=>r.winner===opp).length, draws=a.length-wins-losses,
      avg=x=>+(x.reduce((s,r)=>s+(r[x]||0),0)/a.length).toFixed(1);
    summary.matchups[opp]={matches:a.length,wins,losses,draws,winRate:+(wins/a.length*100).toFixed(1),
      avgTime:avg('t'),avgConanHp:avg('conanHp'),avgOppHp:avg('oppHp'),avgConanDamage:avg('conanDmg'),avgOppDamage:avg('oppDmg'),
      winsAsA:a.filter(r=>r.side==='A'&&r.winner==='conan').length,winsAsB:a.filter(r=>r.side==='B'&&r.winner==='conan').length};
  }
  summary.errors=rows.flatMap(r=>r.errors.map(e=>({opp:r.opp,i:r.i,error:e})));
  fs.writeFileSync('tools/conan_matchup_results.json',JSON.stringify({summary,rows},null,2));
  console.log(JSON.stringify(summary,null,2));
  if(summary.errors.length)process.exitCode=1;
})();
