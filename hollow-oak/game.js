"use strict";
const E=window.EDU,$=id=>document.getElementById(id),esc=E.esc,CH=window.HO_CHAPTERS,PZ=window.HO_PUZZLES,TEAM=Object.fromEntries(HO_TEAM.map(t=>[t.id,t]));
const AS="assets/",clueImg=n=>`${AS}clues/clue-${n}.webp`;
// ---------- stage scaling: fixed 1180x820, letterboxed ----------
function fit(){const s=Math.min(innerWidth/1180,innerHeight/820);const st=$("stage");st.style.transform=`translate(${(innerWidth-1180*s)/2}px,${(innerHeight-820*s)/2}px) scale(${s})`;window.__scale=s}
addEventListener("resize",fit);fit();
// ---------- sound ----------
const S={tap:()=>E.beep(660,.05,"square",.03),good:()=>E.tune([523,659,784,1047],.1),bad:()=>E.beep(150,.22,"sawtooth",.05),
 clue:()=>E.tune([392,523,659],.09,"square"),close:()=>E.tune([392,494,587,784,988],.14),page:()=>E.beep(300,.08,"triangle",.04,600)};
const muteR=()=>$("mute").classList.toggle("off",!!E.DB.muted);muteR();$("mute").onclick=()=>{E.DB.muted=!E.DB.muted;E.save();muteR()};
// ---------- profiles ----------
let me=null,track="g2",cur=0;
const prog=()=>E.gameData(me,"hollowOak",()=>({g2:{},g5:{}}));
const chProg=id=>{const p=prog()[track];p[id]=p[id]||{solved:{},done:false};return p[id]};
const isTest=()=>!!E.DB.profiles[me].test;
function show(id){["s-title","s-board","s-card","s-scene","s-file"].forEach(s=>$(s).classList.toggle("hide",s!==id));closeOv()}
function profiles(){me=null;show("s-title");
 $("profList").innerHTML=Object.entries(E.DB.profiles).map(([n,p])=>{const g=p.games.hollowOak;const c=g?[...Object.values(g.g2||{}),...Object.values(g.g5||{})].filter(x=>x.done).length:0;
  return`<button class="prof${p.test?" parent":""}" data-n="${esc(n)}"><div class="av">${p.av}</div><div class="nm">${esc(n)}</div>${p.test?'<div class="tbadge">TEST MODE: all unlocked</div>':`<div class="st">${c} of 3 chapters</div>`}</button>`}).join("");
 document.querySelectorAll("#profList .prof").forEach(b=>b.onclick=()=>{S.tap();me=b.dataset.n;track=E.trackFor(me);board()})}
function board(){show("s-board");$("caseTitle").textContent=HO_CASE.title;$("caseIntro").textContent=`${E.DB.profiles[me].av} ${me}: ${HO_CASE.intro}`;
 $("trackPick").classList.toggle("hide",!isTest());document.querySelectorAll("#trackPick .pbtn").forEach(b=>{b.classList.toggle("sel",b.dataset.t===track);b.onclick=()=>{track=b.dataset.t;board()}});
 $("chList").innerHTML=CH.map((c,i)=>{const p=chProg(c.id),n=Object.keys(p.solved).length,open=isTest()||i===0||chProg(CH[i-1].id).done;
  return`<button class="ch${open?"":" lock"}${p.done?" done":""}" data-i="${i}" ${open?"":"disabled"}><img src="${AS}ui/chapter-card-${c.n}.webp" alt=""><div class="lbl">${p.done?"Case file complete":open?`${n} of ${c.spots.length} clues found`:"🔒 Locked"}<small>Chapter ${c.n}: ${esc(c.title)}</small></div></button>`}).join("");
 document.querySelectorAll("#chList .ch:not(.lock)").forEach(b=>b.onclick=()=>{S.tap();chapterCard(+b.dataset.i)})}
