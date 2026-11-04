(function(){
const f=document.getElementById('f'),pw=document.getElementById('pw'),err=document.getElementById('err'),out=document.getElementById('out'),lock=document.getElementById('lock');
const b=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function dec(e,p){const km=await crypto.subtle.importKey('raw',new TextEncoder().encode(p),'PBKDF2',false,['deriveKey']);
const k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b(e.salt),iterations:e.iter,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:b(e.iv)},k,b(e.ct)));}
f.addEventListener('submit',async ev=>{ev.preventDefault();err.hidden=true;const btn=f.querySelector('button');btn.disabled=true;btn.textContent='Checking...';
try{const keys=await (await fetch('keys.json',{cache:'no-store'})).json();const ids=Object.keys(keys).sort((a,c)=>keys[c].num-keys[a].num);let h='';
for(const id of ids){h+='<section class="paper">'+await dec(keys[id].enc,pw.value)+'</section>';}
out.innerHTML=h+'<p class="foot"><button class="btn" onclick="window.print()">Print</button> <button class="btn" onclick="location.reload()">Lock again</button></p>';out.hidden=false;lock.hidden=true;pw.value='';}
catch(e){err.hidden=false;}btn.disabled=false;btn.textContent='Unlock';});
})();
