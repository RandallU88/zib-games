(function(){
const D=JSON.parse(document.getElementById('lesson-data').textContent);
const kid=D.kid.toLowerCase(),base='urwin.lessons.'+kid+'.'+D.lesson_id+'.';
const ld=(k,d)=>{try{const v=localStorage.getItem(base+k);return v?JSON.parse(v):d}catch(e){return d}};
const sv=(k,v)=>{try{localStorage.setItem(base+k,JSON.stringify(v));return true}catch(e){alert('Could not save. The iPad may be out of storage.');return false}};
const A=ld('answers',{});const setA=(id,v)=>{if(v===''||v==null)delete A[id];else A[id]=v;sv('answers',A);flash(id);prog()};
const el=(t,c,txt)=>{const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e};
function flash(id){const s=document.querySelector('[data-saved="'+id+'"]');if(s){s.classList.add('show');clearTimeout(s._t);s._t=setTimeout(()=>s.classList.remove('show'),1200)}}
const app=document.getElementById('app');document.body.classList.add('lessonpage');document.body.dataset.theme=D.theme_word;
function heroArt(){const im=new Image();im.alt='';im.onload=()=>{hero.style.background='linear-gradient(90deg,rgba(244,236,220,.96) 0,rgba(244,236,220,.7) 38%,transparent 62%),url('+im.src+') right center/cover';hero.style.minHeight='230px'};im.src=D.art_dir+(D.kid.toLowerCase())+'-hero.png'}
// hero
const hero=el('div','hero');hero.append(el('div','kick','Lesson '+parseInt(D.lesson_id.split('-')[1])+' \u00b7 Theme word: '+D.theme_word),el('h1',null,D.title),
 el('div','meta','Grade '+D.grade+' \u00b7 '+D.subjects.join(', ')+' \u00b7 '+D.est_minutes+' min'));app.append(hero);heroArt();
const pg=el('p','progress');app.append(pg);
// chores
const ch=ld('chores',{});const cs=el('section','chores');const h=el('h2',null,'Morning Chores');const cnt=el('span','count');h.append(cnt);cs.append(h);
const cl=el('div','chlist');D.chores.forEach(c=>{const b=el('button','chore');b.type='button';b.setAttribute('role','checkbox');b.dataset.chore=c.id;
 b.append(el('span','bx'),el('span','lb',c.label));const up=()=>{b.classList.toggle('on',!!ch[c.id]);b.setAttribute('aria-checked',!!ch[c.id])};up();
 b.onclick=()=>{ch[c.id]=!ch[c.id];if(!ch[c.id])delete ch[c.id];sv('chores',ch);up();cc()};cl.append(b)});
const cc=()=>{cnt.textContent=Object.keys(ch).length+' of '+D.chores.length+' done'};cc();
const rs=el('button','linkbtn','Reset chores');rs.type='button';rs.style.marginTop='10px';rs.onclick=()=>{if(!confirm('Uncheck all chores?'))return;for(const k in ch)delete ch[k];sv('chores',ch);cl.querySelectorAll('.chore').forEach(b=>{b.classList.remove('on');b.setAttribute('aria-checked','false')});cc()};
cs.append(cl,rs);app.append(cs);
// teacher box
const tb=D.teacher_box,dt=el('details','teacher');dt.append(el('summary',null,'For Parents: plan for today'));
const add=(l,t)=>{const p=el('p');p.append(el('b',null,l+' '),document.createTextNode(t));dt.append(p)};
add('Who:',tb.who);add('Materials:',tb.materials.join('; '));const ol=el('ol');tb.steps.forEach(s=>ol.append(el('li',null,s)));dt.append(el('b',null,'Steps:'),ol);
add('What done looks like:',tb.done_looks_like);add('Standard check:',tb.standard_check);add('Advanced stretch:',tb.advanced_stretch);app.append(dt);
// art placeholder
function art(a,suffix){const box=el('div','art');const id=a.id+(suffix||'');const img=new Image();img.alt=a.label;
 box.append(el('span',null,'Art coming: '+a.label+' ('+id+'.png)'));img.onload=()=>{box.textContent='';box.classList.add('has');box.append(img)};img.src=D.art_dir+id+'.png';return box}
let total=0;
D.sections.forEach(s=>{const p=el('section','paper');p.id=s.id;const t=s.tag||'';
 p.append(el('span','tag'+(/ADV/.test(t)?' adv':/OPTIONAL/.test(t)?' opt':''),t));p.append(el('h2',null,s.id+' \u00b7 '+s.title));
 p.append(art(s.art));
 if(s.encouragement)p.append(el('p','enc',s.encouragement));
 if(s.hint)p.append(el('p','hint','Strategy hint: '+s.hint));
 if(s.pages)p.append(story(s));
 s.questions.forEach(q=>{if(!/OPTIONAL/.test(t))total++;p.append(question(q))});app.append(p)});
function story(s){const w=el('div');const st=el('div','story');const pager=el('div','pager');const pv=el('button','linkbtn','\u2039 Back'),nx=el('button','btn','Next \u203a'),dots=el('div','dots');
 pv.type=nx.type='button';let i=Math.min(ld('story.'+s.id,0),s.pages.length-1);
 s.pages.forEach(()=>dots.append(el('i')));
 const r=()=>{st.textContent='';const lab=el('div','small','Part '+(i+1)+' of '+s.pages.length);st.append(lab,el('p',null,s.pages[i]));
  [...dots.children].forEach((d,j)=>d.classList.toggle('on',j<=i));pv.disabled=i==0;pv.style.visibility=i==0?'hidden':'visible';
  nx.textContent=i==s.pages.length-1?'Done reading \u2713':'Next \u203a';sv('story.'+s.id,i)};
 pv.onclick=()=>{if(i>0){i--;r()}};nx.onclick=()=>{if(i<s.pages.length-1){i++;r()}else{sv('storyDone.'+s.id,true);nx.textContent='Read! \u2713'}};
 pager.append(pv,dots,nx);w.append(st,pager);r();return w}
function question(q){const w=el('div','q');w.dataset.qid=q.id;w.dataset.type=q.type;const p=el('p','p');p.append(document.createTextNode(q.prompt));w.id='q-'+q.id;
 const s=el('span','saved','Saved');s.dataset.saved=q.id;p.append(s);w.append(p);
 const f={multiple_choice:mc,short_typed:typed,number_typed:num,tap_to_sort:sort,pencil_draw:pad,pencil_write:pad}[q.type];
 if(!f){w.append(el('p','small','Unsupported question type: '+q.type));return w}
 if(q.alt_type==='pencil_write'&&q.type==='short_typed')w.append(both(q));else w.append(f(q));return w}
function mc(q){const g=el('div','opts');g.setAttribute('role','radiogroup');q.options.forEach(o=>{const b=el('button','opt',o);b.type='button';b.setAttribute('role','radio');
 const up=()=>{b.classList.toggle('on',A[q.id]===o);b.setAttribute('aria-checked',A[q.id]===o)};b._up=up;up();b.onclick=()=>{setA(q.id,A[q.id]===o?'':o);g.querySelectorAll('.opt').forEach(x=>x._up())};g.append(b)});return g}
function typed(q,long){const t=el('textarea',long?'long':'');t.value=typeof A[q.id]==='string'?A[q.id]:(A[q.id]&&A[q.id].text)||'';t.placeholder='Type your answer here';t.setAttribute('autocapitalize','sentences');
 let tm;t.oninput=()=>{clearTimeout(tm);tm=setTimeout(()=>save(q.id,{text:t.value}),400)};t.onblur=()=>save(q.id,{text:t.value});return t}
function save(id,part){let cur=A[id];if(typeof cur==='string')cur={text:cur};cur=Object.assign({},cur||{},part);for(const k in cur)if(!cur[k])delete cur[k];setA(id,Object.keys(cur).length?cur:'')}
function num(q){const i=el('input','num');i.type='text';i.inputMode='numeric';i.pattern='[0-9]*';i.autocomplete='off';i.value=A[q.id]||'';i.placeholder='?';i.setAttribute('aria-label','Answer for '+q.id);
 i.oninput=()=>{i.value=i.value.replace(/[^0-9]/g,'').slice(0,6);setA(q.id,i.value)};return i}
function sort(q){const w=el('div','sort');let m=Object.assign({},A[q.id]||{});let sel=null;const pool=el('div','pool');const bs=el('div','buckets');const bk={};
 w.append(el('div','small','Tap a card, then tap a box. Tap a card in a box to move it back.'),pool,bs);
 q.buckets.forEach(b=>{const d=el('div','bucket');d.setAttribute('role','button');d.dataset.bucket=b;d.append(el('h4',null,b));const inn=el('div','in');d.append(inn);bk[b]=inn;
  d.onclick=e=>{if(sel==null||e.target.classList.contains('chip'))return;m[sel]=b;sel=null;commit()};bs.append(d)});
 function commit(){setA(q.id,Object.keys(m).length?m:'');r()}
 function r(){pool.textContent='';Object.values(bk).forEach(x=>x.textContent='');bs.querySelectorAll('.bucket').forEach(d=>d.classList.toggle('ready',sel!=null));
  q.items.forEach(it=>{const c=el('button','chip'+(sel===it?' sel':''),it);c.type='button';c.dataset.item=it;
   if(m[it]&&bk[m[it]]){c.onclick=e=>{e.stopPropagation();delete m[it];commit()};bk[m[it]].append(c)}
   else{c.onclick=()=>{sel=sel===it?null:it;r()};pool.append(c)}});
  if(!pool.children.length)pool.append(el('span','small','All sorted! \u2713'))}
 r();return w}
function pad(q){const w=el('div');const pd=el('div','pad');const cv=el('canvas');pd.append(cv);const write=q.type==='pencil_write'||q.alt_type==='pencil_write';
 if(q.model_text){const m=el('p','model',q.model_text);w.append(m)}
 pd.style.height=write?'220px':'min(60vh,460px)';w.append(pd);
 const ctx=cv.getContext('2d');let color='#2a221a',size=write?3:5,erase=false,drawing=false,last=null,dpr=Math.min(2,window.devicePixelRatio||1);
 const key=q.id+(q.type==='short_typed'?'':''),cur=()=>{const a=A[q.id];return a&&typeof a==='object'?a.drawing:null};
 function guides(){if(!write)return;const H=cv.height/dpr,W=cv.width/dpr;ctx.save();ctx.globalCompositeOperation='destination-over';
  for(let y=50;y<H-20;y+=90){ctx.strokeStyle='#9ab';ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.moveTo(0,y+60);ctx.lineTo(W,y+60);ctx.stroke();
   ctx.setLineDash([8,8]);ctx.strokeStyle='#c9a';ctx.beginPath();ctx.moveTo(0,y+30);ctx.lineTo(W,y+30);ctx.stroke()}ctx.restore()}
 function fit(){const r=pd.getBoundingClientRect();if(!r.width)return;const keep=cur();cv.width=r.width*dpr;cv.height=r.height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.lineCap=ctx.lineJoin='round';
  if(keep){const im=new Image();im.onload=()=>{ctx.drawImage(im,0,0,r.width,r.height)};im.src=keep}}
 const pt=e=>{const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
 cv.addEventListener('pointerdown',e=>{drawing=true;cv.setPointerCapture(e.pointerId);last=pt(e);e.preventDefault()});
 cv.addEventListener('pointermove',e=>{if(!drawing)return;const p=pt(e);const pr=e.pressure&&e.pointerType==='pen'?(0.5+e.pressure):1;
  ctx.globalCompositeOperation=erase?'destination-out':'source-over';ctx.strokeStyle=color;ctx.lineWidth=(erase?24:size)*pr;ctx.beginPath();ctx.moveTo(...last);ctx.lineTo(...p);ctx.stroke();last=p;e.preventDefault()});
 const end=()=>{if(!drawing)return;drawing=false;save(q.id,{drawing:cv.toDataURL('image/png')})};cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
 const tools=el('div','tools');(write?['#2a221a','#1f4e8c']:['#2a221a','#8e2f25','#a4512b','#d9a520','#7d8f69','#5b7a96']).forEach((c,i)=>{const s=el('button','sw'+(i==0?' on':''));s.type='button';s.style.background=c;s.setAttribute('aria-label','Color');
  s.onclick=()=>{color=c;erase=false;tools.querySelectorAll('.sw').forEach(x=>x.classList.remove('on'));s.classList.add('on');er.classList.remove('on')};tools.append(s)});
 const er=el('button','linkbtn','Eraser');er.type='button';er.onclick=()=>{erase=!erase;er.classList.toggle('on',erase)};
 const clr=el('button','linkbtn','Clear');clr.type='button';clr.onclick=()=>{if(!confirm('Erase the whole page?'))return;ctx.clearRect(0,0,cv.width,cv.height);save(q.id,{drawing:''})};
 tools.append(er,clr);w.append(tools);

 if(write)pd.style.background='repeating-linear-gradient(#fffdf6 0 49px,#9ab 49px 50px,#fffdf6 50px 79px,#d7b 79px 80px,#fffdf6 80px 109px,#9ab 109px 110px,#fffdf6 110px 140px)';
 requestAnimationFrame(fit);let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(fit,200)});return w}
function both(q){const w=el('div');const mode=el('div','mode');const tb=el('button','linkbtn','Type it'),pb=el('button','linkbtn','Write with pencil');tb.type=pb.type='button';
 const t=typed(q,true);const pdw=pad(Object.assign({},q,{type:'pencil_write'}));pdw.style.display='none';mode.append(tb,pb);w.append(mode,t,pdw);
 const set=m=>{tb.classList.toggle('on',m=='t');pb.classList.toggle('on',m=='p');t.style.display=m=='t'?'':'none';pdw.style.display=m=='p'?'':'none';if(m=='p')window.dispatchEvent(new Event('resize'));sv('mode.'+q.id,m)};
 tb.onclick=()=>set('t');pb.onclick=()=>set('p');set(ld('mode.'+q.id,'t'));return w}
function prog(){const ids=[];D.sections.forEach(s=>{if(!/OPTIONAL/.test(s.tag||''))s.questions.forEach(q=>ids.push(q.id))});const n=ids.filter(i=>A[i]!=null).length;pg.textContent=n+' of '+ids.length+' questions answered (optional parts not counted)'}
prog();
const ft=el('div','foot');const ra=el('button','linkbtn','Start this lesson over');ra.type='button';ra.onclick=()=>{if(!confirm('Erase all answers and drawings for this lesson?'))return;
 Object.keys(localStorage).filter(k=>k.startsWith(base)&&!k.startsWith(base+'chores')).forEach(k=>localStorage.removeItem(k));location.reload()};ft.append(ra);app.append(ft);
})();