$("boardBack").onclick=profiles;$("menuBtn").onclick=()=>{S.tap();board()};
function chapterCard(i){cur=i;const c=CH[i];if(Object.keys(chProg(c.id).solved).length){scene(i);return}show("s-card");$("cardTap").style.backgroundImage=`url(${AS}ui/chapter-card-${c.n}.webp)`;$("cardTap").onclick=()=>{S.page();scene(i,true)}}
// ---------- dialogue ----------
let dq=[],dDone=null;
function talk(lines,then){dq=lines.slice();dDone=then||null;nextLine()}
function nextLine(){const l=dq.shift();if(!l){$("dlg").classList.add("hide");$("pose").classList.add("hide");const f=dDone;dDone=null;f&&f();return}
 const [who,txt]=l,t=TEAM[who];$("dlg").classList.remove("hide");$("dlgImg").src=`${AS}characters/${who}-bust.webp`;$("dlgName").textContent=t.guest?t.name:t.name.split(" ")[0];$("dlgTxt").textContent=txt;
 const pose={biscuit:"biscuit-sniff",june:"june-point",ole:"ole-idle",wes:"wes-point"}[who]||null;$("pose").classList.toggle("hide",!pose);if(pose)$("pose").src=`${AS}characters/${pose}.webp`;S.page()}
$("dlg").onclick=nextLine;
// ---------- scene ----------
function scene(i,intro){cur=i;const c=CH[i],p=chProg(c.id);show("s-scene");$("s-scene").style.backgroundImage=`url(${AS}${c.bg}.webp)`;
 const n=Object.keys(p.solved).length,all=n===c.spots.length;
 $("spots").innerHTML=c.spots.map((s,k)=>`<button class="spot ho-hotspot${k in p.solved?" found":""}" data-k="${k}" style="left:${s.x}px;top:${s.y}px" aria-label="${esc(s.label)}"><span class="lab">${esc(s.label)}</span></button>`).join("");
 $("prog").textContent=`Chapter ${c.n}: ${n} of ${c.spots.length} clues`;
 $("tray").innerHTML=[...Array(8)].map((_,k)=>{const has=k<c.spots.length&&k in p.solved;return`<div class="slot${has?" has":""}">${has?`<img src="${clueImg(c.spots[k].item)}" alt="${esc(c.spots[k].label)} clue">`:""}</div>`}).join("");
 $("cfBtn").classList.toggle("hide",!all);$("cfBtn").classList.toggle("final",c.n===3);
 document.querySelectorAll("#spots .spot").forEach(b=>b.onclick=()=>{if(!$("dlg").classList.contains("hide"))return;S.tap();puzzle(+b.dataset.k)});
 if(intro)talk(c.talk);else if(all&&!p.toldDone){p.toldDone=true;E.save();talk(c.done)}}
$("cfBtn").onclick=()=>caseFile(cur);
function ov(html,cls,after){const b=$("ovBox");b.className="panel"+(cls?" "+cls:"");b.innerHTML=html;$("ov").classList.remove("hide");b.scrollTop=0;after&&after();const x=b.querySelector(".x");if(x)x.onclick=closeOv}
function closeOv(){$("ov").classList.add("hide")}
// ---------- notebook ----------
$("nbBtn").onclick=()=>notebook(null);
function notebook(sel){S.page();const c=CH[cur],p=chProg(c.id);if(sel==null)sel=Object.keys(p.solved).map(Number).sort((a,b)=>b-a)[0];
 const R=sel!=null&&sel in p.solved?`<h3>${esc(c.spots[sel].label)}</h3><img src="${clueImg(c.spots[sel].item)}" alt=""><p>${esc(c.clues[sel])}</p>`:`<h3>No clues yet</h3><p>Tap a glowing spot in the scene to find one.</p>`;
 ov(`<button class="icon close x" aria-label="Close"></button><div class="nbL"><h3>Chapter ${c.n} clues</h3>${c.spots.map((s,k)=>k in p.solved?`<button data-k="${k}" class="${k===sel?"sel":""}"><img src="${clueImg(s.item)}" alt="">${esc(s.label)}</button>`:`<button class="no" disabled>? ${esc(s.label)}</button>`).join("")}</div><div class="nbR">${R}</div>`,"nb",
  ()=>document.querySelectorAll(".nbL button[data-k]").forEach(b=>b.onclick=()=>notebook(+b.dataset.k)))}
