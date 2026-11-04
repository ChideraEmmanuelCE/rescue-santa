"use client";
import {useEffect,useMemo,useRef} from "react";
import {useThree,useFrame} from "@react-three/fiber";
import * as T from "three";
import {RGBELoader} from "three/examples/jsm/loaders/RGBELoader.js";
import {random01} from "@/lib/world";

export default function WinterLight({lowPower}:{lowPower:boolean}){
  const scene=useThree(s=>s.scene);
  useEffect(()=>{
    let cancelled=false, env:T.DataTexture|undefined;
    new RGBELoader().load("/expedition/winter.hdr",map=>{
      if(cancelled){map.dispose();return;}
      env=map;map.mapping=T.EquirectangularReflectionMapping;scene.background=map;scene.environment=map;
      scene.backgroundIntensity=.76;scene.environmentIntensity=.42;
    },undefined,()=>{});
    return ()=>{cancelled=true;if(env){if(scene.background===env)scene.background=null;if(scene.environment===env)scene.environment=null;env.dispose();}};
  },[scene]);
  return <>
    <hemisphereLight args={["#e6efff","#788ea1",1.05]}/>
    <directionalLight castShadow color="#ffdfb0" intensity={2.15} position={[-37,31,-48]}
      shadow-mapSize={[lowPower?1024:2048,lowPower?1024:2048]} shadow-camera-left={-62} shadow-camera-right={62}
      shadow-camera-top={61} shadow-camera-bottom={-61} shadow-camera-far={160} shadow-normalBias={.035}/>
  </>;
}
export function Powder({count}:{count:number}){
  const ref=useRef<T.ShaderMaterial>(null);
  const seeds=useMemo(()=>Float32Array.from({length:count*3},(_,i)=>random01(i+674)),[count]);
  const uniforms=useMemo(()=>({time:{value:0},eye:{value:new T.Vector3()}}),[]);
  useFrame(({clock,camera})=>{uniforms.time.value=clock.elapsedTime;uniforms.eye.value.copy(camera.position);});
  return <points frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[seeds,3]}/></bufferGeometry>
    <shaderMaterial ref={ref} uniforms={uniforms} transparent depthWrite={false} vertexShader={`
    uniform float time;uniform vec3 eye;varying float opacity;
    void main(){vec3 p=position*vec3(44.,23.,44.);
      p.x+=time*.6+sin(time*.7+p.z)*.65;p.y-=time*(1.1+position.z*.9);
      p=mod(p-eye,vec3(44.,23.,44.))-vec3(22.,11.5,22.)+eye;
      vec4 mv=viewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
      gl_PointSize=clamp((30.+position.y*45.)/max(.3,-mv.z),1.,6.);
      opacity=smoothstep(0.5,2.,-mv.z)*(.28+position.y*.52);}
    `} fragmentShader={`varying float opacity;void main(){float a=1.-smoothstep(.13,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(.94,.97,1.,a*opacity);}`}/>
  </points>
}
