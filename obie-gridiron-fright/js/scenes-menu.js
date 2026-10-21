// Boot, Title, Level Select, Settings, Results scenes.
const UI = {
  fix(scene){ document.body.classList.add('menu'); const v=OBIE.view(OBIE.W,OBIE.H); const c=scene.cameras.main; c.setZoom(v.z); c.centerOn(OBIE.W/2, OBIE.H/2); scene.view=v;
    if(!scene._rs){ scene._rs=()=>{ if(scene.sys.isActive()) scene.scene.restart(scene.sys.settings.data); }; scene.game.events.on('obie-resize',scene._rs);
      scene.events.once('shutdown',()=>{ scene.game.events.off('obie-resize',scene._rs); scene._rs=null; }); }
    return c; },
  cover(scene,img){ const v=scene.view; img.setPosition(OBIE.W/2,OBIE.H/2); img.setScale(Math.max(v.vw/img.width, v.vh/img.height)); return img; },
  text(scene,x,y,str,size,opt={}){
    const t=scene.add.text(x,y,str,Object.assign({fontFamily:opt.font||'Bungee',fontSize:size+'px',color:opt.color||OBIE.HEX.bone,
      stroke:OBIE.HEX.black,strokeThickness:opt.stroke!=null?opt.stroke:Math.max(2,size/10),align:'center',resolution:OBIE.RES}, opt.style||{}));
    t.setOrigin(opt.ox!=null?opt.ox:0.5, opt.oy!=null?opt.oy:0.5); return t;
  },
  button(scene,x,y,w,h,label,cb,primary){
    const c=scene.add.container(x,y); const g=scene.add.graphics();
    const draw=(down)=>{ g.clear();
      g.fillStyle(0x000000,0.45); g.fillRoundedRect(-w/2+3,-h/2+5,w,h,14);
      if(primary){ g.fillStyle(down?OBIE.C.burnt:OBIE.C.orange,1); g.fillRoundedRect(-w/2,-h/2,w,h,14); g.fillStyle(OBIE.C.ember,0.6); g.fillRoundedRect(-w/2+4,-h/2+4,w-8,h*0.38,10); }
      else { g.fillStyle(down?0x332f3a:OBIE.C.charcoal,0.96); g.fillRoundedRect(-w/2,-h/2,w,h,14); }
      g.lineStyle(3,primary?OBIE.C.black:OBIE.C.gold,1); g.strokeRoundedRect(-w/2,-h/2,w,h,14); };
    draw(false);
    const t=UI.text(scene,0,1,label,primary?30:24,{font:'Barlow Condensed',color:primary?OBIE.HEX.black:OBIE.HEX.bone,stroke:primary?0:3,style:{fontStyle:'700'}});
    c.add([g,t]); c.setSize(w,h); c.setInteractive({useHandCursor:true});
    c.on('pointerdown',()=>{ draw(true); c.setScale(0.96); });
    c.on('pointerout',()=>{ draw(false); c.setScale(1); });
    c.on('pointerup',()=>{ draw(false); c.setScale(1); SFX.init(); SFX.play('click'); cb(); });
    c.label=t; return c;
  },
  fadeTo(scene,key,data){ scene.cameras.main.fadeOut(260,17,16,20); scene.time.delayedCall(270,()=>scene.scene.start(key,data)); },
};

