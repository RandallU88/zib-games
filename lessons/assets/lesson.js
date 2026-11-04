(function(){
const D=JSON.parse(document.getElementById('lesson-data').textContent);
const kid=D.kid.toLowerCase(),base='urwin.lessons.'+kid+'.'+D.lesson_id+'.',AD=D.art_dir,UI=AD+'../ui/';
const today=new Date().toLocaleDateString('en-CA');
const ld=(k,d)=>{try{const v=localStorage.getItem(base+k);return v?JSON.parse(v):d}catch(e){return d}};
const sv=(k,v)=>{try{localStorage.setItem(base+k,JSON.stringify(v));return true}catch(e){alert('Could not save. The iPad may be out of storage.');return false}};
const A=ld('answers',{});
const setA=(id,v)=>{if(v===''||v==null)delete A[id];else A[id]=v;sv('answers',A);flash(id);prog()};
const el=(t,c,txt)=>{const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e};
const icon=(n,c)=>{const i=el('img',c||'ico');i.src=UI+'lucide-'+n+'.svg';i.alt='';i.setAttribute('aria-hidden','true');return i};
function pic(name,alt,cls){const p=el('picture',cls);const s=el('source');s.type='image/webp';s.srcset=AD+name+'.webp';const i=el('img');i.src=AD+name+'.png';i.alt=alt||'';i.loading='lazy';i.decoding='async';p.append(s,i);return p}
function svg(name,alt,cls){const i=el('img',cls);i.src=AD+name;i.alt=alt||'';i.decoding='async';return i}
function flash(id){const s=document.querySelector('[data-saved="'+id+'"]');if(s){s.classList.add('show');clearTimeout(s._t);s._t=setTimeout(()=>s.classList.remove('show'),1200)}}
document.body.classList.add('lessonpage','kid-'+kid,'theme-'+D.theme_word.toLowerCase().replace(/[^a-z0-9]+/g,'-'),D.lesson_id);
document.body.dataset.theme=D.theme_word;
const app=document.getElementById('app');
// hero
const hero=el('div','hero');const ht=el('div','ht');
ht.append(el('div','kick','Lesson '+parseInt(D.lesson_id.split('-')[1])+' \u00b7 Theme word: '+D.theme_word),el('h1',null,D.title),el('div','meta','Grade '+D.grade+' \u00b7 '+D.subjects.join(', ')+' \u00b7 '+D.est_minutes+' min'));
hero.append(ht);hero.style.setProperty('--hero-img','url("'+AD+kid+'-hero.webp")');app.append(hero);
const pg=el('div','progress');const pgt=el('span');const pgb=el('div','bar');const pgi=el('i');pgb.append(pgi);pg.append(pgt,pgb);app.append(pg);
// chores (per kid, per lesson, per day)
const ckey='chores.'+today;const ch=ld(ckey,{});
const cs=el('section','chores');const h=el('div','chead');const h2=el('h2',null,'Morning Chores');const cnt=el('span','count');h.append(h2,cnt);
const cbar=el('div','bar');const cbi=el('i');cbar.append(cbi);const stamp=pic('../ui/badge-chores','','stamp');stamp.querySelector('img').alt='Chores badge';
cs.append(h,cbar);
const cl=el('div','chlist');D.chores.forEach(c=>{const b=el('button','chore');b.type='button';b.setAttribute('role','checkbox');b.dataset.chore=c.id;
 const bx=el('img','bx');bx.alt='';b.append(bx,el('span','lb',c.label));
 const up=()=>{const on=!!ch[c.id];b.classList.toggle('on',on);b.setAttribute('aria-checked',on);bx.src=UI+'checkbox-'+(on?'checked':'unchecked')+'.svg'};up();
 b.onclick=()=>{ch[c.id]=!ch[c.id];if(!ch[c.id])delete ch[c.id];sv(ckey,ch);up();cc(true);if(navigator.vibrate)navigator.vibrate(10)};cl.append(b)});
const cc=anim=>{const n=Object.keys(ch).length;cnt.textContent=n+' of '+D.chores.length+' done';cbi.style.width=(100*n/D.chores.length)+'%';
 const all=n===D.chores.length;stamp.classList.toggle('show',all);if(all&&anim){stamp.classList.remove('pop');void stamp.offsetWidth;stamp.classList.add('pop')}};
const rs=el('button','linkbtn');rs.type='button';rs.append(icon('undo-2'),document.createTextNode(' Reset chores'));
rs.onclick=()=>{if(!confirm('Uncheck all chores?'))return;for(const k in ch)delete ch[k];sv(ckey,ch);cl.querySelectorAll('.chore').forEach(b=>{b.classList.remove('on');b.setAttribute('aria-checked','false');b.querySelector('.bx').src=UI+'checkbox-unchecked.svg'});cc()};
cs.append(cl,rs,stamp);app.append(cs);cc();
// teacher box
const tb=D.teacher_box,dt=el('details','teacher');dt.append(el('summary',null,'For Parents: plan for today'));
const add=(l,t)=>{const p=el('p');p.append(el('b',null,l+' '),document.createTextNode(t));dt.append(p)};
add('Who:',tb.who);add('Materials:',tb.materials.join('; '));const ol=el('ol');tb.steps.forEach(s=>ol.append(el('li',null,s)));dt.append(el('b',null,'Steps:'),ol);
add('What done looks like:',tb.done_looks_like);add('Standard check:',tb.standard_check);add('Advanced stretch:',tb.advanced_stretch);app.append(dt);
// sections
D.sections.forEach(s=>{const p=el('section','paper sec');p.id=s.id;const t=s.tag||'';
 p.append(el('span','tag'+(/ADV/.test(t)?' adv':/OPTIONAL/.test(t)?' optional':''),t),el('h2',null,s.title));
 if(s.banner&&!s.panels)p.append(pic(s.banner,'','banner'));
 if(s.encouragement)p.append(el('p','enc',s.encouragement));
 if(s.hint)p.append(el('p','hint','Strategy hint: '+s.hint));
 if(s.pages)p.append(story(s));
 if(s.layout==='thermo'){const row=el('div','thermos');const qs=s.questions.filter(q=>q.figure&&q.figure.kind==='thermo');
  qs.forEach(q=>row.append(question(q,s)));p.append(row);s.questions.filter(q=>!qs.includes(q)).forEach(q=>p.append(question(q,s)))}
 else s.questions.forEach(q=>p.append(question(q,s)));
 app.append(p)});
function story(s){const w=el('div','reader');const art=el('div','panel');const st=el('div','story');const pager=el('div','pager');
 const pv=el('button','linkbtn');pv.append(icon('chevron-left'),document.createTextNode(' Back'));const nx=el('button','btn'),dots=el('div','dots');
 pv.type=nx.type='button';let i=Math.min(ld('story.'+s.id,0),s.pages.length-1);const word=kid==='savannah'?'Chapter':'Part';
 s.pages.forEach(()=>dots.append(el('i')));
 const r=()=>{art.textContent='';if(s.panels&&s.panels[i])art.append(pic(s.panels[i],'Story picture '+(i+1)));
  st.textContent='';st.append(el('div','pn',word+' '+(i+1)+' of '+s.pages.length),el('p',null,s.pages[i]));
  [...dots.children].forEach((d,j)=>d.classList.toggle('on',j===i));pv.style.visibility=i==0?'hidden':'visible';
  nx.textContent=i==s.pages.length-1?'Done reading':'Next';nx.append(icon(i==s.pages.length-1?'check':'chevron-right','ico w'));sv('story.'+s.id,i)};
 pv.onclick=()=>{if(i>0){i--;r()}};nx.onclick=()=>{if(i<s.pages.length-1){i++;r();w.scrollIntoView({block:'nearest'})}else{sv('storyDone.'+s.id,true);nx.textContent='Read!';nx.append(icon('check','ico w'))}};
 pager.append(pv,dots,nx);w.append(art,st,pager);r();return w}
function question(q,s){const w=el('div','q');w.dataset.qid=q.id;w.dataset.type=q.type;w.id='q-'+q.id;const p=el('h3','p');p.append(document.createTextNode(q.prompt));
 const sd=el('span','saved','Saved');sd.dataset.saved=q.id;p.append(sd);w.append(p);
 if(q.figure){const f=el('div','fig '+q.figure.kind);f.append(svg(q.figure.src,q.figure.alt));w.append(f)}
 if(q.coins){const f=el('div','coins');f.setAttribute('role','img');f.setAttribute('aria-label','Coins to count');q.coins.forEach(c=>f.append(svg('L4-coin-'+c+'.svg',c+' coin','coin '+c)));w.append(f)}
 const fn={multiple_choice:mc,short_typed:typed,number_typed:num,tap_to_sort:sort,pencil_draw:pad,pencil_write:pad}[q.type];
 if(!fn){w.append(el('p','small','Unsupported question type: '+q.type));return w}
 if(q.alt_type==='pencil_write'&&q.type==='short_typed')w.append(both(q,s));else w.append(fn(q,s));return w}
function mc(q){const g=el('div','opts');g.setAttribute('role','radiogroup');q.options.forEach(o=>{const b=el('button','opt');b.type='button';b.setAttribute('role','radio');b.append(el('span','ring'),el('span',null,o));
 const up=()=>{b.classList.toggle('on',A[q.id]===o);b.setAttribute('aria-checked',A[q.id]===o)};b._up=up;up();b.onclick=()=>{setA(q.id,A[q.id]===o?'':o);g.querySelectorAll('.opt').forEach(x=>x._up())};g.append(b)});return g}
function save(id,part){let cur=A[id];if(typeof cur==='string')cur={text:cur};cur=Object.assign({},cur||{},part);for(const k in cur)if(!cur[k])delete cur[k];setA(id,Object.keys(cur).length?cur:'')}
function typed(q,s,long){const wrap=el('div','tw');const t=el('textarea',long?'long':'');t.value=typeof A[q.id]==='string'?A[q.id]:(A[q.id]&&A[q.id].text)||'';t.placeholder='Type your answer here';t.setAttribute('autocapitalize','sentences');
 const wc=el('div','wc');const count=()=>{const v=t.value.trim();const w=v?v.split(/\s+/).length:0;const se=(v.match(/[.!?]+(\s|$)/g)||[]).length;wc.textContent=w+' words \u00b7 '+se+' sentences'};
 let tm;t.oninput=()=>{count();clearTimeout(tm);tm=setTimeout(()=>save(q.id,{text:t.value}),400)};t.onblur=()=>save(q.id,{text:t.value});count();wrap.append(t);if(long)wrap.append(wc);return wrap}
function num(q){const i=el('input','num');i.type='text';i.inputMode='numeric';i.pattern='[0-9]*';i.autocomplete='off';i.value=A[q.id]||'';i.setAttribute('aria-label','Your answer');
 i.oninput=()=>{i.value=i.value.replace(/[^0-9]/g,'').slice(0,6);setA(q.id,i.value)};return i}
function sort(q){const w=el('div','sort');let m=Object.assign({},A[q.id]||{});let sel=null;const pool=el('div','pool');const bs=el('div','buckets');const bk={};const ia=q.item_art||{},ba=q.bucket_art||{};
 w.append(el('div','small','Tap a card, then tap a box. Tap a card in a box to send it back.'),pool,bs);
 q.buckets.forEach(b=>{const d=el('div','bucket');d.setAttribute('role','button');d.dataset.bucket=b;if(ba[b])d.append(pic(ba[b],'','bart'));d.append(el('h4',null,b));const inn=el('div','in');d.append(inn);bk[b]=inn;
  d.onclick=e=>{if(sel==null||e.target.closest('.chip'))return;m[sel]=b;sel=null;commit()};bs.append(d)});
 function commit(){setA(q.id,Object.keys(m).length?m:'');r()}
 function card(it){const c=el('button','chip');c.type='button';c.dataset.item=it;
  if(ia.pumpkin){c.classList.add('pumpkin');c.append(svg(ia.pumpkin,''),el('span','pn',it))}else if(ia[it]){c.classList.add('icon');c.append(pic(ia[it],''),el('span','lab',it))}else c.textContent=it;return c}
 function r(){pool.textContent='';Object.values(bk).forEach(x=>x.textContent='');bs.querySelectorAll('.bucket').forEach(d=>{d.classList.toggle('ready',sel!=null);d.classList.toggle('empty',!q.items.some(it=>m[it]===d.dataset.bucket))});
  q.items.forEach(it=>{const c=card(it);if(sel===it)c.classList.add('sel');
   if(m[it]&&bk[m[it]]){c.classList.add('placed');c.onclick=e=>{e.stopPropagation();delete m[it];commit()};bk[m[it]].append(c)}
   else{c.onclick=()=>{sel=sel===it?null:it;r()};pool.append(c)}});
  if(!pool.children.length)pool.append(el('span','small done','All sorted!'))}
 r();return w}
function pad(q,s){const w=el('div','padwrap');const write=q.type==='pencil_write'||q.alt_type==='pencil_write';const pd=el('div','pad');const cv=el('canvas');pd.append(cv);
 if(s&&s.guide){const m=el('div','guide model');m.style.backgroundImage='url("'+AD+s.guide+'")';m.append(el('span','mtext',q.model_text||''));m.setAttribute('aria-label','Model sentence');w.append(m);
  pd.classList.add('guide');pd.style.backgroundImage='url("'+AD+s.guide+'")'}
 else if(write){pd.classList.add('ruled')}
 else if(s&&s.canvas_bg){pd.style.backgroundImage='url("'+AD+s.canvas_bg+'.webp")';pd.classList.add('drawbg')}
 if(!s||!s.guide)pd.style.height=write?'240px':'min(56vh,460px)';
 w.append(pd);
 const ctx=cv.getContext('2d');let erase=false,drawing=false,last=null,pen=false,dpr=Math.min(2,window.devicePixelRatio||1);const hist=[];
 const cur=()=>{const a=A[q.id];return a&&typeof a==='object'?a.drawing:null};
 function fit(){const r=pd.getBoundingClientRect();if(!r.width)return;const keep=cur();cv.width=r.width*dpr;cv.height=r.height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.lineCap=ctx.lineJoin='round';
  if(keep){const im=new Image();im.onload=()=>ctx.drawImage(im,0,0,r.width,r.height);im.src=keep}}
 const pt=e=>{const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
 cv.addEventListener('pointerdown',e=>{if(e.pointerType==='pen')pen=true;if(pen&&e.pointerType==='touch')return;hist.push(cv.toDataURL());if(hist.length>20)hist.shift();drawing=true;cv.setPointerCapture(e.pointerId);last=pt(e);e.preventDefault()});
 cv.addEventListener('pointermove',e=>{if(!drawing||(pen&&e.pointerType==='touch'))return;const p=pt(e);const pr=e.pointerType==='pen'&&e.pressure?(0.4+e.pressure):1;
  ctx.globalCompositeOperation=erase?'destination-out':'source-over';ctx.strokeStyle=getComputedStyle(document.body).getPropertyValue('--ink')||'#2A211A';ctx.lineWidth=(erase?24:3)*pr;ctx.beginPath();ctx.moveTo(...last);ctx.lineTo(...p);ctx.stroke();last=p;e.preventDefault()});
 const end=()=>{if(!drawing)return;drawing=false;save(q.id,{drawing:cv.toDataURL('image/png')})};cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
 const tools=el('div','tools');const mk=(n,lab,fn)=>{const b=el('button','tool');b.type='button';b.setAttribute('aria-label',lab);b.title=lab;b.append(icon(n));b.onclick=fn;tools.append(b);return b};
 const pb=mk('pencil','Pencil',()=>{erase=false;pb.classList.add('on');eb.classList.remove('on')});const eb=mk('eraser','Eraser',()=>{erase=true;eb.classList.add('on');pb.classList.remove('on')});pb.classList.add('on');
 mk('undo-2','Undo',()=>{const d=hist.pop();if(d==null)return;const r=pd.getBoundingClientRect();ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);ctx.restore();
  const im=new Image();im.onload=()=>{ctx.globalCompositeOperation='source-over';ctx.drawImage(im,0,0,r.width,r.height);save(q.id,{drawing:cv.toDataURL('image/png')})};im.src=d});
 const clr=el('button','linkbtn','Clear page');clr.type='button';clr.onclick=()=>{if(!confirm('Erase the whole page?'))return;hist.push(cv.toDataURL());ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);ctx.restore();save(q.id,{drawing:''})};
 pd.append(tools);const below=el('div','below');below.append(clr,el('span','small','Saves by itself as you draw.'));w.append(below);
 requestAnimationFrame(fit);let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(fit,200)});return w}
