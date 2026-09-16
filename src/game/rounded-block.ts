import { CreateBoxVertexData } from "@babylonjs/core/Meshes/Builders/boxBuilder.pure";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { Scene } from "@babylonjs/core/scene";

/** Original bevel geometry, bounded inside the existing box/hitbox. Each face
 * keeps its original atlas and color; smooth edge normals add no overlay plates. */
export function roundedBlockData(options: Parameters<typeof CreateBoxVertexData>[0], radius = 0.045): VertexData {
  const box=CreateBoxVertexData(options), half=[(options.width??options.size??1)/2,(options.height??options.size??1)/2,(options.depth??options.size??1)/2];
  const r=Math.min(radius,...half.map(h=>h*.22)), data=new VertexData(), positions:number[]=[],normals:number[]=[],uvs:number[]=[],indices:number[]=[],colors:number[]=[];
  const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
  for(let face=0;face<6;face++) {
    const corners=Array.from({length:4},(_,i)=>Array.from({length:3},(_,a)=>box.positions![(face*4+i)*3+a]!));
    const edge=(a:number,b:number)=>Math.hypot(...corners[a]!.map((v,i)=>v-corners[b]![i]!));
    const levels=(length:number)=>[0,r*.293/length,r/length,1-r/length,1-r*.293/length,1];
    const us=levels(edge(0,1)),vs=levels(edge(0,3)),start=positions.length/3;
    for(const v of vs)for(const u of us){
      const p=half.map((_,a)=>lerp(lerp(corners[0]![a]!,corners[1]![a]!,u),lerp(corners[3]![a]!,corners[2]![a]!,u),v));
      const center=p.map((x,a)=>Math.max(-half[a]!+r,Math.min(half[a]!-r,x)));
      const d=p.map((x,a)=>x-center[a]!),length=Math.hypot(...d);
      const n=d.map(x=>x/length);positions.push(...center.map((x,a)=>x+n[a]!*r));normals.push(...n);
      for(let a=0;a<2;a++){const at=(i:number)=>box.uvs![(face*4+i)*2+a]!;
        uvs.push(lerp(lerp(at(0),at(1),u),lerp(at(3),at(2),u),v));}
      if(box.colors)colors.push(...Array.from({length:4},(_,a)=>box.colors![(face*4)*4+a]!));
    }
    for(let v=0;v<5;v++)for(let u=0;u<5;u++){const a=start+v*6+u;indices.push(a,a+1,a+7,a,a+7,a+6);}
  }
  data.positions=positions;data.normals=normals;data.indices=indices;data.uvs=uvs;if(colors.length)data.colors=colors;return data;
}
export function createRoundedBlock(name:string,options:Parameters<typeof CreateBoxVertexData>[0],scene:Scene,radius=.045):Mesh {
  const mesh=new Mesh(name,scene);roundedBlockData(options,radius).applyToMesh(mesh);return mesh;
}
