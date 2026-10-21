// Main gameplay, parallax background scene and HUD scene.
OBIE.input = { left:false, right:false, jump:false, throw:false };
const GTOP = { pumpkin:34, corn:60, graveyard:60, stadium:10 };

class BGScene extends Phaser.Scene{
  constructor(){ super('BG'); }
  create(d){
    const L=OBIE.LEVELS[d.level-1], H=OBIE.H; this.layers=[];
    const v=this.v=OBIE.view(OBIE.GW,OBIE.GH); const cam=this.cameras.main; cam.setZoom(v.z); cam.centerOn(v.vw/2, H-v.vh/2);
    const top=H-v.vh, vw=v.vw+4;
    const sky=this.add.tileSprite(-2,top,vw,v.vh,L.key+'_L0_sky').setOrigin(0,0); const ts=v.vh/1152; sky.setTileScale(ts); sky.f=0.1; sky.ts=ts; this.layers.push(sky);
    if(L.key==='pumpkin'||L.key==='corn'){
      const tex=this.textures.get(L.key+'_L1_far').getSourceImage(); const h=tex.height/2;
      const l1=this.add.tileSprite(-2,H*0.70,vw,h,L.key+'_L1_far').setOrigin(0,1).setTileScale(0.5); l1.f=0.3; l1.ts=0.5; this.layers.push(l1);
      const fogKey='l1fog_'+L.key; if(!this.textures.exists(fogKey)){ const c=this.textures.createCanvas(fogKey,4,64), x=c.getContext(), g=x.createLinearGradient(0,0,0,64);
        const col=L.key==='pumpkin'?'91,58,122':'43,31,74'; g.addColorStop(0,'rgba('+col+',0.25)'); g.addColorStop(1,'rgba('+col+',0)'); x.fillStyle=g; x.fillRect(0,0,4,64); c.refresh(); }
      this.add.image(-2,H*0.70-h,fogKey).setOrigin(0,0).setDisplaySize(vw,h*0.3);
    }
    const tex2=this.textures.get(L.key+'_L2_mid').getSourceImage();
    const l2=this.add.tileSprite(-2,H*0.82,vw,tex2.height/2,L.key+'_L2_mid').setOrigin(0,1).setTileScale(0.5); l2.f=0.6; l2.ts=0.5; this.layers.push(l2);
    if(L.fog){ this.fog=this.add.tileSprite(-2,H*0.84,vw,128,'fog').setOrigin(0,1).setAlpha(0.8); this.fog.f=0.8; this.fog.ts=1; this.layers.push(this.fog); }
    this._rs=()=>this.scene.restart(d); this.game.events.on('obie-resize',this._rs); this.events.once('shutdown',()=>this.game.events.off('obie-resize',this._rs));
  }
  update(t){ const g=this.scene.get('Game'); if(!g||!g.cameras||!g.cameras.main) return; const sx=g.cameras.main.worldView.x;
    this.layers.forEach(l=>{ l.tilePositionX = sx*l.f/l.ts + (l===this.fog? t*0.02:0); }); }
}

