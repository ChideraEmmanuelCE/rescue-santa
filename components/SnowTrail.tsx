"use client";
import {useRef,useMemo} from "react";
import type {MutableRefObject} from "react";
import {useFrame} from "@react-three/fiber";
import * as T from "three";
import type SoloGame from "@/lib/SoloGame";

/** Recycle the oldest impressions; no geometry allocation while the players walk. */
export default function SnowTrail({position,game}:{position:MutableRefObject<T.Vector3>;game:SoloGame}){
  const mesh=useRef<T.InstancedMesh>(null),cursor=useRef(0);
  const last=useRef<{x:number;z:number;side:number}|null>(null);
  const dummy=useMemo(()=>new T.Object3D(),[]);
  const texture=useMemo(()=>{
    const c=document.createElement("canvas");c.width=40;c.height=72;const g=c.getContext("2d")!;
    g.shadowColor="#466278";g.shadowBlur=4;g.fillStyle="#526c7a";g.beginPath();g.ellipse(20,26,12,19,0,0,Math.PI*2);g.fill();g.fillRect(11,46,18,15);
    g.globalCompositeOperation="destination-out";g.fillStyle="#000";for(let i=0;i<5;i++)g.fillRect(5,12+i*8,28,2);
    return new T.CanvasTexture(c);
  },[]);
  useFrame(()=>{
    const m=mesh.current;if(!m)return;
    function stamp(x:number,y:number,z:number,yaw:number){
      const prev=last.current;if(!prev){last.current={x,z,side:1};return;}
      const distance=Math.hypot(x-prev.x,z-prev.z);if(distance<.93)return;
      prev.x=x;prev.z=z;if(distance>4||y>1.4)return;
      prev.side*=-1;dummy.rotation.order="YXZ";dummy.rotation.set(-Math.PI/2,-yaw,0,"YXZ");
      dummy.position.set(x+Math.cos(yaw)*.18*prev.side,-.039,z+Math.sin(yaw)*.18*prev.side);dummy.updateMatrix();
      m!.setMatrixAt(cursor.current%128,dummy.matrix);cursor.current++;m!.count=Math.min(cursor.current,128);m!.instanceMatrix.needsUpdate=true;
    }
    const p=game.myPlayer,v=position.current;if(p)stamp(v.x,v.y,v.z,p.yaw);
  });
  return <instancedMesh ref={mesh} args={[undefined,undefined,128]} count={0} frustumCulled={false}><planeGeometry args={[.34,.55]}/><meshBasicMaterial map={texture} transparent opacity={.26} depthWrite={false} polygonOffset polygonOffsetFactor={-1}/></instancedMesh>;
}
