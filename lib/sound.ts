let ctx: AudioContext | undefined, master: GainNode | undefined, noise: AudioBuffer | undefined;
let muted=false;
export function enableSound(){
  try {
    if(!ctx){
      ctx=new AudioContext(); master=ctx.createGain();master.gain.value=muted?0:.65;master.connect(ctx.destination);
      noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
      const a=noise.getChannelData(0); for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;
      const wind=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),volume=ctx.createGain();
      wind.buffer=noise;wind.loop=true;filter.type="lowpass";filter.frequency.value=320;volume.gain.value=.052;
      wind.connect(filter).connect(volume).connect(master);wind.start();
    }
    void ctx.resume().catch(()=>{});
  }catch{}
}
export function setMuted(v:boolean){muted=v;if(ctx&&master)master.gain.setTargetAtTime(v?0:.65,ctx.currentTime,.05);}
export function suspendSound(){void ctx?.suspend().catch(()=>{});}
export function sound(kind:"fire"|"step"|"hit"|"jump"|"clear"|"charge"|"bell",volume=1){
  if(!ctx||!master||!noise||ctx.state!=="running"||muted)return;
  const t=ctx.currentTime;
  const specs={charge:[.75,420,3000,.12],bell:[.02,1000,500,.015],fire:[.20,2400,310,.46],step:[.13,1250,220,.18],hit:[.22,3100,430,.45],jump:[.22,650,1750,.15],clear:[.8,750,1500,.12]}[kind];
  const [duration,from,to,gain]=specs;
  const src=ctx.createBufferSource(), eq=ctx.createBiquadFilter(),env=ctx.createGain();
  src.buffer=noise;eq.type="bandpass";eq.Q.value=.7;eq.frequency.setValueAtTime(from,t);eq.frequency.exponentialRampToValueAtTime(to,t+duration);
  env.gain.setValueAtTime(.001,t);env.gain.exponentialRampToValueAtTime(Math.max(.002,gain*volume),t+.012);env.gain.exponentialRampToValueAtTime(.001,t+duration);
  src.connect(eq).connect(env).connect(master);src.start(t,Math.random());src.stop(t+duration);
  if(kind==="clear"||kind==="hit"||kind==="bell"){
    for(const [i,hz] of (kind==="clear"?[523,659,784,1046]:kind==="bell"?[1397,2093]:[1520,2020]).entries()){
      const osc=ctx.createOscillator(),amp=ctx.createGain(),s=t+i*.065;osc.frequency.value=hz;
      amp.gain.setValueAtTime(.055*volume,s);amp.gain.exponentialRampToValueAtTime(.001,s+.28);
      osc.connect(amp).connect(master);osc.start(s);osc.stop(s+.3);
    }
  }
}