class GameScene extends Phaser.Scene{
  constructor(){ super('Game'); }
  init(d){ this.levelNum=d.level||1; this.L=OBIE.LEVELS[this.levelNum-1]; this.score=d.score||0; this.lives=d.lives!=null?d.lives:3;
    this.startBoss=!!d.boss; this.hearts=3; this.maxHearts=3; this.ammo=8; this.levelStartScore=this.score; }
  create(){
    // Guard: one bad effect or callback must never stall the game loop
    const warn=(e)=>{ this._errs=(this._errs||0)+1; if(this._errs<8) console.warn('Recovered from callback error:',e&&e.message); };
    const wrap=f=>typeof f==='function'?function(...a){ try{ return f.apply(this,a); }catch(e){ warn(e); } }:f;
    const F=this.physics.add; if(!F._wrapped){ const o=F.overlap.bind(F), c=F.collider.bind(F); F.overlap=(a,b,cb,pc,cx)=>o(a,b,wrap(cb),wrap(pc),cx); F.collider=(a,b,cb,pc,cx)=>c(a,b,wrap(cb),wrap(pc),cx); F._wrapped=true; }
    const T=this.time; if(!T._wrapped){ const d=T.delayedCall.bind(T); T.delayedCall=(ms,cb,args,cx)=>d(ms,wrap(cb),args,cx); T._wrapped=true; }
    document.body.classList.remove('menu');
    const L=this.L, G=L.ground, H=OBIE.H; this.G=G;
    this.lv=OBIE.buildLevel(L); const lv=this.lv; this.worldW=lv.worldW;
    this.scene.launch('BG',{level:this.levelNum}); this.scene.sendToBack('BG');
    this.arenaW=lv.arenaW; const cam=this.cameras.main; this.applyView(); cam.fadeIn(400);
    this._rs=()=>{ this.applyView(); }; this.game.events.on('obie-resize',this._rs); this.events.once('shutdown',()=>this.game.events.off('obie-resize',this._rs));
    this.physics.world.setBounds(0,-400,this.worldW,H+800); this.physics.world.gravity.y=1600;
    // Ground segments split by pits, with painted end caps at each lip
    this.solids=this.physics.add.staticGroup(); this.plats=this.physics.add.staticGroup();
    const pits=lv.pits.slice().sort((a,b)=>a.x-b.x); let gx=0; const segs=[];
    pits.forEach(p=>{ segs.push([gx,p.x]); gx=p.x+p.w; }); segs.push([gx,this.worldW]); this.segs=segs;
    const gtex=this.textures.get(L.key+'_L3_ground').getSourceImage(); const gh=gtex.height/2, gy=G-GTOP[L.key];
    const capScale=(k)=>{ const m=OBIE_PROPS[k]; return Math.max((H-G+24)/(m.h-m.top), Math.min(0.5, 150/m.w)); };
    const stripEnd={}, stripStart={};
    if(!this.textures.exists('pitgrad')){ const c=this.textures.createCanvas('pitgrad',4,120), x=c.getContext(), g=x.createLinearGradient(0,0,0,120); g.addColorStop(0,'rgba(11,11,12,0)'); g.addColorStop(1,'rgba(11,11,12,0.85)'); x.fillStyle=g; x.fillRect(0,0,4,120); c.refresh(); }
    pits.forEach(p=>{
      this.add.image(p.x,H-120,'pitgrad').setOrigin(0,0).setDisplaySize(p.w,120).setDepth(1);
      const kr=L.key+'_ground_cap_right', kl=L.key+'_ground_cap_left';
      const sr=capScale(kr), mr=OBIE_PROPS[kr], wr=mr.w*sr; const capR=this.add.image(p.x+wr*0.15,G-mr.top*sr,kr).setOrigin(1,0).setScale(sr).setDepth(2.5);
      const sl=capScale(kl), ml=OBIE_PROPS[kl], wl=ml.w*sl; const capL=this.add.image(p.x+p.w-wl*0.15,G-ml.top*sl,kl).setOrigin(0,0).setScale(sl).setDepth(2.5);
      stripEnd[p.x]=capR.x-wr+24; stripStart[p.x+p.w]=capL.x+wl-24;
    });
    segs.forEach(([a,b])=>{ if(b-a<2) return;
      const va=stripStart[a]!=null?stripStart[a]:a, vb=stripEnd[b]!=null?stripEnd[b]:b;
      if(vb>va){ const t=this.add.tileSprite(va,gy,vb-va,Math.max(gh,H-gy),L.key+'_L3_ground').setOrigin(0,0).setTileScale(0.5).setDepth(2); t.tilePositionX=va*2; }
      const r=this.add.rectangle(a+(b-a)/2,G+100,b-a,200); this.physics.add.existing(r,true); this.solids.add(r); });
    const PS=L.key==='stadium'?0.34:0.42; this.PS=PS;
    const pk=(n)=>L.key+'_platform_'+n, pm=(n)=>OBIE_PROPS[pk(n)];
    const platW=(n)=>(pm('left').w+pm('right').w+n*pm('mid').w)*PS;
    const buildPlat=(cx,y,n,dynamic)=>{ if(L.key==='stadium') n=Math.max(1,n); const w=platW(n), x0=cx-w/2; const c=this.add.container(x0,y).setDepth(3);
      let xx=0; const put=(part)=>{ const m=pm(part); const im=this.add.image(xx,-m.top*PS,pk(part)).setOrigin(0,0).setScale(PS); c.add(im); xx+=m.w*PS; };
      put('left'); for(let i=0;i<n;i++) put('mid'); put('right');
      const top=pm('mid').h*PS*0.12, inset=pm('left').w*PS*0.12;
      const r=this.add.rectangle(x0+w/2,y+top/2,w-inset*2,Math.max(10,top)); this.physics.add.existing(r,!dynamic);
      r.body.checkCollision.down=false; r.body.checkCollision.left=false; r.body.checkCollision.right=false; r.vis=c; r.w=w; return r; };
    lv.plats.forEach(p=>this.plats.add(buildPlat(p.cx,p.y,p.n)));
    this.movers=this.physics.add.group({allowGravity:false,immovable:true});
    lv.movers.forEach(m=>{ const r=buildPlat(m.x+platW(L.key==='stadium'?Math.max(1,m.n):m.n)/2,m.y,m.n,true); this.movers.add(r); r.body.setAllowGravity(false); r.body.setImmovable(true);
      r.body.checkCollision.down=false; r.body.checkCollision.left=false; r.body.checkCollision.right=false;
      r.minX=m.x+r.w/2; r.maxX=m.x+m.range+r.w/2; r.body.setVelocityX(m.speed); r.spd=m.speed; });
    this.hazards=this.physics.add.staticGroup();
    const hk=L.key+'_hazard_'+L.hazard, hm=OBIE_PROPS[hk], HS=0.5, hw=hm.w*HS, hh=hm.h*HS;
    lv.hazards.forEach(h=>{ for(let i=0;i<h.n;i++){ const cx=h.x+65+i*130;
      const v=this.add.image(cx,G+8,hk).setOrigin(0.5,1).setScale(HS).setDepth(4);
      if(L.hazard==='ghostfire'){ v.setBlendMode('ADD'); this.tweens.add({targets:v,scaleY:HS*1.06,alpha:0.85,duration:260,yoyo:true,repeat:-1}); }
      if(L.hazard==='sparks') this.tweens.add({targets:v,alpha:0.75,duration:90,yoyo:true,repeat:-1,repeatDelay:500});
      const r=this.add.rectangle(cx,G+8-hh*0.3,hw*0.6,hh*0.6-8); this.physics.add.existing(r,true); r.vis=v; this.hazards.add(r); } });
    // Collectibles
    this.items=this.physics.add.group({allowGravity:false,immovable:true});
    const addItem=(x,y,key,kind,size)=>{ const it=this.items.create(x,y,key).setDepth(5); const sc=size/Math.max(it.width,it.height); it.setScale(sc); it.kind=kind;
      if(kind==='candy'){ it.body.setCircle(28/sc,it.width/2-28/sc,it.height/2-28/sc); this.tweens.add({targets:it,scale:sc*1.08,duration:650+Math.random()*250,yoyo:true,repeat:-1,ease:'Sine.easeInOut'}); }
      else it.body.setSize(it.width*0.8,it.height*0.8);
      this.tweens.add({targets:it,y:y-6,duration:700+Math.random()*300,yoyo:true,repeat:-1,ease:'Sine.easeInOut'}); return it; };
    lv.candy.forEach(c=>addItem(c.x,Math.min(c.y,G-110),'candy_corn','candy',46));
    lv.balls.forEach(c=>addItem(c.x,c.y,'football','ball',36));
    lv.hearts.forEach(c=>addItem(c.x,c.y,'heart','heart',34));
    this.addItem=addItem;
    // Checkpoints
    this.cps=this.physics.add.staticGroup(); this.respawn={x:120,y:G-40};
    lv.checkpoints.forEach(c=>{ const f=this.add.image(c.x,G+4,'checkpoint_flag_down').setOrigin(0.25,1).setScale(0.5).setDepth(4);
      const z=this.add.zone(c.x+10,G-60,40,120); this.physics.add.existing(z,true); z.flag=f; this.cps.add(z); });
    // Arena gate marker
    this.arenaW=lv.arenaW; this.add.image(lv.arenaX,G+4,'checkpoint_flag_down').setOrigin(0.25,1).setScale(0.5).setTint(0xff9a9a).setDepth(4);
    // Player
    this.makeAnims();
    const p=this.player=this.physics.add.sprite(120,G-10,'obie','idle_0').setOrigin(0.5,1).setScale(0.58).setDepth(10);
    p.body.setSize(80,186).setOffset(88,66); p.body.setMaxVelocityY(1100); p.setCollideWorldBounds(false);
    this.shadows=[]; this.makeShadow=(t,w)=>{ const sh=this.add.ellipse(t.x,G,w,10,0x000000,0.4).setDepth(t===p?9.5:7.5); sh.t=t; this.shadows.push(sh); return sh; };
    p.facing=1; p.inv=0; p.coyote=0; p.jumpBuf=0; p.throwing=false; p.hurtT=0; p.airT=0;
    this.makeShadow(p,64);
    p.on('animationupdate',(a,f)=>{ if(a.key==='o_throw' && f.textureFrame==='throw_2') this.spawnBall(); });
    p.on('animationcomplete',(a)=>{ if(a.key==='o_throw') p.throwing=false; });
    this.physics.add.collider(p,this.solids); this.physics.add.collider(p,this.plats); this.physics.add.collider(p,this.movers,(pl,m)=>{ this.onMover=m; });
    this.physics.add.overlap(p,this.items,(pl,it)=>this.collect(it));
    this.physics.add.overlap(p,this.hazards,(pl,hz)=>{ if(p.inv>0||this.dying||this.god) return; hz.vis.setTint(OBIE.C.red); this.time.delayedCall(150,()=>hz.vis.clearTint()); this.hurt(p.x+40*-p.facing); });
    this.physics.add.overlap(p,this.cps,(pl,z)=>this.checkpoint(z));
    // Enemies
    this.enemies=this.physics.add.group(); this.balls=this.physics.add.group({allowGravity:false}); this.bossShots=this.physics.add.group({allowGravity:false});
    this.physics.add.collider(this.enemies,this.solids); this.physics.add.collider(this.enemies,this.plats);
    lv.enemies.forEach(e=>this.spawnEnemy(e.type,e.x,G-20));
    this.physics.add.overlap(p,this.enemies,(pl,e)=>this.touchEnemy(e));
    this.physics.add.overlap(this.balls,this.enemies,(b,e)=>{ if(!b.active||!e.active||e.dead||b.hit) return; b.hit=true; const dir=(b.body&&b.body.velocity.x<0)?-1:1; this.impact(b); this.damageEnemy(e,1,dir); });
    this.physics.add.overlap(p,this.bossShots,(pl,s)=>{ if(!s.active) return; this.hurt(s.x); if(!s.persist){ s.destroy(); } });
    // FX
    this.fxSpark=this.add.particles(0,0,'spark',{speed:{min:120,max:380},lifespan:500,scale:{start:0.5,end:0},tint:[OBIE.C.orange,OBIE.C.gold,OBIE.C.bone],emitting:false,blendMode:'ADD'}).setDepth(20);
    this.fxCandy=this.add.particles(0,0,'spark',{speed:{min:60,max:180},lifespan:400,scale:{start:0.35,end:0},tint:[0xFFF4D6,OBIE.C.orange,0xF6C21A],emitting:false}).setDepth(20);
    this.fxDust=this.add.particles(0,0,'soft',{speedX:{min:-80,max:80},speedY:{min:-40,max:-10},lifespan:450,scale:{start:0.25,end:0.6},alpha:{start:0.35,end:0},tint:0xb8a890,emitting:false}).setDepth(9);
    this.fxStraw=this.add.particles(0,0,'straw',{speed:{min:100,max:300},lifespan:700,rotate:{min:0,max:360},scale:0.7,gravityY:600,emitting:false}).setDepth(20);
    this.fxGhost=this.add.particles(0,0,'soft',{speed:{min:30,max:120},lifespan:800,scale:{start:0.5,end:1.2},alpha:{start:0.5,end:0},tint:OBIE.C.ghost,emitting:false,blendMode:'ADD'}).setDepth(20);
    // Input
    const K=Phaser.Input.Keyboard.KeyCodes; this.keys=this.input.keyboard.addKeys({l:K.LEFT,r:K.RIGHT,a:K.A,d:K.D,up:K.UP,w:K.W,sp:K.SPACE,z:K.Z,x:K.X,j:K.J,k:K.K,p:K.P,esc:K.ESC,m:K.M});
    this.input.keyboard.on('keydown-P',()=>this.togglePause()); this.input.keyboard.on('keydown-ESC',()=>this.togglePause());
    this.input.keyboard.on('keydown-M',()=>this.toggleMute());
    this.prevJump=false; this.prevThrow=false;
    cam.startFollow(p,true,0.12,0.1); cam.setDeadzone(60,400); cam.setFollowOffset(-this.v.vw*0.12,0);
    this.scene.launch('HUD',{level:this.levelNum}); this.hud=this.scene.get('HUD');
    this.bossStarted=false; this.boss=null; this.done=false; this.dying=false;
    this.events.on('shutdown',()=>{ this.scene.stop('HUD'); this.scene.stop('BG'); });
    const onVis=()=>{ if(document.hidden && !this.done) this.togglePause(true); }; document.addEventListener('visibilitychange',onVis);
    this.events.once('shutdown',()=>document.removeEventListener('visibilitychange',onVis));
    this.portraitCheck=this.time.addEvent({delay:500,loop:true,callback:()=>{ if(window.innerHeight>window.innerWidth && !this.done) this.togglePause(true); }});
    SFX.startMusic(this.levelNum);
    this.time.delayedCall(250,()=>this.hud.titleCard('LEVEL '+L.id+': '+L.name, L.sub));
    if(this.startBoss){ p.x=lv.arenaX+140; this.respawn={x:lv.arenaX+80,y:G-40}; }
    if(OBIE.params.debug) window.__obie={ game:this, warp:(x)=>{ p.x=x; p.y=G-120; }, state:()=>({level:this.levelNum,x:p.x,y:p.y,hearts:this.hearts,lives:this.lives,score:this.score,ammo:this.ammo,boss:this.boss?{hp:this.boss.hp,max:this.boss.max}:null,bossStarted:this.bossStarted}) };
    if(OBIE.params.god) this.god=true;
  }
  applyView(){ const v=this.v=OBIE.view(OBIE.GW,OBIE.GH); const cam=this.cameras.main; cam.setZoom(v.z);
    if(this.bossStarted){ const w=Math.max(this.arenaW,v.vw); cam.setBounds(this.lv.arenaX+(this.arenaW-w)/2,OBIE.H-v.vh,w,v.vh); }
    else cam.setBounds(0,OBIE.H-v.vh,this.worldW,v.vh);
    if(this.player) cam.setFollowOffset(this.bossStarted?0:-v.vw*0.12,0); }
  makeAnims(){
    if(!this.anims.exists('crow_flap')) this.anims.create({key:'crow_flap',frames:[0,1,2,1].map(i=>({key:'boss2_husk_colossus_crow_'+i})),frameRate:12,repeat:-1});
    if(this.anims.exists('o_run')) return;
    const fr=(n)=>n.map(f=>({key:'obie',frame:f}));
    this.anims.create({key:'o_idle',frames:fr(['idle_0','idle_1','idle_2','idle_3']),frameRate:6,repeat:-1});
    this.anims.create({key:'o_run',frames:fr(['run_0','run_1','run_2','run_3','run_4','run_5','run_6','run_7']),frameRate:12,repeat:-1});
    this.anims.create({key:'o_throw',frames:fr(['throw_0','throw_1','throw_2','throw_3']),frameRate:16,repeat:0});
    this.anims.create({key:'o_hurt',frames:fr(['hurt_0','hurt_1']),frameRate:8,repeat:0});
  }
  spawnEnemy(type,x,y){
    const cfg=OBIE.ENEMY[type]; const e=this.enemies.create(x,y,'pixel').setOrigin(0.5,1).setVisible(false);
    e.body.setSize(4,4); e.setDisplaySize(56,118); e.body.setSize(56/e.scaleX*1,118/e.scaleY*1);
    e.type=type; e.hp=cfg.hp; e.cfg=cfg; e.dir=-1; e.t=Math.random()*10; e.baseY=y-120;
    e.vis=this.add.image(x,y,'enemies',type).setOrigin(0.5,1).setScale(cfg.scale).setDepth(8); if(!cfg.fly) e.shadow=this.makeShadow(e,60);
    if(cfg.fly){ e.body.setAllowGravity(false); e.y=this.G-150; e.baseY=this.G-150; e.shotT=2000+Math.random()*1500; }
    return e;
  }
  update(time,dt){
    try{ this.update2(time,dt); }catch(err){ this._errs=(this._errs||0)+1; if(this._errs<5) console.warn('Recovered from update error:',err&&err.message); }
  }
  update2(time,dt){
    if(this.done) return; const p=this.player, k=this.keys, I=OBIE.input, s=dt/1000;
    const left=k.l.isDown||k.a.isDown||I.left, right=k.r.isDown||k.d.isDown||I.right;
    const jump=k.up.isDown||k.w.isDown||k.sp.isDown||k.z.isDown||I.jump, thr=k.x.isDown||k.j.isDown||k.k.isDown||I.throw;
    const onGround=p.body.blocked.down||p.body.touching.down;
    if(!this.dying){
      const acc=onGround?2600:1700, max=270;
      if(left&&!right){ p.body.setAccelerationX(-acc); p.facing=-1; } else if(right&&!left){ p.body.setAccelerationX(acc); p.facing=1; }
      else { p.body.setAccelerationX(0); p.body.velocity.x*=onGround?0.75:0.94; if(Math.abs(p.body.velocity.x)<8) p.body.velocity.x=0; }
      p.body.velocity.x=Phaser.Math.Clamp(p.body.velocity.x,-max,max);
      if(onGround){ if(p.airT>0.25){ this.fxDust.explode(6,p.x,p.y); this.tweens.add({targets:p,scaleY:0.52,scaleX:0.64,duration:70,yoyo:true}); } p.coyote=0.1; p.airT=0; } else { p.coyote-=s; p.airT+=s; }
      const JD=Phaser.Input.Keyboard.JustDown; const jp=JD(k.up)|JD(k.w)|JD(k.sp)|JD(k.z)|(I.jump&&!this.prevTJump)|!!I.jumpTap; I.jumpTap=false; if(jp) p.jumpBuf=0.12; else p.jumpBuf-=s;
      if(p.jumpBuf>0 && p.coyote>0){ p.body.setVelocityY(-720); p.coyote=0; p.jumpBuf=0; p.jumpT=time; SFX.play('jump'); this.fxDust.explode(4,p.x,p.y); }
      if(!jump && p.body.velocity.y<-250) p.body.velocity.y*=0.55; // variable jump height
      if(JD(k.x)|JD(k.j)|JD(k.k)|(I.throw&&!this.prevTThrow)|!!I.throwTap) this.tryThrow(); I.throwTap=false;
      if(this.onMover && onGround){ p.x+=this.onMover.body.velocity.x*s; }
      this.onMover=null;
    }
    this.prevJump=jump; this.prevThrow=thr; this.prevTJump=I.jump; this.prevTThrow=I.throw;
    p.setFlipX(p.facing<0);
    // animation state
    if(this.dying){} else if(p.hurtT>0){ p.hurtT-=s; }
    else if(p.throwing){}
    else if(!onGround){ p.anims.stop(); const vy=p.body.velocity.y; const f=(p.jumpT&&time-p.jumpT<80)?'jump_takeoff':(Math.abs(vy)<60?'jump_apex':(vy>0?'jump_fall':'jump_takeoff')); p.setFrame(f); }
    else if(Math.abs(p.body.velocity.x)>20) p.anims.play('o_run',true);
    else p.anims.play('o_idle',true);
    const bob=(!p.throwing&&onGround&&Math.abs(p.body.velocity.x)<=20&&p.hurtT<=0)?Math.sin(time/260)*0.004:0; if(!this.tweens.isTweening(p)) { p.scaleY=0.58+bob; p.scaleX=0.58; }
    // i-frames blink
    if(p.inv>0){ p.inv-=s; p.setAlpha(Math.floor(time/60)%2?0.35:1); if(p.inv<=0) p.setAlpha(1); }
    // movers
    this.movers.children.iterate(m=>{ if(m.x>m.maxX) m.body.setVelocityX(-m.spd); else if(m.x<m.minX) m.body.setVelocityX(m.spd); });
    // pits
    if(p.y>OBIE.H+60 && !this.dying) this.fallInPit();
    // enemies
    this.enemies.children.each(e=>this.updateEnemy(e,time,s));
    this.balls.children.each(b=>{ if(time>b.die) b.destroy(); });
    this.bossShots.children.each(b=>{ if(b.update2) b.update2(time,s); if(b.glow) b.glow.setPosition(b.x,b.y); if(b.x<-200||b.x>this.worldW+200||b.y>OBIE.H+100||(b.die&&time>b.die)) b.destroy(); });
    // boss trigger
    if(!this.bossStarted && p.x>this.lv.arenaX+120) this.startBossFight();
    if(this.boss) this.updateBoss(time,s);
    if(this.bossStarted && p.x<this.lv.arenaX+20){ p.x=this.lv.arenaX+20; p.body.velocity.x=Math.max(0,p.body.velocity.x); }
    if(p.x>this.worldW-30){ p.x=this.worldW-30; } if(p.x<20) p.x=20;
    this.shadows=this.shadows.filter(sh=>{ if(!sh.active) return false; if(!sh.t.active){ sh.destroy(); return false; } const t=sh.t, b=t.body; if(!b) return true;
      const onG=b.blocked.down||b.touching.down; if(onG) t.lastGY=b.bottom; const gy=t.lastGY||b.bottom; const d=Math.max(0,gy-b.bottom);
      sh.setPosition(t.x,gy-2); sh.setScale(Math.max(0.4,1-d/300)); sh.setAlpha(Math.max(0.1,0.4-d/500)*(t.alpha||1)); return true; });
    this.hud.sync(this);
  }
  groundAt(x){ return this.segs.some(([a,b])=>x>=a+4&&x<=b-4); }
  updateEnemy(e,time,s){
    if(e.dead) return; const p=this.player, c=e.cfg; e.t+=s;
    const dx=p.x-e.x; const near=Math.abs(dx)<700;
    if(!near && !e.fly){ e.body.setVelocityX(0); }
    else if(c.fly){ e.dir=dx<0?-1:1; e.body.setVelocityX(Math.abs(dx)>200?e.dir*c.speed:Math.sin(e.t)*40); e.y=e.baseY+Math.sin(e.t*2.2)*36;
      e.shotT-=s*1000; if(e.shotT<=0 && Math.abs(dx)<520){ e.shotT=2600; this.throwFlag(e); } }
    else { let sp=c.speed; if(e.type==='pumpkinhead_runner' && Math.abs(dx)<360 && Math.abs(p.y-e.y)<120){ e.dir=dx<0?-1:1; sp=c.charge; }
      else if(e.type==='scarecrow_lineman'||e.type==='zombie_player'){ if(Math.abs(dx)<500) e.dir=dx<0?-1:1; }
      const ahead=e.x+e.dir*40; if(e.body.blocked.down && (!this.groundAt(ahead)) && e.y>=this.G-5){ e.dir*=-1; }
      if(e.body.blocked.left) e.dir=1; if(e.body.blocked.right) e.dir=-1;
      e.body.setVelocityX(e.dir*sp); }
    if(e.y>OBIE.H+80){ this.killEnemy(e,true); return; }
    // squash and bob tweens done procedurally
    const v=e.vis, ph=e.t*(c.fly?3:(Math.abs(e.body.velocity.x)>100?14:8));
    const sq=c.fly?Math.sin(ph)*0.04:Math.abs(Math.sin(ph))*0.07;
    v.setScale(c.scale*(1+sq*0.6), c.scale*(1-sq)); v.x=e.x; v.y=e.y-(c.fly?0:Math.abs(Math.sin(ph))*5);
    v.setFlipX(e.dir>0); if(!c.fly) v.rotation=Math.sin(ph)*0.04;
  }
  throwFlag(e){ const f=this.bossShots.create(e.x,e.y-60,'pflag').setDisplaySize(20,20).setDepth(15); f.body.setAllowGravity(true);
    const dx=this.player.x-e.x; f.body.setVelocity(Phaser.Math.Clamp(dx*1.1,-360,360),-380); f.setAngularVelocity(400); SFX.play('whistle'); }
  touchEnemy(e){
    if(e.dead) return; const p=this.player;
    if(p.body.velocity.y>80 && p.body.bottom < e.body.top+26){ // stomp
      p.body.setVelocityY(this.prevJump?-640:-430); SFX.play('stomp'); this.cameras.main.shake(80,0.004); this.damageEnemy(e,e.type==='scarecrow_lineman'?2:2,0); this.addScore(50,e.x,e.y-110);
    } else this.hurt(e.x);
  }
  damageEnemy(e,n,dir){
    e.hp-=n; e.vis.setTintFill(0xffffff); this.time.delayedCall(80,()=>e.vis&&e.vis.clearTint()); SFX.play('hit');
    this.fxSpark.explode(8,e.x,e.y-50);
    if(e.type==='scarecrow_lineman') this.fxStraw.explode(6,e.x,e.y-50);
    if(dir) e.x+=dir*14;
    if(e.hp<=0) this.killEnemy(e);
  }
  killEnemy(e,silent){
    e.dead=true; e.body.enable=false; if(!silent){ this.addScore(e.cfg.score,e.x,e.y-120); SFX.play('defeat'); this.cameras.main.shake(100,0.005);
      if(e.type==='scarecrow_lineman') this.fxStraw.explode(24,e.x,e.y-60); else if(e.type==='ghost_ref') this.fxGhost.explode(14,e.x,e.y-60); else this.fxSpark.explode(18,e.x,e.y-60);
      if(Math.random()<0.3) this.addItem(e.x,e.y-60,'football','ball',36); }
    if(e.shadow){ e.shadow.destroy(); e.shadow=null; }
    this.tweens.add({targets:e.vis,scaleY:0.05,scaleX:e.cfg.scale*1.5,alpha:0,duration:260,ease:'Quad.in',onComplete:()=>{ e.vis.destroy(); e.destroy(); }});
  }
  tryThrow(){
    const p=this.player; if(p.throwing||this.dying||p.hurtT>0) return;
    if(this.ammo<=0){ this.hud.flashAmmo(); SFX.play('click'); return; }
    p.throwing=true; p.anims.play('o_throw',true);
  }
  spawnBall(){
    const p=this.player; if(this.ammo<=0) return; this.ammo--; SFX.play('throw');
    const b=this.balls.create(p.x+p.facing*40,p.y-95,'football_proj').setScale(0.5).setDepth(12);
    b.body.setSize(40,28); let vy=-30; const bo=this.boss; if(bo&&!bo.dead&&bo.hover&&Math.sign(bo.x-p.x)===p.facing){ const t=Math.abs(bo.x-b.x)/680; vy=Phaser.Math.Clamp(((bo.y-110)-b.y)/Math.max(t,0.2),-420,300); } b.body.setVelocity(p.facing*680,vy); b.setAngularVelocity(720*p.facing); b.die=this.time.now+1100;
    const trail=this.add.particles(0,0,'spark',{follow:b,lifespan:200,scale:{start:0.25,end:0},alpha:{start:0.6,end:0},tint:OBIE.C.ember,frequency:20,blendMode:'ADD'}).setDepth(11);
    b.once('destroy',()=>{ trail.stop(); this.time.delayedCall(250,()=>trail.destroy()); });
  }
  impact(b){ this.fxSpark.explode(6,b.x,b.y); b.destroy(); }
  collect(it){
    if(!it.active) return; const x=it.x,y=it.y;
    if(it.kind==='candy'){ this.addScore(10); SFX.play('candy'); this.fxCandy.explode(6,x,y); }
    else if(it.kind==='ball'){ this.ammo=Math.min(30,this.ammo+3); SFX.play('ball'); this.hud.popText(x,y,'+3',this); this.fxSpark.explode(8,x,y); }
    else if(it.kind==='heart'){ this.maxHearts=Math.min(5,Math.max(this.maxHearts,this.hearts+1)); this.hearts=Math.min(this.maxHearts,this.hearts+1); SFX.play('heart'); this.fxSpark.explode(10,x,y); }
    it.destroy();
  }
  addScore(n,x,y){ this.score+=n; if(x!=null) this.hud.popText(x,y,'+'+n,this); }
  checkpoint(z){ if(z.on) return; z.on=true; this.tweens.add({targets:z.flag,scaleX:0.02,duration:150,yoyo:true,onYoyo:()=>z.flag.setTexture('checkpoint_flag_raised')}); this.respawn={x:z.x,y:this.G-40}; SFX.play('checkpoint');
    this.fxSpark.explode(14,z.x+10,this.G-170); this.hud.toast('CHECKPOINT'); }
  hurt(fromX){
    const p=this.player; if(p.inv>0||this.dying||this.done||this.god) return;
    this.hearts--; p.inv=1.4; p.hurtT=0.25; p.throwing=false; p.anims.play('o_hurt',true);
    p.body.setVelocity((p.x<fromX?-1:1)*300,-380); SFX.play('hurt'); this.cameras.main.shake(180,0.01); this.cameras.main.flash(120,224,38,43,false);
    p.setTintFill(0xffffff); this.time.delayedCall(90,()=>p.clearTint());
    if(this.hearts<=0) this.die();
  }
  fallInPit(){
    if(this.god){ this.player.y=this.G-200; this.player.body.setVelocityY(0); return; }
    this.hearts--; SFX.play('hurt'); this.cameras.main.shake(150,0.01);
    if(this.hearts<=0) return this.die();
    // back to safe ground before the pit
    const p=this.player; let x=p.x; for(let i=0;i<60 && !this.groundAt(x);i++) x-=20; x-=40;
    p.setPosition(x,this.G-80); p.body.setVelocity(0,0); p.inv=1.4;
  }
  die(){
    if(this.dying) return; this.dying=true; const p=this.player; p.anims.play('o_hurt',true); p.body.setVelocity(0,-500); p.body.checkCollision.none=true;
    this.lives--; SFX.play('lose'); this.cameras.main.shake(300,0.012);
    this.time.delayedCall(1300,()=>{
      if(this.lives<0){ this.finish(false); return; }
      this.hud.banner(this.lives+' '+(this.lives===1?'LIFE':'LIVES')+' LEFT','',1400);
      p.body.checkCollision.none=false; this.dying=false; this.hearts=this.maxHearts; p.inv=2;
      const r=this.bossStarted?{x:this.lv.arenaX+80}:this.respawn; p.setPosition(r.x,this.G-80); p.body.setVelocity(0,0); this.ammo=Math.max(this.ammo,5);
      if(this.boss){ this.boss.x=Math.max(this.boss.x,this.lv.arenaX+700); }
    });
  }
  // ---------- BOSS ----------
  startBossFight(){
    this.bossStarted=true; const L=this.L, ax=this.lv.arenaX, cam=this.cameras.main;
    cam.stopFollow(); cam.pan(ax+this.arenaW/2,OBIE.H-this.v.vh/2,700,'Sine.easeInOut'); this.time.delayedCall(720,()=>{ this.applyView(); cam.startFollow(this.player,true,0.08,0.1); cam.setFollowOffset(0,0); });
    this.enemies.children.each(e=>{ if(!e.dead && e.x<ax) this.killEnemy(e,true); });
    SFX.stopMusic(); SFX.play('roar');
    const b=this.boss=this.physics.add.sprite(ax+this.arenaW-170,-200,'pixel').setOrigin(0.5,1).setVisible(false);
    b.body.setSize(4,4); b.setDisplaySize(130,210); b.body.setSize(130/b.scaleX,210/b.scaleY);
    b.key=L.boss.key; b.hp=b.max=L.boss.hp; b.t=0; b.atkT=2.2; b.dir=-1; b.state='enter'; b.flash=0;
    b.vis=this.add.image(b.x,b.y,'bosses',b.key).setOrigin(0.5,1).setScale(0.5).setDepth(9);
    b.glow=this.add.image(b.x,b.y,'soft').setScale(5,1.2).setTint(b.key==='tailgate_wraith'?OBIE.C.wraith:OBIE.C.ember).setAlpha(0).setBlendMode('ADD').setDepth(8);
    if(b.key==='zombie_coach'){ b.rim=this.add.image(b.x,b.y,'soft').setTint(0x9CC8FF).setBlendMode('ADD').setAlpha(0.45).setScale(5,7).setDepth(8.9); }
    if(b.key==='tailgate_wraith'){ b.body.setAllowGravity(false); b.y=this.G-120; b.hover=true; }
    this.physics.add.collider(b,this.solids,()=>{ if(b.slamming){ b.slamming=false; this.slamLand(b); } });
    this.physics.add.overlap(this.player,b,()=>{ const p=this.player; if(b.dead) return;
      if(p.body.velocity.y>80 && p.body.bottom<b.body.top+30){ p.body.setVelocityY(-560); this.damageBoss(1); SFX.play('stomp'); } else this.hurt(b.x); });
    this.physics.add.overlap(this.balls,b,(bb,ball)=>{ const o=bb===b?ball:bb; if(!o.active||b.dead) return; this.impact(o); this.damageBoss(1); });
    this.time.delayedCall(900,()=>{ this.hud.bossBar(L.boss.name,1); this.hud.banner(L.boss.name,'Boss fight!',1600); SFX.startMusic(this.levelNum); });
    this.ammoDrop=this.time.addEvent({delay:7000,loop:true,callback:()=>{ if(this.ammo<6 && this.boss && !this.boss.dead) this.addItem(ax+Phaser.Math.Between(120,800),this.G-160,'football','ball',36); }});
    if(this.ammo<6) this.ammo=6;
  }
  damageBoss(n){
    const b=this.boss; if(!b||b.dead||b.state==='enter') return; b.hp-=n; this.addScore(25);
    b.vis.setTintFill(0xffffff); this.time.delayedCall(70,()=>b.vis&&!b.dead&&b.vis.clearTint());
    this.fxSpark.explode(10,b.x,b.y-120); SFX.play('bossHit'); this.cameras.main.shake(70,0.004);
    this.hud.bossBar(null,Math.max(0,b.hp/b.max));
    if(b.hp<=b.max/2 && !b.enraged){ b.enraged=true; this.hud.banner('ENRAGED!','',900); b.vis.setTint(0xffb0a0); this.time.delayedCall(300,()=>b.vis.clearTint()); }
    if(b.hp<=0) this.defeatBoss();
  }
  defeatBoss(){
    const b=this.boss; b.dead=true; b.body.enable=false; this.ammoDrop&&this.ammoDrop.remove(); SFX.stopMusic(); SFX.play('boom');
    this.bossShots.clear(true,true); this.enemies.children.each(e=>!e.dead&&this.killEnemy(e));
    this.physics.world.timeScale=2.5; this.time.timeScale=0.5; this.tweens.timeScale=0.5;
    for(let i=0;i<6;i++) this.time.delayedCall(i*120,()=>{ this.fxSpark.explode(30,b.x+Phaser.Math.Between(-80,80),b.y-Phaser.Math.Between(40,220)); this.cameras.main.shake(200,0.015); SFX.play('hit'); });
    this.tweens.add({targets:b.vis,alpha:0,scaleY:0.1,angle:-20,duration:900,delay:500});
    this.addScore(2000+this.hearts*500,b.x,b.y-260);
    this.time.delayedCall(1300,()=>{ this.physics.world.timeScale=1; this.time.timeScale=1; this.tweens.timeScale=1; this.hud.banner('BOSS DEFEATED!','+'+(2000+this.hearts*500),1800); });
    this.time.delayedCall(2200,()=>this.finish(true));
  }
  finish(win){
    if(this.done) return; this.done=true; const save=OBIE.save.load(); let newBest=false;
    if(win){ save.unlocked=Math.max(save.unlocked,Math.min(4,this.levelNum+1)); if((save.best[this.levelNum]||0)<this.score){ save.best[this.levelNum]=this.score; newBest=true; }
      save.total=Math.max(save.total||0,this.score); }
    OBIE.save.write(save);
    this.cameras.main.fadeOut(500,17,16,20);
    this.time.delayedCall(520,()=>this.scene.start('Result',{win,level:this.levelNum,score:this.score,lives:this.lives,newBest,final:win&&this.levelNum===4}));
  }
  updateBoss(time,s){
    const b=this.boss, p=this.player, ax=this.lv.arenaX; if(!b) return;
    b.t+=s; const vis=b.vis;
    if(!b.dead){
      if(b.state==='enter'){ if(b.hover){ b.y=Phaser.Math.Linear(b.y,this.G-120,0.05); } if((b.body.blocked.down||b.hover) && b.t>1.0){ if(!b.landed){ b.landed=true; this.cameras.main.shake(300,0.012); SFX.play('boom'); this.fxDust.explode(20,b.x,this.G);} if(b.t>1.6) b.state='fight'; } }
      else this.bossAI(b,time,s);
      b.x=Phaser.Math.Clamp(b.x,ax+90,ax+this.arenaW-90);
    }
    const moving=Math.abs(b.body.velocity.x)>20, ph=b.t*(moving?9:3);
    const sq=b.hover?Math.sin(ph)*0.03:(moving?Math.abs(Math.sin(ph))*0.05:Math.sin(ph)*0.025);
    if(!b.dead){ vis.setScale(0.5*(1+sq*0.6),0.5*(1-sq)); vis.x=b.x+(b.shakeT>0?Math.sin(time*0.08)*6:0); vis.y=b.y-(moving?Math.abs(Math.sin(ph))*6:0); vis.setFlipX(b.dir>0); }
    if(b.shakeT>0) b.shakeT-=s;
    b.glow.setPosition(b.x,b.y-40); if(b.rim){ b.rim.setPosition(vis.x+18,b.y-120); b.rim.setAlpha(b.dead?0:0.4+Math.sin(time*0.004)*0.08); } b.glow.setAlpha(b.shakeT>0?0.5+Math.sin(time*0.03)*0.2:(b.hover?0.25:0));
  }
  telegraph(b,dur){ b.shakeT=dur; }
  bossAI(b,time,s){
    const p=this.player, dx=p.x-b.x, rate=b.enraged?0.65:1; b.atkT-=s;
    const face=()=>{ b.dir=dx<0?-1:1; };
    if(b.key==='gourd_king'){
      if(!b.slamming && b.body.blocked.down){ face(); b.body.setVelocityX(b.shakeT>0?0:b.dir*(b.enraged?90:60)); }
      if(b.atkT<=0){ b.atkT=2.6*rate; const r=Math.random();
        if(r<0.55){ this.telegraph(b,0.45); this.time.delayedCall(450,()=>{ if(b.dead) return; const n=b.enraged?2:1; for(let i=0;i<n;i++) this.time.delayedCall(i*600,()=>this.rollPumpkin(b)); }); }
        else { this.telegraph(b,0.35); this.time.delayedCall(350,()=>{ if(b.dead) return; b.slamming=true; b.body.setVelocity(Phaser.Math.Clamp(dx*1.2,-420,420),-820); SFX.play('roar'); }); } }
    } else if(b.key==='husk_colossus'){
      face(); const want=p.x+(dx<0?380:-380); b.body.setVelocityX(b.shakeT>0?0:Phaser.Math.Clamp((want-b.x)*0.6,-110,110)*-1*0+ (Math.abs(dx)<260?-b.dir*120:(Math.abs(dx)>520?b.dir*70:0)));
      if(b.atkT<=0){ b.atkT=2.4*rate; if(Math.random()<0.62){ this.telegraph(b,0.4); this.time.delayedCall(400,()=>{ if(b.dead) return; const n=b.enraged?4:3; for(let i=0;i<n;i++) this.time.delayedCall(i*220,()=>this.huskSpiral(b)); }); }
        else { this.telegraph(b,0.5); SFX.play('roar'); this.time.delayedCall(500,()=>{ if(b.dead) return; for(let i=0;i<(b.enraged?3:2);i++) this.time.delayedCall(i*350,()=>this.spawnCrow(b)); }); } }
    } else if(b.key==='tailgate_wraith'){
      if(b.dashing){ if((b.dashDir>0&&b.x>this.lv.arenaX+this.arenaW-110)||(b.dashDir<0&&b.x<this.lv.arenaX+110)){ b.dashing=false; b.body.setVelocity(0,0); } }
      else { face(); const tx=this.lv.arenaX+this.arenaW/2+Math.sin(b.t*0.7)*320, ty=this.G-150+Math.sin(b.t*1.7)*50; b.body.setVelocity((tx-b.x)*1.6,(ty-b.y)*2.5); }
      if(b.atkT<=0 && !b.dashing){ b.atkT=2.2*rate; if(Math.random()<0.6){ this.telegraph(b,0.4); this.time.delayedCall(400,()=>{ if(b.dead) return; this.emberVolley(b); if(b.enraged) this.time.delayedCall(500,()=>!b.dead&&this.emberVolley(b)); }); }
        else { this.telegraph(b,0.7); this.time.delayedCall(700,()=>{ if(b.dead) return; b.dashing=true; b.dashDir=p.x>b.x?1:-1; b.dir=b.dashDir; b.y=this.G-70; b.body.setVelocity(b.dashDir*(b.enraged?560:460),0); SFX.play('roar'); }); } }
    } else if(b.key==='zombie_coach'){
      if(b.charging){ if(b.body.blocked.left||b.body.blocked.right||b.x<=this.lv.arenaX+92||b.x>=this.lv.arenaX+this.arenaW-92){ b.charging=false; this.cameras.main.shake(200,0.01); b.body.setVelocityX(0);} }
      else { face(); b.body.setVelocityX(b.shakeT>0?0:b.dir*(b.enraged?80:55)); }
      if(b.atkT<=0 && !b.charging){ b.atkT=2.5*rate; const r=Math.random();
        if(r<0.35 && this.enemies.countActive()<3){ this.telegraph(b,0.5); SFX.play('whistle'); this.time.delayedCall(500,()=>{ if(b.dead) return; [this.lv.arenaX+40,this.lv.arenaX+this.arenaW-40].forEach(x=>{ const e=this.spawnEnemy('zombie_player',x,this.G-20); e.dir=x<b.x?1:-1; }); }); }
        else if(r<0.7){ this.telegraph(b,0.35); this.time.delayedCall(350,()=>{ if(b.dead) return; if(Math.random()<0.5) this.clipboard(b); else this.whistleBlast(b); }); }
        else { this.telegraph(b,0.6); this.time.delayedCall(600,()=>{ if(b.dead) return; b.charging=true; b.dir=p.x>b.x?1:-1; b.body.setVelocityX(b.dir*(b.enraged?520:420)); SFX.play('whistle'); }); } }
    }
  }
  shot(x,y,key,w,h,glowTint){ const o=this.bossShots.create(x,y,key).setDepth(15); o.setDisplaySize(w,h); o.body.setSize(o.width*0.7,o.height*0.7);
    const gl=this.add.image(x,y,'soft').setBlendMode('ADD').setTint(glowTint||OBIE.C.ember).setAlpha(0.55).setDepth(14).setScale(Math.max(w,h)/40);
    o.glow=gl; o.once('destroy',()=>gl.destroy()); return o; }
  rollPumpkin(b){ const o=this.shot(b.x+b.dir*60,this.G-33,'boss1_gourd_king_pumpkin_bomb',55,66,OBIE.C.ember); const d=this.player.x<b.x?-1:1; o.body.setVelocityX(d*(b.enraged?330:270)); o.setAngularVelocity(d*360);
    o.die=this.time.now+5000; SFX.play('stomp'); }
  slamLand(b){ this.cameras.main.shake(300,0.016); SFX.play('boom'); this.fxDust.explode(24,b.x,this.G);
    const ring=this.add.image(b.x,this.G+4,'boss1_gourd_king_shockwave_ring').setOrigin(0.5,0.9).setScale(0.2).setDepth(14).setBlendMode('ADD');
    this.tweens.add({targets:ring,scale:0.6,alpha:0,duration:500,ease:'Quad.out',onComplete:()=>ring.destroy()});
    [-1,1].forEach(d=>{ const w=this.shot(b.x+d*70,this.G-22,'boss1_gourd_king_shockwave_arc',96,52,OBIE.C.ember); w.body.setVelocityX(d*360); w.setFlipX(d<0); w.persist=true; w.die=this.time.now+2400; w.setBlendMode('ADD'); }); }
  huskSpiral(b){ const o=this.shot(b.x+b.dir*50,b.y-170,'boss2_husk_colossus_husk_spiral',72,46,OBIE.C.gold); o.body.setAllowGravity(true); o.body.setGravityY(-800);
    const dx=this.player.x-o.x, t=0.9; o.body.setVelocity(dx/t,(this.player.y-60-o.y-0.5*800*t*t)/t); o.setAngularVelocity(600); o.die=this.time.now+3000; SFX.play('throw'); }
  spawnCrow(b){ const c=this.shot(this.lv.arenaX+(Math.random()<0.5?-20:this.arenaW+20),90+Math.random()*80,'boss2_husk_colossus_crow_0',60,60,0x553366); c.glow.setAlpha(0.2); c.play('crow_flap'); c.t=0; c.die=this.time.now+6000;
    c.update2=(time,s)=>{ c.t+=s; const p=this.player; if(c.t<1.2){ c.body.setVelocity((p.x-c.x)*0.6,Math.sin(c.t*6)*80); } else if(!c.dived){ c.dived=true; const a=Phaser.Math.Angle.Between(c.x,c.y,p.x,p.y-40); c.body.setVelocity(Math.cos(a)*420,Math.sin(a)*420); }
      c.setFlipX(c.body.velocity.x>0); }; }
  emberVolley(b){ const n=b.enraged?5:3; const base=Phaser.Math.Angle.Between(b.x,b.y-120,this.player.x,this.player.y-50); SFX.play('throw');
    for(let i=0;i<n;i++){ const a=base+(i-(n-1)/2)*0.22; const o=this.shot(b.x,b.y-120,'boss3_tailgate_wraith_ember',64,37,OBIE.C.wraith); o.body.setSize(60,60); o.body.setVelocity(Math.cos(a)*300,Math.sin(a)*300); o.rotation=a+Math.PI; o.die=this.time.now+4000; } }
  whistleBlast(b){ const d=this.player.x<b.x?-1:1; const o=this.shot(b.x+d*60,b.y-120,'boss4_zombie_coach_whistle_blast',70,65,OBIE.C.gold); o.setFlipX(d>0);
    o.body.setVelocityX(d*360); o.die=this.time.now+3500; SFX.play('whistle'); this.tweens.add({targets:o,scale:o.scale*1.25,duration:400,yoyo:true,repeat:-1}); }
  clipboard(b){ const o=this.shot(b.x+b.dir*40,b.y-110,'boss4_zombie_coach_clipboard',44,41,0xffffff); const d=this.player.x<b.x?-1:1; o.t=0; o.setAngularVelocity(720); o.die=this.time.now+3500; SFX.play('throw');
    o.update2=(time,s)=>{ o.t+=s; o.body.setVelocityX(d*560*Math.cos(o.t*2.0)); o.body.setVelocityY(Math.sin(o.t*2.2)*-60); }; }
  // ---------- pause / mute ----------
  togglePause(forceOn){
    if(this.done) return;
    if(this.scene.isPaused('Game')){ if(forceOn) return; this.scene.resume('Game'); this.hud.showPause(false); SFX.startMusic(this.levelNum); }
    else { this.scene.pause('Game'); this.hud.showPause(true); SFX.stopMusic(); SFX.play('pause'); OBIE.input.left=OBIE.input.right=OBIE.input.jump=OBIE.input.throw=false; }
  }
  toggleMute(){ const s=OBIE.save.load(); s.muted=!s.muted; OBIE.save.write(s); SFX.setMuted(s.muted); if(this.hud&&this.hud.updateMute) this.hud.updateMute(); }
}