function both(q,s){const w=el('div','both'+(s.notebook?' notebook':''));if(s.notebook)w.style.setProperty('--nb','url("'+AD+s.notebook+'.webp")');
 const mode=el('div','seg');mode.setAttribute('role','tablist');const tb=el('button',null,'Type'),pb=el('button',null,'Write');tb.type=pb.type='button';
 const t=typed(q,s,true);const pdw=pad(Object.assign({},q,{type:'pencil_write'}),{});pdw.style.display='none';mode.append(tb,pb);w.append(mode,t,pdw);
 const set=m=>{tb.classList.toggle('on',m=='t');pb.classList.toggle('on',m=='p');tb.setAttribute('aria-selected',m=='t');pb.setAttribute('aria-selected',m=='p');t.style.display=m=='t'?'':'none';pdw.style.display=m=='p'?'':'none';if(m=='p')window.dispatchEvent(new Event('resize'));sv('mode.'+q.id,m)};
 tb.onclick=()=>set('t');pb.onclick=()=>set('p');set(ld('mode.'+q.id,'t'));return w}
function prog(){const ids=[];D.sections.forEach(s=>{if(!/OPTIONAL/.test(s.tag||''))s.questions.forEach(q=>ids.push(q.id))});const n=ids.filter(i=>A[i]!=null).length;
 pgt.textContent=n+' of '+ids.length+' questions answered (optional parts not counted)';pgi.style.width=(100*n/ids.length)+'%'}
prog();
const ft=el('div','foot');const ra=el('button','linkbtn','Start this lesson over');ra.type='button';ra.onclick=()=>{if(!confirm('Erase all answers and drawings for this lesson?'))return;
 Object.keys(localStorage).filter(k=>k.startsWith(base)&&!k.startsWith(base+'chores')).forEach(k=>localStorage.removeItem(k));location.reload()};ft.append(ra);app.append(ft);
})();
