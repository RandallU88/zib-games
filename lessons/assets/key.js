(function(){
document.body.classList.add('keypage');
const f=document.getElementById('f'),pw=document.getElementById('pw'),err=document.getElementById('err'),out=document.getElementById('out'),lock=document.getElementById('lock'),show=document.getElementById('show');
show.onclick=()=>{const t=pw.type==='password';pw.type=t?'text':'password';show.querySelector('img').src='../assets/ui/lucide-'+(t?'eye-off':'eye')+'.svg';show.setAttribute('aria-label',t?'Hide password':'Show password')};
const b=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function dec(e,p){const km=await crypto.subtle.importKey('raw',new TextEncoder().encode(p),'PBKDF2',false,['deriveKey']);
const k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b(e.salt),iterations:e.iter,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:b(e.iv)},k,b(e.ct)));}
f.addEventListener('submit',async ev=>{ev.preventDefault();err.hidden=true;const btn=f.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Checking...';
try{const keys=await (await fetch('keys.json',{cache:'no-store'})).json();const ids=Object.keys(keys).sort((a,c)=>keys[c].num-keys[a].num);let h='';
for(const id of ids){h+='<section class="ksec">'+await dec(keys[id].enc,pw.value)+'</section>';}
out.innerHTML='<div class="tbar"><button class="btn" style="width:auto" onclick="window.print()">Print</button><button class="btn" style="width:auto;background:#6B5D4F" onclick="location.reload()">Lock again</button></div>'+h;out.hidden=false;lock.hidden=true;pw.value='';}
catch(e){err.hidden=false;lock.classList.remove('shake');void lock.offsetWidth;lock.classList.add('shake');}btn.disabled=false;btn.textContent='Unlock';});
})();
