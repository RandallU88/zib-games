(function(){
const $=id=>document.getElementById(id);
const fmt=n=>'$'+Math.round(n).toLocaleString('en-US');
// Budget split
function budget(){const pay=+$('bPay').value||0,n=+$('bN').value,m=pay*n;
 const p=[+$('bNeed').value||0,+$('bWant').value||0,+$('bSave').value||0],t=p[0]+p[1]+p[2];
 if(t!==100){$('bOut').textContent='Your percentages add to '+t+'%. Make them add to 100%.';$('bBar').innerHTML='';return;}
 const names=['Needs','Wants','Savings and debt'],cols=['#C9A04A','#7a8fb0','#5ec46e'];
 $('bOut').innerHTML='Monthly take-home '+fmt(m)+': '+names.map((x,i)=>x+' '+fmt(m*p[i]/100)).join(', ')+'.';
 $('bBar').innerHTML=p.map((v,i)=>'<span style="width:'+v+'%;background:'+cols[i]+'"></span>').join('');}
$('bGo').onclick=budget;
// Compound
function comp(){const P=+$('cP').value||0,M=+$('cM').value||0,r=(+$('cR').value||0)/100/12,n=Math.max(0,Math.round((+$('cY').value||0)*12));
 let b=P;for(let i=0;i<n;i++)b=b*(1+r)+M;const put=P+M*n,g=b-put;
 $('cOut').textContent='After '+(n/12)+' years: '+fmt(b)+'. You put in '+fmt(put)+'; growth added '+fmt(g)+'.';
 const pp=b>0?put/b*100:100;$('cBar').innerHTML='<span style="width:'+pp+'%;background:#7a8fb0"></span><span style="width:'+(100-pp)+'%;background:#C9A04A"></span>';}
$('cGo').onclick=comp;
// Debts
const def=[['Card A',3000,24,90],['Card B',800,18,30],['Car loan',9000,7,250]];
$('debts').innerHTML=def.map((d,i)=>'<div class="row" style="margin-bottom:8px"><label>Name<input id="dn'+i+'" value="'+d[0]+'"></label><label>Balance ($)<input id="db'+i+'" type="number" value="'+d[1]+'"></label><label>APR (%)<input id="dr'+i+'" type="number" step="0.1" value="'+d[2]+'"></label><label>Minimum ($)<input id="dm'+i+'" type="number" value="'+d[3]+'"></label></div>').join('');
function sim(ds,order,pay){ds=ds.map(d=>({...d}));let mo=0,int=0;const done=[];
 while(ds.some(d=>d.b>0.005)&&mo<1200){mo++;ds.forEach(d=>{if(d.b>0){const i=d.b*d.r/1200;d.b+=i;int+=i;}});
  let left=pay;ds.forEach(d=>{if(d.b>0){const x=Math.min(d.m,d.b);d.b-=x;left-=x;}});
  const act=ds.filter(d=>d.b>0.005).sort(order);for(const d of act){if(left<=0)break;const x=Math.min(left,d.b);d.b-=x;left-=x;}
  ds.forEach(d=>{if(d.b<=0.005&&!done.includes(d.n))done.push(d.n);});}
 return{mo,int,done};}
$('dGo').onclick=function(){const ds=[];for(let i=0;i<3;i++){const b=+$('db'+i).value||0;if(b>0)ds.push({n:$('dn'+i).value||('Debt '+(i+1)),b,r:+$('dr'+i).value||0,m:+$('dm'+i).value||0});}
 const pay=+$('dPay').value||0,mins=ds.reduce((s,d)=>s+d.m,0);
 if(!ds.length){$('dOut').textContent='Enter at least one debt.';return;}
 if(pay<mins){$('dOut').textContent='Your monthly payment must be at least the total of the minimums ('+fmt(mins)+').';return;}
 const a=sim(ds,(x,y)=>y.r-x.r,pay),s=sim(ds,(x,y)=>x.b-y.b,pay);
 if(a.mo>=1200){$('dOut').textContent='At this payment the debt never gets paid off. Try a higher amount.';return;}
 const line=(t,x)=>'<b>'+t+'</b>: debt-free in '+x.mo+' months, '+fmt(x.int)+' interest. Order: '+x.done.join(', ')+'.';
 const diff=s.int-a.int;
 $('dOut').innerHTML=line('Avalanche',a)+'<br>'+line('Snowball',s)+'<br>'+(diff>1?'Avalanche saves about '+fmt(diff)+' in interest.':'Both methods cost about the same here.');};
// Quiz
const Q=[["Moving into a higher tax bracket means:",["All your income is taxed at the higher rate","Only the dollars in that bracket are taxed at the higher rate","You take home less money overall"],1,"Brackets are marginal; only the dollars above the threshold get the higher rate."],
["With biweekly pay, how many paychecks come in a year?",["24","26","52"],1,"26. That gives two months with a third paycheck."],
["Which payoff method saves the most interest?",["Avalanche (highest APR first)","Snowball (smallest balance first)"],0,"Avalanche targets the most expensive debt first. Snowball can be better for motivation."],
["What is the IRA contribution limit for 2026 (under age 50)?",["$7,000","$7,500","$24,500"],1,"$7,500, per the IRS. $24,500 is the 401(k) employee limit."],
["Where should an emergency fund usually live?",["Stocks, for growth","An insured high-yield savings account","A CD you cannot touch for 5 years"],1,"Safe and easy to reach beats growth for emergency money."],
["Your employer matches 401(k) contributions. A good first step is:",["Skip it until debts are gone","Contribute at least enough to get the full match","Put everything in an IRA instead"],1,"The match is free money, an instant return."],
["The biggest factor in a FICO score is:",["Payment history","Credit mix","Number of cards"],0,"Payment history is about 35% of a FICO score."],
["A Roth account gives you:",["A tax deduction now","Tax-free qualified withdrawals later","No contribution limits"],1,"Roth: pay tax now, qualified withdrawals are tax-free later."]];
let score=0,ans=0;
$('qz').innerHTML=Q.map((q,i)=>'<div class="q"><p>'+(i+1)+'. '+q[0]+'</p><div class="opts">'+q[1].map((o,j)=>'<button data-q="'+i+'" data-o="'+j+'">'+o+'</button>').join('')+'</div><div class="fb" id="fb'+i+'"></div></div>').join('');
$('qz').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const i=+b.dataset.q,j=+b.dataset.o,box=b.parentNode;if(box.dataset.done)return;box.dataset.done=1;ans++;
 const q=Q[i];box.children[q[2]].classList.add('ok');if(j===q[2]){score++;$('fb'+i).textContent='Correct. '+q[3];}else{b.classList.add('no');$('fb'+i).textContent='Not quite. '+q[3];}
 $('qScore').textContent='Score: '+score+' of '+ans+(ans===Q.length?' answered. Nice work.':'');});
budget();comp();
})();
