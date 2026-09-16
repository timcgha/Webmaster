import {expect,it} from 'vitest';
import {CreateBoxVertexData} from '@babylonjs/core/Meshes/Builders/boxBuilder.pure';
import {Vector4} from '@babylonjs/core/Maths/math.vector';
import {roundedBlockData} from '../src/game/rounded-block';

it('rounded costume faces retain original winding and stay inside each assigned atlas tile',()=>{
 const faceUV=Array.from({length:6},(_,i)=>new Vector4(i/6,.2,(i+1)/6,.8));
 const options={width:.72,height:.78,depth:.66,faceUV};
 const original=CreateBoxVertexData(options),rounded=roundedBlockData(options);
 function orientation(d:typeof rounded,offset:number){
  const ids=d.indices!.slice(offset,offset+3),a=ids[0]!*3,b=ids[1]!*3,c=ids[2]!*3,p=d.positions!,n=d.normals!;
  const u=[p[b]!-p[a]!,p[b+1]!-p[a+1]!,p[b+2]!-p[a+2]!],v=[p[c]!-p[a]!,p[c+1]!-p[a+1]!,p[c+2]!-p[a+2]!];
  return (u[1]!*v[2]!-u[2]!*v[1]!)*n[a]!+(u[2]!*v[0]!-u[0]!*v[2]!)*n[a+1]!+(u[0]!*v[1]!-u[1]!*v[0]!)*n[a+2]!;
 }
 for(let face=0;face<6;face++){
  const sign=Math.sign(orientation(original,face*6));
  for(let triangle=0;triangle<18;triangle++)expect(Math.sign(orientation(rounded,face*54+triangle*3)),`face${face} triangle${triangle}`).toBe(sign);
  for(let vertex=0;vertex<16;vertex++){
   const offset=(face*16+vertex)*2,u=rounded.uvs![offset]!,v=rounded.uvs![offset+1]!;
   expect(u).toBeGreaterThanOrEqual(face/6-1e-6);expect(u).toBeLessThanOrEqual((face+1)/6+1e-6);
   expect(v).toBeGreaterThanOrEqual(.2-1e-6);expect(v).toBeLessThanOrEqual(.8+1e-6);
  }
 }
});