class BootScene extends Phaser.Scene{
  constructor(){ super('Boot'); }
  preload(){
    const A='assets/';
    this.load.atlas('obie',A+'sprites/obie@2x.png',A+'sprites/obie.json');
    this.load.atlas('enemies',A+'sprites/enemies@2x.png',A+'sprites/enemies.json');
    this.load.atlas('bosses',A+'sprites/bosses@2x.png',A+'sprites/bosses.json');
    this.load.image('football_proj',A+'sprites/football_projectile@2x.png');
    ['btn_jump','btn_left','btn_right','btn_pause','btn_throw','football','heart','logo','star_coin','title-bg'].forEach(k=>this.load.image(k,A+'ui/'+k+'@2x.png'));
    Object.keys(OBIE_PROPS).forEach(k=>this.load.image(k,A+'props/'+k+'@2x.png'));
    OBIE.LEVELS.forEach(L=>['L0_sky','L1_far','L2_mid','L3_ground'].forEach(l=>this.load.image(L.key+'_'+l,A+'parallax/'+L.key+'_'+l+'@2x.png')));
    const w=this.add.graphics(); this.load.on('progress',p=>{ w.clear(); w.fillStyle(OBIE.C.orange,1); w.fillRect(0,this.scale.height-20,this.scale.width*p,20); });
  }
  create(){
    document.getElementById('loading').style.display='none';
    this.makeTextures();
    const s=OBIE.save.load(); SFX.setMuted(!!s.muted);
    const P=OBIE.params;
    if(P.end==='win') return this.scene.start('Result',{win:true,level:4,score:12345,final:true});
    if(P.end==='lose') return this.scene.start('Result',{win:false,level:1,score:4321});
    if(P.level) this.scene.start('Game',{level:P.level,boss:P.boss,score:0,lives:3});
    else this.scene.start('Title');
  }
  makeTextures(){
    const g=this.make.graphics({x:0,y:0,add:false});
    const tex=(k,w,h,fn)=>{ g.clear(); fn(g); g.generateTexture(k,w,h); };
    // particles
    tex('spark',16,16,g=>{ g.fillStyle(0xffffff,1); g.fillCircle(8,8,8); });
    tex('soft',64,64,g=>{ for(let r=32;r>0;r-=2){ g.fillStyle(0xffffff,0.04); g.fillCircle(32,32,r);} });
    tex('straw',8,24,g=>{ g.fillStyle(0xE8C25A,1); g.fillRect(2,0,4,24); });
    // candy corn (@2x: 36x44)
    tex('candy',40,48,g=>{ g.fillStyle(OBIE.C.black,1); g.fillTriangle(20,0,0,46,40,46);
      g.fillStyle(0xFFF4D6,1); g.fillTriangle(20,4,14,17,26,17); g.fillStyle(OBIE.C.orange,1); g.fillTriangle(14,17,26,17,31,30); g.fillTriangle(14,17,9,30,31,30);
      g.fillStyle(0xF6C21A,1); g.fillRect(6,30,28,13); g.fillTriangle(9,30,6,43,9,43); g.fillTriangle(31,30,34,43,31,43);
      g.fillStyle(0xffffff,0.5); g.fillRect(17,10,3,24); });
    // checkpoint pennant
    tex('flag',96,240,g=>{ g.fillStyle(0x3b3442,1); g.fillRect(8,0,10,240); g.fillStyle(OBIE.C.gold,1); g.fillCircle(13,6,9);
      g.fillStyle(OBIE.C.orange,1); g.fillTriangle(18,16,94,46,18,84); g.fillStyle(OBIE.C.black,1); g.fillTriangle(18,38,60,48,18,62); });
    tex('flag_off',96,240,g=>{ g.fillStyle(0x3b3442,1); g.fillRect(8,0,10,240); g.fillStyle(0x777777,1); g.fillCircle(13,6,9);
      g.fillStyle(0x5b5560,1); g.fillTriangle(18,16,94,46,18,84); });
    // penalty flag, ember, husk spiral, clipboard, rolling pumpkin, crow
    tex('pflag',40,40,g=>{ g.fillStyle(0xF6D21A,1); g.fillRoundedRect(4,4,32,32,6); g.fillStyle(OBIE.C.black,0.6); g.fillCircle(20,20,5); });
    tex('ember',40,40,g=>{ for(let r=20;r>4;r-=3){ g.fillStyle(OBIE.C.wraith,0.18); g.fillCircle(20,20,r);} g.fillStyle(0xF4E0FF,1); g.fillCircle(20,20,6); });
    tex('husk',64,32,g=>{ g.fillStyle(0x8a6a2a,1); g.fillEllipse(32,16,62,26); g.fillStyle(0xE8C25A,1); g.fillEllipse(32,14,54,18); g.lineStyle(2,0x6b4f1d,1); for(let i=12;i<56;i+=8) g.lineBetween(i,5,i+4,26); });
    tex('clip',56,64,g=>{ g.fillStyle(0x7a5530,1); g.fillRoundedRect(2,6,52,56,5); g.fillStyle(0xF3EBDD,1); g.fillRect(8,14,40,42); g.fillStyle(0x999999,1); g.fillRect(18,2,20,10);
      g.fillStyle(0x444444,1); for(let i=0;i<4;i++) g.fillRect(12,20+i*9,30,3); });
    tex('rollpump',96,88,g=>{ g.fillStyle(0x7a2f05,1); g.fillEllipse(48,48,94,78); g.fillStyle(0xE8650F,1); g.fillEllipse(48,46,86,72);
      g.fillStyle(0xC4540F,1); g.fillEllipse(30,46,22,70); g.fillEllipse(66,46,22,70); g.fillStyle(0xFFA347,0.7); g.fillEllipse(48,30,26,22);
      g.fillStyle(0x3d6b1f,1); g.fillRect(43,2,10,16); g.fillStyle(0x2a1a00,1); g.fillTriangle(28,40,40,40,34,30); g.fillTriangle(56,40,68,40,62,30); g.fillRect(30,56,36,8); });
    tex('crow',64,40,g=>{ g.fillStyle(0x15121a,1); g.fillEllipse(32,22,30,18); g.fillTriangle(20,20,0,4,24,14); g.fillTriangle(44,20,64,4,40,14); g.fillCircle(46,16,8);
      g.fillStyle(OBIE.C.gold,1); g.fillTriangle(52,15,62,18,52,20); g.fillStyle(0xff3030,1); g.fillCircle(48,14,2); });
    tex('shock',160,40,g=>{ for(let i=0;i<5;i++){ g.fillStyle(OBIE.C.ember,0.16+i*0.12); g.fillEllipse(80,30,160-i*28,22-i*3);} });
    // hazards (tile 64 wide @2x)
    tex('hz_thorns',64,56,g=>{ g.fillStyle(0x23351a,1); g.fillRect(0,40,64,16); g.fillStyle(0x3d5a26,1);
      for(let i=0;i<4;i++){ g.fillTriangle(i*16,44,i*16+8,4+(i%2)*10,i*16+16,44);} g.fillStyle(0xC9D98a,1); for(let i=0;i<4;i++) g.fillTriangle(i*16+6,20+(i%2)*10,i*16+8,6+(i%2)*10,i*16+10,20+(i%2)*10); });
    tex('hz_pitchforks',64,72,g=>{ g.fillStyle(0x5a3b1e,1); g.fillRect(0,56,64,16); g.fillStyle(0x9aa0a8,1);
      [10,32,54].forEach(x=>{ g.fillRect(x-2,24,4,34); g.fillRect(x-9,24,18,4); g.fillTriangle(x-9,24,x-7,2,x-5,24); g.fillTriangle(x-2,24,x,0,x+2,24); g.fillTriangle(x+5,24,x+7,2,x+9,24); }); });
    tex('hz_ghostfire',64,80,g=>{ g.fillStyle(0x1a2a24,1); g.fillRect(0,66,64,14); for(let i=0;i<6;i++){ g.fillStyle(OBIE.C.ghost,0.12+i*0.1); g.fillEllipse(32,52-i*4,56-i*8,40-i*4);} g.fillStyle(0xE6FFEC,0.9); g.fillEllipse(32,56,16,18); });
    tex('hz_sparks',64,64,g=>{ g.fillStyle(0x2b2b33,1); g.fillRect(0,48,64,16); g.fillStyle(0x555560,1); g.fillRect(0,50,64,4);
      g.lineStyle(3,0x8FD8FF,1); g.beginPath(); g.moveTo(6,48); g.lineTo(16,22); g.lineTo(26,38); g.lineTo(36,10); g.lineTo(46,34); g.lineTo(58,16); g.strokePath(); g.fillStyle(0xffffff,1); g.fillCircle(36,10,4); });
    // platforms: 3 slices left, mid, right (each 64x48 @2x)
    const plat=(k,base,top,line,deco)=>{ tex(k,64,48,g=>{ g.fillStyle(0x000000,0.35); g.fillRect(0,40,64,8); g.fillStyle(base,1); g.fillRect(0,8,64,34); g.fillStyle(top,1); g.fillRect(0,0,64,12);
        g.lineStyle(2,line,0.8); g.lineBetween(0,12,64,12); g.lineBetween(0,41,64,41); deco(g); }); };
    plat('plat_wood',0x5a3a22,0x8a5a32,0x2a1a0e,g=>{ g.lineStyle(2,0x3a2414,0.9); g.lineBetween(32,12,32,41); g.fillStyle(0x2a1a0e,1); g.fillCircle(6,26,3); g.fillCircle(58,26,3); g.fillStyle(0x3d6b1f,1); g.fillRect(0,0,64,4); });
    plat('plat_hay',0xB48A3A,0xE8C25A,0x6b4f1d,g=>{ g.lineStyle(1,0x8a6a2a,0.9); for(let i=0;i<64;i+=6) g.lineBetween(i,14,i+4,40); g.fillStyle(0x7a5530,1); g.fillRect(0,20,64,4); });
    plat('plat_stone',0x4a4f55,0x6d747a,0x23262a,g=>{ g.lineStyle(2,0x2a2d31,1); g.lineBetween(0,26,64,26); g.lineBetween(20,12,20,26); g.lineBetween(46,26,46,41); g.fillStyle(0x3E6E73,0.7); g.fillRect(0,0,64,3); });
    plat('plat_bleacher',0x3a4250,0xAEB7C2,0x1d2128,g=>{ g.fillStyle(0x1b3a6b,1); g.fillRect(0,14,64,8); g.fillStyle(0x7d8794,1); g.fillRect(4,22,6,20); g.fillRect(54,22,6,20); });
    // pit fill
    tex('pit',64,64,g=>{ for(let i=0;i<16;i++){ g.fillStyle(0x07060a,0.4+i*0.04); g.fillRect(0,i*4,64,4);} });
    // fog and vignette
    tex('fog',512,128,g=>{ for(let i=0;i<14;i++){ g.fillStyle(0xC8D8E0,0.05); g.fillEllipse(40+i*34,70+Math.sin(i)*14,180,60+i%3*10);} });
    tex('vignette',256,144,g=>{ for(let i=0;i<20;i++){ g.lineStyle(10,0x000000,0.04+i*0.004); g.strokeRect(-i*2+5,-i*2+5,256+i*4-10,144+i*4-10);} });
    tex('bat',48,24,g=>{ g.fillStyle(0x0b0a10,1); g.fillEllipse(24,12,12,12); g.fillTriangle(20,10,0,2,6,18); g.fillTriangle(28,10,48,2,42,18); });
    tex('pixel',4,4,g=>{ g.fillStyle(0xffffff,1); g.fillRect(0,0,4,4); });
    g.destroy();
  }
}

