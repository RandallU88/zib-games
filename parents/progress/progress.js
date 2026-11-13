/* Parent progress + answers. Passcode is checked server-side (SECURITY DEFINER RPC). It is kept in memory only. */
(function(){
const URL_='https://rcnlpsynyfmwentrhvhr.supabase.co',KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjbmxwc3lueWZtd2VudHJodmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzODE3ODgsImV4cCI6MjEwODk1Nzc4OH0.ovx-rPRdppqZlB-70gavvRnKzA0TY4GVMRBvnF0QOsQ';
const $=id=>document.getElementById(id);
const el=(t,c,txt)=>{const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e};
const KIDS=[['logan','Logan','Grade 2'],['savannah','Savannah','Grade 5']];
const KIDSET=new Set(KIDS.map(k=>k[0]));
let PASS=null, DATA=null, VIEW={kid:'both',lesson:null};
const when=t=>new Date(t).toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/New_York'})+' ET';
async function rpc(fn,body){const r=await fetch(URL_+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok)throw new Error('Server error '+r.status);return r.json()}
function errMsg(d){return d&&d.error==='locked'?'Too many wrong tries. Wait 15 minutes and try again.':'That passcode did not work.'}
$('f').addEventListener('submit',async e=>{e.preventDefault();const b=$('go'),er=$('err');er.hidden=true;b.disabled=true;b.textContent='Checking...';
  try{const d=await rpc('homeschool_parent_progress',{p_pass:$('pw').value});
    if(!d.ok){er.textContent=errMsg(d);er.hidden=false;return}
    PASS=$('pw').value;$('pw').value='';$('lock').hidden=true;$('app').hidden=false;render(d)}
  catch(x){er.textContent='Could not reach the server. Check the connection and try again.';er.hidden=false}
  finally{b.disabled=false;b.textContent='Unlock'}});
$('lockbtn').onclick=()=>{PASS=null;DATA=null;$('app').hidden=true;$('lock').hidden=false;$('grid').textContent='';$('totals').textContent='';if($('asof'))$('asof').textContent='';if($('picker'))$('picker').textContent='';if($('review')){$('review').textContent='';$('review').hidden=true}$('pw').focus()};
async function reload(){if(!PASS)return;const d=await rpc('homeschool_parent_progress',{p_pass:PASS});if(!d.ok){$('lockbtn').onclick();$('err').textContent=errMsg(d);$('err').hidden=false;return}render(d)}
$('refresh').onclick=()=>reload().catch(()=>alert('Could not reach the server.'));
function score(qs){let r=0,w=0,v=0,b=0,den=0;for(const q of qs||[]){const g=(q.grade||{}).v;
  if(g==='right')r++;else if(g==='wrong')w++;else if(g==='review')v++;else b++;
  if(!q.review&&(g==='right'||g==='wrong'||(g==='blank'&&!q.optional)))den++}
  return {r,w,v,b,den,pct:den?Math.round(100*r/den):null}}
function fmtCorrect(c){if(c==null)return null;if(typeof c==='object'&&!Array.isArray(c))return Object.keys(c).map(k=>k+': '+[].concat(c[k]).join(', ')).join(' | ');return String(c)}
function isDraw(s){return typeof s==='string'&&/^data:image\/(png|jpeg|jpg|webp)/i.test(s.trim())}
function fmtResp(q,box){const a=q.response;if(a==null||a===''){box.append(el('span','v none','No answer'));return}
  if(typeof a==='string'||typeof a==='number'){
    if(isDraw(String(a))){const i=el('img');i.alt='Drawing';i.src=String(a).trim();box.append(i)}
    else box.append(el('span','v',String(a)));return}
  if(q.type==='tap_to_sort'){const g={};for(const it in a){(g[a[it]]=g[a[it]]||[]).push(it)}box.append(el('span','v',Object.keys(g).map(k=>k+': '+g[k].join(', ')).join(' | ')));return}
  if(a.text)box.append(el('span','v',a.text));
  if(isDraw(a.drawing)){const i=el('img');i.alt=q.type==='pencil_draw'?'Drawing':'Handwriting';i.src=a.drawing.trim();box.append(i)}
  if(!a.text&&!isDraw(a.drawing))box.append(el('span','v none','No answer'))}
const MARK={right:['\u2713','Right'],wrong:['\u2717','Wrong'],review:['?','Needs review'],blank:['\u2013','No answer']};

function parseHash(){
  const h=(location.hash||'').replace(/^#/, '');
  const out={kid:'both',lesson:null};
  if(!h)return out;
  const q=new URLSearchParams(h.includes('=')?h:(''));
  if(h.includes('=')){
    const kid=(q.get('kid')||'both').toLowerCase();
    out.kid=KIDSET.has(kid)||kid==='both'?kid:'both';
    out.lesson=q.get('lesson')||null;
  }else{
    // Allow #logan/lesson-04 as well as #kid=logan&lesson=lesson-04
    const parts=h.split('/').filter(Boolean);
    if(parts[0]&&(KIDSET.has(parts[0])||parts[0]==='both'))out.kid=parts[0];
    if(parts[1])out.lesson=parts[1];
  }
  return out;
}
function writeHash(view,replace){
  const parts=['kid='+encodeURIComponent(view.kid||'both')];
  if(view.lesson)parts.push('lesson='+encodeURIComponent(view.lesson));
  const next='#'+parts.join('&');
  if((location.hash||'')===next)return;
  if(replace)history.replaceState(null,'',next);
  else history.pushState(null,'',next);
}
function padNum(n){return String(n).padStart(2,'0')}
function lessonLabel(L,kids){
  if(!L)return 'Lesson';
  if(L.lesson_id==='simple-machine-shop'||(L.num==null&&/machine/i.test(L.title||'')))
    return L.title||'Simple Machine Shop';
  let title=L.title||'';
  if(L.by){
    const keys=kids&&kids.length?kids:Object.keys(L.by);
    const titles=[];
    for(const k of keys){const tt=L.by[k]&&L.by[k].title;if(tt&&!titles.includes(tt))titles.push(tt)}
    title=titles.length===1?titles[0]:'';
  }
  if(L.num!=null)return title?('Lesson '+padNum(L.num)+': '+title):('Lesson '+padNum(L.num));
  return title||L.lesson_id;
}
function sortLessons(list){
  return list.slice().sort((a,b)=>{
    const an=a.num==null?NaN:Number(a.num),bn=b.num==null?NaN:Number(b.num);
    const aN=Number.isFinite(an)?an:1000,bN=Number.isFinite(bn)?bn:1000;
    if(aN!==bN)return aN-bN;
    return String(a.lesson_id||'').localeCompare(String(b.lesson_id||''));
  });
}
function catalog(lessons){
  const map=new Map();
  for(const L of lessons||[]){
    const id=L.lesson_id;
    if(!map.has(id))map.set(id,{lesson_id:id,num:L.num,title:L.title,by:{}});
    const row=map.get(id);
    if(L.num!=null&&row.num==null)row.num=L.num;
    if(L.title)row.title=L.title;
    row.by[L.kid]=L;
  }
  return sortLessons([...map.values()]);
}
function kidsInView(){
  if(VIEW.kid==='both')return KIDS;
  return KIDS.filter(([k])=>k===VIEW.kid);
}

function renderGrid(d,by,nums){
  const t=$('grid');t.textContent='';const th=el('thead'),hr=el('tr');hr.append(el('th',null,'Lesson'));KIDS.forEach(([,n])=>hr.append(el('th',null,n)));th.append(hr);t.append(th);
  const tb=el('tbody');
  for(const num of nums){const tr=el('tr');tr.append(el('th',null,'Lesson '+padNum(num)));
    for(const [k,n] of KIDS){const L=(by[k]||[]).find(x=>x.num===num);const td=el('td');td.dataset.k=n;
      if(!L){td.append(el('span','none','None'));tr.append(td);continue}
      td.append(el('span','lt',L.title));
      if(L.submission){td.append(el('span','pill yes','Submitted'),el('span','when',when(L.submission.submitted_at)));const s=score(L.submission.questions);
        td.append(el('span','sc',(s.pct==null?'':s.r+' / '+s.den+' right ('+s.pct+'%)')+(s.v?' \u00b7 '+s.v+' to review':'')));
        td.classList.add('jump');td.title='Open this lesson\'s answers';
        td.onclick=()=>openLesson(k,L.lesson_id,true)}
      else td.append(el('span','pill no','Not yet'));
      tr.append(td)}
    tb.append(tr)}
  // Non-numbered entries (Simple Machine Shop, etc.) get their own row
  const extras=[...new Set((d.lessons||[]).filter(L=>L.num==null||!nums.includes(L.num)).map(L=>L.lesson_id))];
  for(const id of extras){const sample=(d.lessons||[]).find(L=>L.lesson_id===id);const tr=el('tr');tr.append(el('th',null,lessonLabel(sample)));
    for(const [k,n] of KIDS){const L=(by[k]||[]).find(x=>x.lesson_id===id);const td=el('td');td.dataset.k=n;
      if(!L){td.append(el('span','none','None'));tr.append(td);continue}
      td.append(el('span','lt',L.title));
      if(L.submission){td.append(el('span','pill yes','Submitted'),el('span','when',when(L.submission.submitted_at)));const s=score(L.submission.questions);
        td.append(el('span','sc',(s.pct==null?'':s.r+' / '+s.den+' right ('+s.pct+'%)')+(s.v?' \u00b7 '+s.v+' to review':'')));
        td.classList.add('jump');td.title='Open this lesson\'s answers';
        td.onclick=()=>openLesson(k,L.lesson_id,true)}
      else td.append(el('span','pill no','Not yet'));
      tr.append(td)}
    tb.append(tr)}
  t.append(tb);const tf=el('tfoot'),fr=el('tr');fr.append(el('td',null,'Total'));
  KIDS.forEach(([k,n])=>{const ls=by[k]||[];fr.append(el('td',null,n+': '+ls.filter(L=>L.submission).length+' of '+ls.length+' submitted'))});tf.append(fr);t.append(tf);
}

function renderPicker(d){
  const box=$('picker');box.textContent='';box.hidden=false;
  const head=el('div','answers-head');
  head.append(el('h2',null,'Kids\' answers'));
  head.append(el('p','review-note','Choose a kid and a lesson to review that lesson only.'));
  box.append(head);
  const segs=el('div','kid-seg');
  segs.setAttribute('role','tablist');
  segs.setAttribute('aria-label','Choose a kid');
  const opts=[['both','Both'],...KIDS.map(([k,n])=>[k,n])];
  for(const [id,label] of opts){
    const b=el('button','',label);b.type='button';b.dataset.kid=id;b.dataset.testid='kid-'+id;
    b.setAttribute('aria-pressed', VIEW.kid===id?'true':'false');
    if(VIEW.kid===id)b.classList.add('on');
    b.onclick=()=>{VIEW.kid=id;VIEW.lesson=null;writeHash(VIEW,false);paint()};
    segs.append(b);
  }
  box.append(segs);
  const list=el('div','lesson-list');
  list.setAttribute('role','list');
  list.dataset.testid='lesson-list';
  const rows=catalog(d.lessons);
  const kview=kidsInView();
  if(!rows.length){list.append(el('p','none','No lessons to show yet.'));box.append(list);return}
  for(const row of rows){
    const card=el('button','lesson-card');card.type='button';
    card.setAttribute('role','listitem');
    card.dataset.lesson=row.lesson_id;
    card.dataset.testid='lesson-card-'+row.lesson_id;
    const title=el('span','t',lessonLabel(row,kview.map(([k])=>k)));
    card.append(title);
    const bits=el('span','meta');
    let anySub=false,reviewN=0;
    for(const [k,n] of kview){
      const L=row.by[k];
      const line=el('span','kid-status');
      if(!L){line.append(el('span','who',n+': '),el('span','pill no','None'));}
      else if(L.submission){
        anySub=true;
        const s=score(L.submission.questions);
        reviewN+=s.v;
        line.append(el('span','who',n+(L.title?': '+L.title:':')+' '));
        line.append(el('span','pill yes','Submitted'));
        line.append(el('span','when',when(L.submission.submitted_at)));
        if(s.v)line.append(el('span','c v',s.v+' to review'));
      }else{
        line.append(el('span','who',n+(L.title?': '+L.title:':')+' '));
        line.append(el('span','pill no','Not yet'));
      }
      bits.append(line);
    }
    if(!anySub&&kview.length===1){/* single-kid not-yet already shown */}
    card.append(bits);
    card.onclick=()=>openLesson(VIEW.kid,row.lesson_id,true);
    list.append(card);
  }
  box.append(list);
}

function paintQuestions(qs,into){
  let sec=null;
  for(const q of qs||[]){if(q.section!==sec){sec=q.section;into.append(el('h3',null,sec||''))}
    const g=(q.grade||{}).v||'blank';const row=el('div','qrow '+g);row.dataset.qid=q.id;row.dataset.verdict=g;
    const mk=el('span','mark '+g,MARK[g][0]);mk.setAttribute('aria-label',MARK[g][1]);row.append(mk);
    const top=el('div','qid',q.id);if(q.optional)top.append(el('span','opt-tag','optional'));row.append(top,el('div','qp',q.prompt||''));
    const qa=el('div','qa');qa.append(el('b',null,'Answered:'));fmtResp(q,qa);row.append(qa);
    const qc=el('div','qc');const cc=fmtCorrect(q.correct);
    if(cc!=null&&!q.review){qc.append(el('b',null,'Correct:'),document.createTextNode(cc))}
    else{qc.append(el('b',null,q.rubric?'Look for:':'Correct:'),document.createTextNode(q.rubric||cc||'Parent judges this one'))}
    const vt=el('span','vt '+g,'  '+MARK[g][1]+((q.grade||{}).part?' ('+q.grade.part+' placed right)':''));qc.append(document.createTextNode(' '),vt);
    row.append(qc);into.append(row)}
}

function renderKidLesson(L,n,k,into){
  const card=el('article','sub-card');card.dataset.kid=k;card.dataset.lesson=L.lesson_id;
  if(!L.submission){
    const empty=el('div','sum');
    empty.append(el('span','t',n),el('span','m','Not yet submitted.'));
    card.append(empty);into.append(card);return}
  const S=L.submission,s=score(S.questions);
  const sum=el('div','sum');
  sum.append(el('span','t',n),el('span','m','Submitted '+when(S.submitted_at)+(L.times>1?' \u00b7 sent '+L.times+' times, showing the latest':'')));
  const ch=el('span','chips');
  if(s.pct!=null)ch.append(el('span','c v','Score '+s.r+' / '+s.den+' ('+s.pct+'%)'));
  ch.append(el('span','c r',s.r+' right'),el('span','c w',s.w+' wrong'));
  const rev=el('span','c v jump',s.v+' to review');rev.title='Jump to answers that need review';
  rev.onclick=()=>{const r=card.querySelector('.qrow.review');if(r)r.scrollIntoView({block:'center'})};
  ch.append(rev,el('span','c b',s.b+' blank'));
  sum.append(ch);card.append(sum);
  const qs=el('div','qs');paintQuestions(S.questions,qs);card.append(qs);
  const ft=el('div','subfoot');ft.append(el('span',null,'Un-submit to let '+n+' send this lesson fresh. Their answers stay on their device.'));
  const rb=el('button','danger','Un-submit');rb.type='button';rb.onclick=async()=>{if(!confirm('Un-submit '+lessonLabel(L,[k])+' for '+n+'? This removes every copy they sent for this lesson.'))return;
    rb.disabled=true;try{const r=await rpc('homeschool_parent_reset',{p_pass:PASS,p_kid:k,p_lesson:L.lesson_id});if(!r.ok){alert(errMsg(r));return}await reload()}catch(x){alert('Could not reach the server.')}finally{rb.disabled=false}};
  ft.append(rb);card.append(ft);into.append(card);
}

function renderReview(d){
  const box=$('review');box.textContent='';box.hidden=false;
  const back=el('button','back-lessons','Back to lessons');back.type='button';back.id='back-lessons';back.dataset.testid='back-lessons';
  back.onclick=()=>{VIEW.lesson=null;writeHash(VIEW,false);paint()};
  box.append(back);
  const rows=catalog(d.lessons);
  const row=rows.find(r=>r.lesson_id===VIEW.lesson);
  const title=el('h2',null,row?lessonLabel(row,kidsInView().map(([k])=>k)):'Lesson');
  box.append(title);
  const kview=kidsInView();
  let shown=0;
  for(const [k,n] of kview){
    const L=row&&row.by[k];
    if(!L){box.append(el('p','none',n+': no record of this lesson.'));continue}
    renderKidLesson(L,n,k,box);shown++;
  }
  if(!row)box.append(el('p','none','That lesson is not on the list.'));
  else if(!shown)box.append(el('p','none','Nothing to show for this lesson.'));
}

function paint(){
  if(!DATA)return;
  const want=!!VIEW.lesson;
  $('picker').hidden=want;
  $('review').hidden=!want;
  const grid=$('gridcard');
  if(grid)grid.hidden=want;
  if(want)renderReview(DATA);
  else renderPicker(DATA);
}

function openLesson(kid,lesson,push){
  VIEW.kid=(kid==='both'||KIDSET.has(kid))?kid:'both';
  VIEW.lesson=lesson||null;
  writeHash(VIEW,!push);
  paint();
  const target=VIEW.lesson?$('review'):$('picker');
  if(target)target.scrollIntoView({block:'start'});
}

function render(d){
  DATA=d;
  VIEW=parseHash();
  // If the hash names a lesson that is not in this payload, still keep the kid filter.
  $('asof').textContent='Updated '+when(d.server_time);
  const by={};for(const L of d.lessons){(by[L.kid]=by[L.kid]||[]).push(L)}
  const nums=[...new Set(d.lessons.map(L=>L.num).filter(n=>n!=null))].sort((a,b)=>b-a);
  const tt=$('totals');tt.textContent='';
  for(const [k,n,g] of KIDS){const ls=by[k]||[];const done=ls.filter(L=>L.submission).length;const c=el('div','tot');const im=el('img');im.src='../../lessons/assets/avatars/'+k+'-avatar.webp?v=2';im.alt='';
    const tx=el('div');tx.append(el('b',null,n),el('span',null,done+' of '+ls.length+' lessons submitted \u00b7 '+g));c.append(im,tx);tt.append(c)}
  renderGrid(d,by,nums);
  paint();
}

window.addEventListener('hashchange',()=>{if(!DATA)return;VIEW=parseHash();paint()});
window.Progress={
  open:openLesson,
  state:()=>({kid:VIEW.kid,lesson:VIEW.lesson}),
  render
};
})();