// ---------- puzzles ----------
const HINT={cipher:"Solve each one, then count through the alphabet: A is 1, B is 2, C is 3.",scale:"Both sides of the scale must be equal.",map:"Count one square at a time from START. Up is north and right is east.",
 pattern:"Say the pattern out loud. What changes each time?",reading:"Read the passage again and find the sentence that answers the question.",logic:"Mark ✓ for what a clue says and ✗ for what it rules out. Each row and each column gets one ✓."};
const L26="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function puzzle(k){const c=CH[cur],P=PZ[track][c.id][k],spot=c.spots[k];let tries=0;
 const top=`<button class="icon close x" aria-label="Close"></button><button class="icon hint hintB" id="hintB" aria-label="Hint"></button><h2>${esc(P.title)}</h2>${P.intro?`<p class="in">${esc(P.intro)}</p>`:""}`;
 const solveBtn=!["reading","pattern","logic"].includes(P.t);
 const foot=`<div class="msg" id="msg"></div>${solveBtn?'<div class="foot"><button class="imgbtn solve inl" id="chk" aria-label="Solve"></button></div>':""}`;
 const say=(t,bad)=>{const m=$("msg");m.className="msg"+(bad?" bad":"");m.textContent=t};
 const wrong=()=>{tries++;S.bad();say(tries>1?"Not yet. Hint: "+HINT[P.t]:"Not quite. Try again!",true)};
 const right=()=>{S.good();const p=chProg(c.id);if(!(k in p.solved))p.solved[k]=tries;E.save();
  ov(`<div class="found"><div class="stampTxt">Clue found!</div><img class="it" src="${clueImg(spot.item)}" alt=""><p>${esc(c.clues[k])}</p><button class="imgbtn next inl" id="ok" aria-label="Next"></button></div>`,"",()=>$("ok").onclick=()=>{S.clue();closeOv();scene(cur)})};
 let body="",wire=()=>{};
 if(P.t==="cipher"){const sl=Array(P.answer.length).fill(null);const tiles=(P.answer+P.extra).split("").sort(()=>Math.random()-.5);
  body=`<div class="key">${L26.split("").map((x,i)=>`${x}=${i+1}`).join(" ")}</div><div class="codes">${P.codes.map((q,i)=>`<div>${esc(q)}<span class="sl" data-s="${i}"></span></div>`).join("")}</div><div class="tiles">${tiles.map((x,i)=>`<button class="pbtn" data-t="${i}">${x}</button>`).join("")}</div>`;
  wire=()=>{const draw=()=>{document.querySelectorAll(".sl").forEach((s,i)=>s.textContent=sl[i]==null?"":tiles[sl[i]]);document.querySelectorAll(".tiles .pbtn").forEach(b=>b.classList.toggle("used",sl.includes(+b.dataset.t)))};
   document.querySelectorAll(".tiles .pbtn").forEach(b=>b.onclick=()=>{const t=+b.dataset.t;if(sl.includes(t))return;const i=sl.indexOf(null);if(i<0)return;sl[i]=t;S.tap();draw()});
   document.querySelectorAll(".sl").forEach(s=>s.onclick=()=>{sl[+s.dataset.s]=null;draw()});
   $("chk").onclick=()=>{if(sl.includes(null))return say("Fill every box first.");sl.map(t=>tiles[t]).join("")===P.answer?right():wrong()}}}
 else if(P.t==="scale"){let v="";const OL='stroke="#2B1D14" stroke-width="4"';
  const pan=(items,x)=>{const per=Math.min(items.length,4),rows=Math.ceil(items.length/4);return items.map((n,i)=>{const r=Math.floor(i/4),c=i%4,inRow=Math.min(per,items.length-r*4);return`<g transform="translate(${x+c*62-((inRow-1)*31)} ${112-(rows-1-r)*48})"><rect x="-30" y="-46" width="60" height="46" rx="${n==="?"?20:4}" fill="${n==="?"?"#F2D27A":"#D9B977"}" ${OL}/><text y="-14" text-anchor="middle" font-size="24" font-weight="bold" font-family="Alegreya SC">${n}</text></g>`}).join("")};
  let Lh,Rh;if(P.groups){Lh=Array(P.groups[0]).fill(P.groups[1]);Rh=["?"]}else{Lh=P.left;Rh=P.right}
  const sc=1;
  body=`<svg viewBox="0 -60 600 280" style="width:100%;height:240px"><rect x="292" y="60" width="16" height="140" fill="#6B4426" ${OL}/><rect x="220" y="196" width="160" height="18" fill="#4A2F1D" ${OL}/><rect x="40" y="52" width="520" height="12" fill="#C9A24A" ${OL}/>
   <path d="M40 112 H260 M370 112 H530" stroke="#2B1D14" stroke-width="6"/><g transform="translate(150 0) scale(${sc}) translate(-150 0)">${pan(Lh,150)}</g>${pan(Rh,450)}</svg>
   ${P.groups?`<p class="in" style="text-align:center;font-weight:700">${P.groups[0]} crates of ${P.groups[1]}: ${P.groups[0]} × ${P.groups[1]} = ?</p>`:""}
   <div class="scaleRow"><div class="ans" id="ans">?</div><div class="keys">${[1,2,3,4,5,6,7,8,9,0].map(n=>`<button class="pbtn" data-n="${n}">${n}</button>`).join("")}</div><button class="pbtn" id="clr">Clear</button></div>`;
  wire=()=>{document.querySelectorAll(".keys .pbtn").forEach(b=>b.onclick=()=>{if(v.length<3)v+=b.dataset.n;S.tap();$("ans").textContent=v});$("clr").onclick=()=>{v="";$("ans").textContent="?"};
   $("chk").onclick=()=>{if(!v)return;if(+v===P.answer)right();else{wrong();v="";$("ans").textContent="?"}}}}
 else if(P.t==="map"){let pick=null;const N=P.size,cols=N+(P.coords?1:0);let cells="";
  if(P.coords)cells+=`<span></span>`+[...Array(N)].map((_,x)=>`<span class="lab">${L26[x]}</span>`).join("");
  for(let r=0;r<N;r++){if(P.coords)cells+=`<span class="lab">${r+1}</span>`;for(let x=0;x<N;x++){const st=x===P.start[0]&&r===P.start[1];cells+=`<button class="${st?"st":""}" data-c="${x},${r}" aria-label="Square ${P.coords?L26[x]+(r+1):(x+1)+", "+(r+1)}">${P.marks[x+","+r]||""}</button>`}}
  body=`<div style="display:flex;gap:20px;align-items:center;justify-content:center"><div class="mapg" style="grid-template-columns:repeat(${cols},78px)">${cells}</div><div style="font:700 20px var(--ho-font-body);text-align:center">N<br>⬆<br>W ⬅ ✚ ➡ E<br>⬇<br>S</div></div>`;
  wire=()=>{document.querySelectorAll(".mapg button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".mapg button").forEach(x=>x.classList.remove("pick"));b.classList.add("pick");pick=b.dataset.c;S.tap()});
   $("chk").onclick=()=>{if(!pick)return say("Tap a square first.");pick===P.answer.join(",")?right():wrong()}}}
 else if(P.t==="pattern"){body=`<div class="seq">${P.seq.map(x=>`<span>${esc(x)}</span>`).join("")}<span class="q">?</span></div><div class="chs2">${P.choices.map(x=>`<button class="pbtn" data-v="${esc(x)}" style="font-size:32px">${esc(x)}</button>`).join("")}</div>`;
  wire=()=>document.querySelectorAll(".chs2 .pbtn").forEach(b=>b.onclick=()=>b.dataset.v===P.answer?right():(b.classList.add("bad"),wrong()))}
 else if(P.t==="reading"){body=`<div class="passage">${esc(P.passage)}</div><h2 style="font-size:24px;margin-top:12px">${esc(P.q)}</h2><div class="chs2">${P.choices.map((x,i)=>`<button class="pbtn" data-i="${i}">${esc(x)}</button>`).join("")}</div>`;
  wire=()=>document.querySelectorAll(".chs2 .pbtn").forEach(b=>b.onclick=()=>+b.dataset.i===P.answer?right():(b.classList.add("bad"),wrong()))}
 else if(P.t==="logic"){const g={};body=`<div style="display:flex;gap:20px;align-items:flex-start"><ul class="clues" style="flex:1">${P.clues.map(x=>`<li>${esc(x)}</li>`).join("")}</ul><table class="lg"><tr><th></th>${P.cols.map(x=>`<th>${esc(x)}</th>`).join("")}</tr>${P.rows.map(r=>`<tr><th>${esc(r)}</th>${P.cols.map(x=>`<td><button data-k="${esc(r)}|${esc(x)}" aria-label="${esc(r)} and ${esc(x)}"></button></td>`).join("")}</tr>`).join("")}</table></div>
  <h2 style="font-size:24px;margin-top:6px">${esc(P.q)}</h2><div class="chs2" style="grid-template-columns:repeat(${P.rows.length},1fr)">${P.rows.map(r=>`<button class="pbtn" data-v="${esc(r)}">${esc(r)}</button>`).join("")}</div>`;
  wire=()=>{document.querySelectorAll(".lg button").forEach(b=>b.onclick=()=>{const s=((g[b.dataset.k]||0)+1)%3;g[b.dataset.k]=s;b.textContent=["","✓","✗"][s];b.style.color=s===1?"#5E6B3A":"#B3261E";S.tap()});
   document.querySelectorAll(".chs2 .pbtn").forEach(b=>b.onclick=()=>b.dataset.v===P.answer?right():(b.classList.add("bad"),wrong()))}}
 ov(top+body+foot,"",()=>{wire();$("hintB").onclick=()=>{S.tap();say("Hint: "+HINT[P.t])}})}
