"use client";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as T from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

export type Motion = { speed:number; airborne:boolean; shot:number };
export default function SantaRig({motion,height=2.25}:{motion?:MutableRefObject<Motion>;height?:number}){
  const {scene}=useGLTF("/expedition/santa.gltf");
  const rig=useMemo(()=>{
    const model=clone(scene);
    const bones:Record<string,T.Bone>={};
    model.traverse(obj=>{
      if(obj instanceof T.Mesh){obj.castShadow=true; obj.frustumCulled=false;}
      if(obj instanceof T.Bone) bones[obj.name.replace(/^.*mixamorig/i,"").replace(/[^a-z]/gi,"")]=obj;
    });
    model.updateMatrixWorld(true);
    const box=new T.Box3().setFromObject(model,true);
    const scale=height/Math.max(.001,box.max.y-box.min.y);
    const center=box.getCenter(new T.Vector3());
    model.scale.setScalar(scale);
    model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
    const rest=new Map(Object.values(bones).map(b=>[b,b.quaternion.clone()]));
    return {model,bones,rest};
  },[scene,height]);
  const phase=useRef(0), blend=useRef(0);
  const twist=useMemo(()=>new T.Quaternion(),[]);
  const euler=useMemo(()=>new T.Euler(),[]);
  useFrame(({clock},dt)=>{
    const m=motion?.current;
    blend.current=T.MathUtils.damp(blend.current,Math.min(1,(m?.speed||0)/5),9,dt);
    phase.current+=dt*(6+blend.current*5);
    const gait=Math.sin(phase.current)*blend.current;
    const fire=Math.max(0,1-(performance.now()-(m?.shot??-2000))/360);
    function joint(name:string,x:number,y:number,z:number){
      const b=rig.bones[name]; if(!b)return;
      b.quaternion.copy(rig.rest.get(b)!).multiply(twist.setFromEuler(euler.set(x,y,z)));
    }
    joint("LeftUpLeg",gait*.48,0,0); joint("RightUpLeg",-gait*.48,0,0);
    joint("LeftLeg",Math.max(0,-gait)*.65+(m?.airborne ? .25 : 0),0,0);
    joint("RightLeg",Math.max(0,gait)*.65,0,0);
    joint("LeftArm",-gait*.32,0,.9);joint("RightArm",gait*.32-fire*1.25,0,-.9);
    joint("LeftForeArm",-.13,0,0);joint("RightForeArm",-.26-fire*.5,0,0);
    joint("Spine",-.04*blend.current,Math.sin(phase.current)*.045*blend.current,0);
    joint("Head",Math.sin(clock.elapsedTime*1.6)*.018,0,0);
  });
  return <group rotation={[0,Math.PI,0]}><primitive object={rig.model} dispose={null}/></group>;
}
