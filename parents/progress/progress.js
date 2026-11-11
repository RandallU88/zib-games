/* Parent progress + answers. Passcode is checked server-side (SECURITY DEFINER RPC). It is kept in memory only. */
(function(){
const URL_='https://rcnlpsynyfmwentrhvhr.supabase.co',KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjbmxwc3lueWZtd2VudHJodmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzODE3ODgsImV4cCI6MjEwODk1Nzc4OH0.ovx-rPRdppqZlB-70gavvRnKzA0TY4GVMRBvnF0QOsQ';
const $=id=>document.getElementById(id);
const el=(t,c,txt)=>{const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e};
const KIDS=[['logan','Logan','Grade 2'],['savannah','Savannah','Grade 5']];
let PASS=null;
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
$('lockbtn').onclick=()=>{PASS=null;$('app').hidden=true;$('lock').hidden=false;$('detail').textContent='';$('grid').textContent='';$('totals').textContent='';$('pw').focus()};
async function reload(){if(!PASS)return;const d=await rpc('homeschool_parent_progress',{p_pass:PASS});if(!d.ok){$('lockbtn').onclick();$('err').textContent=errMsg(d);$('err').hidden=false;return}render(d)}
$('refresh').onclick=()=>reload().catch(()=>alert('Could not reach the server.'));
function score(qs){let r=0,w=0,v=0,b=0,den=0;for(const q of qs){const g=(q.grade||{}).v;
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
function render(d){$('asof').textContent='Updated '+when(d.server_time);
  const by={};for(const L of d.lessons){(by[L.kid]=by[L.kid]||[]).push(L)}
  const nums=[...new Set(d.lessons.map(L=>L.num))].sort((a,b)=>b-a);
  // totals
  const tt=$('totals');tt.textContent='';
  for(const [k,n,g] of KIDS){const ls=by[k]||[];const done=ls.filter(L=>L.submission).length;const c=el('div','tot');const im=el('img');im.src='../../lessons/assets/avatars/'+k+'-avatar.webp?v=2';im.alt='';
    const tx=el('div');tx.append(el('b',null,n),el('span',null,done+' of '+ls.length+' lessons submitted \u00b7 '+g));c.append(im,tx);tt.append(c)}
  // grid
  const t=$('grid');t.textContent='';const th=el('thead'),hr=el('tr');hr.append(el('th',null,'Lesson'));KIDS.forEach(([,n])=>hr.append(el('th',null,n)));th.append(hr);t.append(th);
  const tb=el('tbody');
  for(const num of nums){const tr=el('tr');tr.append(el('th',null,'Lesson '+num));
    for(const [k,n] of KIDS){const L=(by[k]||[]).find(x=>x.num===num);const td=el('td');td.dataset.k=n;
      if(!L){td.append(el('span','none','None'));tr.append(td);continue}
      td.append(el('span','lt',L.title));
      if(L.submission){td.append(el('span','pill yes','Submitted'),el('span','when',when(L.submission.submitted_at)));const s=score(L.submission.questions);
        td.append(el('span','sc',(s.pct==null?'':s.r+' / '+s.den+' right ('+s.pct+'%)')+(s.v?' \u00b7 '+s.v+' to review':'')));
        td.classList.add('jump');td.title='Open this lesson\'s answers';
        td.onclick=()=>{const d=document.querySelector('details.sub-card[data-kid="'+k+'"][data-lesson="'+L.lesson_id+'"]');if(!d)return;d.open=true;d.scrollIntoView({block:'start'});const r=d.querySelector('.qrow.review');if(r)r.scrollIntoView({block:'center'})}}
      else td.append(el('span','pill no','Not yet'));
      tr.append(td)}
    tb.append(tr)}
  t.append(tb);const tf=el('tfoot'),fr=el('tr');fr.append(el('td',null,'Total'));
  KIDS.forEach(([k,n])=>{const ls=by[k]||[];fr.append(el('td',null,n+': '+ls.filter(L=>L.submission).length+' of '+ls.length+' submitted'))});tf.append(fr);t.append(tf);
  // detail
  const dd=$('detail');dd.textContent='';
  for(const [k,n] of KIDS){const ls=(by[k]||[]).filter(L=>L.submission);const h=el('div','kidhead');const im=el('img');im.src='../../lessons/assets/avatars/'+k+'-avatar.webp?v=2';im.alt='';h.append(im,el('h2',null,n+': answers'));dd.append(h);
    if(!ls.length){dd.append(el('p','none','Nothing submitted yet.'));continue}
    dd.append(el('p','review-note','Tap a submitted lesson to open it. Lessons with items to review open automatically so you can see drawings and written answers.'));
    for(const L of ls){const S=L.submission,s=score(S.questions);const det=el('details','sub-card');det.dataset.kid=k;det.dataset.lesson=L.lesson_id;
      if(s.v)det.open=true;
      const sm=el('summary');const sum=el('div','sum');
      sum.append(el('span','t','Lesson '+L.num+': '+L.title),el('span','m','Submitted '+when(S.submitted_at)+(L.times>1?' \u00b7 sent '+L.times+' times, showing the latest':'')));
      const ch=el('span','chips');ch.append(el('span','c r',s.r+' right'),el('span','c w',s.w+' wrong'));
      const rev=el('span','c v jump',s.v+' to review');rev.title='Jump to answers that need review';
      rev.onclick=e=>{e.preventDefault();e.stopPropagation();det.open=true;const r=det.querySelector('.qrow.review');if(r)r.scrollIntoView({block:'center'})};
      ch.append(rev,el('span','c b',s.b+' blank'));
      if(s.pct!=null)ch.prepend(el('span','c v','Score '+s.r+' / '+s.den+' ('+s.pct+'%)'));sum.append(ch);sm.append(sum);det.append(sm);
      const qs=el('div','qs');let sec=null;
      for(const q of S.questions){if(q.section!==sec){sec=q.section;qs.append(el('h3',null,sec||''))}
        const g=(q.grade||{}).v||'blank';const row=el('div','qrow '+g);row.dataset.qid=q.id;row.dataset.verdict=g;
        const mk=el('span','mark '+g,MARK[g][0]);mk.setAttribute('aria-label',MARK[g][1]);row.append(mk);
        const top=el('div','qid',q.id);if(q.optional)top.append(el('span','opt-tag','optional'));row.append(top,el('div','qp',q.prompt||''));
        const qa=el('div','qa');qa.append(el('b',null,'Answered:'));fmtResp(q,qa);row.append(qa);
        const qc=el('div','qc');const cc=fmtCorrect(q.correct);
        if(cc!=null&&!q.review){qc.append(el('b',null,'Correct:'),document.createTextNode(cc))}
        else{qc.append(el('b',null,q.rubric?'Look for:':'Correct:'),document.createTextNode(q.rubric||cc||'Parent judges this one'))}
        const vt=el('span','vt '+g,'  '+MARK[g][1]+((q.grade||{}).part?' ('+q.grade.part+' placed right)':''));qc.append(document.createTextNode(' '),vt);
        row.append(qc);qs.append(row)}
      det.append(qs);
      const ft=el('div','subfoot');ft.append(el('span',null,'Un-submit to let '+n+' send this lesson fresh. Their answers stay on their device.'));
      const rb=el('button','danger','Un-submit');rb.type='button';rb.onclick=async()=>{if(!confirm('Un-submit Lesson '+L.num+' for '+n+'? This removes every copy they sent for this lesson.'))return;
        rb.disabled=true;try{const r=await rpc('homeschool_parent_reset',{p_pass:PASS,p_kid:k,p_lesson:L.lesson_id});if(!r.ok){alert(errMsg(r));return}await reload()}catch(x){alert('Could not reach the server.')}finally{rb.disabled=false}};
      ft.append(rb);det.append(ft);dd.append(det)}}}
})();