// ---------- case file ----------
function caseFile(i){const c=CH[i],p=chProg(c.id);p.done=true;E.save();S.close();show("s-file");
 const tries=Object.values(p.solved).reduce((a,b)=>a+b,0),stars=tries===0?3:tries<=3?2:1,next=CH[i+1];
 $("fileBox").innerHTML=`<div class="cfSheet"><h2>Chapter ${c.n}: ${esc(c.title)}</h2><div class="cfStars">${"★".repeat(stars)}${"☆".repeat(3-stars)}</div>
  <div>${tries===0?"Every clue solved on the first try. Ace detective work!":`Extra tries this chapter: ${tries}. Good detectives keep going!`}</div>
  <b>EVIDENCE</b><ol>${c.clues.map(t=>`<li>${esc(t)}</li>`).join("")}</ol><b>WHAT WE FIGURED OUT</b><div>${esc(c.solve)}</div></div>
  <div class="cfTeam">${["june","theo","pip","eli"].map(t=>`<img src="${AS}characters/${t}-celebrate.webp" alt="${TEAM[t].name}">`).join("")}<img src="${AS}characters/biscuit-celebrate.webp" alt="Biscuit" style="height:110px"></div>
  <img class="stamp" src="${AS}ui/stamp-case-solved.webp" alt="Case solved">
  <div class="cfBtns"><button class="imgbtn back inl" id="bd" aria-label="Back to case board"></button>${next?'<button class="imgbtn next inl" id="nx" aria-label="Next chapter"></button>':""}</div>`;
 if($("nx"))$("nx").onclick=()=>chapterCard(i+1);$("bd").onclick=board}
window.__ho={setMe:n=>{me=n;track=E.trackFor(n)},board,scene,puzzle,caseFile,notebook,get track(){return track},setTrack:t=>track=t,PZ,CH};
profiles();
