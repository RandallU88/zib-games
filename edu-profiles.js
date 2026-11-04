/* Shared Urwin Homeschool profiles. Uses Keyboard Academy's store (kbAcademy.v1) so kids are already set up.
   Each game keeps its own progress under DB.profiles[name].games[gameKey]. */
(function(){
const SK="kbAcademy.v1";
function load(){let DB=null;try{DB=JSON.parse(localStorage.getItem(SK)||"null")}catch(e){}
 DB=DB||{profiles:{Logan:{av:"🦖",les:{},best:0,acc:0,games:{}},Savannah:{av:"🦄",les:{},best:0,acc:0,games:{}}},muted:false};
 if(!DB.profiles.Parent)DB.profiles.Parent={av:"🧑‍🏫",les:{},best:0,acc:0,games:{},test:true};
 for(const p of Object.values(DB.profiles)){p.games=p.games||{};p.les=p.les||{}}
 localStorage.setItem(SK,JSON.stringify(DB));return DB}
let DB=load();
const save=()=>localStorage.setItem(SK,JSON.stringify(DB));
/* Track: which math level a profile uses. Logan = grade 2, Savannah = grade 5 (multiplication only).
   Other names default to grade 2; Parent picks either track. */
function trackFor(name){const p=DB.profiles[name];if(p&&p.track)return p.track;return /savannah/i.test(name)?"g5":"g2"}
function gameData(name,key,def){const p=DB.profiles[name];if(!p.games[key])p.games[key]=def();return p.games[key]}
let AC=null;
function beep(f,d=.08,type="square",v=.05,slide){if(DB.muted)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();
 const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=f;if(slide)o.frequency.exponentialRampToValueAtTime(slide,AC.currentTime+d);
 g.gain.value=v;g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+d);o.connect(g).connect(AC.destination);o.start();o.stop(AC.currentTime+d)}catch(e){}}
const tune=(ns,step=.12,type="triangle")=>ns.forEach((n,i)=>setTimeout(()=>beep(n,.15,type,.07),i*step*1000));
function muteBtn(el){const r=()=>{el.textContent=DB.muted?"🔇":"🔊";el.setAttribute("aria-label",DB.muted?"Sound off":"Sound on")};r();
 el.addEventListener("click",()=>{DB.muted=!DB.muted;save();r()})}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
window.EDU={get DB(){return DB},reload(){DB=load()},save,trackFor,gameData,beep,tune,muteBtn,esc};
})();
