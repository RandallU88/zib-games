// Full-bleed canvas at device resolution. Scenes zoom their cameras so there are never letterbox bars.
(function(){
  OBIE.GW=880; OBIE.GH=495; // gameplay design view (world units); wider or taller screens see more world
  OBIE.metrics=function(){ const dpr=Math.min(2,window.devicePixelRatio||1); const w=Math.max(1,window.innerWidth), h=Math.max(1,window.innerHeight);
    const sa=getComputedStyle(document.getElementById('safe'));
    return { dpr, w, h, cw:Math.round(w*dpr), ch:Math.round(h*dpr), safe:{t:parseFloat(sa.paddingTop)||0,r:parseFloat(sa.paddingRight)||0,b:parseFloat(sa.paddingBottom)||0,l:parseFloat(sa.paddingLeft)||0} }; };
  // Contain-zoom with the extra area shown as more world (no bars).
  OBIE.view=function(DW,DH){ const m=OBIE.metrics(); const z=Math.min(m.cw/DW, m.ch/DH); return { z, vw:m.cw/z, vh:m.ch/z, m }; };
  const start=()=>{
    const m=OBIE.metrics();
    const game=window.obieGame=new Phaser.Game({
      type:Phaser.AUTO, parent:'game', backgroundColor:'#111014',
      width:m.cw, height:m.ch,
      scale:{ mode:Phaser.Scale.NONE, zoom:1/m.dpr },
      physics:{ default:'arcade', arcade:{ gravity:{y:1600}, debug:false } },
      input:{ activePointers:5 }, render:{ antialias:true, roundPixels:false },
      scene:[BootScene,TitleScene,LevelsScene,SettingsScene,ResultScene,GameScene,BGScene,HUDScene],
    });
    let t=null; const fit=()=>{ clearTimeout(t); t=setTimeout(()=>{ const m=OBIE.metrics(); if(m.cw===game.scale.width&&m.ch===game.scale.height) return;
      game.scale.setZoom(1/m.dpr); game.scale.resize(m.cw,m.ch); game.scale.refresh(); game.events.emit('obie-resize'); },120); };
    window.addEventListener('resize',fit); window.addEventListener('orientationchange',fit);
  };
  const fonts=['28px Bungee','700 20px "Barlow Condensed"','500 16px Inter'];
  Promise.race([Promise.all(fonts.map(f=>document.fonts.load(f))), new Promise(r=>setTimeout(r,2500))]).then(start,start);
})();
