/* Urwin Homeschool: lesson submissions. Public values only (project URL + anon key; RLS lets anon INSERT only). */
(function(){
const URL_='https://rcnlpsynyfmwentrhvhr.supabase.co',KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjbmxwc3lueWZtd2VudHJodmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzODE3ODgsImV4cCI6MjEwODk1Nzc4OH0.ovx-rPRdppqZlB-70gavvRnKzA0TY4GVMRBvnF0QOsQ';
const QK='urwin.hs.outbox';
const ld=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}};
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}};
const sk=(kid,lid)=>'urwin.lessons.'+kid+'.'+lid+'.submitted';
const H={apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'};
function uuid(){if(crypto.randomUUID)return crypto.randomUUID();const b=crypto.getRandomValues(new Uint8Array(16));b[6]=b[6]&15|64;b[8]=b[8]&63|128;const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20)}
const fire=()=>window.dispatchEvent(new Event('hs-sync'));
async function post(it){
  const responses=it.responses||ld('urwin.lessons.'+it.kid+'.'+it.lesson_id+'.answers',{});
  const r=await fetch(URL_+'/rest/v1/homeschool_submissions',{method:'POST',headers:Object.assign({Prefer:'return=minimal'},H),
    body:JSON.stringify({kid:it.kid,lesson_id:it.lesson_id,client_ref:it.ref,client_at:it.at,responses})});
  let t='';try{t=await r.text()}catch(e){}
  if(r.ok||r.status===409)return 'ok';
  if(r.status>=400&&r.status<500&&r.status!==408&&r.status!==429){let m='';try{m=JSON.parse(t).message||''}catch(e){}lastErr=(r.status+' '+m).slice(0,120);return 'reject'}
  return 'retry'}
let lastErr='';
let busy=false;
async function flush(){if(busy)return;busy=true;try{const q=ld(QK,[]);const keep=[];
  for(const it of q){let res='retry';try{res=await post(it)}catch(e){res='retry'}
    const k=sk(it.kid,it.lesson_id),s=ld(k,null);
    if(res==='retry'){keep.push(it);if(s&&s.ref===it.ref){s.tries=(s.tries||0)+1;s.last=new Date().toISOString();sv(k,s)}continue}
    if(s&&s.ref===it.ref){s.synced=res==='ok';s.failed=res==='reject';if(s.failed)s.err=lastErr;else delete s.err;sv(k,s)}}
  sv(QK,keep)}finally{busy=false;fire()}}
function submit(kid,lid,responses){const it={kid,lid:undefined,lesson_id:lid,ref:uuid(),at:new Date().toISOString(),responses};delete it.lid;
  const s={ref:it.ref,at:it.at,synced:false};if(!sv(sk(kid,lid),s))return null;
  const q=ld(QK,[]).filter(x=>!(x.kid===kid&&x.lesson_id===lid));q.push(it);
  if(!sv(QK,q)){delete it.responses;q[q.length-1]=it;sv(QK,q)}
  flush();return s}
function local(kid,lid){return ld(sk(kid,lid),null)}
function pending(){return ld(QK,[]).length}
/* Server status (lesson ids + time only). Clears a synced local mark if a parent reset it. */
async function status(kid,lids){let srv=null;
  try{const r=await fetch(URL_+'/rest/v1/rpc/homeschool_status',{method:'POST',headers:H,body:JSON.stringify({p_kid:kid})});if(r.ok)srv=await r.json()}catch(e){}
  const out={};const q=ld(QK,[]);
  for(const lid of lids){const k=sk(kid,lid);let s=ld(k,null);
    if(srv){if(srv[lid]){if(!s||s.synced){s={ref:s&&s.ref,at:srv[lid],synced:true};sv(k,s)}}
      else if(s&&s.synced&&!q.some(x=>x.ref===s.ref)){try{localStorage.removeItem(k)}catch(e){}s=null}}
    if(s)out[lid]=s}
  return out}
window.HSSubmit={submit,local,status,flush,pending};
window.addEventListener('online',flush);
/* iPad Safari often resumes a tab without firing 'online' and pauses timers in the background: retry when the page comes back. */
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&pending())flush()});
window.addEventListener('pageshow',()=>{if(pending())setTimeout(flush,300)});
window.addEventListener('focus',()=>{if(pending())flush()});
setInterval(()=>{if(pending())flush()},30000);
if(pending())setTimeout(flush,800);
})();
