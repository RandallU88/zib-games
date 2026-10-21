// Shared constants, palette, save data and level definitions.
window.OBIE = {
  W: 1024, H: 576, RES: 3,
  C: { orange:0xFF7A1A, ember:0xFFA347, burnt:0xC4540F, black:0x111014, charcoal:0x232129, bone:0xF3EBDD,
       gold:0xF2B233, violet:0x2B1F4A, dusk:0x5B3A7A, teal:0x3E6E73, ghost:0x7CFF9E, wraith:0xB26BFF, turf:0x2F6B2C, red:0xE0262B },
  HEX: { orange:'#FF7A1A', ember:'#FFA347', black:'#111014', bone:'#F3EBDD', gold:'#F2B233', red:'#E0262B', charcoal:'#232129' },
  LEVELS: [
    { id:1, key:'pumpkin', name:'PUMPKIN PATCH', sub:'Midnight Harvest', ground:465, tint:0x5B3A7A, fog:false,
      boss:{ key:'gourd_king', name:'THE GOURD KING', hp:22 }, enemies:['zombie_player','pumpkinhead_runner'], hazard:'thorns', len:7600, seed:11, plat:'wood' },
    { id:2, key:'corn', name:'CORN MAZE', sub:'Lost in the Stalks', ground:498, tint:0x2B1F4A, fog:false,
      boss:{ key:'husk_colossus', name:'HUSK COLOSSUS', hp:28 }, enemies:['scarecrow_lineman','pumpkinhead_runner','zombie_player'], hazard:'pitchforks', len:8400, seed:23, plat:'hay' },
    { id:3, key:'graveyard', name:'GRAVEYARD TAILGATE', sub:'Grills and Ghouls', ground:500, tint:0x3E6E73, fog:true,
      boss:{ key:'tailgate_wraith', name:'THE TAILGATE WRAITH', hp:32 }, enemies:['ghost_ref','zombie_player','scarecrow_lineman'], hazard:'ghostfire', len:9000, seed:37, plat:'stone' },
    { id:4, key:'stadium', name:'FRIDAY NIGHT STADIUM', sub:'Under the Lights', ground:500, tint:0x232129, fog:true,
      boss:{ key:'zombie_coach', name:'ZOMBIE COACH', hp:38 }, enemies:['zombie_player','ghost_ref','pumpkinhead_runner','scarecrow_lineman'], hazard:'sparks', len:9600, seed:53, plat:'bleacher' },
  ],
  ENEMY: {
    zombie_player:{ hp:2, speed:55, score:150, scale:0.54 },
    scarecrow_lineman:{ hp:3, speed:28, score:250, scale:0.58 },
    pumpkinhead_runner:{ hp:1, speed:85, charge:290, score:200, scale:0.52 },
    ghost_ref:{ hp:2, speed:60, score:300, scale:0.52, fly:true },
  },
  save: {
    key:'obie_gridiron_fright_v1',
    load(){ try{ return Object.assign({unlocked:1,best:{},muted:false,total:0}, JSON.parse(localStorage.getItem(this.key)||'{}')); }catch(e){ return {unlocked:1,best:{},muted:false,total:0}; } },
    write(d){ try{ localStorage.setItem(this.key, JSON.stringify(d)); }catch(e){} },
  },
  params: (function(){ const p=new URLSearchParams(location.search); const o={};
    const dbg=p.get('debug'); // supports ?debug=3&boss=1, ?debug=level3&boss, ?level=3&boss=1
    let lv=p.get('level') || (dbg && (dbg.match(/\d/)||[])[0]);
    if(lv) o.level=Math.max(1,Math.min(4,parseInt(lv,10)||1));
    o.boss = p.has('boss') || (dbg && /boss/.test(dbg));
    o.god = p.has('god'); o.debug = p.has('debug')||p.has('level');
    o.end = p.get('end'); return o; })(),
};

// Deterministic level builder: returns platforms, pits, hazards, pickups, enemies, checkpoints.
// Platforms are given as mid-tile counts (n); real width is computed from Canvas's platform pieces.
OBIE.buildLevel = function(L){
  let s=L.seed; const rnd=()=>{ s=(s*16807)%2147483647; return (s-1)/2147483646; };
  const ri=(a,b)=>Math.floor(a+rnd()*(b-a+1));
  const G=L.ground, out={ pits:[], plats:[], movers:[], hazards:[], candy:[], balls:[], hearts:[], enemies:[], checkpoints:[], arenaX:L.len, arenaW:1100, worldW:L.len+1100 };
  let x=800; const diff=L.id;
  const cps=[Math.floor(L.len*0.36), Math.floor(L.len*0.7)]; let cpi=0;
  const candyArc=(cx,cy,n,dx)=>{ for(let i=0;i<n;i++) out.candy.push({x:cx+i*Math.max(dx,56), y:cy-Math.sin(i/(n-1||1)*Math.PI)*50}); };
  while(x < L.len-700){
    if(cpi<cps.length && x>cps[cpi]){ out.checkpoints.push({x:x+100}); x+=380; cpi++; continue; }
    const t=rnd(); const en=L.enemies[ri(0,L.enemies.length-1)];
    if(t<0.2){ // pit with a stepping platform
      const w=ri(230,280+diff*25); out.pits.push({x, w});
      const py=G-ri(100,130); out.plats.push({cx:x+w/2, y:py, n:0});
      candyArc(x+w/2-60, py-50, 4, 40);
      x+=w+ri(200,280);
    } else if(t<0.38){ // staircase platforms with ammo
      const n=ri(2,3); for(let i=0;i<n;i++){ const px=x+130+i*270, py=G-120-i*90; out.plats.push({cx:px,y:py,n:i%2}); candyArc(px-45,py-45,3,45); }
      out.balls.push({x:x+130+(n-1)*270, y:G-120-(n-1)*90-60});
      out.enemies.push({type:en, x:x+n*270+120});
      x+=n*270+420;
    } else if(t<0.55){ // hazard group, optional high platform route
      const c=diff>=3&&rnd()<0.5?2:1; const w=c*130; out.hazards.push({x, w, n:c});
      if(c===2) out.plats.push({cx:x+w/2, y:G-210, n:1});
      candyArc(x-10, G-170, 5, (w+20)/4);
      x+=w+ri(260,340);
    } else if(t<0.68 && diff>=2){ // moving platform over wide pit
      const w=ri(420,500); out.pits.push({x,w});
      out.movers.push({x:x+40, y:G-110, n:0, range:w-280, speed:70+diff*8});
      candyArc(x+80, G-180, 6, (w-160)/5);
      x+=w+ri(220,280);
    } else if(t<0.8){ // enemy gauntlet
      const n=ri(1,1+Math.min(2,diff)); for(let i=0;i<n;i++) out.enemies.push({type:L.enemies[ri(0,L.enemies.length-1)], x:x+160+i*280});
      candyArc(x+40, G-70, 6, 70); if(rnd()<0.5) out.balls.push({x:x+n*280+40, y:G-50});
      x+=n*280+340;
    } else { // high ledges with heart or bonus
      out.plats.push({cx:x+120, y:G-125, n:0}); out.plats.push({cx:x+420, y:G-235, n:1});
      if(rnd()<0.35) out.hearts.push({x:x+420, y:G-300}); else out.balls.push({x:x+420,y:G-300});
      candyArc(x+340, G-300, 4, 50);
      out.enemies.push({type:en, x:x+200});
      x+=700;
    }
  }
  while(out.checkpoints.length<2) out.checkpoints.push({x:cps[out.checkpoints.length]});
  return out;
};
