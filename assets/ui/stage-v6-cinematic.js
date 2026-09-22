/*
 * Replaces the legacy 240x150 embedded stage art with 1536x1024 WebP art.
 * It also maps matchup-chip images back to fighter keys for per-model scaling.
 */
(() => {
  const script = document.currentScript;
  const assetRoot = new URL('../stages/v6/', script && script.src ? script.src : document.baseURI);
  const stageKeys = [
    'dojo','street','stadium','forest','space','roof',
    'volcano','temple','snow','desert','cavern','sakura'
  ];
  const stageUrls = Object.fromEntries(stageKeys.map(key => [
    key, new URL(key + '.webp', assetRoot).href
  ]));
  const fighterSource = new Map();
  let activeStage = 'dojo';
  let queued = false;

  function captureFighters() {
    document.querySelectorAll('.cTile[data-key] .cAva img').forEach(image => {
      fighterSource.set(image.currentSrc || image.src, image.closest('.cTile').dataset.key);
    });
    document.querySelectorAll('.pickChip[data-key] img').forEach(image => {
      const chip = image.closest('.pickChip');
      const key = chip.dataset.key || fighterSource.get(image.currentSrc || image.src);
      if (key) image.closest('.pickChip').dataset.fighter = key;
    });
  }

  function syncStages() {
    const selected = document.querySelector('.sTile.on[data-stage]');
    if (selected && stageUrls[selected.dataset.stage]) activeStage = selected.dataset.stage;

    document.querySelectorAll('.sTile[data-stage] img').forEach(image => {
      const key = image.closest('.sTile').dataset.stage;
      if (!stageUrls[key]) return;
      image.dataset.stageV6 = key;
      if (image.src !== stageUrls[key]) image.src = stageUrls[key];
      image.decoding = 'async';
    });

    const versusBackground = document.getElementById('vsStageBg');
    if (versusBackground && stageUrls[activeStage]) {
      versusBackground.dataset.stage = activeStage;
      const next = 'url("' + stageUrls[activeStage] + '")';
      if (versusBackground.style.backgroundImage !== next) {
        versusBackground.style.setProperty('background-image', next, 'important');
      }
    }
  }

  function sync() {
    queued = false;
    captureFighters();
    syncStages();
  }
  function scheduleSync() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(sync);
  }

  document.addEventListener('click', event => {
    const tile = event.target.closest && event.target.closest('.sTile[data-stage]');
    if (tile && stageUrls[tile.dataset.stage]) activeStage = tile.dataset.stage;
    scheduleSync();
  }, true);

  const start = () => {
    sync();
    new MutationObserver(scheduleSync).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {once:true});
  } else {
    start();
  }
})();

/* UI V7.1.1 — durable mode-icon mount.
   Icons are real elements so theme pseudo-elements cannot erase them. */
(()=>{
  const FALLBACK={
    duel:"⚔",ffa:"🔥",team:"🛡",relay:"🔁",league:"🏆",cup:"🥇",adv:"🗺"
  };

  function mountModeIcons(){
    document.querySelectorAll("#charSelect .mTab").forEach((tab)=>{
      let icon=tab.querySelector(".mModeIcon");
      if(!icon){
        icon=document.createElement("span");
        icon.className="mModeIcon";
        icon.setAttribute("aria-hidden","true");
        tab.prepend(icon);
      }
      icon.textContent=tab.dataset.ico||FALLBACK[tab.dataset.mode]||"✦";
    });
  }

  mountModeIcons();
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",mountModeIcons,{once:true});
})();
