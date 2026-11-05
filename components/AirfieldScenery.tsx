"use client";
import {useMemo,useRef,useLayoutEffect,useEffect} from "react";
import * as T from "three";
import {fields} from "@/lib/Airfield";
import {random01} from "@/lib/world";
type V=[number,number,number];
type Item={p:V;s:V;c:string;r?:V};
function Batch({items,shape="box",glow=false}:{items:Item[];shape?:"box"|"pine"|"rock"|"sphere";glow?:boolean}){
  const ref=useRef<T.InstancedMesh>(null);
  useLayoutEffect(()=>{
    const mesh=ref.current!,o=new T.Object3D(),color=new T.Color();
    items.forEach((v,i)=>{o.position.set(...v.p);o.scale.set(...v.s);o.rotation.set(...(v.r??[0,0,0]) as V);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);mesh.setColorAt(i,color.set(v.c));});
    mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();
  },[items]);
  return <instancedMesh ref={ref} args={[undefined,undefined,items.length]} receiveShadow={!glow}>
    {shape==="pine"?<coneGeometry args={[1,1,9]}/>:shape==="rock"?<icosahedronGeometry args={[1,1]}/>:shape==="sphere"?<sphereGeometry args={[1,8,5]}/>:<boxGeometry/>}
    {glow?<meshBasicMaterial toneMapped={false}/>:<meshStandardMaterial roughness={.84}/>}
  </instancedMesh>;
}
function Sign({text,position,size,flat=false}:{text:string;position:V;size:[number,number];flat?:boolean}){
  const texture=useMemo(()=>{
    const c=document.createElement("canvas");c.width=512;c.height=96;const g=c.getContext("2d")!;
    if(!flat){g.fillStyle="#163d39";g.fillRect(0,0,512,96);g.strokeStyle="#d6b77d";g.lineWidth=5;g.strokeRect(4,4,504,88);}
    g.fillStyle=flat?"#e8e9e0":"#ffe2ae";g.font="bold 62px sans-serif";g.textAlign="center";g.textBaseline="middle";g.fillText(text,256,50,483);
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
  },[text,flat]);useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh position={position} rotation-x={flat?-Math.PI/2:0}><planeGeometry args={size}/><meshBasicMaterial map={texture} transparent depthWrite={!flat} side={T.DoubleSide}/></mesh>;
}
function airportLandscape(){
  const structures:Item[]=[],lit:Item[]=[],trees:Item[]=[],peaks:Item[]=[],ornaments:Item[]=[];
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,c:string,arr=structures)=>arr.push({p:[x,y,z],s:[w,h,d],c});
  for(const f of fields){
    const z=f.z;
    box(0,.04,z,30,.14,266,"#424d58");box(-34,-.01,z+74,47,.13,64,"#54636d");
    for(let n=-120;n<=120;n+=14){
      box(0,.12,z+n,.48,.02,6,"#f8f6e4");
      for(const side of [-1,1])box(side*15,.24,z+n,.46,.32,.46,Math.abs(n)>105?"#bcffcd":"#ffe9ac",lit);
    }
    for(const side of [-1,1]){
      box(side*14,.125,z,.2,.02,258,"#d4ddd8");
      for(let i=0;i<7;i++)box((i-3)*3,.13,z+side*119,1.45,.02,6,"#f4efde");
    }
    // Terminal, glazed arrivals hall, snow caps and rooftop control cabin.
    box(-47,3,z+58,25,6,14,"#883c36");box(-47,6.25,z+58,27,.6,16,"#e8eeef");
    for(let i=0;i<9;i++)box(-57+i*2.5,3.3,z+65.05,1.8,2.4,.15,i%3?"#ffd495":"#a4dce3",lit);
    box(-35,6,z+44,4.5,12,4.5,"#c8c8b8");box(-35,13,z+44,7,3,7,"#4e7e87");box(-35,14.8,z+44,8,.7,8,"#f4f4e4");
    for(const side of [-1,1])box(-35+side*3.55,13,z+44,.15,1.5,5.4,"#a5def0",lit);
    box(-35,16,z+44,.3,2,.3,"#703833");box(-35,17,z+44,.45,.45,.45,"#ff5252",lit);
    box(-51,4.2,z+93,23,8.4,17,"#385549");box(-51,8.65,z+93,24,.6,18,"#eef3ec");
    box(-51,3.3,z+101.55,16,6.4,.2,"#20343c");for(let i=0;i<8;i++)box(-58+i*2,3.4,z+101.72,.1,6,.08,"#69817d");
    for(let i=0;i<24;i++)box(-59+i,6,z+65.8,.22,.25,.22,["#ff826d","#fff0ad","#8df7b3"][i%3],lit);
    for(let i=0;i<8;i++){const x=-29-(i%4)*1.4,zz=z+77+Math.floor(i/4)*1.6;box(x,.6,zz,1.2,1.2,1.2,i%2?"#b83937":"#226351");box(x,.61,zz,.18,1.23,1.22,"#edc279");}
    for(let level=0;level<4;level++){const y=1.6+level*1.5,rad=3.5-level*.66;trees.push({p:[-29,y,z+66],s:[rad,3.6,rad],c:"#194f3e"});
      for(let j=0;j<10;j++){const a=j*Math.PI/5+level;ornaments.push({p:[-29+Math.cos(a)*rad*.78,y-1,z+66+Math.sin(a)*rad*.78],s:[.19,.2,.19],c:j%2?"#ffe3a1":"#e64642"});}}
    ornaments.push({p:[-29,8.2,z+66],s:[.44,.58,.44],c:"#fff1ad"});
  }
  for(let i=0;i<420;i++){
    const x=(random01(3*i+1)-.5)*790,z=300-random01(i*3+2)*1560;
    if(fields.some(f=>Math.abs(z-f.z)<169&&Math.abs(x)<85)||Math.abs(x)<19)continue;
    const h=4+random01(3*i+5)*10;
    trees.push({p:[x,h*.40,z],s:[h*.30,h*.8,h*.30],c:"#214b49"},{p:[x,h*.65,z],s:[h*.23,h*.72,h*.23],c:"#ccdfdd"});
  }
  for(let i=0;i<90;i++){const side=i%2?1:-1,z=480-random01(i*9)*1990,h=35+random01(i*7+19)*95,x=side*(560+random01(i*9+1)*155);
    peaks.push({p:[x,-h*.36,z],s:[90,h,125],c:"#9fbdc9",r:[.09,i,.13]},{p:[x,h*.13,z],s:[60,h*.59,90],c:"#e0eaed",r:[.09,i,.13]});}
  return {structures,lit,trees,peaks,ornaments};
}
export default function AirfieldScenery(){
  const data=useMemo(airportLandscape,[]);
  return <><mesh rotation-x={-Math.PI/2} position={[0,-.08,-490]}><planeGeometry args={[3400,3200]}/><meshStandardMaterial color="#dce8e8"/></mesh>
    <Batch items={data.structures}/><Batch items={data.lit} glow/><Batch items={data.trees} shape="pine"/><Batch items={data.peaks} shape="rock"/><Batch items={data.ornaments} shape="sphere" glow/>
    {fields.map(f=><group key={f.name}><Sign text={f.name.toUpperCase()} position={[-47,5.4,f.z+65.22]} size={[15,2.2]}/>
      <Sign text="POLAR AIR MAIL" position={[-51,7.5,f.z+101.7]} size={[14,1.9]}/>
      <Sign text="36" flat position={[0,.145,f.z+103]} size={[7,6]}/></group>)}
  </>;
}