class HUDScene extends Phaser.Scene{
  constructor(){ super('HUD'); }
  create(){
    // HUD units = CSS pixels, pinned to the real screen edges and safe-area insets
    const m=OBIE.metrics(); this.m=m; const cam=this.cameras.main; cam.setZoom(m.dpr); cam.centerOn(m.w/2,m.h/2);
    const W=m.w, H=m.h, sa=m.safe, L=16+sa.l, R=W-16-sa.r, T=12+sa.t, B=H-16-sa.b; this.game_=this.scene.get('Game');
    this.hearts=[]; for(let i=0;i<5;i++){ this.hearts.push(this.add.image(L+18+i*42,T+18,'heart').setDisplaySize(36,36)); }
    this.lifeTxt=UI.text(this,L,T+42,'',18,{font:'Barlow Condensed',ox:0,oy:0,stroke:3,style:{fontStyle:'700'}});
    this.coin=this.add.image(W/2-46,T+18,'star_coin').setDisplaySize(32,32);
    this.scoreTxt=UI.text(this,W/2-24,T+18,'0',28,{ox:0,stroke:4});
    this.pauseBtn=this.add.image(R-32,T+28,'btn_pause').setDisplaySize(64,64).setInteractive({useHandCursor:true});
    this.pauseBtn.on('pointerup',()=>this.game_.togglePause());
    this.ammoTxt=UI.text(this,R-76,T+20,'0',24,{ox:1,stroke:4});
    this.ballIcon=this.add.image(R-76-this.ammoTxt.width-24,T+20,'football').setDisplaySize(32,32);
    // boss bar: top center under the score, 50% width, 16 tall, name above
    this.bossG=this.add.graphics().setVisible(false); this.bossName=UI.text(this,W/2,T+50,'',18,{color:OBIE.HEX.bone,stroke:3}).setVisible(false); this.bossPct=1; this.bossShown=1; this.bossY=T+62;
    const touch=this.sys.game.device.input.touch || /[?&]touch/.test(location.search);
    this.btns=[];
    if(touch){
      const mk=(key,x,y,size,act)=>{ const b=this.add.image(x,y,key).setDisplaySize(size,size).setAlpha(0.75); b.size=size; b.act=act; b.base=b.scale; this.btns.push(b); return b; };
      mk('btn_left',L+40,B-40,80,'left'); mk('btn_right',L+40+80+16,B-40,80,'right');
      mk('btn_jump',R-44,B-44,88,'jump'); mk('btn_throw',R-88-16-44,B-44,88,'throw');
      this.input.addPointer(4);
      // latch quick taps so a tap shorter than one frame still counts
      this.input.on('pointerdown',(ptr)=>{ if(this.pause.visible) return; const wp=this.cameras.main.getWorldPoint(ptr.x,ptr.y);
        this.btns.forEach(b=>{ const r=b.size/2+12; if(Math.abs(wp.x-b.x)<r&&Math.abs(wp.y-b.y)<r){ if(b.act==='jump') OBIE.input.jumpTap=true; if(b.act==='throw') OBIE.input.throwTap=true; } }); });
    }
    // title card and banners
    this.card=this.add.container(W/2,H*0.3).setAlpha(0).setDepth(50);
    this.cardBg=this.add.graphics(); this.cardT=UI.text(this,0,-14,'',40,{color:OBIE.HEX.orange,stroke:3}); this.cardS=UI.text(this,0,30,'',20,{font:'Barlow Condensed',color:OBIE.HEX.bone,stroke:0,style:{fontStyle:'700'}});
    this.card.add([this.cardBg,this.cardT,this.cardS]);
    this.toastT=UI.text(this,W/2,H*0.22,'',26,{color:OBIE.HEX.gold,stroke:4}).setAlpha(0);
    this.pops=[];
    // pause overlay (sound toggle lives here)
    this.pause=this.add.container(0,0).setVisible(false).setDepth(100);
    const dim=this.add.rectangle(W/2,H/2,W,H,0x111014,0.8).setInteractive();
    const sc=Math.min(1,H/520), gap=74*sc, y0=H/2-gap*1.5+24*sc;
    const t=UI.text(this,W/2,y0-gap*0.95,'PAUSED',48*sc,{color:OBIE.HEX.orange,stroke:5});
    const btn=(i,label,cb,pr)=>{ const b=UI.button(this,W/2,y0+gap*i,260,64,label,cb,pr); b.setScale(sc); b.on('pointerout',()=>b.setScale(sc)); b.on('pointerup',()=>b.setScale(sc)); return b; };
    this.pause.add([dim,t,
      btn(0,'RESUME',()=>this.game_.togglePause(),true),
      btn(1,'RESTART LEVEL',()=>{ const g=this.game_; g.scene.restart({level:g.levelNum,score:g.levelStartScore,lives:g.lives}); }),
      (this.pMute=btn(2,'SOUND',()=>{ SFX.init(); this.game_.toggleMute(); })),
      btn(3,'QUIT TO MENU',()=>{ const g=this.game_; g.scene.stop('BG'); g.scene.start('Title'); })]);
    this.updateMute();
    if(this.game_.bossStarted && this.game_.boss && !this.game_.boss.dead) this.bossBar(OBIE.LEVELS[this.game_.levelNum-1].boss.name,this.game_.boss.hp/this.game_.boss.max);
    if(this.scene.isPaused('Game')) this.showPause(true);
    this._rs=()=>this.scene.restart(); this.game.events.on('obie-resize',this._rs); this.events.once('shutdown',()=>this.game.events.off('obie-resize',this._rs));
  }
  btnPos(act){ const b=this.btns.find(b=>b.act===act); return b?{x:b.x,y:b.y}:null; }
  updateMute(){ const m=SFX.isMuted(); if(this.pMute) this.pMute.label.setText(m?'SOUND: OFF':'SOUND: ON'); }
  showPause(on){ this.pause.setVisible(on); this.btns.forEach(b=>b.setVisible(!on)); }
  sync(g){
    for(let i=0;i<5;i++){ const h=this.hearts[i]; h.setVisible(i<g.maxHearts); h.setAlpha(i<g.hearts?1:0.25); h.setTint(i<g.hearts?0xffffff:0x333333); }
    this.lifeTxt.setText('LIVES x'+Math.max(0,g.lives)+'   LEVEL '+g.levelNum);
    this.scoreTxt.setText(String(g.score)); this.ammoTxt.setText(String(g.ammo)); this.ballIcon.x=this.ammoTxt.x-this.ammoTxt.width-22;
  }
  update(t,dt){
    if(this.btns.length && !this.pause.visible){
      const I=OBIE.input; const st={left:false,right:false,jump:false,throw:false}; const cam=this.cameras.main;
      this.input.manager.pointers.forEach(p=>{ if(!p.isDown) return; const wp=cam.getWorldPoint(p.x,p.y);
        this.btns.forEach(b=>{ const r=b.size/2+12; if(Math.abs(wp.x-b.x)<r && Math.abs(wp.y-b.y)<r) st[b.act]=true; }); });
      this.btns.forEach(b=>{ const on=st[b.act]; b.setAlpha(on?1:0.75); b.setScale(b.base*(on?0.94:1)); });
      Object.assign(I,st);
    }
    if(this.bossG.visible){ this.bossShown=Phaser.Math.Linear(this.bossShown,this.bossPct,0.12); const W=this.m.w, bw=W*0.5, bx=(W-bw)/2, by=this.bossY, bh=16;
      const g=this.bossG; g.clear(); g.fillStyle(OBIE.C.charcoal,0.95); g.fillRoundedRect(bx,by,bw,bh,6); g.fillStyle(0xffffff,0.6); g.fillRoundedRect(bx,by,Math.max(0.1,bw*this.bossShown),bh,6);
      g.fillStyle(OBIE.C.red,1); if(this.bossPct>0) g.fillRoundedRect(bx,by,Math.max(8,bw*this.bossPct),bh,6); g.fillStyle(0xffffff,0.18); g.fillRect(bx+4,by+3,Math.max(0,bw*this.bossPct-8),4);
      g.lineStyle(2,OBIE.C.gold,1); g.strokeRoundedRect(bx,by,bw,bh,6); }
  }
  bossBar(name,pct){ if(name){ this.bossName.setText(name).setVisible(true); this.bossG.setVisible(true); this.bossShown=0; } this.bossPct=pct; if(pct<=0) this.time.delayedCall(1500,()=>{ this.bossG.setVisible(false); this.bossName.setVisible(false); }); }
  titleCard(a,b,ms){ this.tweens.killTweensOf(this.card); this.cardT.setText(a); this.cardS.setText(b||'').setVisible(!!b);
    const w=Math.min(this.m.w-32,Math.max(this.cardT.width,this.cardS.width)+64), h=b?112:76; this.cardT.y=b?-16:0;
    if(this.cardT.width>w-32){ const k=(w-32)/this.cardT.width; this.cardT.setScale(k); } else this.cardT.setScale(1);
    this.cardBg.clear(); this.cardBg.fillStyle(0x0B0B0C,0.6); this.cardBg.fillRoundedRect(-w/2,-h/2,w,h,24);
    this.card.setAlpha(1).setScale(0.9); this.tweens.add({targets:this.card,scale:1,duration:250,ease:'Back.out'});
    this.tweens.add({targets:this.card,alpha:0,duration:400,delay:ms||2000}); }
  banner(a,b,ms){ this.titleCard(a,b,ms||1600); }
  toast(str){ this.tweens.killTweensOf(this.toastT); this.toastT.setText(str).setAlpha(1).setScale(0.7); this.tweens.add({targets:this.toastT,scale:1,duration:200,ease:'Back.out'}); this.tweens.add({targets:this.toastT,alpha:0,duration:400,delay:900}); }
  popText(x,y,str,g){ const cam=g.cameras.main, k=cam.zoom/this.m.dpr; const sx=(x-cam.worldView.x)*k, sy=(y-cam.worldView.y)*k;
    const t=UI.text(this,sx,sy,str,18,{color:OBIE.HEX.gold,stroke:3}); this.tweens.add({targets:t,y:sy-40,alpha:0,duration:700,onComplete:()=>t.destroy()}); }
  flashAmmo(){ this.tweens.add({targets:[this.ammoTxt,this.ballIcon],alpha:0.2,duration:80,yoyo:true,repeat:2}); this.ammoTxt.setColor(OBIE.HEX.red); this.time.delayedCall(500,()=>this.ammoTxt.setColor(OBIE.HEX.bone)); }
}