class TitleScene extends Phaser.Scene{
  constructor(){ super('Title'); }
  create(){
    const W=OBIE.W,H=OBIE.H; UI.fix(this); this.cameras.main.fadeIn(400);
    const bg=UI.cover(this,this.add.image(W/2,H/2,'title-bg'));
    this.tweens.add({targets:bg,scale:bg.scale*1.02,duration:4000,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    const glow=this.add.image(W/2,H*0.55,'soft').setScale(14,5).setTint(OBIE.C.ember).setAlpha(0.18).setBlendMode('ADD');
    this.time.addEvent({delay:200,loop:true,callback:()=>glow.setAlpha(0.12+Math.random()*0.1)});
    for(let i=0;i<7;i++){ const b=this.add.image(Phaser.Math.Between(0,W),Phaser.Math.Between(40,220),'bat').setScale(0.5+Math.random()*0.4).setAlpha(0.9);
      this.tweens.add({targets:b,x:b.x+Phaser.Math.Between(-300,300),y:b.y+Phaser.Math.Between(-40,60),duration:Phaser.Math.Between(4000,8000),yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
      this.tweens.add({targets:b,scaleY:b.scaleY*0.4,duration:140,yoyo:true,repeat:-1}); }
    const logo=this.add.image(W/2,H*0.08,'logo').setOrigin(0.5,0); const lw=Math.min(W*0.56*0.62,640); logo.setScale(lw/logo.width);
    this.tweens.add({targets:logo,y:logo.y+6,duration:1800,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    const save=OBIE.save.load();
    UI.button(this,W/2,H*0.72,240,72,'PLAY',()=>{ SFX.init(); UI.fadeTo(this,'Game',{level:Math.min(save.unlocked,4),score:0,lives:3}); },true);
    UI.button(this,W/2-108,H*0.72+80,200,64,'LEVELS',()=>UI.fadeTo(this,'Levels'));
    UI.button(this,W/2+108,H*0.72+80,200,64,'SETTINGS',()=>UI.fadeTo(this,'Settings'));
    const isTouch=this.sys.game.device.input.touch; const tap=UI.text(this,W/2,H-14,isTouch?'Tap PLAY to start':'Press Enter or click PLAY   |   Arrows or A/D to run, Space to jump, X or J to throw, P to pause',isTouch?18:14,{font:'Barlow Condensed',stroke:3,style:{fontStyle:'700'}});
    this.tweens.add({targets:tap,alpha:0.4,duration:900,yoyo:true,repeat:-1});
    if(save.total) UI.text(this,W-14,14,'BEST TOTAL '+save.total,14,{ox:1,oy:0,color:OBIE.HEX.gold});
    this.input.keyboard.once('keydown-ENTER',()=>{ SFX.init(); UI.fadeTo(this,'Game',{level:Math.min(save.unlocked,4),score:0,lives:3}); });
    this.input.once('pointerdown',()=>{ SFX.init(); SFX.startMusic(0); });
    SFX.startMusic(0);
  }
}

class LevelsScene extends Phaser.Scene{
  constructor(){ super('Levels'); }
  create(){
    const W=OBIE.W,H=OBIE.H; UI.fix(this); this.cameras.main.fadeIn(300);
    this.add.rectangle(W/2,H/2,W*3,H*3,OBIE.C.black);
    const bg=UI.cover(this,this.add.image(W/2,H/2,'title-bg')).setAlpha(0.35);
    UI.text(this,W/2,52,'CHOOSE YOUR FIELD',36,{color:OBIE.HEX.orange});
    const save=OBIE.save.load();
    OBIE.LEVELS.forEach((L,i)=>{
      const x=W/2+(i-1.5)*236, y=H/2+20, cw=216, ch=260, locked=L.id>save.unlocked;
      const c=this.add.container(x,y); const g=this.add.graphics();
      g.fillStyle(0x000000,0.5); g.fillRoundedRect(-cw/2+4,-ch/2+6,cw,ch,16); g.fillStyle(OBIE.C.charcoal,1); g.fillRoundedRect(-cw/2,-ch/2,cw,ch,16);
      const th=this.add.image(0,-ch/2+70,L.key+'_L0_sky'); th.setDisplaySize(cw-16,124); th.setCrop(th.width*0.25,0,th.width*0.5,th.height); th.setDisplaySize((cw-16)*2,124);
      const mask=this.make.graphics({add:false}); mask.fillRect(x-cw/2+8,y-ch/2+8,cw-16,124); th.setMask(mask.createGeometryMask());
      const bs=this.add.image(0,-ch/2+128,'bosses',L.boss.key).setOrigin(0.5,1).setScale(0.22);
      if(locked){ th.setTint(0x444444); bs.setTint(0x000000).setAlpha(0.8); }
      const b=this.add.graphics(); b.lineStyle(3,locked?0x555555:OBIE.C.gold,1); b.strokeRoundedRect(-cw/2,-ch/2,cw,ch,16);
      const n=UI.text(this,0,10,'LEVEL '+L.id,22,{color:locked?'#777':OBIE.HEX.orange});
      const nm=UI.text(this,0,46,L.name,20,{font:'Barlow Condensed',stroke:3,style:{fontStyle:'700',wordWrap:{width:cw-20}}});
      const best=UI.text(this,0,92,locked?'LOCKED':('BEST '+(save.best[L.id]||0)),16,{font:'Barlow Condensed',color:locked?'#888':OBIE.HEX.gold,stroke:3,style:{fontStyle:'700'}});
      c.add([g,th,bs,b,n,nm,best]); c.setSize(cw,ch);
      if(!locked){ c.setInteractive({useHandCursor:true}); c.on('pointerdown',()=>c.setScale(0.96)); c.on('pointerout',()=>c.setScale(1));
        c.on('pointerup',()=>{ c.setScale(1); SFX.init(); SFX.play('click'); UI.fadeTo(this,'Game',{level:L.id,score:0,lives:3}); }); }
    });
    UI.button(this,W/2,H-50,200,64,'BACK',()=>UI.fadeTo(this,'Title'));
  }
}

class SettingsScene extends Phaser.Scene{
  constructor(){ super('Settings'); }
  create(){
    const W=OBIE.W,H=OBIE.H; UI.fix(this); this.cameras.main.fadeIn(300);
    this.add.rectangle(W/2,H/2,W*3,H*3,OBIE.C.black); const bg=UI.cover(this,this.add.image(W/2,H/2,'title-bg')).setAlpha(0.3);
    UI.text(this,W/2,70,'SETTINGS',40,{color:OBIE.HEX.orange});
    const save=OBIE.save.load();
    const snd=UI.button(this,W/2,200,320,68,'',()=>{ save.muted=!save.muted; SFX.setMuted(save.muted); OBIE.save.write(save); upd(); });
    const upd=()=>snd.label.setText('SOUND: '+(save.muted?'OFF':'ON')); upd();
    let confirm=false; const rs=UI.button(this,W/2,290,320,68,'RESET PROGRESS',()=>{
      if(!confirm){ confirm=true; rs.label.setText('TAP AGAIN TO CONFIRM'); return; }
      OBIE.save.write({unlocked:1,best:{},muted:save.muted,total:0}); rs.label.setText('PROGRESS RESET'); });
    UI.text(this,W/2,380,'Arrows or A/D to run.  Space, W or Up to jump (hold for higher).\nX or J to throw a spiral.  P or Esc to pause.  M to mute.\nJump on enemies to stomp them.  Grab footballs for ammo and candy corn for points.',16,{font:'Inter',stroke:3,style:{lineSpacing:8}});
    UI.button(this,W/2,H-50,200,64,'BACK',()=>UI.fadeTo(this,'Title'));
  }
}

class ResultScene extends Phaser.Scene{
  constructor(){ super('Result'); }
  create(d){
    const W=OBIE.W,H=OBIE.H; UI.fix(this); this.cameras.main.fadeIn(400);
    SFX.stopMusic();
    this.add.rectangle(W/2,H/2,W*3,H*3,OBIE.C.black);
    const bg=UI.cover(this,this.add.image(W/2,H/2,d.win?(OBIE.LEVELS[d.level-1].key+'_L0_sky'):'title-bg')).setAlpha(0.5);
    const save=OBIE.save.load();
    if(d.win){
      SFX.play('win');
      const title=d.final?'CHAMPIONS!':'LEVEL CLEAR!';
      const t=UI.text(this,W/2,110,title,64,{color:OBIE.HEX.orange,stroke:8}); t.setScale(0.2); this.tweens.add({targets:t,scale:1,duration:600,ease:'Back.out'});
      const ob=this.add.image(W/2-260,H*0.78,'obie','throw_0').setOrigin(0.5,1).setScale(0.9);
      this.tweens.add({targets:ob,y:ob.y-30,duration:500,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
      const msg=d.final?'Obie beat all four bosses. The town is safe for Friday night!':(OBIE.LEVELS[d.level-1].boss.name+' is down. Next up: '+(OBIE.LEVELS[d.level]?OBIE.LEVELS[d.level].name:''));
      UI.text(this,W/2+60,200,msg,20,{font:'Barlow Condensed',stroke:3,style:{fontStyle:'700',wordWrap:{width:560}}});
      UI.text(this,W/2+60,260,'SCORE '+d.score,34,{color:OBIE.HEX.gold});
      if(d.newBest) UI.text(this,W/2+60,300,'NEW BEST!',20,{color:OBIE.HEX.ember});
      const e=this.add.particles(0,0,'spark',{x:{min:0,max:W},y:-10,speedY:{min:80,max:200},speedX:{min:-40,max:40},lifespan:4000,scale:{min:0.3,max:0.7},
        tint:[OBIE.C.orange,OBIE.C.gold],frequency:25,quantity:3,rotate:{min:0,max:360}}); this.time.delayedCall(2000,()=>e.stop());
      if(!d.final) UI.button(this,W/2+60,H*0.66,260,72,'NEXT LEVEL',()=>UI.fadeTo(this,'Game',{level:d.level+1,score:d.score,lives:Math.max(3,d.lives||3)}),true);
      else UI.button(this,W/2+60,H*0.66,260,72,'PLAY AGAIN',()=>UI.fadeTo(this,'Game',{level:1,score:0,lives:3}),true);
    } else {
      SFX.play('lose');
      const t=UI.text(this,W/2,62,'GAME OVER',56,{color:OBIE.HEX.red,stroke:8}); this.tweens.add({targets:t,y:68,duration:900,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
      this.add.ellipse(W/2,280,120,18,0x000000,0.5); const ob=this.add.image(W/2,282,'obie','hurt_1').setOrigin(0.5,1); ob.setScale(160/(ob.height*0.92));
      UI.text(this,W/2,282+24+16,'SCORE '+d.score,30,{color:OBIE.HEX.gold});
      UI.button(this,W/2,410,260,72,'TRY AGAIN',()=>UI.fadeTo(this,'Game',{level:d.level,score:0,lives:3}),true);
    }
    UI.button(this,W/2+(d.win?60:0),d.win?H*0.66+84:492,200,60,'MAIN MENU',()=>UI.fadeTo(this,'Title'));
  }
}
