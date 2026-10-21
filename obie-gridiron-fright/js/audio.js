// Synthesized WebAudio sound effects and music. No audio files.
window.SFX = (function(){
  let ctx=null, master=null, musicGain=null, muted=false, musicTimer=null, musicStep=0;
  function init(){
    if(ctx) { if(ctx.state==='suspended') ctx.resume(); return; }
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    ctx=new AC(); master=ctx.createGain(); master.gain.value=muted?0:0.55; master.connect(ctx.destination);
    musicGain=ctx.createGain(); musicGain.gain.value=0.16; musicGain.connect(master);
  }
  function tone(o){
    if(!ctx||muted) return; const t=ctx.currentTime+(o.delay||0);
    const osc=ctx.createOscillator(), g=ctx.createGain();
    osc.type=o.type||'square'; osc.frequency.setValueAtTime(o.f,t);
    if(o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20,o.f2),t+o.d);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(o.v||0.3,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+o.d);
    osc.connect(g); g.connect(o.dest||master); osc.start(t); osc.stop(t+o.d+0.05);
  }
  function noise(o){
    if(!ctx||muted) return; const t=ctx.currentTime+(o.delay||0);
    const len=Math.floor(ctx.sampleRate*o.d), buf=ctx.createBuffer(1,len,ctx.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
    const src=ctx.createBufferSource(); src.buffer=buf;
    const f=ctx.createBiquadFilter(); f.type=o.ft||'lowpass'; f.frequency.setValueAtTime(o.f||1200,t);
    if(o.f2) f.frequency.exponentialRampToValueAtTime(o.f2,t+o.d);
    const g=ctx.createGain(); g.gain.setValueAtTime(o.v||0.3,t); g.gain.exponentialRampToValueAtTime(0.0001,t+o.d);
    src.connect(f); f.connect(g); g.connect(master); src.start(t);
  }
  const fx={
    jump(){tone({f:300,f2:640,d:0.16,type:'square',v:0.14});},
    throw(){noise({d:0.18,f:3000,f2:600,ft:'bandpass',v:0.35});tone({f:500,f2:900,d:0.1,type:'triangle',v:0.12});},
    candy(){tone({f:880,d:0.07,type:'square',v:0.1});tone({f:1320,d:0.12,type:'square',v:0.1,delay:0.05});},
    ball(){tone({f:440,d:0.08,type:'triangle',v:0.25});tone({f:660,d:0.14,type:'triangle',v:0.25,delay:0.07});},
    heart(){[523,659,784].forEach((f,i)=>tone({f,d:0.15,type:'sine',v:0.25,delay:i*0.07}));},
    hit(){noise({d:0.12,f:1800,f2:200,v:0.4});tone({f:180,f2:60,d:0.12,type:'square',v:0.2});},
    stomp(){tone({f:220,f2:90,d:0.15,type:'square',v:0.25});noise({d:0.1,f:900,v:0.3});},
    hurt(){tone({f:400,f2:120,d:0.35,type:'sawtooth',v:0.22});},
    defeat(){noise({d:0.35,f:2500,f2:150,v:0.35});tone({f:300,f2:50,d:0.3,type:'square',v:0.15});},
    checkpoint(){[392,523,659,784].forEach((f,i)=>tone({f,d:0.18,type:'triangle',v:0.25,delay:i*0.08}));},
    roar(){tone({f:110,f2:55,d:0.9,type:'sawtooth',v:0.3});noise({d:0.8,f:600,f2:100,v:0.3});},
    bossHit(){tone({f:160,f2:80,d:0.12,type:'square',v:0.3});noise({d:0.1,f:2000,v:0.25});},
    whistle(){tone({f:2200,f2:2400,d:0.5,type:'sine',v:0.18});tone({f:2250,d:0.5,type:'sine',v:0.1});},
    boom(){noise({d:0.9,f:1200,f2:60,v:0.6});tone({f:90,f2:30,d:0.8,type:'sine',v:0.5});},
    win(){[523,659,784,1047,784,1047].forEach((f,i)=>tone({f,d:0.22,type:'square',v:0.14,delay:i*0.12}));},
    lose(){[392,349,311,262].forEach((f,i)=>tone({f,d:0.3,type:'triangle',v:0.25,delay:i*0.22}));},
    click(){tone({f:660,d:0.05,type:'square',v:0.1});},
    pause(){tone({f:520,f2:300,d:0.12,type:'triangle',v:0.2});},
  };
  // Spooky marching music: bass + arp, minor key
  const scales={
    1:[110,131,147,165,196],2:[98,117,131,147,175],3:[87,104,117,131,156],4:[123,147,165,185,220],0:[110,131,147,165,196]};
  function startMusic(n){
    stopMusic(); if(!ctx) return; musicStep=0; const sc=scales[n]||scales[0]; const bpm=n===0?100:132; const stepT=60/bpm/2;
    musicTimer=setInterval(()=>{
      if(muted||!ctx) return; const s=musicStep++;
      if(s%4===0) tone({f:sc[(Math.floor(s/8))%2?3:0]/2,d:stepT*3,type:'triangle',v:0.5,dest:musicGain});
      const arp=[0,2,4,2,1,3,4,3]; if(n!==0||s%2===0) tone({f:sc[arp[s%8]]*2,d:stepT*0.9,type:'square',v:0.12,dest:musicGain});
      if(n!==0 && s%4===2) noiseHat();
    },stepT*1000);
  }
  function noiseHat(){ if(!ctx||muted) return; const t=ctx.currentTime; const len=Math.floor(ctx.sampleRate*0.04), buf=ctx.createBuffer(1,len,ctx.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=Math.random()*2-1; const src=ctx.createBufferSource(); src.buffer=buf; const f=ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=6000;
    const g=ctx.createGain(); g.gain.setValueAtTime(0.12,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.04); src.connect(f); f.connect(g); g.connect(musicGain); src.start(t);}
  function stopMusic(){ if(musicTimer) clearInterval(musicTimer); musicTimer=null; }
  return {
    init, play(n){ try{ fx[n]&&fx[n](); }catch(e){} }, startMusic, stopMusic,
    setMuted(m){ muted=m; if(master) master.gain.value=m?0:0.55; }, isMuted(){return muted;}
  };
})();
